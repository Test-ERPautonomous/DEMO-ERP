import React, { useState, useEffect } from 'react';
import { 
  PurchaseOrder, 
  CounterSale, 
  InventoryItem, 
  GarageSettings,
  SupplierMasterItem
} from '../../types';
import { 
  ShoppingCart, 
  Truck, 
  Plus, 
  CheckCircle2, 
  Clock, 
  Receipt, 
  Search, 
  Trash2, 
  X, 
  Calendar, 
  Building2, 
  RotateCcw, 
  PackageCheck, 
  FileText, 
  Check, 
  Phone,
  Mail,
  MapPin,
  Send,
  AlertCircle,
  Eye,
  ArrowRight
} from 'lucide-react';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';
import { useGarage } from '../../context/GarageContext';
import { PurchaseOrderRecordModal } from './PurchaseOrderRecordModal';
import { GoodsReceiptNoteRecordModal } from './GoodsReceiptNoteRecordModal';
import { CounterSaleRecordModal } from './CounterSaleRecordModal';
import { formatDate } from '../../utils/formatters';

export interface GoodsReceiptRecord {
  id: string;
  grnNumber: string;
  poNumber: string;
  poId?: string;
  supplierName: string;
  supplierContact?: string;
  deliveryNoteNumber: string;
  receiptDate: string;
  receivedBy: string;
  items: Array<{
    partId?: string;
    sku: string;
    name: string;
    quantity: number;
    unitCost: number;
    total: number;
  }>;
  totalAmount: number;
  notes?: string;
  status: 'Inspected & Received' | 'Pending Verification';
}

interface Props {
  purchaseOrders: PurchaseOrder[];
  counterSales: CounterSale[];
  inventory: InventoryItem[];
  settings: GarageSettings;
  onCreatePurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => void;
  onUpdatePOStatus: (id: string, status: PurchaseOrder['status']) => void;
  onCreateCounterSale: (sale: Omit<CounterSale, 'id' | 'saleNumber'>) => void;
  initialTab?: 'purchases' | 'new-po' | 'grn' | 'sales' | 'suppliers' | 'returns';
  onReceiveGoods?: (poId: string, itemsReceived: Array<{ itemId: string; qty: number; unitCost: number }>) => void;
  onOpenSupplier?: (supplierId: string) => void;
}

export const PurchaseSalesManager: React.FC<Props> = ({
  purchaseOrders,
  counterSales,
  inventory,
  settings,
  onCreatePurchaseOrder,
  onUpdatePOStatus,
  onCreateCounterSale,
  initialTab,
  onReceiveGoods,
  onOpenSupplier
}) => {
  const { suppliers } = useGarage();
  const [activeTab, setActiveTab] = useState<'purchases' | 'grn' | 'sales' | 'suppliers' | 'returns'>(
    initialTab === 'new-po' ? 'purchases' : (initialTab || 'purchases')
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // Shared Record Shell Modals
  const [isPoModalOpen, setIsPoModalOpen] = useState(initialTab === 'new-po');
  const [selectedPoId, setSelectedPoId] = useState<string | null>(null);

  const [isGrnModalOpen, setIsGrnModalOpen] = useState(false);
  const [selectedGrnPoId, setSelectedGrnPoId] = useState<string | null>(null);

  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);

  // GRN records synchronized with purchase orders
  const [grnRecords, setGrnRecords] = useState<GoodsReceiptRecord[]>([
    {
      id: 'grn-1',
      grnNumber: 'GRN-0001',
      poNumber: 'PO-0001',
      supplierName: 'Metro Auto Supplies Co.',
      deliveryNoteNumber: 'DN-99420',
      receiptDate: '2026-09-04',
      receivedBy: 'Hamza (Store Supervisor)',
      items: [
        { sku: 'BRK-PAD-F', name: 'Front Ceramic Brake Pads (Toyota/Lexus)', quantity: 10, unitCost: 45, total: 450 },
        { sku: 'OIL-FLT-01', name: 'Engine Oil Filter Cartridge', quantity: 25, unitCost: 8, total: 200 }
      ],
      totalAmount: 650,
      status: 'Inspected & Received'
    }
  ]);

  const computedGrnRecords = React.useMemo(() => {
    const list: GoodsReceiptRecord[] = [...grnRecords];
    const existingPoNumbers = new Set(list.map(g => g.poNumber));

    purchaseOrders.forEach(po => {
      if ((po.status === 'Received' || po.status === 'Partially Received') && !existingPoNumbers.has(po.poNumber)) {
        list.push({
          id: `grn-po-${po.id}`,
          grnNumber: `GRN-${po.poNumber.replace(/^PO-?/i, '')}`,
          poNumber: po.poNumber,
          poId: po.id,
          supplierName: po.supplierName,
          supplierContact: po.supplierContact,
          deliveryNoteNumber: `DN-${po.poNumber.replace(/^PO-?/i, '')}`,
          receiptDate: po.receivedDate || po.date || new Date().toISOString().split('T')[0],
          receivedBy: 'Store Supervisor',
          items: (po.items || []).map(i => ({
            partId: i.partId || i.sku,
            sku: i.sku,
            name: i.name,
            quantity: i.quantityReceived || i.quantityOrdered || i.quantity || 0,
            unitCost: i.unitCost || 0,
            total: (i.quantityReceived || i.quantityOrdered || i.quantity || 0) * (i.unitCost || 0)
          })),
          totalAmount: po.totalAmount,
          notes: po.notes,
          status: 'Inspected & Received'
        });
      }
    });

    return list;
  }, [grnRecords, purchaseOrders]);

  const handleOpenNewPO = () => {
    setSelectedPoId(null);
    setIsPoModalOpen(true);
  };

  const handleOpenPORecord = (po: PurchaseOrder) => {
    setSelectedPoId(po.id);
    setIsPoModalOpen(true);
  };

  const handleOpenNewGRN = (poId?: string) => {
    setSelectedGrnPoId(poId || null);
    setIsGrnModalOpen(true);
  };

  const purchaseColumns = [
    {
      header: 'PO Number & Date',
      accessor: (po: PurchaseOrder) => (
        <div>
          <div className="font-mono font-bold text-indigo-600">{po.poNumber || 'PO-0001'}</div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-mono">
            <Calendar className="w-3 h-3" /> {formatDate(po.date)}
          </div>
        </div>
      )
    },
    {
      header: 'Supplier',
      accessor: (po: PurchaseOrder) => (
        <div>
          <div className="font-bold text-slate-900">{po.supplierName}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{po.supplierContact}</div>
        </div>
      )
    },
    {
      header: 'Items Ordered',
      accessor: (po: PurchaseOrder) => (
        <div>
          <div className="font-bold text-slate-900">{(po.items || []).length} items</div>
          <div className="text-[10px] text-slate-400 truncate max-w-[200px]">
            {(po.items || []).map(i => `${i.name} (x${i.quantityOrdered ?? i.quantity})`).join(', ')}
          </div>
        </div>
      )
    },
    {
      header: 'Status',
      accessor: (po: PurchaseOrder) => (
        <Badge variant={po.status === 'Received' ? 'success' : po.status === 'Partially Received' ? 'indigo' : 'amber'} dot>
          {po.status}
        </Badge>
      )
    },
    {
      header: 'Total Value',
      accessor: (po: PurchaseOrder) => <div className="text-right font-bold text-slate-900 font-mono">QAR {Number(po.totalAmount || 0).toFixed(2)}</div>,
      headerClassName: 'text-right'
    },
    {
      header: 'Actions',
      accessor: (po: PurchaseOrder) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenPORecord(po); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
            title="Open PO Record"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
          {po.status !== 'Received' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleOpenNewGRN(po.id); }}
              className="px-2.5 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-all flex items-center gap-1 cursor-pointer"
              title="Create Goods Receipt Note"
            >
              <PackageCheck className="w-3.5 h-3.5" />
              <span>Receive GRN</span>
            </button>
          )}
        </div>
      ),
      headerClassName: 'text-right'
    }
  ];

  const salesColumns = [
    {
      header: 'Sale #',
      accessor: (sale: CounterSale) => <div className="font-mono font-bold text-emerald-600">{sale.saleNumber || 'CS-0001'}</div>
    },
    {
      header: 'Customer',
      accessor: (sale: CounterSale) => (
        <div>
          <div className="font-bold text-slate-900">{sale.customerName}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">{sale.customerPhone}</div>
        </div>
      )
    },
    {
      header: 'Date',
      accessor: (sale: CounterSale) => <div className="text-slate-600 font-mono">{formatDate(sale.date)}</div>
    },
    {
      header: 'Method',
      accessor: (sale: CounterSale) => <Badge variant="secondary">{sale.paymentMethod}</Badge>
    },
    {
      header: 'Grand Total',
      accessor: (sale: CounterSale) => <div className="text-right font-bold text-emerald-800 font-mono">QAR {Number(sale.totalAmount || 0).toFixed(2)}</div>,
      headerClassName: 'text-right'
    }
  ];

  const grnColumns = [
    {
      header: 'GRN Number',
      accessor: (grn: GoodsReceiptRecord) => <div className="font-mono font-bold text-emerald-700">{grn.grnNumber}</div>
    },
    {
      header: 'Linked PO',
      accessor: (grn: GoodsReceiptRecord) => <div className="font-mono font-bold text-indigo-700">{grn.poNumber}</div>
    },
    {
      header: 'Supplier',
      accessor: (grn: GoodsReceiptRecord) => (
        <div>
          <div className="font-bold text-slate-900">{grn.supplierName}</div>
          <div className="text-[10px] text-slate-500 mt-0.5">DN: {grn.deliveryNoteNumber}</div>
        </div>
      )
    },
    {
      header: 'Received By',
      accessor: (grn: GoodsReceiptRecord) => <div className="text-slate-700 font-medium">{grn.receivedBy}</div>
    },
    {
      header: 'Total Value',
      accessor: (grn: GoodsReceiptRecord) => <div className="text-right font-bold text-slate-900 font-mono">QAR {Number(grn.totalAmount || 0).toFixed(2)}</div>,
      headerClassName: 'text-right'
    },
    {
      header: 'Action',
      accessor: (grn: GoodsReceiptRecord) => (
        <div className="flex items-center justify-end">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenNewGRN(grn.poId); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>GRN Record</span>
          </button>
        </div>
      ),
      headerClassName: 'text-right'
    }
  ];

  const supplierColumns = [
    {
      header: 'Supplier Name',
      accessor: (s: SupplierMasterItem) => (
        <div>
          <div className="font-bold text-slate-900">{s.name}</div>
          <div className="text-[10px] text-slate-500">{s.category || 'Automotive Spares Vendor'}</div>
        </div>
      )
    },
    {
      header: 'Contact Person',
      accessor: (s: SupplierMasterItem) => (
        <div>
          <div className="font-medium text-slate-800">{s.contact}</div>
          <div className="text-[10px] text-slate-500 font-mono">{s.phone}</div>
        </div>
      )
    },
    {
      header: 'Location',
      accessor: (s: SupplierMasterItem) => (
        <div className="text-xs text-slate-600 flex items-center gap-1">
          <MapPin className="w-3 h-3 text-slate-400" />
          <span>{s.location || 'Industrial Area, Doha'}</span>
        </div>
      )
    },
    {
      header: 'Payment Terms',
      accessor: (s: SupplierMasterItem) => (
        <span className="text-xs font-medium text-slate-600 font-mono">{s.terms || '30 Days Net'}</span>
      )
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'purchases':
        return (
          <div className="space-y-4">
            {bannerMessage && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-semibold flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{bannerMessage}</span>
                </div>
                <button onClick={() => setBannerMessage(null)} className="text-emerald-600 hover:text-emerald-900">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
            <DataTable
              data={purchaseOrders}
              columns={purchaseColumns}
              onRowClick={handleOpenPORecord}
              searchPlaceholder="Search PO #, Supplier..."
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>
        );
      case 'grn':
        return (
          <DataTable
            data={computedGrnRecords}
            columns={grnColumns}
            onRowClick={(grn) => handleOpenNewGRN(grn.poId)}
            searchPlaceholder="Search GRN #, Supplier..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'sales':
        return (
          <DataTable
            data={counterSales}
            columns={salesColumns}
            onRowClick={(s) => { setSelectedSaleId(s.id); setIsSaleModalOpen(true); }}
            searchPlaceholder="Search Sale #, Customer..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'suppliers':
        return (
          <DataTable
            data={suppliers}
            columns={supplierColumns}
            onRowClick={(s) => onOpenSupplier && onOpenSupplier(s.id)}
            searchPlaceholder="Search Supplier, Location, Terms..."
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
          />
        );
      case 'returns':
        return (
          <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
            <RotateCcw className="w-8 h-8 mx-auto text-slate-400" />
            <h3 className="font-bold text-sm text-slate-800">Purchase Returns Log</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">No pending vendor returns at this time. Return records will appear here when parts are rejected during GRN inspection.</p>
          </div>
        );
      default:
        return null;
    }
  };

  const getModuleTitle = () => {
    switch (activeTab) {
      case 'purchases': return 'Purchase Orders';
      case 'grn': return 'Goods Receipt Notes (GRN)';
      case 'sales': return 'Counter Sales';
      case 'suppliers': return 'Suppliers Directory';
      case 'returns': return 'Purchase Returns';
      default: return 'Purchasing & Material Inwarding';
    }
  };

  const getModuleIcon = () => {
    switch (activeTab) {
      case 'purchases': return Truck;
      case 'grn': return PackageCheck;
      case 'sales': return ShoppingCart;
      case 'suppliers': return Building2;
      case 'returns': return RotateCcw;
      default: return Receipt;
    }
  };

  return (
    <ModuleContainer
      title={getModuleTitle()}
      subtitle="Manage vendor purchase orders, GRN stock inwarding, Qatar supplier accounts, and OTC parts sales"
      icon={getModuleIcon()}
      actions={
        <div className="flex items-center gap-2">
          {activeTab === 'purchases' && (
            <button
              id="btn-new-purchase-order"
              onClick={handleOpenNewPO}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New PO Record</span>
            </button>
          )}
          {activeTab === 'grn' && (
            <button
              onClick={() => handleOpenNewGRN()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New GRN Record</span>
            </button>
          )}
          {activeTab === 'sales' && (
            <button
              onClick={() => { setSelectedSaleId(null); setIsSaleModalOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Counter Sale</span>
            </button>
          )}
        </div>
      }
      tabs={
        <div className="flex items-center gap-1">
          {(['purchases', 'grn', 'sales', 'suppliers', 'returns'] as const).map(tab => {
            const label = tab === 'purchases' ? 'Purchase Orders'
              : tab === 'grn' ? 'Goods Receipts (GRN)'
              : tab === 'sales' ? 'Counter Sales'
              : tab === 'suppliers' ? 'Suppliers'
              : 'Returns';
            return (
              <button
                key={tab}
                id={`tab-${tab}`}
                onClick={() => { setActiveTab(tab); setSearchTerm(''); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab ? 'bg-white shadow-xs text-indigo-600 font-extrabold' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      }
    >
      {renderContent()}

      {/* SHARED PURCHASE ORDER RECORD MODAL */}
      <PurchaseOrderRecordModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        poId={selectedPoId}
        onOpenGRN={(poId) => {
          setIsPoModalOpen(false);
          setSelectedGrnPoId(poId);
          setIsGrnModalOpen(true);
        }}
        onOpenSupplier={onOpenSupplier}
      />

      {/* SHARED GOODS RECEIPT NOTE RECORD MODAL */}
      <GoodsReceiptNoteRecordModal
        isOpen={isGrnModalOpen}
        onClose={() => setIsGrnModalOpen(false)}
        initialPoId={selectedGrnPoId}
        onOpenPO={(poId) => {
          setIsGrnModalOpen(false);
          setSelectedPoId(poId);
          setIsPoModalOpen(true);
        }}
      />

      {/* SHARED COUNTER SALE RECORD MODAL */}
      <CounterSaleRecordModal
        isOpen={isSaleModalOpen}
        onClose={() => {
          setIsSaleModalOpen(false);
          setSelectedSaleId(null);
        }}
        saleId={selectedSaleId}
      />
    </ModuleContainer>
  );
};
