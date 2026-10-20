import React from 'react';
import {
  Wrench,
  Car,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  TrendingUp,
  DollarSign
} from 'lucide-react';

interface DashboardProps {
  jobCards: any[];
  inventory: any[];
  invoices: any[];
  onOpenJobCardModal: () => void;
  onOpenCounterSale: () => void;
  onNavigateTab: (tab: string) => void;
  currency?: string;
}

export const DashboardView: React.FC<DashboardProps> = ({
  jobCards,
  inventory,
  invoices,
  onOpenJobCardModal,
  onOpenCounterSale,
  onNavigateTab,
  currency = 'QAR'
}) => {
  const activeJobs = jobCards.filter(j => !['Invoiced', 'Closed'].includes(j.status));
  const inProgressJobs = jobCards.filter(j => j.status === 'In Progress');
  const lowStockParts = inventory.filter(p => p.quantityOnHand <= (p.minReorderLevel || 5));
  const totalRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0);
  const paidRevenue = invoices.reduce((sum, inv) => sum + (Number(inv.paidAmount) || 0), 0);
  const unpaidBalance = invoices.reduce((sum, inv) => sum + (Number(inv.balanceAmount) || 0), 0);

  const kpis = [
    {
      label: 'Active Vehicles in Shop',
      value: activeJobs.length,
      sub: `${inProgressJobs.length} on active repair bays`,
      icon: Car,
      color: 'text-blue-400',
      bg: 'bg-blue-950/40 border-blue-800/40'
    },
    {
      label: 'Total Invoiced Revenue',
      value: `${currency} ${totalRevenue.toLocaleString()}`,
      sub: `${currency} ${paidRevenue.toLocaleString()} collected`,
      icon: TrendingUp,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/40'
    },
    {
      label: 'Unpaid Receivables',
      value: `${currency} ${unpaidBalance.toLocaleString()}`,
      sub: `${invoices.filter(i => i.status !== 'Paid').length} open invoices`,
      icon: DollarSign,
      color: 'text-amber-400',
      bg: 'bg-amber-950/40 border-amber-800/40'
    },
    {
      label: 'Low Stock Part Alerts',
      value: lowStockParts.length,
      sub: 'Need purchase order reorder',
      icon: AlertTriangle,
      color: 'text-rose-400',
      bg: 'bg-rose-950/40 border-rose-800/40'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Shortcuts */}
      <div className="bg-gradient-to-r from-blue-900/60 via-slate-900 to-indigo-950/60 border border-slate-800 p-6 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Workshop Operations Live Console</h2>
          <p className="text-slate-300 text-sm mt-1">
            Real-time management for Najm Al Huda Garage • Industrial Area, Doha, Qatar
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={onOpenJobCardModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-blue-600/20"
          >
            <Wrench className="w-4 h-4" />
            <span>New Job Order</span>
          </button>
          <button
            onClick={onOpenCounterSale}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors shadow-lg shadow-emerald-600/20"
          >
            <Receipt className="w-4 h-4" />
            <span>Sell Spare Parts</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className={`p-5 rounded-2xl border ${kpi.bg} shadow-md backdrop-blur-xs flex items-center justify-between`}>
              <div>
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                <div className="text-2xl font-black text-white mt-1">{kpi.value}</div>
                <div className="text-xs text-slate-400 mt-1">{kpi.sub}</div>
              </div>
              <div className={`p-3 rounded-xl bg-slate-900/80 border border-slate-700/60 ${kpi.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Grid: Active Work Orders & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Job Cards Table (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-blue-400" />
                <span>Active Workshop Job Cards</span>
              </h3>
              <p className="text-xs text-slate-400">Vehicles currently undergoing repair or inspection</p>
            </div>
            <button
              onClick={() => onNavigateTab('jobs')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-800/80 text-xs text-slate-400 uppercase">
                <tr>
                  <th className="p-3">Job #</th>
                  <th className="p-3">Vehicle & Plate</th>
                  <th className="p-3">Service</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {activeJobs.slice(0, 6).map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-blue-400">{job.jobNumber || job.job_number}</td>
                    <td className="p-3">
                      <div className="font-semibold text-white">{job.vehiclePlate || job.vehicle_plate}</div>
                      <div className="text-xs text-slate-400">
                        {job.vehicleMake || job.vehicle_make} {job.vehicleModel || job.vehicle_model}
                      </div>
                    </td>
                    <td className="p-3 text-xs text-slate-300">{job.serviceType || job.service_type}</td>
                    <td className="p-3">
                      <span className="text-xs px-2.5 py-1 rounded-md bg-blue-900/40 text-blue-300 border border-blue-700/50 font-medium">
                        {job.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-bold text-white">
                      {currency} {(job.grandTotal || job.grand_total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts & Quick PO */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Low Stock Critical Parts</span>
              </h3>
              <p className="text-xs text-slate-400">Items below minimum reorder threshold</p>
            </div>
            <button
              onClick={() => onNavigateTab('inventory')}
              className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
            >
              <span>Restock</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {lowStockParts.slice(0, 5).map((part) => (
              <div
                key={part.id}
                className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl flex items-center justify-between"
              >
                <div>
                  <div className="font-semibold text-xs text-white truncate max-w-[160px]">{part.name}</div>
                  <div className="text-[11px] text-slate-400 font-mono mt-0.5">SKU: {part.sku}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs px-2 py-0.5 rounded bg-rose-950/80 text-rose-400 border border-rose-800 font-bold">
                    {part.quantityOnHand} in stock
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">Min: {part.minReorderLevel || 5}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
