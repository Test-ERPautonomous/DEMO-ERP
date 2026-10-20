import React, { useState } from 'react';
import { X, Wrench, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api } from '../api';

interface JobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: any[];
  vehicles: any[];
  technicians: any[];
  inventory: any[];
  onSuccess: () => void;
}

export const JobCardModal: React.FC<JobCardModalProps> = ({
  isOpen,
  onClose,
  customers,
  vehicles,
  technicians,
  inventory,
  onSuccess
}) => {
  const [customerId, setCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2023);
  const [mileage, setMileage] = useState(75000);
  const [serviceType, setServiceType] = useState('Mechanical Repair');
  const [priority, setPriority] = useState('Medium');
  const [technicianId, setTechnicianId] = useState('');
  const [complaints, setComplaints] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [laborOperations, setLaborOperations] = useState<any[]>([]);
  const [laborDesc, setLaborDesc] = useState('');
  const [laborHours, setLaborHours] = useState(1);
  const [laborRate, setLaborRate] = useState(150);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const cid = e.target.value;
    setCustomerId(cid);
    const found = customers.find(c => c.id === cid);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const vid = e.target.value;
    setVehicleId(vid);
    const found = vehicles.find(v => v.id === vid);
    if (found) {
      setPlateNumber(found.plateNumber || found.plate);
      setMake(found.make);
      setModel(found.model);
      setYear(found.year || 2023);
      setMileage(found.mileage || 0);
    }
  };

  const handleAddLabor = () => {
    if (!laborDesc.trim()) return;
    setLaborOperations([
      ...laborOperations,
      {
        id: `lab-${Date.now()}`,
        description: laborDesc,
        hours: laborHours,
        rate: laborRate,
        total: laborHours * laborRate
      }
    ]);
    setLaborDesc('');
    setLaborHours(1);
  };

  const handleRemoveLabor = (id: string) => {
    setLaborOperations(laborOperations.filter(l => l.id !== id));
  };

  const subtotalLabor = laborOperations.reduce((sum, l) => sum + l.total, 0);
  const grandTotal = subtotalLabor;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !plateNumber) {
      alert('Please fill customer and vehicle plate details.');
      return;
    }

    setLoading(true);
    try {
      const selectedTech = technicians.find(t => t.id === technicianId);
      await api.createJobCard({
        customerId,
        customerName,
        customerPhone,
        vehicleId,
        vehiclePlate: plateNumber,
        vehicleMake: make,
        vehicleModel: model,
        vehicleYear: year,
        mileage,
        serviceType,
        priority,
        technicianId,
        technicianName: selectedTech?.name || 'Unassigned',
        complaints,
        diagnosis,
        laborOperations,
        partsUsed: [],
        subtotal: subtotalLabor,
        discount: 0,
        tax: 0,
        grandTotal,
        paidAmount: 0,
        status: 'Draft'
      });

      setSuccessMsg('Job Card created successfully!');
      setTimeout(() => {
        setSuccessMsg('');
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      alert(err.message || 'Failed to create job card');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-lg">
            <Wrench className="w-5 h-5" />
            <span>Create New Workshop Job Card</span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded-md text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {successMsg ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <CheckCircle2 className="w-16 h-16 text-blue-400 mb-3 animate-bounce" />
            <h3 className="text-xl font-bold text-white">{successMsg}</h3>
            <p className="text-slate-400 text-sm mt-1">Job order is now active on the operations board.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Customer Details */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">1. Customer Information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Select Existing</label>
                  <select
                    value={customerId}
                    onChange={handleCustomerChange}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="">-- Or type new below --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Customer Name *</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={e => setCustomerPhone(e.target.value)}
                    placeholder="+974 ..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
              </div>
            </div>

            {/* Vehicle Details */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">2. Vehicle Information</h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Plate Number *</label>
                  <input
                    type="text"
                    value={plateNumber}
                    onChange={e => setPlateNumber(e.target.value)}
                    required
                    placeholder="e.g. 543210"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Make</label>
                  <input
                    type="text"
                    value={make}
                    onChange={e => setMake(e.target.value)}
                    placeholder="Toyota, Nissan..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Model</label>
                  <input
                    type="text"
                    value={model}
                    onChange={e => setModel(e.target.value)}
                    placeholder="Land Cruiser, Patrol..."
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={e => setYear(parseInt(e.target.value) || 2023)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Mileage (km)</label>
                  <input
                    type="number"
                    value={mileage}
                    onChange={e => setMileage(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                  />
                </div>
              </div>
            </div>

            {/* Service & Technician */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">3. Job Assignment & Service Type</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Service Type</label>
                  <select
                    value={serviceType}
                    onChange={e => setServiceType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="Mechanical Repair">Mechanical Repair (ميكانيك)</option>
                    <option value="Denting & Painting">Denting & Painting (سمكرة وصبغ)</option>
                    <option value="Electrical & AC">Electrical & AC (كهرباء ومكيف)</option>
                    <option value="Periodic Service">Periodic Oil & Filter Service (سيرفس دوري)</option>
                    <option value="Brake & Suspension">Brake & Suspension (فرامل ومساعدات)</option>
                    <option value="Full Collision Restoration">Full Collision Restoration (إصلاح حوادث)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Medium">Medium</option>
                    <option value="Urgent">Urgent (مستعجل)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Assign Technician</label>
                  <select
                    value={technicianId}
                    onChange={e => setTechnicianId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="">-- Assign Later --</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>{t.name} ({t.specialization || 'Tech'})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Complaints & Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                4. Customer Complaints & Inspection Notes
              </label>
              <textarea
                value={complaints}
                onChange={e => setComplaints(e.target.value)}
                placeholder="Describe engine sounds, AC issues, body damage, or customer requests..."
                rows={3}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              />
            </div>

            {/* Labor Operations */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">5. Initial Labor Operations</h4>
              </div>

              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  placeholder="e.g. Brake Pads Replacement, Front Bumper Painting"
                  value={laborDesc}
                  onChange={e => setLaborDesc(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
                />
                <input
                  type="number"
                  placeholder="Hours"
                  min="0.5"
                  step="0.5"
                  value={laborHours}
                  onChange={e => setLaborHours(parseFloat(e.target.value) || 1)}
                  className="w-20 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                />
                <input
                  type="number"
                  placeholder="Rate"
                  value={laborRate}
                  onChange={e => setLaborRate(parseFloat(e.target.value) || 150)}
                  className="w-24 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white text-center"
                />
                <button
                  type="button"
                  onClick={handleAddLabor}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm rounded-lg flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>

              {laborOperations.length > 0 && (
                <div className="border border-slate-800 rounded-xl overflow-hidden mb-3">
                  <table className="w-full text-sm text-slate-300">
                    <thead className="bg-slate-800 text-xs text-slate-400">
                      <tr>
                        <th className="p-2.5 text-left">Operation</th>
                        <th className="p-2.5 text-center">Hours</th>
                        <th className="p-2.5 text-right">Rate</th>
                        <th className="p-2.5 text-right">Total (QAR)</th>
                        <th className="p-2.5 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {laborOperations.map(l => (
                        <tr key={l.id}>
                          <td className="p-2.5">{l.description}</td>
                          <td className="p-2.5 text-center">{l.hours} hrs</td>
                          <td className="p-2.5 text-right">{l.rate}</td>
                          <td className="p-2.5 text-right font-bold text-white">{l.total.toFixed(2)}</td>
                          <td className="p-2.5 text-center">
                            <button type="button" onClick={() => handleRemoveLabor(l.id)} className="text-slate-500 hover:text-red-400">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-700 text-slate-300 hover:bg-slate-800 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-lg transition-colors shadow-lg shadow-blue-600/20"
              >
                {loading ? 'Creating Job Card...' : 'Save & Open Job Card'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
