import React, { useMemo, useState } from 'react';
import { JobCard, InventoryItem, Invoice, GarageSettings } from '../../types';
import { useGarage } from '../../context/GarageContext';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { 
  Car, 
  ShoppingCart, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  ArrowUpRight,
  Package,
  Wrench,
  Clock,
  FileCheck,
  Receipt,
  CheckCircle2,
  Hourglass,
  CheckCircle,
  Truck,
  ArrowRight,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { Badge } from '../Common/Badge';

interface Props {
  jobCards: JobCard[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  settings: GarageSettings;
  onOpenCreateJobCard: () => void;
  onOpenPartsSell?: () => void;
  onNavigateToTab: (tab: any, filter?: any) => void;
  onSelectJobCard: (card: JobCard) => void;
  onSelectVehicleHistory: (plate: string) => void;
}

export const GarageDashboard: React.FC<Props> = ({
  jobCards,
  inventory,
  invoices,
  settings,
  onOpenCreateJobCard,
  onOpenPartsSell,
  onNavigateToTab,
  onSelectJobCard,
}) => {
  const { purchaseOrders, estimates } = useGarage();
  const [showWorkflowGuide, setShowWorkflowGuide] = useState(true);

  // Active Job Cards (not closed, delivered, or cancelled)
  const activeJobs = useMemo(() => {
    return jobCards.filter(jc => 
      jc.status !== 'Closed' && 
      jc.status !== 'Delivered' && 
      jc.status !== 'Cancelled'
    );
  }, [jobCards]);

  // Specific operational status counts for "Today at the Workshop"
  const vehiclesWaiting = useMemo(() => {
    return jobCards.filter(jc => 
      jc.status === 'New' || 
      jc.status === 'Draft' || 
      jc.status === 'Received'
    );
  }, [jobCards]);

  const jobsInProgress = useMemo(() => {
    return jobCards.filter(jc => 
      jc.status === 'In Progress' || 
      jc.status === 'Approved'
    );
  }, [jobCards]);

  const jobsWaitingApproval = useMemo(() => {
    return jobCards.filter(jc => 
      jc.status === 'Waiting for Approval' || 
      jc.status === 'Awaiting Customer Approval' || 
      jc.status === 'Estimate'
    );
  }, [jobCards]);

  const jobsReadyForPickup = useMemo(() => {
    return jobCards.filter(jc => 
      jc.status === 'Ready for Pickup' || 
      jc.status === 'Completed'
    );
  }, [jobCards]);

  const unpaidInvoices = useMemo(() => {
    return (invoices || []).filter(inv => inv.paymentStatus === 'Unpaid' || inv.paymentStatus === 'Partial');
  }, [invoices]);

  const lowStockItems = useMemo(() => {
    return (inventory || []).filter(i => {
      const stock = Number(i.quantityOnHand ?? i.stockQuantity ?? 0);
      const minLevel = Number(i.minReorderLevel ?? i.minStockLevel ?? 5);
      return stock <= minLevel;
    });
  }, [inventory]);

  // Financial aggregates
  const totalBilled = useMemo(() => {
    return (invoices || []).reduce((acc, i) => acc + (Number(i.grandTotal ?? i.subtotal) || 0), 0);
  }, [invoices]);

  const totalReceivables = useMemo(() => {
    return (invoices || []).reduce((acc, i) => {
      const invTotal = Number(i.grandTotal ?? i.subtotal) || 0;
      const paid = Number(i.paidAmount) || 0;
      const balance = i.balanceAmount !== undefined ? Number(i.balanceAmount) : Math.max(0, invTotal - paid);
      return acc + balance;
    }, 0);
  }, [invoices]);

  const totalInventoryValue = useMemo(() => {
    return (inventory || []).reduce((acc, i) => {
      const qty = Number(i.quantityOnHand ?? i.stockQuantity ?? 0);
      const cost = Number(i.unitCost ?? i.unitPrice ?? 0);
      return acc + (qty * cost);
    }, 0);
  }, [inventory]);

  // Real 7-day revenue chart
  const chartData = useMemo(() => {
    const dateMap: { [dateStr: string]: number } = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dateMap[key] = 0;
    }

    invoices.forEach(inv => {
      const invDate = inv.date ? inv.date.split('T')[0] : '';
      if (invDate && dateMap[invDate] !== undefined) {
        dateMap[invDate] += (Number(inv.grandTotal ?? inv.subtotal) || 0);
      }
    });

    return Object.entries(dateMap).map(([dateStr, revenue]) => {
      const parts = dateStr.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayLabel = `${monthNames[parseInt(parts[1], 10) - 1]} ${parts[2]}`;
      return {
        date: dayLabel,
        revenue: Math.round(revenue),
      };
    });
  }, [invoices]);

  const hasAnyRevenue = totalBilled > 0;
  const recentJobs = jobCards.slice(0, 5);

  const workflowSteps = [
    { num: '1', title: 'Customer', desc: 'Find or create customer' },
    { num: '2', title: 'Vehicle', desc: 'Select or register plate' },
    { num: '3', title: 'Job Card', desc: 'Open repair order' },
    { num: '4', title: 'Diagnosis', desc: 'Log complaints & check' },
    { num: '5', title: 'Parts & Labor', desc: 'Add spares & hours' },
    { num: '6', title: 'Assign Bay', desc: 'Assign master technician' },
    { num: '7', title: 'Repair', desc: 'Work in bay' },
    { num: '8', title: 'Estimate/Invoice', desc: 'Approval & billing' },
    { num: '9', title: 'Payment', desc: 'Record cash/card' },
    { num: '10', title: 'Delivery', desc: 'Vehicle handover' },
  ];

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">WORKFLOW</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-200">
              Live Workshop
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Real-time status of job cards, repair bays, inventory spares, and customer billing.
          </p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenPartsSell || (() => onNavigateToTab('inventory'))}
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <span>Parts Sell</span>
          </button>
          
          <button
            type="button"
            onClick={onOpenCreateJobCard}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            <span>New Job Card</span>
          </button>
        </div>
      </div>

      {/* Recommended Core Workflow Banner */}
      {showWorkflowGuide && (
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-md border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-sky-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-sky-200">
                Core Workshop Workflow (Next Recommended Step)
              </h2>
            </div>
            <button
              onClick={() => setShowWorkflowGuide(false)}
              className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Hide Guide
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-10 gap-2">
            {workflowSteps.map((step, idx) => (
              <div 
                key={step.num}
                className="bg-white/5 hover:bg-white/10 p-2.5 rounded-xl border border-white/10 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="w-5 h-5 rounded-full bg-sky-500/30 text-sky-300 flex items-center justify-center font-mono font-bold text-[10px]">
                      {step.num}
                    </span>
                    {idx < 9 && <ArrowRight className="w-3 h-3 text-slate-500 hidden lg:block" />}
                  </div>
                  <div className="font-bold text-xs text-white truncate">{step.title}</div>
                </div>
                <div className="text-[10px] text-slate-400 line-clamp-1 mt-1">{step.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TODAY AT THE WORKSHOP (Actionable Operational Center) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-sky-600" />
            <h2 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
              Today at the Workshop
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Click any section to open filtered records
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* 1. Vehicles Waiting */}
          <div
            onClick={() => onNavigateToTab('work_orders', 'WAITING')}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-sky-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-sky-50 text-sky-700 border border-sky-200">
                Reception
              </span>
              <Car className="w-4 h-4 text-sky-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">{vehiclesWaiting.length}</div>
            <div className="text-xs font-bold text-slate-700 truncate">Vehicles Waiting</div>
            <div className="text-[10px] text-slate-500 mt-1">Pending diagnosis / bay</div>
          </div>

          {/* 2. Jobs in Progress */}
          <div
            onClick={() => onNavigateToTab('work_orders', 'In Progress')}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200">
                In Bays
              </span>
              <Wrench className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">{jobsInProgress.length}</div>
            <div className="text-xs font-bold text-slate-700 truncate">Jobs in Progress</div>
            <div className="text-[10px] text-slate-500 mt-1">Active repair & overhaul</div>
          </div>

          {/* 3. Waiting for Approval */}
          <div
            onClick={() => onNavigateToTab('work_orders', 'Waiting for Approval')}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-amber-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                Pending Client
              </span>
              <Hourglass className="w-4 h-4 text-amber-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">{jobsWaitingApproval.length}</div>
            <div className="text-xs font-bold text-slate-700 truncate">Waiting Approval</div>
            <div className="text-[10px] text-slate-500 mt-1">Estimates sent to client</div>
          </div>

          {/* 4. Ready for Pickup */}
          <div
            onClick={() => onNavigateToTab('work_orders', 'Ready for Pickup')}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Done
              </span>
              <CheckCircle className="w-4 h-4 text-emerald-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">{jobsReadyForPickup.length}</div>
            <div className="text-xs font-bold text-slate-700 truncate">Ready for Pickup</div>
            <div className="text-[10px] text-slate-500 mt-1">Repairs completed</div>
          </div>

          {/* 5. Unpaid Invoices */}
          <div
            onClick={() => onNavigateToTab('invoices_payments', 'Unpaid')}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-rose-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                Due
              </span>
              <Receipt className="w-4 h-4 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">{unpaidInvoices.length}</div>
            <div className="text-xs font-bold text-slate-700 truncate">Unpaid Invoices</div>
            <div className="text-[10px] text-rose-600 font-bold mt-1">
              Due: {totalReceivables.toLocaleString(undefined, { maximumFractionDigits: 0 })} QAR
            </div>
          </div>

          {/* 6. Urgent Low-Stock Items */}
          <div
            onClick={() => onNavigateToTab('inventory', 'LOW_STOCK')}
            className="bg-white p-4 rounded-2xl border border-slate-200 hover:border-orange-300 shadow-xs hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-50 text-orange-700 border border-orange-200">
                Inventory
              </span>
              <AlertTriangle className="w-4 h-4 text-orange-600 group-hover:scale-110 transition-transform" />
            </div>
            <div className="text-2xl font-black text-slate-900 mb-0.5">{lowStockItems.length}</div>
            <div className="text-xs font-bold text-slate-700 truncate">Low Stock Alert</div>
            <div className="text-[10px] text-slate-500 mt-1">Below minimum level</div>
          </div>
        </div>
      </div>

      {/* Main Charts & Job Queue Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 7-Day Billed Revenue Reconciliation */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">7-Day Billed Revenue (QAR)</h3>
              <p className="text-[11px] text-slate-500">Live financial reconciliation from registered workshop invoices</p>
            </div>
            <button
              onClick={() => onNavigateToTab('invoices_payments')}
              className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>Total: {totalBilled.toFixed(2)} QAR</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {hasAnyRevenue ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                    formatter={(val: any) => [`${Number(val).toLocaleString()} QAR`, 'Billed']}
                    cursor={{ fill: '#f8fafc' }}
                  />
                  <Bar dataKey="revenue" fill="#0284c7" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Receipt className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-sm font-semibold text-slate-700">No Billed Invoices Recorded Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Complete and invoice active job cards to track daily revenue and receipts here.
              </p>
              <button
                onClick={onOpenCreateJobCard}
                className="mt-3 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                + Open First Job Card
              </button>
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Receivables Outstanding: <strong className="text-slate-800 font-mono">{totalReceivables.toFixed(2)} QAR</strong></span>
            <button
              onClick={() => onNavigateToTab('invoices_payments', 'Unpaid')}
              className="text-sky-600 font-bold hover:underline cursor-pointer"
            >
              Collect Due Payments →
            </button>
          </div>
        </div>

        {/* Right: Recent Active Job Cards */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Recent Job Cards</h3>
              <p className="text-[11px] text-slate-500">Fast access to workshop repair cards</p>
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
              {jobCards.length} Total
            </span>
          </div>

          {recentJobs.length > 0 ? (
            <div className="space-y-2.5 flex-1">
              {recentJobs.map((job) => (
                <div 
                  key={job.id} 
                  onClick={() => onSelectJobCard(job)}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-sky-50/70 border border-slate-100 hover:border-sky-200 transition-all cursor-pointer group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-sky-100 text-slate-500 group-hover:text-sky-700 flex items-center justify-center shrink-0 transition-colors">
                    <Car className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-slate-900 truncate flex items-center gap-1.5">
                      <span className="text-sky-700 font-mono">{job.jobNumber}</span>
                      <span className="text-slate-300">•</span>
                      <span className="font-mono bg-slate-100 px-1 py-0.2 rounded text-[10px] text-slate-800 font-bold">
                        {job.vehicle?.plateNumber || 'No Plate'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {job.customer?.name || 'Walk-in'} — {job.vehicle?.make || ''} {job.vehicle?.model || ''}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                    job.status === 'In Progress' ? 'bg-indigo-100 text-indigo-800' :
                    job.status === 'Ready for Pickup' ? 'bg-emerald-100 text-emerald-800' :
                    job.status === 'Waiting for Approval' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {job.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl">
              <Wrench className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-600">No Job Cards Registered Yet</p>
              <button
                onClick={onOpenCreateJobCard}
                className="mt-2 text-xs font-bold text-sky-600 hover:text-sky-700 underline cursor-pointer"
              >
                Create First Job Card
              </button>
            </div>
          )}

          <button 
            onClick={() => onNavigateToTab('work_orders')}
            className="w-full mt-4 py-2.5 text-xs font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl border border-sky-100 transition-all cursor-pointer text-center"
          >
            Open Job Cards Register →
          </button>
        </div>
      </div>

      {/* Operational Summary Grid: Warehouse & Procurement */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Estimates Counter */}
        <div 
          onClick={() => onNavigateToTab('work_orders', 'Waiting for Approval')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Estimates Pending</h4>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {estimates.filter(e => e.status === 'Awaiting Approval').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Quotations awaiting customer authorization</p>
        </div>

        {/* Purchasing PO Counter */}
        <div 
          onClick={() => onNavigateToTab('purchasing')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-sky-50 text-sky-700 rounded-xl">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Active Purchase Orders</h4>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {purchaseOrders.filter(p => p.status === 'Ordered' || p.status === 'Draft').length}
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Supplier orders awaiting GRN receipt into stock</p>
        </div>

        {/* Warehouse Inventory Valuation */}
        <div 
          onClick={() => onNavigateToTab('inventory')}
          className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-slate-300 shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                <Package className="w-4 h-4" />
              </div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Warehouse Valuation</h4>
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR
          </div>
          <p className="text-[11px] text-slate-500 mt-1">{inventory.length} spare part SKUs on shelf</p>
        </div>
      </div>
    </div>
  );
};
