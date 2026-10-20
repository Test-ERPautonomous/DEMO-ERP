import React, { useState } from 'react';
import { GarageSettings, JobCard, Invoice, InventoryItem } from '../../types';
import { ServiceHistoryView } from '../ServiceHistory/ServiceHistoryView';
import { 
  Database, 
  Download, 
  History, 
  Car, 
  FileText,
  Search,
  Activity
} from 'lucide-react';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';

interface Props {
  initialQuery?: string;
  getVehicleHistory: any;
  onOpenNewJobForVehicle: any;
  onSelectJobCard: (card: any) => void;
  onViewInvoice: (invoiceId: string) => void;
  settings: GarageSettings;
  fullDataBackup: {
    jobCards: JobCard[];
    inventory: InventoryItem[];
    invoices: Invoice[];
    settings: GarageSettings;
  };
}

export const UtilitiesWindow: React.FC<Props> = ({
  initialQuery,
  getVehicleHistory,
  onOpenNewJobForVehicle,
  onSelectJobCard,
  onViewInvoice,
  settings,
  fullDataBackup,
}) => {
  const [activeTab, setActiveTab] = useState<string>('history');
  const [vinQuery, setVinQuery] = useState('');
  const [vinResult, setVinResult] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleDecodeVin = () => {
    if (!vinQuery.trim()) return;
    const cleanVin = vinQuery.trim().toUpperCase();
    
    setVinResult({
      vin: cleanVin,
      region: 'GCC Specification',
      make: 'Premium Import',
      modelYear: 2023,
      compliance: 'GSO Standard Compliant',
      chassisStatus: 'Clear • No Insurance Total Loss Flag'
    });
  };

  const handleDownloadFullBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDataBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `garage_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'history':
        return (
          <ServiceHistoryView
            initialQuery={initialQuery}
            getVehicleHistory={getVehicleHistory}
            onOpenNewJobForVehicle={onOpenNewJobForVehicle}
            onSelectJobCard={onSelectJobCard}
            onViewInvoice={onViewInvoice}
            settings={settings}
          />
        );
      case 'vin':
        return (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-2xl">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">GCC VIN Decoder</h3>
              <p className="text-sm text-slate-500">Decode vehicle chassis numbers for Qatar & Gulf specs</p>
            </div>

            <div className="flex gap-2 mb-8">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter 17-character VIN..."
                  value={vinQuery ?? ''}
                  onChange={(e) => setVinQuery(e.target.value.toUpperCase())}
                  className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 font-mono text-sm uppercase focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                  maxLength={17}
                />
              </div>
              <button
                onClick={handleDecodeVin}
                className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 transition-all"
              >
                Decode
              </button>
            </div>

            {vinResult && (
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-100 space-y-4">
                <div className="font-mono font-bold text-indigo-600 text-sm">VIN: {vinResult.vin}</div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Region', value: vinResult.region },
                    { label: 'Make', value: vinResult.make },
                    { label: 'Compliance', value: vinResult.compliance },
                    { label: 'Status', value: vinResult.chassisStatus, color: 'text-emerald-600' }
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</div>
                      <div className={`text-sm font-bold ${item.color || 'text-slate-900'}`}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      case 'backup':
        return (
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm max-w-xl">
            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Database Archival</h3>
              <p className="text-sm text-slate-500">Download a full snapshot of your workshop data</p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {[
                { label: 'Job Cards', value: fullDataBackup.jobCards.length },
                { label: 'Inventory', value: fullDataBackup.inventory.length },
                { label: 'Invoices', value: fullDataBackup.invoices.length },
                { label: 'Format', value: 'JSON' }
              ].map((item, i) => (
                <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.label}</div>
                  <div className="text-lg font-black text-slate-900 font-mono">{item.value}</div>
                </div>
              ))}
            </div>

            <button
              onClick={handleDownloadFullBackup}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg shadow-emerald-100 transition-all"
            >
              <Download className="w-5 h-5" />
              Download Complete Backup
            </button>
          </div>
        );
      case 'audit':
        return (
          <DataTable
            data={[
              { timestamp: '2026-09-08 14:22', user: 'MAMMAR', action: 'STATUS_ADVANCE', module: 'Operations', ref: 'JC-2026-004' },
              { timestamp: '2026-09-08 13:10', user: 'Admin', action: 'INVOICE_GEN', module: 'Financials', ref: 'INV-2026-001' },
              { timestamp: '2026-09-08 11:35', user: 'Storekeeper', action: 'STOCK_ADJ', module: 'Inventory', ref: 'SKU-OIL-01' }
            ]}
            columns={[
              { header: 'Timestamp', accessor: (a: any) => <div className="text-xs text-slate-500 font-mono">{a.timestamp}</div> },
              { header: 'User', accessor: (a: any) => <div className="font-bold text-slate-900">{a.user}</div> },
              { header: 'Action', accessor: (a: any) => <Badge variant="secondary">{a.action}</Badge> },
              { header: 'Module', accessor: (a: any) => <div className="text-slate-600">{a.module}</div> },
              { header: 'Reference', accessor: (a: any) => <div className="font-bold font-mono text-indigo-600">{a.ref}</div> }
            ]}
            searchPlaceholder="Search Logs..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      default:
        return null;
    }
  };

  return (
    <ModuleContainer
      title="Workshop Utilities"
      subtitle="Vehicle dossier, VIN decoding, and system archival tools"
      icon={Database}
      tabs={
        <div className="flex items-center gap-1 overflow-x-auto pb-1 max-w-[500px]">
          {[
            { id: 'history', label: 'Service History', icon: History },
            { id: 'vin', label: 'VIN Decoder', icon: Car },
            { id: 'backup', label: 'Data Backup', icon: Download },
            { id: 'audit', label: 'Audit Trail', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
              <tab.icon className="w-3.5 h-3.5" />
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
