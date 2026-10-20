import React, { useState } from 'react';
import { Search, Plus, ShoppingCart, Bell, User, Shield, Wrench, FileText, Receipt, Layers, RefreshCw } from 'lucide-react';
import { HeaderLogoBadge } from './Common/HeaderLogoBadge';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenCounterSale: () => void;
  onOpenJobCardModal: () => void;
  onOpenInvoiceModal: () => void;
  onOpenEstimateModal: () => void;
  onRefresh: () => void;
  activeRole: string;
  setActiveRole: (role: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenCounterSale,
  onOpenJobCardModal,
  onOpenInvoiceModal,
  onOpenEstimateModal,
  onRefresh,
  activeRole,
  setActiveRole
}) => {
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30 shadow-md gap-4">
      {/* Photo Logo Badge */}
      <HeaderLogoBadge size="md" showText={true} className="text-white" />

      {/* Search Bar */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-4 py-2 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-lg text-slate-400 text-sm transition-colors group"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
            <span>Search jobs, vehicles, customers, parts (Ctrl+K)...</span>
          </span>
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded border border-slate-600 font-mono">
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Action Buttons & Profile */}
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          title="Refresh Data"
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Counter Sale Quick Button */}
        <button
          onClick={onOpenCounterSale}
          className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          <span className="hidden sm:inline">Parts Sell</span>
        </button>

        {/* Quick Actions Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickMenu(!showQuickMenu)}
            className="flex items-center gap-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Actions</span>
          </button>

          {showQuickMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-50 text-sm text-slate-200"
              onClick={() => setShowQuickMenu(false)}
            >
              <button
                onClick={onOpenJobCardModal}
                className="w-full text-left px-4 py-2 hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
              >
                <Wrench className="w-4 h-4 text-amber-400" />
                <span>New Job Card</span>
              </button>
              <button
                onClick={onOpenInvoiceModal}
                className="w-full text-left px-4 py-2 hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
              >
                <Receipt className="w-4 h-4 text-blue-400" />
                <span>New Invoice</span>
              </button>
              <button
                onClick={onOpenEstimateModal}
                className="w-full text-left px-4 py-2 hover:bg-slate-700/60 flex items-center gap-2.5 transition-colors"
              >
                <FileText className="w-4 h-4 text-purple-400" />
                <span>New Estimate</span>
              </button>
            </div>
          )}
        </div>

        {/* Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-sm text-slate-200 transition-colors"
          >
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="capitalize">{activeRole}</span>
          </button>

          {showRoleMenu && (
            <div
              className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 z-50 text-sm text-slate-200"
              onClick={() => setShowRoleMenu(false)}
            >
              {['admin', 'manager', 'cashier', 'technician'].map((role) => (
                <button
                  key={role}
                  onClick={() => setActiveRole(role)}
                  className={`w-full text-left px-4 py-2 hover:bg-slate-700/60 capitalize flex items-center justify-between ${
                    activeRole === role ? 'text-blue-400 font-semibold' : ''
                  }`}
                >
                  <span>{role}</span>
                  {activeRole === role && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
