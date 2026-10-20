import React, { useState, useEffect } from 'react';
import { InventoryItem, PurchaseOrder, CounterSale, GarageSettings } from '../../types';
import { InventoryManager } from './InventoryManager';
import { PurchaseSalesManager } from '../PurchaseSales/PurchaseSalesManager';
import { ModuleContainer } from '../Common/ModuleContainer';
import { Package, ShoppingCart, Users, Truck, ArrowLeftRight } from 'lucide-react';

interface Props {
  inventory: InventoryItem[];
  purchaseOrders: PurchaseOrder[];
  counterSales: CounterSale[];
  settings: GarageSettings;
  onAddItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  onDeleteItem: (id: string) => void;
  onAdjustStock: (id: string, deltaQuantity: number, reason?: string) => void;
  onCreatePurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'poNumber'>) => void;
  onUpdatePOStatus: (id: string, status: PurchaseOrder['status']) => void;
  onCreateCounterSale: (sale: Omit<CounterSale, 'id' | 'saleNumber'>) => void;
  onReceiveGoods: (poId: string, itemsReceived: Array<{ itemId: string; qty: number; unitCost: number }>) => void;
  initialTab?: 'parts' | 'orders' | 'suppliers' | 'grn' | 'sales';
  initialLowStockOnly?: boolean;
}

export const PartsAndStockView: React.FC<Props> = ({
  inventory,
  purchaseOrders,
  counterSales,
  settings,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onAdjustStock,
  onCreatePurchaseOrder,
  onUpdatePOStatus,
  onCreateCounterSale,
  onReceiveGoods,
  initialTab = 'parts',
  initialLowStockOnly = false,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'parts' | 'orders' | 'suppliers' | 'grn' | 'sales'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  const lowStockCount = inventory.filter(i => {
    const stock = Number(i.quantityOnHand ?? i.stockQuantity ?? 0);
    const minLevel = Number(i.minReorderLevel ?? i.minStockLevel ?? 5);
    return stock <= minLevel;
  }).length;

  const tabs = [
    { key: 'parts', label: 'Parts Inventory', icon: Package, badge: lowStockCount > 0 ? `${lowStockCount} Low` : null },
    { key: 'orders', label: 'Purchase Orders', icon: ShoppingCart },
    { key: 'grn', label: 'Goods Receipt (GRN)', icon: Truck },
    { key: 'sales', label: 'Counter Sales & Returns', icon: ArrowLeftRight },
  ];

  return (
    <div className="space-y-4">
      {/* Sub-navigation bar inside Parts & Stock */}
      <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-1.5 overflow-x-auto custom-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main View Area */}
      {activeSubTab === 'parts' && (
        <InventoryManager
          inventory={inventory}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onAdjustStock={onAdjustStock}
          initialLowStockOnly={initialLowStockOnly}
        />
      )}

      {activeSubTab === 'orders' && (
        <PurchaseSalesManager
          purchaseOrders={purchaseOrders}
          counterSales={counterSales}
          inventory={inventory}
          settings={settings}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onUpdatePOStatus={onUpdatePOStatus}
          onCreateCounterSale={onCreateCounterSale}
          initialTab="purchases"
          onReceiveGoods={onReceiveGoods}
        />
      )}

      {activeSubTab === 'suppliers' && (
        <PurchaseSalesManager
          purchaseOrders={purchaseOrders}
          counterSales={counterSales}
          inventory={inventory}
          settings={settings}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onUpdatePOStatus={onUpdatePOStatus}
          onCreateCounterSale={onCreateCounterSale}
          initialTab="suppliers"
          onReceiveGoods={onReceiveGoods}
        />
      )}

      {activeSubTab === 'grn' && (
        <PurchaseSalesManager
          purchaseOrders={purchaseOrders}
          counterSales={counterSales}
          inventory={inventory}
          settings={settings}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onUpdatePOStatus={onUpdatePOStatus}
          onCreateCounterSale={onCreateCounterSale}
          initialTab="grn"
          onReceiveGoods={onReceiveGoods}
        />
      )}

      {activeSubTab === 'sales' && (
        <PurchaseSalesManager
          purchaseOrders={purchaseOrders}
          counterSales={counterSales}
          inventory={inventory}
          settings={settings}
          onCreatePurchaseOrder={onCreatePurchaseOrder}
          onUpdatePOStatus={onUpdatePOStatus}
          onCreateCounterSale={onCreateCounterSale}
          initialTab="sales"
          onReceiveGoods={onReceiveGoods}
        />
      )}
    </div>
  );
};
