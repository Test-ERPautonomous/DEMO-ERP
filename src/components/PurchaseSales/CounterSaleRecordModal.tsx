import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShoppingCart, 
  User, 
  Package, 
  CreditCard, 
  Receipt, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Search,
  X,
  Minus,
  Banknote,
  PauseCircle,
  PlayCircle,
  History,
  Tag,
  Building,
  Car,
  Phone,
  ArrowRight,
  Filter,
  Check
} from 'lucide-react';
import { CounterSale, InventoryItem, GarageSettings, CustomerMasterItem } from '../../types';
import { useGarage } from '../../context/GarageContext';
import { api } from '../../lib/api';
import { formatDate } from '../../utils/formatters';
import { AdvancedItemSearchModal } from '../Modals/AdvancedItemSearchModal';

export interface CounterSaleRecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  saleId?: string | null;
}

interface CartItem {
  itemId: string;
  sku: string;
  name: string;
  category?: string;
  rackLocation?: string;
  quantity: number;
  unitPrice: number;
  total: number;
  availableStock?: number;
  isCustom?: boolean;
}

interface ParkedCart {
  id: string;
  timestamp: string;
  customerName: string;
  items: CartItem[];
  totalAmount: number;
}

export const CounterSaleRecordModal: React.FC<CounterSaleRecordModalProps> = ({
  isOpen,
  onClose,
  saleId
}) => {
  const { 
    counterSales, 
    inventory, 
    customers,
    createCounterSale, 
    settings 
  } = useGarage();

  // Mode: 'pos' (active sale) or 'history' (recent counter sales)
  const [viewMode, setViewMode] = useState<'pos' | 'history'>('pos');
  const [selectedHistorySale, setSelectedHistorySale] = useState<CounterSale | null>(null);

  // Search & Filters in parts catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(true);

  // Sale metadata
  const [saleNumber, setSaleNumber] = useState('CS-0001');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  // Customer options
  const [customerType, setCustomerType] = useState<'walkin' | 'registered'>('walkin');
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerPhone, setCustomerPhone] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [notes, setNotes] = useState('');

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Card' | 'UPI/Bank' | 'Credit'>('Cash');
  const [amountTendered, setAmountTendered] = useState<string>('');

  // Parked Carts (Hold & Resume)
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>([]);
  const [showParkedList, setShowParkedList] = useState(false);

  // Custom Item Modal State
  const [isCustomItemOpen, setIsCustomItemOpen] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    name: '',
    sku: '',
    price: 50,
    qty: 1,
    category: 'Consumables & Tools'
  });

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<CounterSale | null>(null);

  // Load existing sale if opened in view mode
  useEffect(() => {
    if (!isOpen) return;

    if (saleId) {
      const existing = counterSales.find(s => s.id === saleId);
      if (existing) {
        setLastCompletedSale(existing);
        setShowReceiptModal(true);
        return;
      }
    }

    // New Sale setup
    resetSaleState();
  }, [isOpen, saleId, counterSales]);

  const resetSaleState = () => {
    setCart([]);
    setCustomerType('walkin');
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setVehiclePlate('');
    setSelectedCustomerId('');
    setDiscountValue(0);
    setNotes('');
    setPaymentMethod('Cash');
    setAmountTendered('');
    setErrorMsg(null);
    setSuccessMsg(null);
    setDate(new Date().toISOString().split('T')[0]);
    setTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

    api.getNextDocumentNumber('COUNTER_SALE')
      .then(res => {
        if (res?.code) setSaleNumber(res.code);
        else setSaleNumber(`CS-${String(counterSales.length + 1).padStart(4, '0')}`);
      })
      .catch(() => {
        setSaleNumber(`CS-${String(counterSales.length + 1).padStart(4, '0')}`);
      });
  };

  // Filtered Parts Catalog
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    return (inventory || []).filter(item => {
      if (!item) return false;
      const stock = Number(item.quantityOnHand ?? item.stockQuantity ?? 0);
      if (inStockOnly && stock <= 0) return false;

      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      if (!q) return true;
      return (
        (item.name || '').toLowerCase().includes(q) ||
        (item.sku || '').toLowerCase().includes(q) ||
        (item.brand && item.brand.toLowerCase().includes(q)) ||
        (item.fitment && item.fitment.toLowerCase().includes(q)) ||
        (item.rackLocation && item.rackLocation.toLowerCase().includes(q))
      );
    });
  }, [inventory, searchQuery, selectedCategory, inStockOnly]);

  // Cart operations
  const addToCart = (item: InventoryItem, qty: number = 1) => {
    const existingIndex = cart.findIndex(c => c.itemId === item.id);
    const available = Number(item.quantityOnHand ?? item.stockQuantity ?? 0);
    const price = Number(item.sellingPrice ?? item.unitPrice ?? 50);
    const quantityToAdd = Math.max(1, qty || 1);

    if (existingIndex > -1) {
      const updated = [...cart];
      const cur = updated[existingIndex];
      if (cur.quantity + quantityToAdd > available) {
        setErrorMsg(`Maximum available warehouse stock reached for ${item.name} (${available} in stock).`);
        setTimeout(() => setErrorMsg(null), 3000);
        return;
      }
      cur.quantity += quantityToAdd;
      cur.total = cur.quantity * cur.unitPrice;
      setCart(updated);
    } else {
      if (available <= 0) {
        setErrorMsg(`Cannot add ${item.name} - currently out of stock.`);
        setTimeout(() => setErrorMsg(null), 3000);
        return;
      }
      const actualQty = Math.min(quantityToAdd, available);
      setCart(prev => [
        ...prev,
        {
          itemId: item.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          rackLocation: item.rackLocation,
          quantity: actualQty,
          unitPrice: price,
          total: price * actualQty,
          availableStock: available,
          isCustom: false
        }
      ]);
    }
  };

  const updateCartQty = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    const updated = [...cart];
    const it = updated[index];
    if (it.availableStock !== undefined && newQty > it.availableStock) {
      setErrorMsg(`Only ${it.availableStock} in stock for ${it.name}.`);
      setTimeout(() => setErrorMsg(null), 3000);
      it.quantity = it.availableStock;
    } else {
      it.quantity = newQty;
    }
    it.total = it.quantity * it.unitPrice;
    setCart(updated);
  };

  const updateCartPrice = (index: number, newPrice: number) => {
    const updated = [...cart];
    const it = updated[index];
    it.unitPrice = Math.max(0, newPrice);
    it.total = it.quantity * it.unitPrice;
    setCart(updated);
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddCustomItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customItemForm.name.trim()) return;

    const customId = `custom-${Date.now()}`;
    const customSku = customItemForm.sku.trim() || `GEN-${Math.floor(1000 + Math.random() * 9000)}`;
    const price = Number(customItemForm.price) || 0;
    const qty = Number(customItemForm.qty) || 1;

    setCart(prev => [
      ...prev,
      {
        itemId: customId,
        sku: customSku,
        name: customItemForm.name.trim(),
        category: customItemForm.category,
        quantity: qty,
        unitPrice: price,
        total: qty * price,
        availableStock: 999,
        isCustom: true
      }
    ]);

    setCustomItemForm({
      name: '',
      sku: '',
      price: 50,
      qty: 1,
      category: 'Consumables & Tools'
    });
    setIsCustomItemOpen(false);
  };

  // Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, it) => sum + (Number(it.total) || 0), 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    if (discountType === 'percent') {
      return (subtotal * Math.min(100, Math.max(0, discountValue))) / 100;
    }
    return Math.min(subtotal, Math.max(0, discountValue));
  }, [subtotal, discountType, discountValue]);

  const grandTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount);
  }, [subtotal, discountAmount]);

  const changeDue = useMemo(() => {
    const tendered = parseFloat(amountTendered);
    if (isNaN(tendered) || tendered < grandTotal) return 0;
    return tendered - grandTotal;
  }, [amountTendered, grandTotal]);

  // Handle Registered Customer Selection
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerPhone(found.phone || '');
    }
  };

  // Park Cart (Hold Sale)
  const handleParkCart = () => {
    if (cart.length === 0) return;
    const parked: ParkedCart = {
      id: `parked-${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      customerName: customerName.trim() || 'Walk-in Customer',
      items: [...cart],
      totalAmount: grandTotal
    };
    setParkedCarts(prev => [parked, ...prev]);
    resetSaleState();
    setSuccessMsg('Current cart parked on hold. You can resume it anytime.');
    setTimeout(() => setSuccessMsg(null), 3500);
  };

  // Resume Parked Cart
  const handleResumeCart = (parked: ParkedCart) => {
    setCart(parked.items);
    setCustomerName(parked.customerName);
    setParkedCarts(prev => prev.filter(p => p.id !== parked.id));
    setShowParkedList(false);
    setSuccessMsg(`Resumed sale for ${parked.customerName}.`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Submit Counter Sale
  const handleCompleteSale = async (shouldPrintReceipt = true) => {
    setErrorMsg(null);
    if (cart.length === 0) {
      setErrorMsg('Please add at least one spare part to the cart before checkout.');
      return;
    }
    if (!customerName.trim()) {
      setErrorMsg('Customer name or Walk-in identification is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        saleNumber,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || (vehiclePlate ? `Plate: ${vehiclePlate}` : ''),
        date,
        items: cart.map(it => ({
          partId: it.itemId,
          itemId: it.itemId,
          sku: it.sku,
          name: it.name,
          quantity: Number(it.quantity),
          unitPrice: Number(it.unitPrice),
          total: Number(it.total)
        })),
        subtotal,
        taxAmount: 0,
        totalAmount: grandTotal,
        paymentMethod,
        notes: notes.trim()
      };

      const created = await createCounterSale(payload);
      const saleRecord: CounterSale = {
        id: created?.id || `cs-${Date.now()}`,
        saleNumber: created?.saleNumber || saleNumber,
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        date: payload.date,
        paymentMethod: payload.paymentMethod,
        items: payload.items,
        subtotal,
        taxAmount: 0,
        totalAmount: grandTotal,
        notes: payload.notes
      };

      setLastCompletedSale(saleRecord);

      if (shouldPrintReceipt) {
        setShowReceiptModal(true);
      } else {
        setSuccessMsg(`Sale ${saleRecord.saleNumber} completed for QAR ${grandTotal.toFixed(2)}!`);
        setTimeout(() => {
          resetSaleState();
        }, 1500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete counter sale.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-slate-50 w-full max-w-7xl h-[92vh] rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/20">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 tracking-tight">Parts Counter Sale (POS)</h2>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {saleNumber}
                </span>
                {parkedCarts.length > 0 && (
                  <button
                    onClick={() => setShowParkedList(prev => !prev)}
                    className="flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    <PauseCircle className="w-3.5 h-3.5" />
                    <span>{parkedCarts.length} On Hold</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Instant counter sale, inventory stock deduction, and thermal POS receipt
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switch: POS vs Recent Sales */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('pos')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'pos' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sale Register
              </button>
              <button
                onClick={() => setViewMode('history')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'history' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Sales History ({counterSales.length})</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close POS"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Parked Carts Drawer / Dropdown */}
        {showParkedList && (
          <div className="bg-amber-50 border-b border-amber-200 p-3 px-5 flex items-center justify-between text-xs animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-amber-700" />
              <span className="font-bold text-amber-900">Held / Parked Carts:</span>
              <div className="flex items-center gap-2 flex-wrap">
                {parkedCarts.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleResumeCart(p)}
                    className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-medium cursor-pointer shadow-2xs transition-colors"
                  >
                    <span>{p.customerName}</span>
                    <span className="font-mono font-bold text-amber-700">({p.items.length} items • QAR {p.totalAmount.toFixed(2)})</span>
                    <PlayCircle className="w-3.5 h-3.5 text-emerald-600 ml-1" />
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowParkedList(false)}
              className="text-amber-800 hover:text-amber-950 font-bold text-xs"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Alert Banners */}
        {errorMsg && (
          <div className="bg-rose-50 border-b border-rose-200 text-rose-800 px-5 py-2 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border-b border-emerald-200 text-emerald-800 px-5 py-2 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MAIN BODY: SPLIT WORKSPACE */}
        {viewMode === 'pos' ? (
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden min-h-0">
            
            {/* LEFT SIDE: PARTS CATALOG & QUICK BROWSER (7 Cols) */}
            <div className="lg:col-span-7 flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50">
              
              {/* Search & Filter Toolbar */}
              <div className="p-3 bg-white border-b border-slate-200 space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search parts by name, SKU, OEM, rack location... (Press F5 for Advanced Search)"
                      value={searchQuery || ''}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'F5') {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAdvancedSearch(true);
                        }
                      }}
                      className="w-full pl-9 pr-14 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      title="Search parts. Press F5 while in this search box to open Advanced Item Search with rich filters."
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowAdvancedSearch(true)}
                        title="Advanced Item Search (Shortcut: F5)"
                        className="px-1.5 py-0.5 text-[9px] font-mono font-black bg-slate-200 hover:bg-emerald-100 hover:text-emerald-700 text-slate-700 rounded border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                      >
                        F5
                      </button>
                    </div>
                  </div>

                  {/* Quick Add Custom Unlisted Part Button */}
                  <button
                    type="button"
                    onClick={() => setIsCustomItemOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 cursor-pointer transition-colors shrink-0"
                    title="Add uncataloged item or scrap part"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Custom Item</span>
                  </button>

                  {/* In-Stock Toggle */}
                  <button
                    onClick={() => setInStockOnly(prev => !prev)}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border transition-colors cursor-pointer shrink-0 ${
                      inStockOnly 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {inStockOnly ? '✓ In Stock Only' : 'All Items'}
                  </button>
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-xs">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-all cursor-pointer ${
                        selectedCategory === cat
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat === 'ALL' ? 'All Categories' : cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Parts Catalog Grid */}
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                {filteredInventory.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                    <Package className="w-12 h-12 text-slate-300 mb-2 stroke-1" />
                    <p className="font-bold text-sm text-slate-600">No parts found matching query</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Try adjusting your search terms or click "+ Custom Item" to sell an uncataloged part.
                    </p>
                    <button
                      onClick={() => setIsCustomItemOpen(true)}
                      className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer"
                    >
                      + Add Custom Part
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {filteredInventory.map(item => {
                      const stock = Number(item.quantityOnHand ?? item.stockQuantity ?? 0);
                      const minStock = Number(item.minReorderLevel ?? item.minStockLevel ?? 5);
                      const isLowStock = stock <= minStock;
                      const price = Number(item.sellingPrice ?? item.unitPrice ?? 50);
                      const inCart = cart.find(c => c.itemId === item.id);

                      return (
                        <div
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className={`bg-white p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md hover:border-emerald-400 group relative ${
                            inCart ? 'ring-2 ring-emerald-500/40 border-emerald-500 bg-emerald-50/20' : 'border-slate-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                {item.sku}
                              </span>
                              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                stock <= 0 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : isLowStock 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {stock} in stock
                              </span>
                            </div>

                            <div className="font-bold text-xs text-slate-900 group-hover:text-emerald-700 line-clamp-2 leading-tight">
                              {item.name}
                            </div>

                            {item.rackLocation && (
                              <div className="text-[10px] text-slate-400 mt-1 font-mono flex items-center gap-1">
                                <span>Loc:</span>
                                <span className="font-bold text-slate-600">{item.rackLocation}</span>
                              </div>
                            )}
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <div className="font-mono font-black text-sm text-slate-900">
                              {price.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">QAR</span>
                            </div>

                            {inCart ? (
                              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                                {inCart.quantity}
                              </span>
                            ) : (
                              <button
                                type="button"
                                className="w-6 h-6 rounded-full bg-slate-100 group-hover:bg-emerald-600 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT SIDE: ACTIVE CART & CHECKOUT TERMINAL (5 Cols) */}
            <div className="lg:col-span-5 flex flex-col bg-white overflow-hidden">
              
              {/* Customer Selection Toolbar */}
              <div className="p-3.5 border-b border-slate-200 bg-slate-50/70 space-y-2.5 shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Customer Details</span>
                  </div>

                  {/* Customer Type Toggle */}
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-[11px] font-bold">
                    <button
                      onClick={() => {
                        setCustomerType('walkin');
                        setCustomerName('Walk-in Customer');
                        setSelectedCustomerId('');
                      }}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        customerType === 'walkin' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Walk-in
                    </button>
                    <button
                      onClick={() => setCustomerType('registered')}
                      className={`px-2 py-0.5 rounded transition-all cursor-pointer ${
                        customerType === 'registered' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                      }`}
                    >
                      Registered
                    </button>
                  </div>
                </div>

                {customerType === 'registered' ? (
                  <div className="space-y-1.5">
                    <select
                      value={selectedCustomerId || ''}
                      onChange={(e) => handleSelectCustomer(e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Choose Workshop Customer --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Customer Name (optional)"
                      value={customerName === 'Walk-in Customer' ? '' : (customerName || '')}
                      onChange={(e) => setCustomerName(e.target.value || 'Walk-in Customer')}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 outline-none focus:border-emerald-500 placeholder-slate-400"
                    />
                    <input
                      type="text"
                      placeholder="Phone # (+974...)"
                      value={customerPhone || ''}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:border-emerald-500 placeholder-slate-400"
                    />
                  </div>
                )}

                {/* Optional Vehicle Plate Reference */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Car className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Vehicle Plate # (Optional)"
                      value={vehiclePlate || ''}
                      onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                      className="w-full pl-8 pr-3 py-1 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:border-emerald-500 placeholder-slate-400 uppercase"
                    />
                  </div>
                  
                  {cart.length > 0 && (
                    <button
                      onClick={handleParkCart}
                      className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                      title="Hold this sale to serve another customer"
                    >
                      <PauseCircle className="w-3.5 h-3.5" />
                      <span>Hold Sale</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar divide-y divide-slate-100">
                {cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <ShoppingCart className="w-10 h-10 text-slate-200 mb-2 stroke-1" />
                    <p className="font-bold text-xs text-slate-600">Cart is empty</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click any part on the left to add it to this sale.
                    </p>
                  </div>
                ) : (
                  cart.map((item, index) => (
                    <div key={`${item.itemId}-${index}`} className="py-2.5 first:pt-0 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                            {item.sku}
                          </span>
                          {item.isCustom && (
                            <span className="text-[9px] font-bold uppercase bg-amber-100 text-amber-800 px-1 rounded">
                              Custom
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-xs text-slate-800 truncate mt-0.5">
                          {item.name}
                        </div>
                        <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-500 font-mono">
                          <span className="text-slate-400 font-semibold">QAR</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unitPrice ?? 0}
                            onChange={(e) => updateCartPrice(index, parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-0.5 border border-slate-200 hover:border-emerald-400 focus:border-emerald-500 rounded bg-white text-xs font-bold text-slate-800 text-right font-mono outline-none shadow-2xs"
                            title="Editable Unit Price"
                          />
                          <span className="text-slate-400">ea</span>
                        </div>
                      </div>

                      {/* Quantity Stepper */}
                      <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateCartQty(index, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={item.availableStock || 999}
                          value={item.quantity ?? 1}
                          onChange={(e) => updateCartQty(index, parseInt(e.target.value, 10) || 1)}
                          className="w-8 text-center text-xs font-bold bg-transparent outline-none font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQty(index, item.quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center text-slate-600 hover:text-slate-900 hover:bg-white rounded transition-colors cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right shrink-0 min-w-[70px]">
                        <div className="font-mono font-bold text-xs text-slate-900">
                          {item.total.toFixed(2)}
                        </div>
                        <span className="text-[10px] text-slate-400">QAR</span>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(index)}
                        className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Bottom Checkout & Payment Control */}
              <div className="p-3.5 border-t border-slate-200 bg-slate-50 space-y-3 shrink-0">
                
                {/* Discount & Adjustments */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-500 font-medium">Discount:</span>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={discountType || 'fixed'}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                    >
                      <option value="fixed">QAR</option>
                      <option value="percent">%</option>
                    </select>
                    <input
                      type="number"
                      min="0"
                      value={discountValue || ''}
                      placeholder="0"
                      onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-right outline-none"
                    />
                  </div>
                </div>

                {/* Totals Summary */}
                <div className="space-y-1 pt-2 border-t border-slate-200 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal:</span>
                    <span className="font-mono">{subtotal.toFixed(2)} QAR</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount:</span>
                      <span className="font-mono">- {discountAmount.toFixed(2)} QAR</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1 font-black text-slate-900">
                    <span className="text-sm">Grand Total:</span>
                    <span className="text-xl font-mono text-emerald-700">
                      QAR {grandTotal.toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] font-bold text-slate-600 block">Payment Method</label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                    {(['Cash', 'Card', 'UPI/Bank', 'Credit'] as const).map(method => (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setPaymentMethod(method)}
                        className={`py-1.5 rounded-xl border transition-all cursor-pointer text-center ${
                          paymentMethod === method
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {method === 'UPI/Bank' ? 'Transfer' : method}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Cash Calculator (if cash selected) */}
                {paymentMethod === 'Cash' && grandTotal > 0 && (
                  <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-600">Tendered Cash:</span>
                      <input
                        type="number"
                        placeholder="Amount received"
                        value={amountTendered || ''}
                        onChange={(e) => setAmountTendered(e.target.value)}
                        className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-right outline-none focus:bg-white focus:border-emerald-500"
                      />
                    </div>

                    {/* Quick Tender Buttons */}
                    <div className="flex items-center gap-1 overflow-x-auto text-[10px] font-bold">
                      <button
                        type="button"
                        onClick={() => setAmountTendered(grandTotal.toString())}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-700 cursor-pointer"
                      >
                        Exact
                      </button>
                      {[50, 100, 200, 500].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setAmountTendered(amt.toString())}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded border border-slate-200 text-slate-700 cursor-pointer font-mono"
                        >
                          {amt} QAR
                        </button>
                      ))}
                    </div>

                    {/* Change Due Display */}
                    {parseFloat(amountTendered) >= grandTotal && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs font-bold">
                        <span className="text-slate-500">Change to return:</span>
                        <span className="font-mono text-emerald-700 font-black">
                          QAR {changeDue.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Primary Action Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isSubmitting || cart.length === 0}
                    onClick={() => handleCompleteSale(false)}
                    className="py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    Save & Done
                  </button>

                  <button
                    type="button"
                    disabled={isSubmitting || cart.length === 0}
                    onClick={() => handleCompleteSale(true)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-950/20 flex items-center justify-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Pay & Print</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SALES HISTORY VIEW */
          <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Recent Counter Sales Register</h3>
                <p className="text-xs text-slate-500">View past parts sales receipts, items sold, and payment status</p>
              </div>
              <button
                onClick={() => setViewMode('pos')}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>+ New Sale</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="py-3 px-4">Sale # & Date</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Items Sold</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4 text-right">Total (QAR)</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {counterSales.map(cs => (
                    <tr key={cs.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-emerald-700">{cs.saleNumber}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(cs.date)}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-800">{cs.customerName}</div>
                        {cs.customerPhone && (
                          <div className="text-[10px] text-slate-400 font-mono">{cs.customerPhone}</div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-700">
                          {cs.items.length} items
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-xs">
                          {cs.items.map(it => `${it.name} (x${it.quantity})`).join(', ')}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-slate-100 text-slate-700">
                          {cs.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {Number(cs.totalAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setLastCompletedSale(cs);
                            setShowReceiptModal(true);
                          }}
                          className="px-2.5 py-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1 mx-auto"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ADD CUSTOM PART MODAL */}
      {isCustomItemOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 backdrop-blur-2xs p-4 animate-in fade-in">
          <div className="bg-white max-w-md w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-emerald-600" />
                <span>Add Custom / Uncataloged Part</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsCustomItemOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddCustomItem} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Part / Service Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scrap Alternator / Used Rim"
                  value={customItemForm.name || ''}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Custom SKU (Optional)</label>
                  <input
                    type="text"
                    placeholder="Auto-generated if empty"
                    value={customItemForm.sku || ''}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Category</label>
                  <select
                    value={customItemForm.category || 'Consumables & Tools'}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  >
                    <option value="Mechanical Parts">Mechanical</option>
                    <option value="Body & Panels">Body & Panels</option>
                    <option value="Fluids & Lubricants">Fluids & Oils</option>
                    <option value="Consumables & Tools">Consumables</option>
                    <option value="Scrap & Salvage">Scrap & Salvage</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit Selling Price (QAR) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={customItemForm.price ?? 0}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={customItemForm.qty ?? 1}
                    onChange={(e) => setCustomItemForm({ ...customItemForm, qty: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCustomItemOpen(false)}
                  className="px-3 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  + Add to Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* THERMAL POS RECEIPT MODAL */}
      {showReceiptModal && lastCompletedSale && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-3 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <Printer className="w-4 h-4 text-emerald-600" />
                POS Thermal Slip ({lastCompletedSale.saleNumber})
              </span>
              <button
                onClick={() => {
                  setShowReceiptModal(false);
                  resetSaleState();
                }}
                className="text-slate-400 hover:text-slate-800 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {/* Printable Slip Canvas */}
            <div id="thermal-receipt-slip" className="p-5 overflow-y-auto space-y-3 font-mono text-xs text-slate-800">
              <div className="text-center space-y-0.5 border-b pb-2">
                <div className="font-black text-sm text-slate-900">NAJM AL HUDA GARAGE & SCRAP</div>
                <div className="text-[10px] text-slate-500">Auto Maintenance & Spare Parts</div>
                <div className="text-[10px] text-slate-500">Doha, State of Qatar • Tel: +974 5500 0000</div>
                <div className="text-[10px] font-bold text-slate-700 mt-1">COUNTER SALE RECEIPT</div>
              </div>

              <div className="text-[11px] space-y-0.5 border-b pb-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt No:</span>
                  <span className="font-bold">{lastCompletedSale.saleNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date & Time:</span>
                  <span>{formatDate(lastCompletedSale.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-bold truncate max-w-[180px]">{lastCompletedSale.customerName}</span>
                </div>
                {lastCompletedSale.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Phone:</span>
                    <span>{lastCompletedSale.customerPhone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment:</span>
                  <span className="font-bold">{lastCompletedSale.paymentMethod}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-[11px] border-b pb-2">
                <thead>
                  <tr className="text-slate-400 text-[10px] border-b">
                    <th className="pb-1">Item</th>
                    <th className="text-center pb-1">Qty</th>
                    <th className="text-right pb-1">Price</th>
                    <th className="text-right pb-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dashed">
                  {lastCompletedSale.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="py-1 pr-1">
                        <div className="truncate max-w-[120px] font-medium">{it.name}</div>
                        <div className="text-[9px] text-slate-400">{it.sku}</div>
                      </td>
                      <td className="text-center py-1">{it.quantity}</td>
                      <td className="text-right py-1">{Number(it.unitPrice).toFixed(2)}</td>
                      <td className="text-right py-1 font-bold">{Number(it.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="text-[11px] space-y-0.5 pt-1">
                <div className="flex justify-between text-sm font-black pt-1 border-t">
                  <span>TOTAL (QAR):</span>
                  <span className="text-emerald-700">{Number(lastCompletedSale.totalAmount || 0).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[10px] text-slate-400 pt-3 border-t space-y-0.5">
                <p>Thank you for your business!</p>
                <p>Parts return accepted within 7 days with this slip.</p>
                <p className="font-mono text-[9px] text-slate-300 pt-1">*** END OF RECEIPT ***</p>
              </div>
            </div>

            {/* Print Buttons */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowReceiptModal(false);
                  resetSaleState();
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close & Next Sale
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4" />
                <span>Print Slip</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Advanced Item Search Modal (F5) */}
      <AdvancedItemSearchModal
        isOpen={showAdvancedSearch}
        onClose={() => setShowAdvancedSearch(false)}
        inventory={inventory}
        initialSearchQuery={searchQuery}
        onSelectItem={(item, qty) => addToCart(item, qty)}
        title="POS & Counter Sale - Advanced Parts Search"
        subtitle="Search parts catalog with filters, brand, location, and instant cart addition"
      />
    </div>
  );
};
