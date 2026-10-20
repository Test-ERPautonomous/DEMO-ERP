import React from 'react';
import { 
  LayoutDashboard, 
  Wrench, 
  Users, 
  Package, 
  Receipt, 
  BarChart3, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  Keyboard
} from 'lucide-react';
import { TabKey } from '../../App';

export interface WorkshopSidebarProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey, subTab?: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  onOpenNewJob: () => void;
  onOpenCheatSheet?: () => void;
  activeJobsCount: number;
  pendingInvoicesCount: number;
  lowStockCount: number;
  activeCompanyName: string;
  activeCompanyCode: string;
  userRole?: string;
  userName?: string;
  onOpenEstimation?: () => void;
  onOpenMaterialIssue?: () => void;
  onOpenCashReceipt?: () => void;
  onOpenCompanyManager?: () => void;
  onOpenEasyGuide?: () => void;
}

export const WorkshopSidebar: React.FC<WorkshopSidebarProps> = React.memo(({
  activeTab,
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile,
  onOpenNewJob,
  onOpenCheatSheet,
  activeJobsCount,
  pendingInvoicesCount,
  lowStockCount,
  activeCompanyName,
  userRole,
}) => {
  const isTechnician = userRole?.toLowerCase().includes('technician') || userRole?.toLowerCase().includes('paint');

  const isCurrent = (key: TabKey, aliases: TabKey[] = []) => {
    return activeTab === key || aliases.includes(activeTab);
  };

  // The 7 primary workflow sections as requested
  const navigationItems = [
    {
      key: 'dashboard' as TabKey,
      aliases: [],
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
      badgeColor: '',
      allowTechnician: true,
    },
    {
      key: 'jobs' as TabKey,
      aliases: ['work_orders' as TabKey, 'operations' as TabKey, 'technicians_bays' as TabKey, 'labor' as TabKey],
      label: 'Jobs',
      icon: Wrench,
      badge: activeJobsCount > 0 ? `${activeJobsCount}` : null,
      badgeColor: 'bg-sky-500 text-white',
      allowTechnician: true,
    },
    {
      key: 'customers' as TabKey,
      aliases: ['customers_vehicles' as TabKey, 'masters' as TabKey, 'history' as TabKey, 'utilities' as TabKey],
      label: 'Customers',
      icon: Users,
      badge: null,
      badgeColor: '',
      allowTechnician: true,
    },
    {
      key: 'inventory' as TabKey,
      aliases: ['parts_stock' as TabKey, 'purchasing' as TabKey, 'purchases' as TabKey],
      label: 'Parts & Stock',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount}` : null,
      badgeColor: 'bg-amber-500 text-white',
      allowTechnician: true,
    },
    {
      key: 'billing' as TabKey,
      aliases: ['invoices_payments' as TabKey, 'financial' as TabKey, 'financials' as TabKey],
      label: 'Billing',
      icon: Receipt,
      badge: pendingInvoicesCount > 0 ? `${pendingInvoicesCount}` : null,
      badgeColor: 'bg-emerald-500 text-white',
      allowTechnician: false,
    },
    {
      key: 'reports' as TabKey,
      aliases: [],
      label: 'Reports',
      icon: BarChart3,
      badge: null,
      badgeColor: '',
      allowTechnician: false,
    },
    {
      key: 'settings' as TabKey,
      aliases: ['control_panel' as TabKey, 'users' as TabKey],
      label: 'Settings',
      icon: Settings,
      badge: null,
      badgeColor: '',
      allowTechnician: false,
    },
  ].filter(item => !isTechnician || item.allowTechnician);

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 z-40 flex flex-col shrink-0 bg-sky-600 text-white border-r border-sky-500 transition-all duration-300 ease-in-out lg:static shadow-lg ${
          isMobileOpen 
            ? 'left-0 w-64 shadow-2xl' 
            : '-left-full lg:left-0'
        } ${
          isCollapsed ? 'lg:w-20' : 'lg:w-64'
        }`}
      >
        {/* Top Branding */}
        <div className="h-16 flex items-center justify-between px-3.5 border-b border-sky-500/80 bg-sky-700/60 shrink-0">
          <div className="flex items-center overflow-hidden">
            {isCollapsed ? (
              <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0 text-white font-black text-lg border border-white/20 shadow-xs">
                {activeCompanyName ? activeCompanyName.charAt(0).toUpperCase() : 'A'}
              </div>
            ) : (
              <div className="flex flex-col justify-center min-w-0 py-1">
                <span className="font-black text-white text-base tracking-wide leading-tight uppercase truncate">
                  AUTONOMOUS
                </span>
                <span className="text-[10px] font-bold text-sky-200 tracking-widest uppercase truncate mt-0.5">
                  GARAGE &amp; SCRAP
                </span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-sky-100 hover:text-white hover:bg-sky-500/60 transition-colors cursor-pointer"
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Workshop Banner */}
        <div className="px-3.5 py-2 border-b border-sky-500/80 bg-sky-700/40 shrink-0">
          {!isCollapsed ? (
            <div className="text-left">
              <span className="text-[10px] text-sky-100 font-medium block truncate">
                Automotive Workshop Management System
              </span>
            </div>
          ) : (
            <div className="text-center text-[10px] font-mono text-white font-bold bg-sky-700/60 py-0.5 rounded">
              ERP
            </div>
          )}
        </div>

        {/* Navigation Links Scrollable Area - The 7 Clean Sections */}
        <div className="flex-1 overflow-y-auto px-2.5 py-3 space-y-1 custom-scrollbar">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isCurrent(item.key, item.aliases);
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectTab(item.key);
                  if (window.innerWidth < 1024) onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer group relative transition-all duration-200 ease-out ${
                  active
                    ? 'bg-white text-sky-800 font-bold shadow-md shadow-sky-950/20 hover:bg-sky-50 hover:text-sky-900 hover:scale-[1.02] active:scale-[0.98]'
                    : 'text-sky-50 hover:text-white hover:bg-sky-500/60 hover:shadow-xs hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]'
                } ${isCollapsed ? 'justify-center px-2' : ''}`}
                title={isCollapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-all duration-200 group-hover:scale-115 ${
                  active ? 'text-sky-600' : 'text-sky-200 group-hover:text-white'
                }`} />
                
                {!isCollapsed && (
                  <span className="flex-1 text-left truncate transition-colors duration-200">{item.label}</span>
                )}

                {!isCollapsed && item.badge && (
                  <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full transition-transform duration-200 group-hover:scale-105 ${
                    active ? 'bg-sky-100 text-sky-800 border border-sky-200' : 'bg-sky-700 text-sky-100 border border-sky-400/40'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-white shadow-xs transition-transform duration-200 group-hover:scale-125" />
                )}
              </button>
            );
          })}
        </div>

        {/* Bottom Primary Action: + New Job Card */}
        <div className="p-3 border-t border-sky-500/80 bg-sky-700/60 shrink-0 space-y-2">
          {!isCollapsed ? (
            <button
              onClick={() => {
                onOpenNewJob();
                if (window.innerWidth < 1024) onCloseMobile();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-white hover:bg-sky-50 text-sky-700 hover:text-sky-800 text-xs font-bold shadow-md shadow-sky-950/20 hover:shadow-lg hover:scale-[1.02] flex items-center justify-center cursor-pointer transition-all duration-200 ease-out active:scale-[0.98]"
            >
              <span>+ New Job Card</span>
            </button>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  onOpenNewJob();
                  if (window.innerWidth < 1024) onCloseMobile();
                }}
                className="w-10 h-10 mx-auto rounded-xl bg-white hover:bg-sky-50 text-sky-700 hover:text-sky-800 flex items-center justify-center shadow-md hover:shadow-lg cursor-pointer transition-all duration-200 ease-out hover:scale-105 active:scale-95"
                title="New Job Card"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
});
