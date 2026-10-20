import React, { useState } from 'react';
import { GarageSettings } from '../../types';
import { X, FileText, Plus, CheckCircle, Calendar, DollarSign, Search, Trash2 } from 'lucide-react';

interface BillEntry {
  id: string;
  billNumber: string;
  vendorName: string;
  category: 'Utilities' | 'Paint Supplier' | 'Spare Parts' | 'Rent & Lease' | 'Subcontract Labor' | 'Tools & Maintenance';
  date: string;
  dueDate: string;
  amount: number;
  taxAmount: number;
  status: 'Pending' | 'Approved' | 'Paid';
  notes: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  settings: GarageSettings;
}

export const BillsRegistrationModal: React.FC<Props> = ({ isOpen, onClose, settings }) => {
  const [bills, setBills] = useState<BillEntry[]>([
    {
      id: 'bill-1',
      billNumber: 'BIL-2026-081',
      vendorName: 'Kahramaa (Electricity & Water)',
      category: 'Utilities',
      date: '2026-09-01',
      dueDate: '2026-09-20',
      amount: 3450,
      taxAmount: 0,
      status: 'Approved',
      notes: 'Monthly workshop power & compressor supply',
    },
    {
      id: 'bill-2',
      billNumber: 'BIL-2026-082',
      vendorName: 'Nippon Paint Qatar W.L.L.',
      category: 'Paint Supplier',
      date: '2026-09-03',
      dueDate: '2026-09-25',
      amount: 8900,
      taxAmount: 0,
      status: 'Pending',
      notes: 'Clear coat, 2K primer, mixing bases delivery batch #402',
    },
    {
      id: 'bill-3',
      billNumber: 'BIL-2026-083',
      vendorName: 'Al Attiya Industrial Property Management',
      category: 'Rent & Lease',
      date: '2026-09-01',
      dueDate: '2026-09-10',
      amount: 18000,
      taxAmount: 0,
      status: 'Paid',
      notes: 'Industrial Area St 24 Workshop & Yard lease for Sep 2026',
    },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBill, setNewBill] = useState<Omit<BillEntry, 'id'>>({
    billNumber: `BIL-2026-0${bills.length + 84}`,
    vendorName: '',
    category: 'Spare Parts',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    amount: 0,
    taxAmount: 0,
    status: 'Pending',
    notes: '',
  });

  if (!isOpen) return null;

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBill.vendorName.trim() || newBill.amount <= 0) return;

    setBills([
      {
        ...newBill,
        id: `bill-${Date.now()}`,
      },
      ...bills,
    ]);
    setShowAddForm(false);
    setNewBill({
      billNumber: `BIL-2026-0${bills.length + 85}`,
      vendorName: '',
      category: 'Spare Parts',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      amount: 0,
      taxAmount: 0,
      status: 'Pending',
      notes: '',
    });
  };

  const handleMarkPaid = (id: string) => {
    setBills(bills.map(b => (b.id === id ? { ...b, status: 'Paid' } : b)));
  };

  const handleDelete = (id: string) => {
    setBills(bills.filter(b => b.id !== id));
  };

  const filteredBills = bills.filter(
    b =>
      b.billNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalRegistered = bills.reduce((s, b) => s + b.amount, 0);
  const totalUnpaid = bills.filter(b => b.status !== 'Paid').reduce((s, b) => s + b.amount, 0);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs font-sans text-xs antialiased">
      <div className="bg-white border border-slate-300 rounded-sm shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Title Bar */}
        <div className="bg-[#1e4e79] text-white px-3 py-1.5 flex items-center justify-between font-bold select-none">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span>[Bills Registration &amp; Expense Inward] - Automotive Workshop</span>
          </div>
          <button onClick={onClose} className="text-white hover:text-red-200 cursor-pointer p-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action & Metric Bar */}
        <div className="bg-slate-100 border-b border-slate-300 p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search vendor or bill #..."
                value={searchTerm ?? ''}
                onChange={e => setSearchTerm(e.target.value)}
                className="h-7 text-xs px-2.5 pl-7 border border-slate-300 rounded-xs bg-white text-slate-800 w-48 sm:w-64 focus:outline-none focus:border-blue-600"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
            </div>

            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="h-7 px-3 bg-[#1e4e79] hover:bg-[#163a5c] text-white rounded-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{showAddForm ? 'Cancel' : '+ Register New Bill'}</span>
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">TOTAL INWARD BILLS</span>
              <span className="font-bold text-slate-900">{totalRegistered.toLocaleString()} {settings.currencySymbol}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500 text-[10px] block">PENDING PAYABLE</span>
              <span className="font-bold text-rose-700">{totalUnpaid.toLocaleString()} {settings.currencySymbol}</span>
            </div>
          </div>
        </div>

        {/* Inward Form Collapsible */}
        {showAddForm && (
          <form onSubmit={handleAddBill} className="bg-blue-50/70 border-b border-blue-200 p-3 space-y-2">
            <div className="font-semibold text-blue-900 flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-blue-700" />
              <span>New Bill Inward Entry</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Bill / Voucher #</label>
                <input
                  type="text"
                  value={newBill.billNumber || ''}
                  onChange={e => setNewBill({ ...newBill, billNumber: e.target.value })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Vendor / Supplier Name</label>
                <input
                  type="text"
                  placeholder="e.g. Al Attiya Hardware"
                  value={newBill.vendorName || ''}
                  onChange={e => setNewBill({ ...newBill, vendorName: e.target.value })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Expense Category</label>
                <select
                  value={newBill.category || 'Spare Parts'}
                  onChange={e => setNewBill({ ...newBill, category: e.target.value as any })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                >
                  <option value="Spare Parts">Spare Parts</option>
                  <option value="Paint Supplier">Paint Supplier</option>
                  <option value="Utilities">Utilities (Kahramaa)</option>
                  <option value="Rent & Lease">Rent &amp; Lease</option>
                  <option value="Subcontract Labor">Subcontract Labor (Machining)</option>
                  <option value="Tools & Maintenance">Tools &amp; Maintenance</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Bill Amount ({settings.currencySymbol})</label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={newBill.amount || ''}
                  onChange={e => setNewBill({ ...newBill, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white font-mono font-bold text-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Bill Date</label>
                <input
                  type="date"
                  value={newBill.date || ''}
                  onChange={e => setNewBill({ ...newBill, date: e.target.value })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Due Date</label>
                <input
                  type="date"
                  value={newBill.dueDate || ''}
                  onChange={e => setNewBill({ ...newBill, dueDate: e.target.value })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-600 block mb-0.5">Notes / Reference</label>
                <input
                  type="text"
                  placeholder="Optional description"
                  value={newBill.notes || ''}
                  onChange={e => setNewBill({ ...newBill, notes: e.target.value })}
                  className="w-full h-7 px-2 border border-slate-300 rounded-xs bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-blue-700 hover:bg-blue-800 text-white rounded-xs font-semibold cursor-pointer shadow-xs"
              >
                Save Bill Entry
              </button>
            </div>
          </form>
        )}

        {/* Table of Registered Bills */}
        <div className="flex-1 overflow-auto p-3">
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-200 text-slate-800 text-[11px] font-semibold border-b border-slate-300">
                <th className="p-2 border-r border-slate-300">Bill #</th>
                <th className="p-2 border-r border-slate-300">Vendor</th>
                <th className="p-2 border-r border-slate-300">Category</th>
                <th className="p-2 border-r border-slate-300">Bill Date</th>
                <th className="p-2 border-r border-slate-300">Due Date</th>
                <th className="p-2 border-r border-slate-300 text-right">Amount ({settings.currencySymbol})</th>
                <th className="p-2 border-r border-slate-300 text-center">Status</th>
                <th className="p-2 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredBills.map(bill => (
                <tr key={bill.id} className="border-b border-slate-200 hover:bg-slate-50 text-xs">
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-blue-800">{bill.billNumber}</td>
                  <td className="p-2 border-r border-slate-200 font-medium text-slate-900">{bill.vendorName}</td>
                  <td className="p-2 border-r border-slate-200 text-slate-600">{bill.category}</td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{bill.date}</td>
                  <td className="p-2 border-r border-slate-200 font-mono text-slate-600">{bill.dueDate}</td>
                  <td className="p-2 border-r border-slate-200 font-mono font-bold text-right text-slate-900">
                    {bill.amount.toLocaleString()}
                  </td>
                  <td className="p-2 border-r border-slate-200 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        bill.status === 'Paid'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : bill.status === 'Approved'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      {bill.status}
                    </span>
                  </td>
                  <td className="p-2 text-center flex items-center justify-center gap-1.5">
                    {bill.status !== 'Paid' && (
                      <button
                        onClick={() => handleMarkPaid(bill.id)}
                        className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xs text-[10px] font-semibold cursor-pointer shadow-2xs"
                      >
                        Mark Paid
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(bill.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Delete Bill"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-4 py-2 border-t border-slate-300 flex justify-between items-center text-xs">
          <span className="text-slate-500 font-mono">Total Records: {filteredBills.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
