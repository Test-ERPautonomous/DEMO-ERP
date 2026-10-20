import React, { useState } from 'react';
import { useAuth, getRolePermissions } from '../../context/AuthContext';
import { GarageUser, UserRole, UserPermissions, GarageSettings } from '../../types';
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Key, 
  Check, 
  X, 
  Edit2, 
  Trash2, 
  Lock, 
  CheckCircle2, 
  AlertCircle, 
  Phone, 
  Mail, 
  Clock, 
  Search,
  Filter,
  Shield,
  Eye,
  EyeOff
} from 'lucide-react';

interface Props {
  settings: GarageSettings;
}

const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  'Admin': {
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
  },
  'Service Advisor': {
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
  },
  'Workshop Supervisor': {
    canViewDashboard: true,
    canManageJobCards: true,
    canAdvanceJobStatus: true,
    canManageDentingPainting: true,
    canManageInventory: true,
    canManagePurchasesAndSales: false,
    canViewServiceHistory: true,
    canManageBilling: false,
    canManageSettings: false,
    canManageUsers: false,
  },
  'Paint & Dent Specialist': {
    canViewDashboard: true,
    canManageJobCards: true,
    canAdvanceJobStatus: true,
    canManageDentingPainting: true,
    canManageInventory: false,
    canManagePurchasesAndSales: false,
    canViewServiceHistory: false,
    canManageBilling: false,
    canManageSettings: false,
    canManageUsers: false,
  },
  'Parts Manager': {
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
  },
  'Cashier': {
    canViewDashboard: true,
    canManageJobCards: false,
    canAdvanceJobStatus: false,
    canManageDentingPainting: false,
    canManageInventory: false,
    canManagePurchasesAndSales: true,
    canViewServiceHistory: true,
    canManageBilling: true,
    canManageSettings: false,
    canManageUsers: false,
  },
  'owner': {
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
  },
  'manager': {
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
  },
  'service_advisor': {
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
  },
  'technician': {
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
  },
  'parts_manager': {
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
  },
  'cashier': {
    canViewDashboard: true,
    canManageJobCards: false,
    canAdvanceJobStatus: false,
    canManageDentingPainting: false,
    canManageInventory: false,
    canManagePurchasesAndSales: true,
    canViewServiceHistory: true,
    canManageBilling: true,
    canManageSettings: false,
    canManageUsers: false,
  },
  'customer': {
    canViewDashboard: true,
    canManageJobCards: false,
    canAdvanceJobStatus: false,
    canManageDentingPainting: false,
    canManageInventory: false,
    canManagePurchasesAndSales: false,
    canViewServiceHistory: true,
    canManageBilling: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};

const PERMISSION_LABELS: { key: keyof UserPermissions; label: string; desc: string }[] = [
  { key: 'canViewDashboard', label: 'Dashboard Access', desc: 'View workshop analytics, active cars & KPIs' },
  { key: 'canManageJobCards', label: 'Manage Job Cards', desc: 'Create, edit and inspect customer work orders' },
  { key: 'canAdvanceJobStatus', label: 'Advance Job Stage', desc: 'Move vehicles between Draft, In Progress, Paint, Delivered' },
  { key: 'canManageDentingPainting', label: 'Body & Paint Booth', desc: 'Inspect panels, dent repair actions & paint booth queue' },
  { key: 'canManageInventory', label: 'Inventory & Stock', desc: 'View parts, adjust stock levels & reorder alerts' },
  { key: 'canManagePurchasesAndSales', label: 'Purchases & Sales', desc: 'Issue vendor purchase orders and OTC counter sales' },
  { key: 'canViewServiceHistory', label: 'Vehicle Dossiers', desc: 'Query past repair history and customer records' },
  { key: 'canManageBilling', label: 'Invoices & Payments', desc: 'Generate workshop invoices, record split payments and receipts' },
  { key: 'canManageSettings', label: 'Workshop Settings', desc: 'Edit labor rates, Qatar CR number, company profile, address' },
  { key: 'canManageUsers', label: 'Admin User Control', desc: 'Create user accounts, set passwords, grant permissions' },
];

export const UserManager: React.FC<Props> = ({ settings }) => {
  const { currentUser, users, addUser, updateUser, deleteUser, resetUserPassword } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<GarageUser | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<GarageUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    role: 'Service Advisor' as UserRole,
    email: '',
    phone: '+974 ',
    password: '',
    permissions: DEFAULT_ROLE_PERMISSIONS['Service Advisor'],
  });

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleOpenAddModal = () => {
    setModalError(null);
    setFormData({
      fullName: '',
      username: '',
      role: 'Service Advisor',
      email: '',
      phone: '+974 ',
      password: '',
      permissions: { ...DEFAULT_ROLE_PERMISSIONS['Service Advisor'] },
    });
    setIsAddModalOpen(true);
  };

  const handleRoleChange = (newRole: UserRole) => {
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[newRole] || getRolePermissions(newRole);
    setFormData(prev => ({
      ...prev,
      role: newRole,
      permissions: { ...defaultPerms },
    }));
  };

  const handleTogglePermission = (key: keyof UserPermissions) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !prev.permissions[key],
      },
    }));
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const result = await addUser({
      fullName: formData.fullName,
      username: formData.username,
      role: formData.role,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      permissions: formData.permissions,
    });

    if (!result.success) {
      setModalError(result.error || 'Failed to create user account.');
      return;
    }

    setIsAddModalOpen(false);
    showNotification(`User "${formData.fullName}" created successfully.`);
  };

  const handleOpenEdit = (u: GarageUser) => {
    setModalError(null);
    setEditingUser(u);
    setFormData({
      fullName: u.fullName,
      username: u.username,
      role: u.role,
      email: u.email,
      phone: u.phone || '+974 ',
      password: u.password,
      permissions: { ...u.permissions },
    });
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setModalError(null);

    const result = await updateUser(editingUser.id, {
      fullName: formData.fullName,
      username: formData.username,
      role: formData.role,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      permissions: formData.permissions,
    });

    if (!result.success) {
      setModalError(result.error || 'Failed to update user.');
      return;
    }

    setEditingUser(null);
    showNotification(`User "${formData.fullName}" updated successfully.`);
  };

  const handleDelete = async (u: GarageUser) => {
    if (u.role === 'owner') {
      alert('The workshop Owner account cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete staff account "${u.fullName}" (@${u.username})?`)) {
      const res = await deleteUser(u.id);
      if (!res.success) {
        alert(res.error);
      } else {
        showNotification(`Staff account "${u.fullName}" deleted.`);
      }
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser) return;
    const res = await resetUserPassword(passwordResetUser.id, newPassword);
    if (!res.success) {
      alert(res.error);
      return;
    }
    setPasswordResetUser(null);
    setNewPassword('');
    showNotification(`Password for "${passwordResetUser.fullName}" updated successfully.`);
  };

  const handleToggleActive = async (u: GarageUser) => {
    if (u.id === currentUser?.id || u.role === 'owner') {
      alert('The workshop Owner account cannot be deactivated.');
      return;
    }
    await updateUser(u.id, { isActive: !u.isActive });
    showNotification(`Staff account "${u.fullName}" marked as ${!u.isActive ? 'Active' : 'Deactivated'}.`);
  };

  // Filter users
  const filteredUsers = (users || []).filter(u => {
    if (!u) return false;
    const query = (searchQuery || '').trim().toLowerCase();
    const fullName = (u.fullName || '').toLowerCase();
    const username = (u.username || '').toLowerCase();
    const email = (u.email || '').toLowerCase();
    const phone = u.phone || '';

    const matchesSearch = !query ||
      fullName.includes(query) ||
      username.includes(query) ||
      email.includes(query) ||
      phone.includes(query);

    const matchesRole = roleFilter === 'all' || u.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-emerald-900 border border-emerald-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 text-xs animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header & Access Control Notice */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Team Access &amp; User Permissions
                <span className="text-[11px] font-normal px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono font-semibold">
                  Admin Control Panel
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Manage workshop users, passwords, roles, and granular module access options.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenAddModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create New User</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Total Staff Accounts</span>
          <p className="text-2xl font-bold font-mono text-slate-900 mt-1">{users.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Active Accounts</span>
          <p className="text-2xl font-bold font-mono text-emerald-600 mt-1">
            {users.filter(u => u.isActive).length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Administrators</span>
          <p className="text-2xl font-bold font-mono text-indigo-600 mt-1">
            {users.filter(u => u.role === 'Admin').length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <span className="text-xs text-slate-500 font-medium">Service &amp; Tech Staff</span>
          <p className="text-2xl font-bold font-mono text-purple-600 mt-1">
            {users.filter(u => u.role !== 'Admin').length}
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search staff by name, user, phone..."
            value={searchQuery ?? ''}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter ?? ''}
            onChange={e => setRoleFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 font-medium text-slate-700"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owners</option>
            <option value="Admin">Administrators</option>
            <option value="manager">Service Managers</option>
            <option value="Service Advisor">Service Advisors</option>
            <option value="technician">Technicians</option>
            <option value="Workshop Supervisor">Workshop Supervisors</option>
            <option value="Paint & Dent Specialist">Paint &amp; Dent Specialists</option>
            <option value="Parts Manager">Parts Managers</option>
            <option value="accountant">Accountants</option>
            <option value="Cashier">Cashiers</option>
          </select>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                <th className="py-3.5 px-4">Staff Member</th>
                <th className="py-3.5 px-4">Role &amp; Credentials</th>
                <th className="py-3.5 px-4">Contact (Qatar)</th>
                <th className="py-3.5 px-4">Module Permissions</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredUsers.map(u => {
                const isCurrent = u.id === currentUser?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Member */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                          u.role === 'Admin'
                            ? 'bg-amber-100 text-amber-800'
                            : u.role === 'Service Advisor'
                            ? 'bg-blue-100 text-blue-800'
                            : u.role === 'Paint & Dent Specialist'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-200 text-slate-800'
                        }`}>
                          {u.fullName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.fullName}</span>
                            {isCurrent && (
                              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-semibold px-1.5 py-0.2 rounded">
                                (You)
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role & Auth */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold ${
                          u.role === 'Admin'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : u.role === 'Service Advisor'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : u.role === 'Paint & Dent Specialist'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          {u.role}
                        </span>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Key className="w-3 h-3 text-slate-400" />
                          <span>Password: <span className="font-mono text-slate-700 font-medium">••••••</span></span>
                        </div>
                      </div>
                    </td>

                    {/* Contact */}
                    <td className="py-3 px-4 text-slate-600">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-slate-800">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[170px]">{u.email}</span>
                        </div>
                        {u.phone && (
                          <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Permissions summary */}
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {u.role === 'Admin' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[10px]">
                            Full System Access (10/10)
                          </span>
                        ) : (
                          <>
                            {u.permissions.canManageJobCards && (
                              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px]">Jobs</span>
                            )}
                            {u.permissions.canManageDentingPainting && (
                              <span className="px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 text-[10px]">Paint/Dent</span>
                            )}
                            {u.permissions.canManageInventory && (
                              <span className="px-1.5 py-0.2 rounded bg-amber-50 text-amber-700 text-[10px]">Inventory</span>
                            )}
                            {u.permissions.canManagePurchasesAndSales && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 text-[10px]">Purchases</span>
                            )}
                            {u.permissions.canManageBilling && (
                              <span className="px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 text-[10px]">Billing</span>
                            )}
                            {u.permissions.canManageSettings && (
                              <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 text-[10px]">Settings</span>
                            )}
                          </>
                        )}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggleActive(u)}
                        disabled={isCurrent || u.role === 'owner'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                          u.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                        } ${isCurrent || u.role === 'owner' ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        <span>{u.isActive ? 'Active' : 'Deactivated'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setPasswordResetUser(u);
                            setNewPassword('');
                          }}
                          title="Reset Password"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User & Permissions"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {!isCurrent && u.role !== 'owner' && (
                          <button
                            onClick={() => handleDelete(u)}
                            title="Delete User"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT USER MODAL */}
      {(isAddModalOpen || editingUser) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  {editingUser ? <Edit2 className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    {editingUser ? `Edit Staff Account: ${editingUser.fullName}` : 'Create New Staff User & Access'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assign role, password, and specify module authorization
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={editingUser ? handleUpdateUser : handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.fullName || ''}
                    onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                    placeholder="e.g. Mohammed Al-Kuwari"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Username * (Login Identifier)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.username || ''}
                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                    placeholder="e.g. mkuwari"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    User Role *
                  </label>
                  <select
                    value={formData.role || 'Service Advisor'}
                    onChange={e => handleRoleChange(e.target.value as UserRole)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-medium"
                  >
                    {editingUser?.role === 'owner' && (
                      <option value="owner">Owner (Supabase Auth)</option>
                    )}
                    <option value="manager">Service Manager (Operations &amp; Approvals)</option>
                    <option value="Service Advisor">Service Advisor (Reception &amp; Jobs)</option>
                    <option value="technician">Technician (Mechanical Bays &amp; Jobs)</option>
                    <option value="Workshop Supervisor">Workshop Supervisor (Mechanical Bays)</option>
                    <option value="Paint & Dent Specialist">Paint &amp; Dent Specialist (Bodywork &amp; Paint)</option>
                    <option value="Parts Manager">Parts Manager (Store &amp; Inventory)</option>
                    <option value="accountant">Accountant (Financials &amp; Ledgers)</option>
                    <option value="Cashier">Cashier (Billing &amp; Payments)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.password || ''}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Minimum 4 characters"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={formData.email || ''}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    placeholder="name@workshop.qa"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Qatar Phone Number
                  </label>
                  <input
                    type="text"
                    value={formData.phone || ''}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+974 5512 3456"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>

              {/* Granular Module Permission Options */}
              <div className="pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-indigo-600" />
                    Granular Access Options for this User
                  </span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, permissions: { ...DEFAULT_ROLE_PERMISSIONS[formData.role] } })}
                    className="text-[11px] text-indigo-600 hover:underline font-medium"
                  >
                    Reset to Role Defaults
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {PERMISSION_LABELS.map(p => {
                    const checked = formData.permissions[p.key];
                    return (
                      <label
                        key={p.key}
                        className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200/80 hover:border-indigo-300 transition-colors cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => handleTogglePermission(p.key)}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                        />
                        <div className="text-[11px]">
                          <span className="font-semibold text-slate-900 block">{p.label}</span>
                          <span className="text-slate-500 text-[10px] leading-tight block">{p.desc}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RESET MODAL */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-xs">Reset User Password</h3>
                  <p className="text-[11px] text-slate-500">{passwordResetUser.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Security Password
                </label>
                <input
                  type="text"
                  required
                  value={newPassword ?? ''}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 4 chars)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
