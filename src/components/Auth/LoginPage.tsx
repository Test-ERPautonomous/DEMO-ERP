import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Lock, 
  User, 
  AlertCircle, 
  Info,
  CheckCircle2,
  ShieldCheck,
  Eye, 
  EyeOff, 
  ArrowRight,
  KeyRound,
  UserPlus
} from 'lucide-react';

interface Props {
  onNavigate: (route: string) => void;
}

export const LoginPage: React.FC<Props> = ({ onNavigate }) => {
  const { login, isSetupRequired, checkSetupStatus, setupMasterAdmin } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'setup'>('login');
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Setup Form State
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupEmail, setSetupEmail] = useState('admin@najmalhuda.qa');
  const [showSetupPassword, setShowSetupPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionExpiredNotice, setSessionExpiredNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    checkSetupStatus().then(res => {
      if (res?.isSetupRequired) {
        setActiveTab('setup');
      } else {
        setActiveTab('login');
      }
    });

    const handleAuthExpired = () => {
      setSessionExpiredNotice('Your session has expired. Please sign in again.');
    };
    window.addEventListener('najm:auth-expired', handleAuthExpired);
    return () => window.removeEventListener('najm:auth-expired', handleAuthExpired);
  }, [checkSetupStatus]);

  // Real-time Password Strength Criteria
  const hasMinLength = setupPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(setupPassword);
  const hasLowercase = /[a-z]/.test(setupPassword);
  const hasNumberOrSymbol = /[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(setupPassword);
  const isMatch = setupPassword.length > 0 && setupPassword === setupConfirmPassword;
  const isPasswordValid = hasMinLength && hasUppercase && hasLowercase && hasNumberOrSymbol;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setSessionExpiredNotice(null);

    setIsSubmitting(true);

    const cleanEmailOrUser = emailOrUsername.trim();
    const cleanPassword = password.trim();

    try {
      const result = await login(cleanEmailOrUser, cleanPassword, false);
      if (result.success) {
        onNavigate('/app');
      } else {
        setErrorMessage(result.error || 'Invalid username or password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during login.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!isPasswordValid) {
      setErrorMessage('Please ensure all password strength requirements are met.');
      return;
    }

    if (!isMatch) {
      setErrorMessage('Password and confirmation password do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await setupMasterAdmin({
        password: setupPassword,
        confirmPassword: setupConfirmPassword,
        email: setupEmail.trim() || 'admin@najmalhuda.qa',
        fullName: 'Master Administrator'
      });

      if (res.success) {
        setSuccessMessage('Master Admin account created successfully! Signing in...');
        setSetupPassword('');
        setSetupConfirmPassword('');
        onNavigate('/app');
      } else {
        setErrorMessage(res.error || 'Failed to complete Master Admin setup.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during setup.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-400 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="w-full max-w-sm sm:max-w-md">
        
        {/* Brand Header */}
        <div className="text-center mb-6 text-white space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 text-white shadow-lg mb-2">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-xs">
            Najm Al Huda Garage ERP
          </h1>
          <p className="text-xs text-sky-100 font-medium">
            Automotive Workshop & Fleet Management System
          </p>
        </div>

        <div className="bg-white rounded-2xl p-7 sm:p-8 shadow-2xl space-y-5 border border-sky-200">
          
          {/* Tab Selection when Setup is Required */}
          {isSetupRequired && (
            <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
              <button
                type="button"
                onClick={() => { setActiveTab('setup'); setErrorMessage(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'setup'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Set Up Master Admin</span>
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase animate-pulse">
                  Required
                </span>
              </button>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'login'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            </div>
          )}

          {sessionExpiredNotice && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{sessionExpiredNotice}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* VIEW A: FIRST-TIME MASTER ADMIN SETUP FORM */}
          {activeTab === 'setup' && isSetupRequired ? (
            <form onSubmit={handleSetupSubmit} className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 flex items-start gap-2 text-sky-900 text-xs">
                <KeyRound className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Initial Master Admin Setup</p>
                  <p className="text-[11px] text-sky-700">Configure a secure password for the fixed Master Admin account (<strong className="font-mono">ADMIN</strong>). This credential is required to manage users and system security.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master Admin Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4 text-slate-500" />
                  </div>
                  <input
                    type="text"
                    disabled
                    value="ADMIN"
                    className="w-full bg-slate-100 border border-slate-300 rounded-xl pl-9 pr-20 py-2.5 text-xs text-slate-900 font-bold font-mono cursor-not-allowed"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-[10px] font-extrabold text-sky-700 uppercase">
                    Fixed Role
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Master Admin Email
                </label>
                <input
                  type="email"
                  required
                  value={setupEmail}
                  onChange={e => setSetupEmail(e.target.value)}
                  placeholder="admin@najmalhuda.qa"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  New Master Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    required
                    value={setupPassword}
                    onChange={e => setSetupPassword(e.target.value)}
                    placeholder="Enter strong password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Confirm Master Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    required
                    value={setupConfirmPassword}
                    onChange={e => setSetupConfirmPassword(e.target.value)}
                    placeholder="Confirm strong password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Password Strength Validation List */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-1 text-[11px]">
                <p className="font-bold text-slate-700 mb-1">Password Requirements:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                  <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>8+ Characters</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasUppercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasUppercase ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Uppercase (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasLowercase ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasLowercase ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Lowercase (a-z)</span>
                  </div>
                  <div className={`flex items-center gap-1.5 ${hasNumberOrSymbol ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumberOrSymbol ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Number / Symbol</span>
                  </div>
                  <div className={`flex items-center gap-1.5 col-span-1 sm:col-span-2 ${isMatch ? 'text-emerald-700 font-bold' : 'text-slate-500'}`}>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !isPasswordValid || !isMatch}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Create Master Admin Account</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            
            /* VIEW B: STANDARD USER SIGN IN FORM */
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email or Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={emailOrUsername}
                    onChange={e => setEmailOrUsername(e.target.value)}
                    placeholder="autonomous.hostinger@gmail.com or username"
                    autoFocus
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 px-0.5">
                  <span className="text-[11px] text-slate-500">
                    Owner:{' '}
                    <button
                      type="button"
                      onClick={() => setEmailOrUsername('autonomous.hostinger@gmail.com')}
                      className="text-sky-600 font-semibold hover:underline cursor-pointer"
                    >
                      autonomous.hostinger@gmail.com
                    </button>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
              >
                {isSubmitting ? (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onNavigate('/forgot-password')}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-semibold hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('/register')}
                  className="text-[11px] text-slate-500 hover:text-slate-700 font-medium hover:underline cursor-pointer"
                >
                  Register staff account
                </button>
              </div>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};


