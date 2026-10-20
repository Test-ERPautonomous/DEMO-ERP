import React, { useState, useMemo, useEffect } from 'react';
import { JobCard, InventoryItem, Invoice, GarageSettings } from '../../types';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  BookOpen, 
  History,
  Printer,
  Download,
  Receipt
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useGarage } from '../../context/GarageContext';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';

interface Props {
  jobCards: JobCard[];
  inventory: InventoryItem[];
  invoices: Invoice[];
  settings: GarageSettings;
  selectedReportKey?: string;
  onSelectJobCard?: (card: JobCard) => void;
}

export const ReportsWindow: React.FC<Props> = ({
  jobCards,
  inventory,
  invoices,
  settings,
  selectedReportKey,
  onSelectJobCard
}) => {
  const { 
    expenses, 
    auditLogs
  } = useGarage();

  const [activeReport, setActiveReport] = useState<string>(selectedReportKey || 'operational');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (selectedReportKey) {
      setActiveReport(selectedReportKey);
    }
  }, [selectedReportKey]);

  const totalBilled = useMemo(() => (invoices || []).reduce((s, i) => s + (Number(i.grandTotal ?? i.subtotal) || 0), 0), [invoices]);
  const totalCollected = useMemo(() => (invoices || []).reduce((s, i) => s + (Number(i.paidAmount) || 0), 0), [invoices]);
  const totalOutstanding = useMemo(() => (invoices || []).reduce((s, i) => {
    const invTotal = Number(i.grandTotal ?? i.subtotal) || 0;
    const paid = Number(i.paidAmount) || 0;
    const balance = i.balanceAmount !== undefined ? Number(i.balanceAmount) : Math.max(0, invTotal - paid);
    return s + balance;
  }, 0), [invoices]);

  // Real monthly aggregation
  const monthlyRevenueData = useMemo(() => {
    const monthMap: { [month: string]: number } = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize current year months
    months.forEach(m => { monthMap[m] = 0; });

    (invoices || []).forEach(inv => {
      if (inv.date) {
        const d = new Date(inv.date);
        if (!isNaN(d.getTime())) {
          const mName = months[d.getMonth()];
          monthMap[mName] = (monthMap[mName] || 0) + (Number(inv.grandTotal ?? inv.subtotal) || 0);
        }
      }
    });

    return months.map(m => ({
      month: m,
      revenue: Math.round(monthMap[m] || 0)
    }));
  }, [invoices]);

  const handlePrint = () => window.print();

  const renderContent = () => {
    switch (activeReport) {
      case 'operational':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-sky-50 text-sky-600 rounded-lg">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900">Total Billed Revenue</h4>
                </div>
                <div className="text-3xl font-bold text-slate-900 font-mono">
                  {totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR
                </div>
                <p className="text-xs text-slate-500 mt-2">Total gross invoice value to date</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900">Total Collections</h4>
                </div>
                <div className="text-3xl font-bold text-emerald-600 font-mono">
                  {totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR
                </div>
                <p className="text-xs text-slate-500 mt-2">Payments received and cleared</p>
              </div>
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-900">Outstanding Receivables</h4>
                </div>
                <div className="text-3xl font-bold text-amber-600 font-mono">
                  {totalOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} QAR
                </div>
                <p className="text-xs text-slate-500 mt-2">Unpaid client balance</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Monthly Billed Revenue</h4>
                  <p className="text-xs text-slate-500">Aggregated from posted invoices</p>
                </div>
                <span className="text-xs font-mono font-bold text-sky-600 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-100">
                  {(invoices || []).length} Invoices
                </span>
              </div>
              <div className="h-80 p-6">
                {totalBilled > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                        formatter={(val: any) => [`${Number(val).toLocaleString()} QAR`, 'Revenue']}
                        cursor={{ fill: '#f8fafc' }}
                      />
                      <Bar dataKey="revenue" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl">
                    <Receipt className="w-10 h-10 text-slate-300 mb-2" />
                    <p className="text-sm font-semibold text-slate-700">No Billed Revenue Yet</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                      When you generate and post invoices, real month-by-month revenue will be visualized here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      case 'stock_report':
        return (
          <DataTable
            data={inventory}
            columns={[
              { header: 'SKU / Part #', accessor: (item: InventoryItem) => <div className="font-mono font-bold text-sky-700">{item.sku}</div> },
              { header: 'Item Name', accessor: (item: InventoryItem) => <div className="font-bold text-slate-900">{item.name}</div> },
              { header: 'Category', accessor: (item: InventoryItem) => <Badge variant="secondary">{item.category}</Badge> },
              { header: 'Stock Qty', accessor: (item: InventoryItem) => (
                <div className={`font-bold font-mono ${item.quantityOnHand <= item.minReorderLevel ? 'text-rose-600' : 'text-slate-900'}`}>
                  {item.quantityOnHand}
                </div>
              )},
              { header: 'Unit Cost', accessor: (item: InventoryItem) => <div className="font-mono">{Number(item.unitCost || 0).toFixed(2)} QAR</div> },
              { header: 'Total Value', accessor: (item: InventoryItem) => <div className="text-right font-bold text-slate-900 font-mono">{(Number(item.quantityOnHand || 0) * Number(item.unitCost || 0)).toFixed(2)} QAR</div>, headerClassName: 'text-right' }
            ]}
            searchPlaceholder="Search Inventory..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'audit_logs':
        return (
          <DataTable
            data={auditLogs}
            columns={[
              { header: 'Timestamp', accessor: (log: any) => <div className="text-slate-500 font-mono text-xs">{log.timestamp}</div> },
              { header: 'User', accessor: (log: any) => <div className="font-bold text-slate-900">{log.user}</div> },
              { header: 'Action', accessor: (log: any) => <Badge variant="sky">{log.action}</Badge> },
              { header: 'Details', accessor: (log: any) => <div className="text-slate-600 text-xs">{log.details}</div> }
            ]}
            searchPlaceholder="Search Audit Logs..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      default:
        return (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 shadow-xs">
            <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-[10px]">Data for {activeReport} module</p>
            <p className="text-xs mt-1">Detailed report view is being processed...</p>
          </div>
        );
    }
  };

  const getModuleTitle = () => {
    const titles: Record<string, string> = {
      operational: 'Operations Summary',
      stock_report: 'Inventory Valuation',
      audit_logs: 'System Audit'
    };
    return titles[activeReport] || 'Workshop Analytics';
  };

  return (
    <ModuleContainer
      title={getModuleTitle()}
      subtitle="Financial health and operational efficiency reports"
      icon={BookOpen}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-200 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>
        </div>
      }
      tabs={
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[500px]">
          {[
            { id: 'operational', label: 'Summary' },
            { id: 'stock_report', label: 'Inventory' },
            { id: 'audit_logs', label: 'Audit' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveReport(tab.id); setSearchTerm(''); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${activeReport === tab.id ? 'bg-white shadow-xs text-sky-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      }
    >
      {renderContent()}
    </ModuleContainer>
  );
};
