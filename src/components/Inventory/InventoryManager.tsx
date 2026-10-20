import React, { useState } from 'react';
import { InventoryItem, InventoryCategory } from '../../types';
import { useToast } from '../Common/Toast';
import { exportInventoryToCSV } from '../../utils/csvExport';
import { ModuleContainer } from '../Common/ModuleContainer';
import { DataTable } from '../Common/DataTable';
import { Badge } from '../Common/Badge';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingDown, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  SlidersHorizontal,
  X,
  CheckCircle2,
  DollarSign,
  Printer,
  RotateCcw,
  FileText,
  Boxes,
  Download,
  Filter,
  Eye
} from 'lucide-react';
import { InventoryRecordModal } from './InventoryRecordModal';
import { StockAdjustmentModal } from '../Modals/StockAdjustmentModal';
import { useGarage } from '../../context/GarageContext';

interface Props {
  inventory: InventoryItem[];
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onAdjustStock: (id: string, deltaQuantity: number, reason?: string) => void;
  onOpenJobCard?: (jobCardId: string) => void;
  onOpenPO?: (poId: string) => void;
  onOpenSupplier?: (supplierId: string) => void;
  initialLowStockOnly?: boolean;
}

const CATEGORIES: ('ALL' | InventoryCategory)[] = [
  'ALL',
  'Mechanical Parts',
  'Body & Panels',
  'Paints & Primers',
  'Fluids & Lubricants',
  'Consumables & Tools',
];

export const InventoryManager: React.FC<Props> = ({
  inventory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAdjustStock,
  onOpenJobCard,
  onOpenPO,
  onOpenSupplier,
  initialLowStockOnly = false,
}) => {
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<'ALL' | InventoryCategory>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStockOnly, setShowLowStockOnly] = useState(initialLowStockOnly);

  React.useEffect(() => {
    if (initialLowStockOnly) {
      setShowLowStockOnly(true);
    }
  }, [initialLowStockOnly]);

  // Shared Record Shell Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [isStockAdjustOpen, setIsStockAdjustOpen] = useState(false);
  const { settings } = useGarage();

  const filteredItems = inventory.filter(item => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const term = (searchTerm || '').trim().toLowerCase();
    const matchesSearch = !term ||
      (item.name || '').toLowerCase().includes(term) ||
      (item.sku || '').toLowerCase().includes(term) ||
      (item.brand && item.brand.toLowerCase().includes(term)) ||
      (item.fitment && item.fitment.toLowerCase().includes(term)) ||
      (item.rackLocation && item.rackLocation.toLowerCase().includes(term));

    const matchesLowStock = !showLowStockOnly || item.quantityOnHand <= (item.minReorderLevel || 0);

    return matchesCategory && matchesSearch && matchesLowStock;
  });

  const totalStockCostValuation = (inventory || []).reduce((sum, item) => sum + (item.quantityOnHand || 0) * (item.unitCost || 0), 0);
  const lowStockCount = (inventory || []).filter(i => (i.quantityOnHand || 0) <= (i.minReorderLevel || 0)).length;

  const handleOpenNewRecord = () => {
    setSelectedRecordId(null);
    setIsRecordModalOpen(true);
  };

  const handleOpenItemRecord = (item: InventoryItem) => {
    setSelectedRecordId(item.id);
    setIsRecordModalOpen(true);
  };

  const columns = [
    {
      header: 'SKU & Name',
      accessor: (item: InventoryItem) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-2">
            <span className="font-mono text-[11px] text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-100">{item.sku}</span>
            {item.name}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">
            {item.brand || 'General'} • {item.fitment || 'Universal'}
          </div>
        </div>
      ),
      width: '32%'
    },
    {
      header: 'Category',
      accessor: (item: InventoryItem) => (
        <Badge variant="indigo">{item.category}</Badge>
      )
    },
    {
      header: 'Location',
      accessor: (item: InventoryItem) => item.rackLocation || 'Rack A-01',
      className: 'font-mono'
    },
    {
      header: 'Stock Level',
      accessor: (item: InventoryItem) => {
        const isLow = item.quantityOnHand <= item.minReorderLevel;
        return (
          <div className="flex flex-col gap-1 items-center">
            <Badge variant={isLow ? 'warning' : 'default'} dot={isLow}>
              {item.quantityOnHand} {item.unit}
            </Badge>
            <span className="text-[10px] text-slate-400 font-mono">Min: {item.minReorderLevel}</span>
          </div>
        );
      },
      headerClassName: 'text-center',
      className: 'text-center'
    },
    {
      header: 'Selling / Cost (QAR)',
      accessor: (item: InventoryItem) => (
        <div className="flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold text-slate-400">Sell:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.sellingPrice ?? 0}
              onChange={(e) => onUpdateItem(item.id, { sellingPrice: parseFloat(e.target.value) || 0 })}
              className="w-20 px-1.5 py-0.5 border border-slate-200 hover:border-sky-400 focus:border-sky-500 rounded text-right font-mono font-bold text-xs text-slate-900 bg-white outline-none shadow-2xs"
              title="Click to edit selling price"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400">Cost:</span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={item.unitCost ?? (item as any).costPrice ?? 0}
              onChange={(e) => onUpdateItem(item.id, { unitCost: parseFloat(e.target.value) || 0 })}
              className="w-18 px-1 py-0.5 border border-slate-200 hover:border-sky-400 focus:border-sky-500 rounded text-right font-mono text-[10px] text-slate-600 bg-white outline-none shadow-2xs"
              title="Click to edit unit cost"
            />
          </div>
        </div>
      ),
      headerClassName: 'text-right'
    },
    {
      header: 'Actions',
      accessor: (item: InventoryItem) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            onClick={(e) => { e.stopPropagation(); handleOpenItemRecord(item); }}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors cursor-pointer"
            title="Open Full Record Management"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Record</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete part SKU ${item.sku}?`)) {
                onDeleteItem(item.id);
              }
            }}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Delete Part"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
      headerClassName: 'text-center'
    }
  ];

  return (
    <ModuleContainer
      title="Inventory & Warehouse Parts"
      subtitle="Manage your stock levels, auto parts catalog, barcode tags, and procurement"
      icon={Package}
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsStockAdjustOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
            title="Perform controlled stock adjustment with mandatory reason"
          >
            <SlidersHorizontal className="w-4 h-4 text-sky-600" />
            <span>Adjust Stock</span>
          </button>
          <button
            onClick={() => {
              exportInventoryToCSV(filteredItems);
              addToast(`Exported ${filteredItems.length} inventory items to CSV.`, 'info');
            }}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleOpenNewRecord}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Part Record</span>
          </button>
        </div>
      }
      stats={
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] font-bold text-emerald-700 font-mono">
              Valuation: QAR {totalStockCostValuation.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{lowStockCount} Low Stock Alert</span>
            </div>
          )}
        </div>
      }
    >
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {CATEGORIES.map(category => (
          <button
            key={category}
            onClick={() => setActiveCategory(category)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === category
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      <DataTable
        data={filteredItems}
        columns={columns}
        onRowClick={handleOpenItemRecord}
        searchPlaceholder="Search SKU, Part Name, Brand, Location..."
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                showLowStockOnly 
                  ? 'bg-amber-50 border-amber-200 text-amber-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${showLowStockOnly ? 'text-amber-500' : 'text-slate-400'}`} />
              <span>Low Stock Only</span>
            </button>
          </div>
        }
      />

      {/* SHARED RECORD MANAGEMENT MODAL */}
      <InventoryRecordModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        initialItemId={selectedRecordId}
        onOpenJobCard={onOpenJobCard}
        onOpenPO={onOpenPO}
        onOpenSupplier={onOpenSupplier}
      />

      {/* CONTROLLED STOCK ADJUSTMENT MODAL */}
      {isStockAdjustOpen && (
        <StockAdjustmentModal
          isOpen={isStockAdjustOpen}
          onClose={() => setIsStockAdjustOpen(false)}
          inventory={inventory}
          settings={settings}
          onAdjustStock={onAdjustStock}
        />
      )}
    </ModuleContainer>
  );
};
