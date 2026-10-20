import React, { useState, useRef, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Menu, 
  Receipt, 
  FileText, 
  Package, 
  Clock, 
  DollarSign, 
  ChevronDown, 
  ShieldCheck, 
  LogOut, 
  Layers,
  ShoppingCart,
  Car,
  Keyboard,
  Database
} from 'lucide-react';
import { TabKey } from '../../App';
import { JobCard, Invoice, InventoryItem } from '../../types';

export interface WorkshopHeaderProps {
  onToggleMobileSidebar: () => void;
  activeTab: TabKey;
  onSelectTab: (tab: TabKey, subTab?: string) => void;
  onOpenNewJob: () => void;
  onOpenPartsSell?: () => void;
  onOpenFindVehicle?: () => void;
  onOpenCheatSheet?: (initialMode?: 'view' | 'customize') => void;
  onOpenSupabaseDiagnostic?: () => void;
  onOpenNewInvoice: () => void;
  onOpenEstimation: () => void;
  onOpenMaterialIssue: () => void;
  onOpenIssueReturn: () => void;
  onOpenStockAdjustment: () => void;
  onOpenStockTakeSheet: () => void;
  onOpenGoodsReceiptNote: () => void;
  onOpenCashReceipt: () => void;
  onOpenAdvances: (mode: 'customer_advance' | 'advance_return' | 'supplier_advance' | 'supplier_payment') => void;
  onOpenLaborClock: () => void;
  onOpenGeneralJournal: () => void;
  onOpenCompanyManager: () => void;
  onOpenEasyGuide: () => void;
  onQuickPlateSearch: (plate: string) => void;
  onOpenCommandPalette?: () => void;
  onSelectJobCard: (card: JobCard) => void;
  onSelectInvoice: (invoiceId: string) => void;
  onLogout: () => void;
  activeJobsCount: number;
  pendingInvoicesCount: number;
  lowStockCount: number;
  jobCards: JobCard[];
  invoices: Invoice[];
  inventory: InventoryItem[];
  currentUser: {
    fullName?: string;
    role?: string;
    email?: string;
  } | null;
}

export const WorkshopHeader: React.FC<WorkshopHeaderProps> = ({
  onToggleMobileSidebar,
  activeTab,
  onSelectTab,
  onOpenNewJob,
  onOpenPartsSell,
  onOpenFindVehicle,
  onOpenCheatSheet,
  onOpenSupabaseDiagnostic,
  onOpenNewInvoice,
  onOpenEstimation,
  onOpenMaterialIssue,
  onOpenGoodsReceiptNote,
  onOpenCashReceipt,
  onOpenLaborClock,
  onQuickPlateSearch,
  onOpenCommandPalette,
  onSelectJobCard,
  onSelectInvoice,
  onLogout,
  jobCards,
  invoices,
  inventory,
  currentUser,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
      if (quickActionsRef.current && !quickActionsRef.current.contains(e.target as Node)) {
        setIsQuickActionsOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut Ctrl+K to open Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (onOpenCommandPalette) {
          onOpenCommandPalette();
        } else {
          const input = document.getElementById('global-workshop-search');
          input?.focus();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenCommandPalette]);

  // Filter search matches
  const trimmedSearch = (searchQuery || '').trim().toLowerCase();
  const matchedJobs = trimmedSearch ? jobCards.filter(jc => 
    jc.jobNumber?.toLowerCase().includes(trimmedSearch) ||
    jc.vehicle?.plateNumber?.toLowerCase().includes(trimmedSearch) ||
    jc.customer?.name?.toLowerCase().includes(trimmedSearch) ||
    jc.customer?.phone?.includes(trimmedSearch) ||
    jc.vehicle?.make?.toLowerCase().includes(trimmedSearch) ||
    jc.vehicle?.model?.toLowerCase().includes(trimmedSearch)
  ).slice(0, 5) : [];

  const matchedInvoices = trimmedSearch ? invoices.filter(inv => 
    inv.invoiceNumber?.toLowerCase().includes(trimmedSearch) ||
    inv.customerName?.toLowerCase().includes(trimmedSearch) ||
    inv.vehiclePlate?.toLowerCase().includes(trimmedSearch)
  ).slice(0, 4) : [];

  const matchedInventory = trimmedSearch ? inventory.filter(item => 
    item.name?.toLowerCase().includes(trimmedSearch) ||
    item.sku?.toLowerCase().includes(trimmedSearch)
  ).slice(0, 4) : [];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (trimmedSearch) {
      onQuickPlateSearch(trimmedSearch);
      setIsSearchFocused(false);
      setSearchQuery('');
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0 z-30 shadow-xs">
      {/* Left: Mobile Toggle, Header Logo Photo & Global Search */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button
          onClick={onToggleMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          title="Open Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Quick Search Bar */}
        <div ref={searchRef} className="relative flex-1 max-w-md">
          <button
            type="button"
            onClick={() => {
              if (onOpenCommandPalette) onOpenCommandPalette();
              else setIsSearchFocused(true);
            }}
            className="w-full pl-9 pr-14 py-2 bg-slate-100 hover:bg-slate-200/80 text-left text-xs font-medium text-slate-500 rounded-xl border border-transparent transition-all relative flex items-center cursor-pointer"
          >
            <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
            <span className="truncate">Search Job Cards, Plate #, Customer, Phone, SKU...</span>
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-2xs absolute right-2.5 pointer-events-none font-bold">
              Ctrl+K
            </span>
          </button>

          {/* Search Instant Dropdown Results (fallback if no palette handler) */}
          {!onOpenCommandPalette && isSearchFocused && trimmedSearch && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>Quick Search Results</span>
                <span className="text-[10px] font-normal text-slate-400">Press Enter for details</span>
              </div>

              {matchedJobs.length === 0 && matchedInvoices.length === 0 && matchedInventory.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700">No direct matches found</p>
                </div>
              ) : (
                <div className="p-1 space-y-1">
                  {/* Matched Job Cards */}
                  {matchedJobs.length > 0 && (
                    <div>
                      <span className="px-2.5 py-1 text-[10px] font-extrabold text-sky-600 uppercase tracking-wider block">
                        Job Cards ({matchedJobs.length})
                      </span>
                      {matchedJobs.map(jc => (
                        <button
                          key={jc.id}
                          onClick={() => {
                            onSelectJobCard(jc);
                            setIsSearchFocused(false);
                            setSearchQuery('');
                          }}
                          className="w-full p-2 rounded-xl hover:bg-sky-50 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                              JC
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {jc.jobNumber} • {jc.vehicle?.plateNumber}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                {jc.customer?.name} ({jc.vehicle?.make} {jc.vehicle?.model})
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                            {jc.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Matched Invoices */}
                  {matchedInvoices.length > 0 && (
                    <div className="pt-1 border-t border-slate-100">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider block">
                        Invoices ({matchedInvoices.length})
                      </span>
                      {matchedInvoices.map(inv => (
                        <button
                          key={inv.id}
                          onClick={() => {
                            onSelectInvoice(inv.id);
                            setIsSearchFocused(false);
                            setSearchQuery('');
                          }}
                          className="w-full p-2 rounded-xl hover:bg-emerald-50 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                              INV
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {inv.invoiceNumber} • {inv.customerName}
                              </span>
                              <span className="text-[10px] text-slate-500">
                                Total: {inv.grandTotal ?? inv.subtotal} QAR
                              </span>
                            </div>
                          </div>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                            inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {inv.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Matched Inventory */}
                  {matchedInventory.length > 0 && (
                    <div className="pt-1 border-t border-slate-100">
                      <span className="px-2.5 py-1 text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                        Spare Parts ({matchedInventory.length})
                      </span>
                      {matchedInventory.map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            onSelectTab('inventory');
                            setIsSearchFocused(false);
                            setSearchQuery('');
                          }}
                          className="w-full p-2 rounded-xl hover:bg-indigo-50 text-left flex items-center justify-between gap-2 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[11px] shrink-0">
                              SKU
                            </div>
                            <div className="truncate">
                              <span className="text-xs font-bold text-slate-800 block truncate">
                                {item.name} ({item.sku})
                              </span>
                              <span className="text-[10px] text-slate-500">
                                In Stock: {item.quantityOnHand} • {item.retailPrice || item.unitCost} QAR
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 shrink-0">
                            {item.category}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Controls: Single Primary Action & User Profile */}
      <div className="flex items-center gap-2.5">
        {/* Primary Action: Find Vehicle */}
        <button
          type="button"
          onClick={onOpenFindVehicle || (() => onSelectTab('customers_vehicles', 'vehicles'))}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
        >
          <Car className="w-4 h-4 text-sky-600" />
          <span>Find Vehicle</span>
        </button>

        {/* Quick Actions Dropdown */}
        <div ref={quickActionsRef} className="relative">
          <button
            onClick={() => setIsQuickActionsOpen(prev => !prev)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
            title="Quick Operations Menu"
          >
            <Layers className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden md:inline">Quick Actions</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isQuickActionsOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                Direct Actions
              </div>
              
              {!currentUser?.role?.toLowerCase().includes('technician') && (
                <>
                  <button
                    onClick={() => { onOpenNewInvoice(); setIsQuickActionsOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>New Invoice</span>
                  </button>

                  <button
                    onClick={() => { onOpenEstimation(); setIsQuickActionsOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-sky-600" />
                    <span>New Estimate</span>
                  </button>
                </>
              )}

              <button
                onClick={() => { onOpenMaterialIssue(); setIsQuickActionsOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 cursor-pointer"
              >
                <Package className="w-4 h-4 text-indigo-600" />
                <span>Issue Material to Job Card</span>
              </button>

              {!currentUser?.role?.toLowerCase().includes('technician') && (
                <>
                  <button
                    onClick={() => { onOpenCashReceipt(); setIsQuickActionsOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4 text-amber-600" />
                    <span>Record Payment / Receipt</span>
                  </button>

                  <button
                    onClick={() => { onOpenGoodsReceiptNote(); setIsQuickActionsOpen(false); }}
                    className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 cursor-pointer"
                  >
                    <Package className="w-4 h-4 text-purple-600" />
                    <span>Goods Receipt Note (GRN)</span>
                  </button>
                </>
              )}

              <button
                onClick={() => { onOpenLaborClock(); setIsQuickActionsOpen(false); }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-sky-50 hover:text-sky-700 flex items-center gap-2.5 cursor-pointer border-t border-slate-100"
              >
                <Clock className="w-4 h-4 text-slate-600" />
                <span>Technician Clock In/Out</span>
              </button>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div ref={userMenuRef} className="relative">
          <button
            onClick={() => setIsUserMenuOpen(prev => !prev)}
            className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
            title="User Profile & Settings"
          >
            {localStorage.getItem('najm_header_photo_logo') ? (
              <img
                src={localStorage.getItem('najm_header_photo_logo') || ''}
                alt="User Avatar"
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full object-cover border border-sky-500 shadow-2xs"
              />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-sky-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-4 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-800">{currentUser?.fullName || 'Workshop User'}</p>
                <p className="text-[11px] text-slate-500 font-mono truncate">{currentUser?.email || 'user@workshop.qa'}</p>
                <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-100 text-sky-800 border border-sky-200">
                  {currentUser?.role?.toUpperCase()}
                </span>
              </div>

              <div className="p-1 space-y-0.5">
                <button
                  onClick={() => { onSelectTab('users'); setIsUserMenuOpen(false); }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  <span>User Management &amp; Roles</span>
                </button>

                <button
                  onClick={() => { onSelectTab('settings'); setIsUserMenuOpen(false); }}
                  className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-sky-600 rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors"
                >
                  <Layers className="w-4 h-4 text-slate-400" />
                  <span>Workshop Settings</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
