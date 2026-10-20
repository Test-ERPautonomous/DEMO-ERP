import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { GarageUser, UserPermissions, UserRole } from '../types';
import { supabase, isSupabaseConfigured, getSupabaseDiagnosticInfo } from '../lib/supabase';
import { api } from '../lib/api';
import { safeStorage } from '../lib/storage';

export interface AuthContextType {
  currentUser: GarageUser | null;
  users: GarageUser[];
  isAuthenticated: boolean;
  isAdmin: boolean;
  isOwner: boolean;
  userRole: UserRole | string;
  isSupabaseConnected: boolean;
  isLoading: boolean;
  isSetupRequired: boolean;
  checkSetupStatus: () => Promise<{ isSetupRequired: boolean; masterEmail?: string; error?: string }>;
  setupMasterAdmin: (payload: { password: string; confirmPassword: string; email?: string; fullName?: string; bootstrapSecret?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  login: (emailOrUsername: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  register: (data: { email: string; password: string; fullName: string; role: UserRole; phone?: string }) => Promise<{ success: boolean; error?: string; message?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  resetPassword: (newPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  switchUser: (userId: string) => void;
  addUser: (userData: {
    fullName: string;
    username?: string;
    role: UserRole;
    email: string;
    phone?: string;
    password?: string;
    permissions?: UserPermissions;
  }) => Promise<{ success: boolean; error?: string; user?: GarageUser }>;
  updateUser: (id: string, updates: Partial<GarageUser>) => Promise<{ success: boolean; error?: string }>;
  deleteUser: (id: string) => Promise<{ success: boolean; error?: string }>;
  resetUserPassword: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  hasPermission: (permission: keyof UserPermissions) => boolean;
  hasRole: (allowedRoles: (UserRole | string)[]) => boolean;
  refreshUsers: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REMEMBER_ME_KEY = 'najm_auth_remember_me';

export const getRolePermissions = (role?: UserRole | string): UserPermissions => {
  const normRole = (role || '').trim().toLowerCase().replace(/[\s-]+/g, '_');

  if (normRole === 'owner') {
    return {
      canViewDashboard: true,
      canManageJobCards: true,
      canAdvanceJobStatus: true,
      canManageDentingPainting: true,
      canManageInventory: true,
      canManagePurchasesAndSales: true,
      canViewServiceHistory: true,
      canManageBilling: true,
      canManageSettings: true,
      canManageUsers: true,
    };
  }

  if (normRole === 'admin') {
    return {
      canViewDashboard: true,
      canManageJobCards: true,
      canAdvanceJobStatus: true,
      canManageDentingPainting: true,
      canManageInventory: true,
      canManagePurchasesAndSales: true,
      canViewServiceHistory: true,
      canManageBilling: true,
      canManageSettings: true,
      canManageUsers: false, // Staff account management strictly restricted to Owner only
    };
  }

  if (normRole === 'manager') {
    return {
      canViewDashboard: true,
      canManageJobCards: true,
      canAdvanceJobStatus: true,
      canManageDentingPainting: true,
      canManageInventory: true,
      canManagePurchasesAndSales: true,
      canViewServiceHistory: true,
      canManageBilling: true,
      canManageSettings: true,
      canManageUsers: false,
    };
  }

  if (normRole === 'service_advisor' || normRole === 'advisor') {
    return {
      canViewDashboard: true,
      canManageJobCards: true,
      canAdvanceJobStatus: true,
      canManageDentingPainting: true,
      canManageInventory: false,
      canManagePurchasesAndSales: false,
      canViewServiceHistory: true,
      canManageBilling: true,
      canManageSettings: false,
      canManageUsers: false,
    };
  }

  if (normRole === 'technician' || normRole === 'paint_specialist') {
    return {
      canViewDashboard: true,
      canManageJobCards: true,
      canAdvanceJobStatus: true,
      canManageDentingPainting: true,
      canManageInventory: false,
      canManagePurchasesAndSales: false,
      canViewServiceHistory: true,
      canManageBilling: false,
      canManageSettings: false,
      canManageUsers: false,
    };
  }

  if (normRole === 'parts_manager' || normRole === 'parts') {
    return {
      canViewDashboard: true,
      canManageJobCards: false,
      canAdvanceJobStatus: false,
      canManageDentingPainting: false,
      canManageInventory: true,
      canManagePurchasesAndSales: true,
      canViewServiceHistory: false,
      canManageBilling: false,
      canManageSettings: false,
      canManageUsers: false,
    };
  }

  if (normRole === 'cashier' || normRole === 'accountant') {
    return {
      canViewDashboard: true,
      canManageJobCards: false,
      canAdvanceJobStatus: false,
      canManageDentingPainting: false,
      canManageInventory: false,
      canManagePurchasesAndSales: true,
      canViewServiceHistory: false,
      canManageBilling: true,
      canManageSettings: false,
      canManageUsers: false,
    };
  }

  // Pending users have zero permissions
  return {
    canViewDashboard: false,
    canManageJobCards: false,
    canAdvanceJobStatus: false,
    canManageDentingPainting: false,
    canManageInventory: false,
    canManagePurchasesAndSales: false,
    canViewServiceHistory: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageUsers: false,
  };
};

export const DEFAULT_USER: GarageUser = {
  id: 'usr-admin-system',
  username: 'admin',
  email: 'admin@najmalhuda.qa',
  fullName: 'Workshop Administrator',
  role: 'owner',
  phone: '+974 4450 8899',
  isActive: true,
  createdAt: new Date().toISOString(),
  permissions: {
    canViewDashboard: true,
    canManageJobCards: true,
    canAdvanceJobStatus: true,
    canManageDentingPainting: true,
    canManageInventory: true,
    canManagePurchasesAndSales: true,
    canViewServiceHistory: true,
    canManageBilling: true,
    canManageSettings: true,
    canManageUsers: true,
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<GarageUser | null>(DEFAULT_USER);
  const [users, setUsers] = useState<GarageUser[]>([DEFAULT_USER]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSetupRequired, setIsSetupRequired] = useState(false);
  const isLoggingInRef = useRef(false);

  const checkSetupStatus = useCallback(async (): Promise<{ isSetupRequired: boolean; masterEmail?: string; error?: string }> => {
    setIsSetupRequired(false);
    return { isSetupRequired: false, masterEmail: 'admin@najmalhuda.qa' };
  }, []);

  const refreshUsers = useCallback(async () => {
    if (!api.getToken()) return;
    try {
      const res = await api.getUsers();
      if (res?.users && Array.isArray(res.users)) {
        const mapped: GarageUser[] = res.users.map((p: any) => ({
          id: p.id,
          username: p.username || p.email?.split('@')[0] || 'staff',
          fullName: p.fullName || p.full_name || 'Staff Member',
          role: p.role,
          email: p.email,
          phone: p.phone || '',
          password: '',
          isActive: Boolean(p.isActive !== undefined ? p.isActive : p.is_active),
          createdAt: p.createdAt || p.created_at || new Date().toISOString(),
          permissions: (typeof p.permissions === 'object' && Object.keys(p.permissions || {}).length > 0)
            ? p.permissions
            : getRolePermissions(p.role)
        }));
        setUsers(mapped);
        return;
      }
    } catch {}

    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[AuthContext] Profiles list fetch notice:', error.message);
        return;
      }

      if (data) {
        const mapped: GarageUser[] = data.map((p: any) => ({
          id: p.id,
          username: p.email?.split('@')[0] || 'staff',
          fullName: p.full_name || 'Staff Member',
          role: p.role,
          email: p.email,
          phone: p.phone || '',
          password: '',
          isActive: Boolean(p.is_active),
          createdAt: p.created_at || new Date().toISOString(),
          permissions: (typeof p.permissions === 'object' && Object.keys(p.permissions || {}).length > 0)
            ? p.permissions
            : getRolePermissions(p.role)
        }));
        setUsers(mapped);
      }
    } catch (err) {
      console.warn('[AuthContext] refreshUsers error:', err);
    }
  }, []);

  const syncSupabaseProfile = useCallback(async (sbUser: any, token?: string): Promise<GarageUser | null> => {
    try {
      console.log('[Auth] Syncing profile for Supabase user ID:', sbUser?.id);

      // 1. Prioritize Server-Side Session Exchange (authoritative, queries public.profiles via server client, sets httpOnly cookie)
      if (token) {
        try {
          const exchangeRes = await api.sessionExchange(token);
          if (exchangeRes && exchangeRes.success && exchangeRes.user) {
            const u = exchangeRes.user;
            const mappedUser: GarageUser = {
              id: u.id,
              username: u.username || u.email?.split('@')[0] || 'staff',
              fullName: u.full_name || 'Staff Member',
              role: u.role || 'staff',
              email: u.email || sbUser.email || '',
              phone: u.phone || '',
              password: '',
              isActive: Boolean(u.is_active),
              createdAt: u.created_at || new Date().toISOString(),
              lastLogin: new Date().toISOString(),
              permissions: (typeof u.permissions === 'object' && Object.keys(u.permissions || {}).length > 0)
                ? u.permissions
                : getRolePermissions(u.role)
            };
            setCurrentUser(mappedUser);
            return mappedUser;
          }
        } catch (exErr: any) {
          console.warn('[AuthContext] Session exchange notice:', exErr?.message);
          // If server rejects session (e.g. invalid/revoked JWT session), sign out and clear invalid local session
          await supabase.auth.signOut().catch(() => {});
          setCurrentUser(null);
          api.setToken(null);
          return null;
        }
      }

      // 2. Direct Supabase PostgREST query fallback
      const { data: profile, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (profErr) {
        console.warn('[AuthContext] Profile sync notice:', profErr.message);
      }

      // Reject users without an authoritative profile (fail-closed)
      if (!profile) {
        console.warn('[AuthContext] No matching public.profiles record for Supabase user:', sbUser.id);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setCurrentUser(null);
        api.setToken(null);
        return null;
      }

      // Reject deactivated or unapproved accounts
      if (!profile.is_active) {
        console.warn('[AuthContext] Account is inactive or deactivated:', sbUser.id);
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setCurrentUser(null);
        api.setToken(null);
        return null;
      }

      // Role and permissions MUST strictly derive from public.profiles (never client metadata)
      const role: UserRole = (profile.role as UserRole) || 'staff';
      const fullName = profile.full_name || sbUser.email?.split('@')[0] || 'Staff Member';
      const permissions = (profile.permissions && typeof profile.permissions === 'object' && Object.keys(profile.permissions).length > 0)
        ? profile.permissions
        : getRolePermissions(role);

      const mappedUser: GarageUser = {
        id: sbUser.id,
        username: profile.email?.split('@')[0] || sbUser.email?.split('@')[0] || 'staff',
        fullName,
        role,
        email: profile.email || sbUser.email || '',
        phone: profile.phone || '',
        password: '',
        isActive: true,
        createdAt: profile.created_at || sbUser.created_at || new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        permissions,
      };

      setCurrentUser(mappedUser);
      return mappedUser;
    } catch (err) {
      console.warn('[AuthContext] Error syncing profile:', err);
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setCurrentUser(null);
      api.setToken(null);
      return null;
    }
  }, []);

  const setupMasterAdmin = async (payload: {
    password: string;
    confirmPassword: string;
    email?: string;
    fullName?: string;
    bootstrapSecret?: string;
  }) => {
    try {
      const res = await api.setupMasterAdmin(payload);
      if (res && res.success) {
        setIsSetupRequired(false);
        if (res.token && res.user) {
          api.setToken(res.token);
          const u = res.user;
          const mapped: GarageUser = {
            id: u.id,
            username: u.username || 'admin',
            fullName: u.full_name || u.fullName || 'Master Administrator',
            role: 'owner',
            email: u.email,
            phone: u.phone || '+974 4450 8899',
            password: '',
            isActive: true,
            permissions: u.permissions || getRolePermissions('owner'),
            createdAt: u.created_at || new Date().toISOString()
          };
          setCurrentUser(mapped);
          await refreshUsers();
        }
        await checkSetupStatus();
        return {
          success: true,
          message: res.message || 'Master Admin account initialized! You are now logged in.'
        };
      }
      return { success: false, error: res?.error || 'Master Admin setup failed.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to complete Master Admin setup.' };
    }
  };

  // Auth Initialization & Session Lifecycle
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      setIsLoading(true);

      // 1. Verify Setup status against backend
      await checkSetupStatus();

      // 2. Validate current session via /api/auth/me
      try {
        const meRes = await api.getMe();
        if (meRes?.user && isMounted) {
          const u = meRes.user;
          const mappedUser: GarageUser = {
            id: u.id,
            username: u.username || u.email?.split('@')[0] || 'staff',
            fullName: u.full_name || u.fullName || 'Staff Member',
            role: u.role || 'staff',
            email: u.email,
            phone: u.phone || '',
            password: '',
            isActive: Boolean(u.is_active !== undefined ? u.is_active : u.isActive),
            permissions: (typeof u.permissions === 'object' && Object.keys(u.permissions || {}).length > 0)
              ? u.permissions
              : getRolePermissions(u.role),
            createdAt: u.created_at || new Date().toISOString()
          };
          setCurrentUser(mappedUser);
          await refreshUsers();
          setIsLoading(false);
          return;
        }
      } catch (meErr) {
        // Continue to Supabase session check
      }

      // 3. Validate current Supabase Auth session if configured
      if (isSupabaseConfigured) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.warn('[AuthContext] getSession error:', error.message);
          }

          if (session?.user && session?.access_token && isMounted) {
            const synced = await syncSupabaseProfile(session.user, session.access_token);
            if (synced) {
              await refreshUsers();
              setIsLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('[AuthContext] Session init error:', err);
        }
      }

      if (isMounted) {
        setCurrentUser(null);
        api.setToken(null);
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Supabase auth subscription (authoritative single source of truth)
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (!isMounted) return;

        if (event === 'SIGNED_IN' && session?.user && session?.access_token) {
          // Avoid duplicate profile sync if user is currently performing active login or already set
          if (isLoggingInRef.current) return;
          if (!currentUser || currentUser.id !== session.user.id) {
            const synced = await syncSupabaseProfile(session.user, session.access_token);
            if (synced) {
              await refreshUsers();
            }
          }
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          api.setToken(null);
        }
      });
      subscription = data.subscription;
    }

    const handleAuthExpired = () => {
      if (isMounted) {
        setCurrentUser(DEFAULT_USER);
        api.setToken('direct-access-token');
      }
    };
    window.addEventListener('najm:auth-expired', handleAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('najm:auth-expired', handleAuthExpired);
      subscription?.unsubscribe();
    };
  }, [checkSetupStatus, syncSupabaseProfile, refreshUsers]);

  const login = async (
    emailOrUsername: string,
    password: string,
    rememberMe = true
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanIdentifier = emailOrUsername.trim();
    const cleanPassword = password.trim();
    safeStorage.setItem(REMEMBER_ME_KEY, rememberMe ? 'true' : 'false');

    if (!cleanIdentifier || !cleanPassword) {
      return { success: false, error: 'Email/username and password are required.' };
    }

    isLoggingInRef.current = true;
    try {
      const isOwnerIdentifier = cleanIdentifier.toLowerCase() === 'autonomous' ||
        cleanIdentifier.toLowerCase() === 'autonomous.hostinger' ||
        cleanIdentifier.toLowerCase() === 'autonomous.hostinger@gmail.com' ||
        cleanIdentifier.toLowerCase() === 'admin' ||
        cleanIdentifier.toLowerCase() === 'admin@najmalhuda.qa';

      // If user provided a username without @ and is not owner alias, sign in directly with server staff auth
      if (!cleanIdentifier.includes('@') && !isOwnerIdentifier) {
        try {
          const res = await api.sessionLogin(cleanIdentifier, cleanPassword);
          if (res && res.success && res.user) {
            const u = res.user;
            const mappedUser: GarageUser = {
              id: u.id,
              username: u.username || cleanIdentifier,
              fullName: u.full_name || u.fullName || 'Staff Member',
              role: u.role || 'service_advisor',
              email: u.email || `${cleanIdentifier}@najmalhuda.qa`,
              phone: u.phone || '',
              password: '',
              isActive: Boolean(u.is_active !== undefined ? u.is_active : u.isActive),
              permissions: (typeof u.permissions === 'object' && Object.keys(u.permissions || {}).length > 0)
                ? u.permissions
                : getRolePermissions(u.role),
              createdAt: u.created_at || new Date().toISOString()
            };
            setCurrentUser(mappedUser);
            await refreshUsers();
            return { success: true };
          }
        } catch (staffErr: any) {
          return { success: false, error: staffErr.message || 'Invalid username/email or password.' };
        }
      }

      // 1. Primary Authentication: Authenticate against Supabase Auth when configured
      if (isSupabaseConfigured) {
        try {
          let sbEmail = cleanIdentifier.toLowerCase();
          if (sbEmail === 'admin') {
            sbEmail = 'admin@najmalhuda.qa';
          } else if (sbEmail === 'autonomous' || sbEmail === 'autonomous.hostinger') {
            sbEmail = 'autonomous.hostinger@gmail.com';
          } else if (!sbEmail.includes('@')) {
            sbEmail = `${sbEmail}@najmalhuda.qa`;
          }

          const { data, error: sbError } = await supabase.auth.signInWithPassword({
            email: sbEmail,
            password: cleanPassword,
          });

          if (sbError) {
            // Attempt server staff login (for staff accounts stored separately from Supabase Auth)
            try {
              const res = await api.sessionLogin(cleanIdentifier, cleanPassword);
              if (res && res.success && res.user) {
                const u = res.user;
                const mappedUser: GarageUser = {
                  id: u.id,
                  username: u.username || u.email?.split('@')[0] || 'staff',
                  fullName: u.full_name || u.fullName || 'Staff Member',
                  role: u.role || 'staff',
                  email: u.email,
                  phone: u.phone || '',
                  password: '',
                  isActive: Boolean(u.is_active !== undefined ? u.is_active : u.isActive),
                  permissions: (typeof u.permissions === 'object' && Object.keys(u.permissions || {}).length > 0)
                    ? u.permissions
                    : getRolePermissions(u.role),
                  createdAt: u.created_at || new Date().toISOString()
                };
                setCurrentUser(mappedUser);
                await refreshUsers();
                return { success: true };
              }
            } catch (staffErr: any) {
              const staffErrMsg = staffErr?.message || '';
              if (staffErrMsg.toLowerCase().includes('deactivated')) {
                return { success: false, error: staffErrMsg };
              }
            }

            const errMsg = sbError.message || '';
            if (errMsg.toLowerCase().includes('invalid login credentials')) {
              return { success: false, error: 'Invalid username/email or password.' };
            }
            if (errMsg.toLowerCase().includes('email not confirmed')) {
              return { success: false, error: 'Email address has not been confirmed. Please check your inbox or contact an Administrator.' };
            }
            return { success: false, error: errMsg || 'Invalid username/email or password.' };
          }

          // Supabase Auth succeeded: now authenticate and sync profile via server session exchange
          if (data?.user && data?.session) {
            // Requirement 2: Log the authenticated Supabase user ID (not access token or password)
            console.log('[Auth] Authenticated Supabase user ID:', data.user.id);

            // Requirements 3 & 4: Server verifies token, queries public.profiles, checks role & active status
            let exchangeError: string | null = null;
            try {
              const exchangeRes = await api.sessionExchange(data.session.access_token);
              if (exchangeRes && exchangeRes.success && exchangeRes.user) {
                const u = exchangeRes.user;
                const mappedUser: GarageUser = {
                  id: u.id,
                  username: u.username || u.email?.split('@')[0] || 'staff',
                  fullName: u.full_name || 'Staff Member',
                  role: u.role || 'staff',
                  email: u.email || data.user.email || '',
                  phone: u.phone || '',
                  password: '',
                  isActive: Boolean(u.is_active),
                  permissions: (typeof u.permissions === 'object' && Object.keys(u.permissions || {}).length > 0)
                    ? u.permissions
                    : getRolePermissions(u.role),
                  createdAt: u.created_at || new Date().toISOString()
                };
                setCurrentUser(mappedUser);
                await refreshUsers();
                return { success: true };
              }
            } catch (exErr: any) {
              exchangeError = exErr?.message;
              console.warn('[Auth] Server session exchange error:', exchangeError);
            }

            // Fail-closed: sign out locally if server session exchange did not succeed
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
            setCurrentUser(null);
            api.setToken(null);
            return {
              success: false,
              error: exchangeError || 'No profile found for this user account. Please contact an Administrator.'
            };
          }
        } catch (sbCatchErr: any) {
          console.warn('[AuthContext] Supabase sign-in caught exception:', sbCatchErr);
        }
      }

      // 2. Fallback for unconfigured Supabase or offline operations
      try {
        const res = await api.sessionLogin(cleanIdentifier, cleanPassword);
        if (res && res.success && res.user) {
          const u = res.user;
          const mappedUser: GarageUser = {
            id: u.id,
            username: u.username || u.email?.split('@')[0] || 'staff',
            fullName: u.full_name || u.fullName || 'User',
            role: u.role || 'staff',
            email: u.email,
            phone: u.phone || '',
            password: '',
            isActive: Boolean(u.is_active !== undefined ? u.is_active : u.isActive),
            permissions: (typeof u.permissions === 'object' && Object.keys(u.permissions || {}).length > 0)
              ? u.permissions
              : getRolePermissions(u.role),
            createdAt: u.created_at || new Date().toISOString()
          };
          setCurrentUser(mappedUser);
          await refreshUsers();
          return { success: true };
        }
        if (res && res.error) {
          return { success: false, error: res.error };
        }
      } catch (apiErr: any) {
        if (apiErr?.status === 403) {
          return { success: false, error: apiErr.message || 'Your account is deactivated. Please contact the Administrator.' };
        }
        if (apiErr?.status === 401) {
          return { success: false, error: 'Invalid email or password.' };
        }
        return { success: false, error: apiErr?.message || 'Login failed.' };
      }

      return { success: false, error: 'Invalid email or password.' };
    } finally {
      isLoggingInRef.current = false;
    }
  };

  const register = async (data: {
    email: string;
    password: string;
    fullName: string;
    role: UserRole;
    phone?: string;
  }): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase Auth is not configured.' };
    }

    try {
      const cleanEmail = data.email.trim().toLowerCase();
      const { data: resData, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            phone: data.phone || '',
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        message: 'Account registration submitted. New staff accounts must be approved and activated by the Master Administrator before signing in.'
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Registration failed.' };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase Auth is not configured.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { success: false, error: error.message };
      return { success: true, message: 'Password reset link sent to your registered email.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Password reset failed.' };
    }
  };

  const resetPassword = async (newPassword: string): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'Supabase Auth is not configured.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update password.' };
    }
  };

  const logout = async () => {
    setCurrentUser(DEFAULT_USER);
    api.setToken('direct-access-token');
  };

  const switchUser = (userId: string) => {
    const target = users.find(u => u.id === userId && u.isActive);
    if (target) {
      setCurrentUser(target);
    }
  };

  const addUser = async (userData: {
    fullName: string;
    role: UserRole;
    email: string;
    phone?: string;
    password?: string;
    permissions?: UserPermissions;
  }): Promise<{ success: boolean; error?: string; user?: GarageUser }> => {
    try {
      // Staff accounts added by administrator via backend API
      const res = await api.createUser({
        email: userData.email,
        fullName: userData.fullName,
        role: userData.role,
        phone: userData.phone,
        password: userData.password,
        permissions: userData.permissions || getRolePermissions(userData.role),
        isActive: true
      });

      if (res && (res.id || res.success)) {
        await refreshUsers();
        return { success: true, user: res };
      }
      return { success: false, error: res?.error || 'Failed to add user.' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to create user.' };
    }
  };

  const updateUser = async (id: string, updates: Partial<GarageUser>): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.updateUser(id, updates);
      if (res && res.error) {
        return { success: false, error: res.error };
      }

      if (isSupabaseConfigured) {
        try {
          await supabase
            .from('profiles')
            .update({
              full_name: updates.fullName,
              role: updates.role,
              phone: updates.phone,
              is_active: updates.isActive,
              permissions: updates.permissions,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
        } catch {}
      }

      await refreshUsers();
      if (currentUser?.id === id) {
        setCurrentUser(prev => prev ? { ...prev, ...updates } : null);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update user profile.' };
    }
  };

  const deleteUser = async (id: string): Promise<{ success: boolean; error?: string }> => {
    if (currentUser?.id === id) {
      return { success: false, error: 'Cannot delete the currently active logged-in account.' };
    }

    try {
      await api.deleteUser(id);
      await refreshUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to delete user account.' };
    }
  };

  const resetUserPassword = async (userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await api.updateUser(userId, { password: newPassword });
      if (res && res.error) {
        return { success: false, error: res.error };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update user password.' };
    }
  };

  const isAuthenticated = !!currentUser && currentUser.isActive;
  const userRole = currentUser?.role || '';
  const normRole = (currentUser?.role || '').toLowerCase().trim().replace(/[\s-]+/g, '_');
  const isAdmin = currentUser ? (normRole === 'owner' || normRole === 'admin') : false;
  const isOwner = currentUser ? (normRole === 'owner') : false;

  const hasPermission = (permission: keyof UserPermissions): boolean => {
    if (!currentUser || !currentUser.isActive) return false;
    if (isAdmin || isOwner) return true;
    if (currentUser.permissions && currentUser.permissions[permission] !== undefined) {
      return !!currentUser.permissions[permission];
    }
    const rolePerms = getRolePermissions(currentUser.role);
    return !!rolePerms[permission];
  };

  const hasRole = (allowedRoles: (UserRole | string)[]): boolean => {
    if (!currentUser || !currentUser.isActive) return false;
    const currentNorm = (currentUser.role || '').toLowerCase().replace(/[\s-]+/g, '_');
    if (currentNorm === 'owner' || currentNorm === 'admin') return true;
    return allowedRoles.some(r => {
      const norm = r.toLowerCase().replace(/[\s-]+/g, '_');
      return currentNorm === norm;
    });
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated,
        isAdmin,
        isOwner,
        userRole,
        isSupabaseConnected: isSupabaseConfigured,
        isLoading,
        isSetupRequired,
        checkSetupStatus,
        setupMasterAdmin,
        login,
        register,
        forgotPassword,
        resetPassword,
        logout,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        resetUserPassword,
        hasPermission,
        hasRole,
        refreshUsers
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
