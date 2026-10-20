import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { GarageUser, UserRole } from '../../types';
import { 
  User, 
  ChevronDown, 
  LogOut, 
  Shield, 
  Users, 
  Check, 
  Lock,
  ArrowRightLeft
} from 'lucide-react';

interface Props {
  onNavigateToUsers?: () => void;
}

export const UserNavDropdown: React.FC<Props> = ({ onNavigateToUsers }) => {
  const { currentUser, users, switchUser, logout, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isSwitchMenuOpen, setIsSwitchMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSwitchMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!currentUser) return null;

  const roleColors: Record<UserRole, { badge: string; avatar: string }> = {
    'Admin': { badge: 'bg-amber-950 text-amber-300 border-amber-800', avatar: 'bg-amber-600 text-white' },
    'Service Advisor': { badge: 'bg-blue-950 text-blue-300 border-blue-800', avatar: 'bg-blue-600 text-white' },
    'Workshop Supervisor': { badge: 'bg-indigo-950 text-indigo-300 border-indigo-800', avatar: 'bg-indigo-600 text-white' },
    'Paint & Dent Specialist': { badge: 'bg-purple-950 text-purple-300 border-purple-800', avatar: 'bg-purple-600 text-white' },
    'Parts Manager': { badge: 'bg-emerald-950 text-emerald-300 border-emerald-800', avatar: 'bg-emerald-600 text-white' },
    'Cashier': { badge: 'bg-teal-950 text-teal-300 border-teal-800', avatar: 'bg-teal-600 text-white' },
    'owner': { badge: 'bg-amber-950 text-amber-300 border-amber-800', avatar: 'bg-amber-600 text-white' },
    'manager': { badge: 'bg-indigo-950 text-indigo-300 border-indigo-800', avatar: 'bg-indigo-600 text-white' },
    'service_advisor': { badge: 'bg-blue-950 text-blue-300 border-blue-800', avatar: 'bg-blue-600 text-white' },
    'technician': { badge: 'bg-sky-950 text-sky-300 border-sky-800', avatar: 'bg-sky-600 text-white' },
    'parts_manager': { badge: 'bg-emerald-950 text-emerald-300 border-emerald-800', avatar: 'bg-emerald-600 text-white' },
    'cashier': { badge: 'bg-teal-950 text-teal-300 border-teal-800', avatar: 'bg-teal-600 text-white' },
    'customer': { badge: 'bg-slate-950 text-slate-300 border-slate-800', avatar: 'bg-slate-600 text-white' },
  };

  const currentRoleStyle = roleColors[currentUser.role] || { badge: 'bg-slate-800 text-slate-300 border-slate-700', avatar: 'bg-slate-600 text-white' };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition-colors cursor-pointer"
      >
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${currentRoleStyle.avatar}`}>
          {currentUser.fullName.charAt(0)}
        </div>
        <div className="hidden sm:block leading-none">
          <div className="text-xs font-bold text-white flex items-center gap-1.5">
            <span>{currentUser.fullName.split(' ')[0]}</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-semibold border ${currentRoleStyle.badge}`}>
              {currentUser.role}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">
            @{currentUser.username}
          </span>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-2 z-50 text-xs">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-800">
            <p className="text-white font-bold text-sm truncate">{currentUser.fullName}</p>
            <p className="text-slate-400 text-[11px] font-mono">{currentUser.email}</p>
            <div className="mt-2 flex items-center gap-2">
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${currentRoleStyle.badge}`}>
                {currentUser.role}
              </span>
              {isAdmin && (
                <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                  <Shield className="w-3 h-3" /> Full Privileges
                </span>
              )}
            </div>
          </div>

          {/* Quick Switch User Option */}
          <div className="p-1 border-b border-slate-800">
            <button
              onClick={() => setIsSwitchMenuOpen(!isSwitchMenuOpen)}
              className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <span>Switch Staff User</span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isSwitchMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSwitchMenuOpen && (
              <div className="mt-1 space-y-1 pl-2 pr-1 max-h-48 overflow-y-auto">
                {users.map(u => {
                  const isSelected = u.id === currentUser.id;
                  return (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg flex items-center justify-between text-[11px] transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                      }`}
                    >
                      <div className="truncate pr-2">
                        <span>{u.fullName}</span>
                        <span className="text-[10px] text-slate-400 block font-normal font-mono">
                          {u.role}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Admin user management link */}
          {isAdmin && onNavigateToUsers && (
            <div className="p-1 border-b border-slate-800">
              <button
                onClick={() => {
                  onNavigateToUsers();
                  setIsOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Staff &amp; Access Controls</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
