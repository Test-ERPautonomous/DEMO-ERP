import React, { useState } from 'react';
import { Users, Plus, Search, Phone, Mail, MapPin } from 'lucide-react';
import { api } from '../api';

interface CustomersViewProps {
  customers: any[];
  onRefresh: () => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({ customers, onRefresh }) => {
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [qid, setQid] = useState('');
  const [address, setAddress] = useState('');

  const filtered = (customers || []).filter(c => {
    if (!c) return false;
    const q = (search || '').trim().toLowerCase();
    return (
      !q ||
      (c.name || '').toLowerCase().includes(q) ||
      (c.nameAr || c.name_ar || '').toLowerCase().includes(q) ||
      (c.phone || c.contact || '').includes(q)
    );
  });

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;
    try {
      await api.createCustomer({ name, nameAr, phone, email, qid, address });
      setShowAddModal(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create customer');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search customers by name, phone, QID..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
          />
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map(c => (
          <div key={c.id} className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-base text-white">{c.name}</h3>
                {c.nameAr && <p className="text-xs text-blue-400 font-arabic">{c.nameAr}</p>}
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                {c.customerId || c.customerNumber || c.customer_number || 'CUST'}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                <span className="font-mono">{c.phone || c.contact || 'No phone'}</span>
              </div>
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
              {c.address && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">{c.address}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>Add Customer</span>
            </h3>
            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Customer Name (English) *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Customer Name (Arabic)</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={e => setNameAr(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-arabic text-right"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+974 ..."
                  required
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">QID / CR Number</label>
                  <input
                    type="text"
                    value={qid}
                    onChange={e => setQid(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="Doha, Industrial Area..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
