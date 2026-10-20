import React from 'react';
import {
  LayoutDashboard,
  Wrench,
  Users,
  Car,
  Package,
  Receipt,
  FileText,
  BarChart3,
  Settings,
  Grid,
  Truck,
  Paintbrush,
  Clock
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  garageName?: string;
  garageNameAr?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  garageName = 'NAJM AL HUDA GARAGE',
  garageNameAr = 'ورشة نجم الهدى'
}) => {
  const navSections = [
    {
      title: 'Main Operations',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'jobs', label: 'Job Cards & Work Orders', icon: Wrench },
        { id: 'bays', label: 'Repair Bays & Live Floor', icon: Grid }
      ]
    },
    {
      title: 'Parts & Stock',
      items: [
        { id: 'inventory', label: 'Spare Parts Inventory', icon: Package },
        { id: 'purchase-orders', label: 'Purchase Orders & GRN', icon: Truck }
      ]
    },
    {
      title: 'Sales & Financials',
      items: [
        { id: 'invoices', label: 'Invoices & Billing', icon: Receipt },
        { id: 'estimates', label: 'Estimates / Proforma', icon: FileText },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 }
      ]
    },
    {
      title: 'Masters & Setup',
      items: [
        { id: 'customers', label: 'Customers Directory', icon: Users },
        { id: 'vehicles', label: 'Vehicles Master', icon: Car },
        { id: 'technicians', label: 'Technicians Roster', icon: Clock },
        { id: 'paint-codes', label: 'Paint Mixing & Codes', icon: Paintbrush },
        { id: 'settings', label: 'Settings & Sequences', icon: Settings }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 select-none">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">
            <Wrench className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <h1 className="font-bold text-sm tracking-tight text-white truncate">{garageName}</h1>
            <p className="text-xs text-blue-400 font-arabic truncate">{garageNameAr}</p>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {navSections.map((sec, idx) => (
            <div key={idx}>
              <div className="px-3 mb-1.5 text-[10px] font-semibold tracking-wider text-slate-400 uppercase">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setCurrentTab(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                        isActive
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20 font-semibold'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/80'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Footer info */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950 text-center">
        <div className="text-[11px] text-slate-300 font-mono">ERP v2.4 • Qatar QAR</div>
        <div className="text-[10px] text-emerald-400 flex items-center justify-center gap-1.5 mt-0.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          Database Connected
        </div>
      </div>
    </aside>
  );
};
