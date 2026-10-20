import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  Package, 
  Filter, 
  Layers, 
  Check, 
  Plus, 
  SlidersHorizontal, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  MapPin, 
  Tag, 
  DollarSign, 
  Maximize2, 
  RotateCcw, 
  Info,
  Car,
  Barcode,
  Layers3,
  ArrowUpDown
} from 'lucide-react';
import { InventoryItem } from '../../types';

export interface AdvancedItemSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  initialSearchQuery?: string;
  onSelectItem: (item: InventoryItem, quantity?: number) => void;
  title?: string;
  subtitle?: string;
}

export const AdvancedItemSearchModal: React.FC<AdvancedItemSearchModalProps> = ({
  isOpen,
  onClose,
  inventory,
  initialSearchQuery = '',
  onSelectItem,
  title = 'Advanced Inventory Item & Spare Parts Search',
  subtitle = 'Find parts by SKU, OEM, Brand, Vehicle Fitment, Rack Location, or Category'
}) => {
  const [searchTerm, setSearchTerm] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedBrand, setSelectedBrand] = useState<string>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [selectedLocation, setSelectedLocation] = useState<string>('ALL');
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'sku_asc' | 'stock_desc' | 'price_asc' | 'price_desc'>('name_asc');
  
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [addQuantity, setAddQuantity] = useState<number>(1);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Sync initial search query when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchTerm(initialSearchQuery || '');
      setAddQuantity(1);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialSearchQuery]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set).sort();
  }, [inventory]);

  // Extract unique brands
  const brands = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      if (item.brand) set.add(item.brand);
    });
    return Array.from(set).sort();
  }, [inventory]);

  // Extract unique rack/bin locations
  const locations = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      const loc = item.rackLocation || item.binLocation || item.location;
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [inventory]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    const query = (searchTerm || '').trim().toLowerCase();
    const minP = minPrice !== '' ? Number(minPrice) : null;
    const maxP = maxPrice !== '' ? Number(maxPrice) : null;

    return inventory.filter(item => {
      if (!item) return false;

      // 1. Keyword search (Name, NameAr, SKU, Barcode, OEM, Brand, Fitment, Location)
      if (query) {
        const name = (item.name || '').toLowerCase();
        const nameAr = (item.nameAr || '').toLowerCase();
        const sku = (item.sku || '').toLowerCase();
        const barcode = (item.barcode || '').toLowerCase();
        const oem = (item.oemPartNumber || item.oemNumber || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        const fitment = (item.fitment || '').toLowerCase();
        const location = (item.rackLocation || item.binLocation || item.location || '').toLowerCase();
        const category = (item.category || '').toLowerCase();

        const matches = 
          name.includes(query) ||
          nameAr.includes(query) ||
          sku.includes(query) ||
          barcode.includes(query) ||
          oem.includes(query) ||
          brand.includes(query) ||
          fitment.includes(query) ||
          location.includes(query) ||
          category.includes(query);

        if (!matches) return false;
      }

      // 2. Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // 3. Brand filter
      if (selectedBrand !== 'ALL' && (item.brand || 'Generic') !== selectedBrand) {
        return false;
      }

      // 4. Location filter
      if (selectedLocation !== 'ALL') {
        const itemLoc = item.rackLocation || item.binLocation || item.location || '';
        if (itemLoc !== selectedLocation) return false;
      }

      // 5. Stock Status filter
      const stock = Number(item.quantityOnHand ?? item.quantityAvailable ?? item.quantity ?? item.stockQuantity ?? 0);
      const minStock = Number(item.minReorderLevel ?? item.minStockLevel ?? item.minStock ?? 5);

      if (stockFilter === 'IN_STOCK' && stock <= 0) return false;
      if (stockFilter === 'LOW_STOCK' && (stock <= 0 || stock > minStock)) return false;
      if (stockFilter === 'OUT_OF_STOCK' && stock > 0) return false;

      // 6. Price range filter
      const price = Number(item.sellingPrice ?? item.unitPrice ?? item.unitCost ?? 0);
      if (minP !== null && !isNaN(minP) && price < minP) return false;
      if (maxP !== null && !isNaN(maxP) && price > maxP) return false;

      return true;
    }).sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      const skuA = (a.sku || '').toLowerCase();
      const skuB = (b.sku || '').toLowerCase();
      const stockA = Number(a.quantityOnHand ?? a.quantityAvailable ?? a.quantity ?? a.stockQuantity ?? 0);
      const stockB = Number(b.quantityOnHand ?? b.quantityAvailable ?? b.quantity ?? b.stockQuantity ?? 0);
      const priceA = Number(a.sellingPrice ?? a.unitPrice ?? a.unitCost ?? 0);
      const priceB = Number(b.sellingPrice ?? b.unitPrice ?? b.unitCost ?? 0);

      switch (sortBy) {
        case 'name_desc': return nameB.localeCompare(nameA);
        case 'sku_asc': return skuA.localeCompare(skuB);
        case 'stock_desc': return stockB - stockA;
        case 'price_asc': return priceA - priceB;
        case 'price_desc': return priceB - priceA;
        case 'name_asc':
        default:
          return nameA.localeCompare(nameB);
      }
    });
  }, [inventory, searchTerm, selectedCategory, selectedBrand, selectedLocation, stockFilter, minPrice, maxPrice, sortBy]);

  // Selected item object
  const activeSelectedItem = useMemo(() => {
    if (!selectedItemId && filteredItems.length > 0) {
      return filteredItems[0];
    }
    return inventory.find(i => i.id === selectedItemId) || filteredItems[0] || null;
  }, [selectedItemId, filteredItems, inventory]);

  // Keyboard navigation inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.min(prev + 1, filteredItems.length - 1);
          if (filteredItems[next]) {
            setSelectedItemId(filteredItems[next].id);
          }
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => {
          const next = Math.max(prev - 1, 0);
          if (filteredItems[next]) {
            setSelectedItemId(filteredItems[next].id);
          }
          return next;
        });
      } else if (e.key === 'Enter') {
        // If Enter is pressed outside form buttons, select current highlighted item
        if (activeSelectedItem) {
          e.preventDefault();
          handleConfirmSelect(activeSelectedItem);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, focusedIndex, activeSelectedItem]);

  const handleConfirmSelect = (item: InventoryItem) => {
    if (!item) return;
    const qty = Math.max(1, addQuantity || 1);
    onSelectItem(item, qty);
    onClose();
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedBrand('ALL');
    setStockFilter('ALL');
    setSelectedLocation('ALL');
    setMinPrice('');
    setMaxPrice('');
    setSortBy('name_asc');
    searchInputRef.current?.focus();
  };

  const activeFiltersCount = [
    selectedCategory !== 'ALL',
    selectedBrand !== 'ALL',
    stockFilter !== 'ALL',
    selectedLocation !== 'ALL',
    minPrice !== '',
    maxPrice !== ''
  ].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white dark:bg-slate-900 w-full max-w-6xl h-[92vh] max-h-[900px] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        role="dialog"
        aria-modal="true"
        aria-labelledby="advanced-item-search-title"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-900/20">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="advanced-item-search-title" className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  {title}
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-300 border border-sky-200 dark:border-sky-700">
                  {filteredItems.length} of {inventory.length} Items
                </span>
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-mono font-bold border border-amber-300">
                  F5 Active
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono">↑</kbd>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono">↓</kbd>
              <span>Navigate</span>
              <span className="mx-1">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono">Enter</kbd>
              <span>Select</span>
              <span className="mx-1">•</span>
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-[10px] font-mono">Esc</kbd>
              <span>Close</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Search Dialog (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3 shrink-0">
          {/* Main search keyword input */}
          <div className="flex flex-col sm:flex-row gap-2.5 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Part Name, Arabic Name, SKU, OEM #, Barcode, Fitment, Rack..."
                className="w-full pl-10 pr-10 py-2.5 text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 font-medium transition-all"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Sort Dropdown */}
            <div className="flex items-center gap-2">
              <div className="relative shrink-0">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="appearance-none pl-8 pr-8 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                >
                  <option value="name_asc">Sort: Name (A to Z)</option>
                  <option value="name_desc">Sort: Name (Z to A)</option>
                  <option value="sku_asc">Sort: SKU / Part #</option>
                  <option value="stock_desc">Sort: Stock (High to Low)</option>
                  <option value="price_asc">Sort: Price (Low to High)</option>
                  <option value="price_desc">Sort: Price (High to Low)</option>
                </select>
                <ArrowUpDown className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              </div>

              {activeFiltersCount > 0 && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer shrink-0"
                  title="Clear all applied filters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset ({activeFiltersCount})</span>
                </button>
              )}
            </div>
          </div>

          {/* Detailed Filter Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-1 text-xs">
            {/* Category Filter */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 font-medium"
              >
                <option value="ALL">All Categories ({categories.length})</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Stock Filter */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Stock Status
              </label>
              <select
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 font-medium"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="IN_STOCK">In Stock Only (&gt; 0)</option>
                <option value="LOW_STOCK">Low Stock (≤ Reorder)</option>
                <option value="OUT_OF_STOCK">Out of Stock (= 0)</option>
              </select>
            </div>

            {/* Brand Filter */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Brand / Make
              </label>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 font-medium"
              >
                <option value="ALL">All Brands ({brands.length})</option>
                {brands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Location / Rack Filter */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Rack / Location
              </label>
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none focus:border-sky-500 font-medium"
              >
                <option value="ALL">All Locations</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Price (QAR)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  placeholder="Min"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-sky-500"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 outline-none focus:border-sky-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Main Content: Left/Top Results Table & Right/Bottom Inspector */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Main Table View (8 cols) */}
          <div ref={tableContainerRef} className="lg:col-span-8 overflow-y-auto border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col">
            {filteredItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 dark:text-slate-500">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p className="font-bold text-sm text-slate-700 dark:text-slate-300">No Inventory Items Match Filters</p>
                <p className="text-xs max-w-sm mt-1">
                  Try adjusting your keywords, resetting category/brand filters, or checking spelling.
                </p>
                <button
                  type="button"
                  onClick={resetFilters}
                  className="mt-4 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 font-bold w-12 text-center">#</th>
                    <th className="p-3 font-bold">Item Description</th>
                    <th className="p-3 font-bold">SKU / OEM</th>
                    <th className="p-3 font-bold">Location</th>
                    <th className="p-3 font-bold text-center">Stock</th>
                    <th className="p-3 font-bold text-right">Price (QAR)</th>
                    <th className="p-3 font-bold text-center w-24">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredItems.map((item, index) => {
                    const isSelected = (activeSelectedItem?.id === item.id);
                    const isFocused = (index === focusedIndex);
                    const stock = Number(item.quantityOnHand ?? item.quantityAvailable ?? item.quantity ?? item.stockQuantity ?? 0);
                    const minStock = Number(item.minReorderLevel ?? item.minStockLevel ?? item.minStock ?? 5);
                    const price = Number(item.sellingPrice ?? item.unitPrice ?? item.unitCost ?? 0);
                    const cost = Number(item.unitCost ?? item.costPrice ?? item.purchasePrice ?? 0);
                    const oemNo = item.oemPartNumber || item.oemNumber || '';
                    const rackLoc = item.rackLocation || item.binLocation || item.location || '-';

                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          setSelectedItemId(item.id);
                          setFocusedIndex(index);
                        }}
                        onDoubleClick={() => handleConfirmSelect(item)}
                        className={`transition-colors cursor-pointer ${
                          isSelected 
                            ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-900 dark:text-sky-100 font-medium' 
                            : 'hover:bg-slate-50 dark:hover:bg-slate-850'
                        } ${isFocused ? 'ring-1 ring-inset ring-sky-400' : ''}`}
                      >
                        <td className="p-3 text-center text-slate-400 font-mono text-[11px]">
                          {index + 1}
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.name}</span>
                            {item.brand && (
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                {item.brand}
                              </span>
                            )}
                          </div>
                          {item.nameAr && (
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 dir-rtl">
                              {item.nameAr}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {item.category || 'General'}
                            </span>
                            {item.fitment && (
                              <span className="text-[10px] text-slate-500 truncate max-w-[200px]" title={item.fitment}>
                                🚗 {item.fitment}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="font-bold text-slate-800 dark:text-slate-200">{item.sku}</div>
                          {oemNo && (
                            <div className="text-[10px] text-slate-500">OEM: {oemNo}</div>
                          )}
                          {item.barcode && (
                            <div className="text-[10px] text-slate-400 flex items-center gap-0.5">
                              <Barcode className="w-3 h-3" /> {item.barcode}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{rackLoc}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {stock > minStock ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> {stock}
                            </span>
                          ) : stock > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300" title={`Low Stock! Reorder level: ${minStock}`}>
                              <AlertTriangle className="w-3 h-3" /> {stock} (Low)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                              <XCircle className="w-3 h-3" /> Out
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="font-black text-slate-900 dark:text-white text-sm">
                            {price.toFixed(2)}
                          </div>
                          {cost > 0 && (
                            <div className="text-[10px] text-slate-400">
                              Cost: {cost.toFixed(2)}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleConfirmSelect(item);
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-xs inline-flex items-center gap-1"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Item Details Inspector Panel (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-850 p-5 flex flex-col justify-between overflow-y-auto border-t lg:border-t-0 border-slate-200 dark:border-slate-800">
            {activeSelectedItem ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                      Selected Part Specification
                    </span>
                    <h4 className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                      {activeSelectedItem.name}
                    </h4>
                    {activeSelectedItem.nameAr && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 dir-rtl">
                        {activeSelectedItem.nameAr}
                      </p>
                    )}
                  </div>
                  <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                    {activeSelectedItem.sku}
                  </span>
                </div>

                {/* Specs Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Category</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeSelectedItem.category || 'General'}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Brand / Make</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeSelectedItem.brand || 'OEM / Genuine'}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Rack Location</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeSelectedItem.rackLocation || activeSelectedItem.binLocation || activeSelectedItem.location || 'Warehouse Main'}</span>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Unit of Measure</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeSelectedItem.unit || 'pcs'}</span>
                  </div>
                </div>

                {/* OEM and Fitment */}
                {(activeSelectedItem.oemPartNumber || activeSelectedItem.oemNumber || activeSelectedItem.fitment) && (
                  <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    {(activeSelectedItem.oemPartNumber || activeSelectedItem.oemNumber) && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">OEM Part Reference</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {activeSelectedItem.oemPartNumber || activeSelectedItem.oemNumber}
                        </span>
                      </div>
                    )}
                    {activeSelectedItem.fitment && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block flex items-center gap-1">
                          <Car className="w-3 h-3 text-sky-500" /> Vehicle Compatibility
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 font-medium">
                          {activeSelectedItem.fitment}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Pricing & Stock Summary Box */}
                <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-md space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Unit Selling Price</span>
                    <span className="text-xl font-black text-emerald-400">
                      QAR {Number(activeSelectedItem.sellingPrice ?? activeSelectedItem.unitPrice ?? activeSelectedItem.unitCost ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                    <span className="text-slate-400">Available Stock:</span>
                    <span className="font-bold text-white">
                      {Number(activeSelectedItem.quantityOnHand ?? activeSelectedItem.quantityAvailable ?? activeSelectedItem.quantity ?? activeSelectedItem.stockQuantity ?? 0)} {activeSelectedItem.unit || 'units'}
                    </span>
                  </div>
                </div>

                {/* Quantity Input Before Adding */}
                <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Quantity to Add:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAddQuantity(prev => Math.max(1, prev - 1))}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={addQuantity}
                      onChange={(e) => setAddQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-14 text-center py-1 text-xs font-black border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setAddQuantity(prev => prev + 1)}
                      className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-400">
                <Info className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-xs font-bold">Select any item from the table to inspect details</p>
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-4 mt-auto border-t border-slate-200 dark:border-slate-800 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!activeSelectedItem}
                onClick={() => activeSelectedItem && handleConfirmSelect(activeSelectedItem)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-sky-900/20 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Select Item</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
