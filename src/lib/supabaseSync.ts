import { supabase, isSupabaseConfigured } from './supabase';
import { 
  CustomerMasterItem, 
  VehicleMasterItem, 
  SupplierMasterItem, 
  InventoryItem, 
  JobCard, 
  Invoice 
} from '../types';

export function isNetworkFailure(err: any): boolean {
  if (!err) return false;
  const msg = String(typeof err === 'string' ? err : (err.message || '')).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('typeerror')
  );
}

let cachedReachability: boolean | null = null;
let lastReachabilityCheck = 0;

export async function checkSupabaseReachability(): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const now = Date.now();
  if (cachedReachability !== null && (now - lastReachabilityCheck < 60000)) {
    return cachedReachability;
  }
  try {
    const { error } = await supabase.from('customers').select('id', { count: 'exact', head: true });
    if (error && isNetworkFailure(error)) {
      cachedReachability = false;
      lastReachabilityCheck = now;
      return false;
    }
    cachedReachability = true;
    lastReachabilityCheck = now;
    return true;
  } catch {
    cachedReachability = false;
    lastReachabilityCheck = now;
    return false;
  }
}

export function notifySaveFailure(entity: string, errorMsg: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('najm:toast', {
      detail: {
        message: `Database sync error (${entity}): ${errorMsg}`,
        type: 'error'
      }
    }));
  }
}

// ============================================================================
// CUSTOMERS CRUD
// ============================================================================

export async function fetchCustomersFromSupabase(): Promise<CustomerMasterItem[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (!isNetworkFailure(error)) {
        console.warn('[Supabase] Failed to fetch customers:', error.message);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name || 'Valued Customer',
      contact: row.contact_person || row.name || '',
      phone: row.phone || '',
      email: row.email || undefined,
      qid: row.qid_or_crn || '',
      accountType: row.customer_type === 'fleet' ? 'Corporate' : 'Individual',
      creditLimit: Number(row.credit_limit || 0),
      balance: Number(row.outstanding_balance || 0),
      city: row.address || 'Doha, Qatar',
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching customers:', err);
    return null;
  }
}

export async function upsertCustomerToSupabase(customer: CustomerMasterItem): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email || null,
      address: customer.city || 'Doha, Qatar',
      qid_or_crn: customer.qid || null,
      customer_type: customer.accountType?.toLowerCase() === 'corporate' ? 'fleet' : 'individual',
      credit_limit: customer.creditLimit || 0,
      outstanding_balance: customer.balance || 0
    };

    const { error } = await supabase
      .from('customers')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to upsert customer:', error.message);
      notifySaveFailure('Customer', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Error syncing customer:', err);
    notifySaveFailure('Customer', err?.message || 'Network sync failed');
    return false;
  }
}

export async function deleteCustomerFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('customers').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to delete customer:', error.message);
      notifySaveFailure('Customer Delete', error.message);
      return false;
    }
    return true;
  } catch (err: any) {
    console.warn('[Supabase] Error deleting customer:', err);
    notifySaveFailure('Customer Delete', err?.message || 'Network sync failed');
    return false;
  }
}

// ============================================================================
// VEHICLES CRUD
// ============================================================================

export async function fetchVehiclesFromSupabase(): Promise<VehicleMasterItem[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, customers(name, phone)')
      .order('created_at', { ascending: false });

    if (error) {
      if (!isNetworkFailure(error)) {
        console.warn('[Supabase] Failed to fetch vehicles:', error.message);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      make: row.make || 'Toyota',
      model: row.model || 'Land Cruiser',
      yearFrom: Number(row.year || 2020),
      yearTo: Number(row.year || 2024),
      bodyType: row.body_type || 'SUV',
      engine: row.engine_number || 'V6 4.0L',
      category: 'Vehicle',
      plateNumber: row.plate_number,
      vin: row.vin,
      color: row.color,
      mileage: Number(row.odometer || 0),
      customerId: row.customer_id,
      customerName: row.customers?.name || undefined,
      customerPhone: row.customers?.phone || undefined,
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching vehicles:', err);
    return null;
  }
}

export async function upsertVehicleToSupabase(vehicle: VehicleMasterItem): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: vehicle.id,
      customer_id: vehicle.customerId || null,
      plate_number: vehicle.plateNumber || 'TBD',
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.yearTo || vehicle.yearFrom || 2022,
      color: vehicle.color || 'White',
      vin: vehicle.vin || null,
      odometer: vehicle.mileage || 0,
      engine_number: vehicle.engine || null
    };

    const { error } = await supabase
      .from('vehicles')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to upsert vehicle:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing vehicle:', err);
    return false;
  }
}

export async function deleteVehicleFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to delete vehicle:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleting vehicle:', err);
    return false;
  }
}

// ============================================================================
// SUPPLIERS CRUD
// ============================================================================

export async function fetchSuppliersFromSupabase(): Promise<SupplierMasterItem[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (!isNetworkFailure(error)) {
        console.warn('[Supabase] Failed to fetch suppliers:', error.message);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      name: row.name,
      contact: row.contact_person || row.name,
      phone: row.phone || '',
      email: row.email || undefined,
      location: row.address || 'Industrial Area, Doha',
      category: row.category || 'Mechanical Parts',
      terms: row.payment_terms || 'Net 30'
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching suppliers:', err);
    return null;
  }
}

export async function upsertSupplierToSupabase(supplier: SupplierMasterItem): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: supplier.id,
      name: supplier.name,
      contact_person: supplier.contact,
      phone: supplier.phone,
      email: supplier.email || null,
      address: supplier.location || 'Industrial Area, Doha',
      category: supplier.category || 'General',
      payment_terms: supplier.terms || 'Net 30'
    };

    const { error } = await supabase
      .from('suppliers')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to upsert supplier:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing supplier:', err);
    return false;
  }
}

export async function deleteSupplierFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('suppliers').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to delete supplier:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleting supplier:', err);
    return false;
  }
}

// ============================================================================
// INVENTORY CRUD
// ============================================================================

export async function fetchInventoryFromSupabase(): Promise<InventoryItem[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('*')
      .order('sku', { ascending: true });

    if (error) {
      if (!isNetworkFailure(error)) {
        console.warn('[Supabase] Failed to fetch inventory:', error.message);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      sku: row.sku,
      name: row.name,
      category: row.category || 'Mechanical Parts',
      brand: row.brand || '',
      fitment: row.fitment || 'Universal',
      quantityOnHand: Number(row.quantity_on_hand || 0),
      minReorderLevel: Number(row.min_reorder_level || 5),
      unit: (row.unit || 'pcs') as InventoryItem['unit'],
      unitCost: Number(row.unit_cost || 0),
      sellingPrice: Number(row.selling_price || 0),
      rackLocation: row.rack_location || 'Bay 1',
      supplier: row.supplier_name || 'Direct Wholesale',
      lastRestockedDate: row.last_restocked_date || new Date().toISOString().split('T')[0]
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching inventory:', err);
    return null;
  }
}

export async function upsertInventoryToSupabase(item: InventoryItem): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const payload = {
      id: item.id,
      sku: item.sku,
      name: item.name,
      category: item.category,
      brand: item.brand,
      fitment: item.fitment,
      quantity_on_hand: item.quantityOnHand,
      min_reorder_level: item.minReorderLevel,
      unit: item.unit,
      unit_cost: item.unitCost,
      selling_price: item.sellingPrice,
      rack_location: item.rackLocation,
      supplier_name: item.supplier,
      last_restocked_date: item.lastRestockedDate
    };

    const { error } = await supabase
      .from('inventory_items')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to upsert inventory item:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing inventory item:', err);
    return false;
  }
}

export async function deleteInventoryFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to delete inventory item:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleting inventory item:', err);
    return false;
  }
}

// ============================================================================
// JOB CARDS CRUD
// ============================================================================

export async function fetchJobCardsFromSupabase(): Promise<JobCard[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('job_cards')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      if (!isNetworkFailure(error)) {
        console.warn('[Supabase] Failed to fetch job cards:', error.message);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => {
      let extra: any = {};
      try { extra = JSON.parse(row.data_json || '{}'); } catch {}
      let complaints = [];
      try { complaints = JSON.parse(row.complaints_json || '[]'); } catch {}
      let parts = [];
      try { parts = JSON.parse(row.parts_json || '[]'); } catch {}
      let labor = [];
      try { labor = JSON.parse(row.labor_json || '[]'); } catch {}

      const cust = extra.customer || {
        id: row.customer_id || 'cust-1',
        name: row.customer_name || 'Valued Customer',
        phone: row.customer_phone || '',
        email: ''
      };

      const veh = extra.vehicle || {
        id: row.vehicle_id || 'veh-1',
        plateNumber: row.plate_number || 'TBD',
        make: extra.make || 'Toyota',
        model: extra.model || 'Land Cruiser',
        year: Number(extra.year || 2022)
      };

      return {
        ...extra,
        id: row.id,
        jobNumber: row.job_number,
        customerId: row.customer_id || cust.id,
        vehicleId: row.vehicle_id || veh.id,
        customer: cust,
        vehicle: veh,
        dateIn: row.date_in || extra.dateIn || (row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
        promisedDate: row.promised_date || extra.promisedDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
        createdAt: row.created_at || extra.createdAt || new Date().toISOString(),
        status: row.status || extra.status || 'Draft',
        customerComplaints: complaints.length > 0 ? complaints : (extra.customerComplaints || []),
        partsUsed: parts.length > 0 ? parts : (extra.partsUsed || extra.parts || []),
        parts: parts.length > 0 ? parts : (extra.partsUsed || extra.parts || []),
        requisitions: parts.length > 0 ? parts : (extra.requisitions || extra.partsUsed || []),
        mechanicalTasks: labor.length > 0 ? labor : (extra.mechanicalTasks || extra.labor || []),
        labor: labor.length > 0 ? labor : (extra.mechanicalTasks || extra.labor || []),
        subtotal: Number(extra.subtotal || 0),
        discount: Number(extra.discount || 0),
        tax: Number(extra.tax || 0),
        totalAmount: Number(extra.totalAmount || extra.grandTotal || 0),
        grandTotal: Number(extra.totalAmount || extra.grandTotal || 0),
        companyId: row.company_id || extra.companyId || 'comp-1'
      } as JobCard;
    });
  } catch (err) {
    console.warn('[Supabase] Error fetching job cards:', err);
    return null;
  }
}

export async function upsertJobCardToSupabase(card: JobCard): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const c = card as any;
    const customerObj = c.customer || {};
    const vehicleObj = c.vehicle || {};
    const complaints = c.customerComplaints || c.complaints || [];
    const parts = c.partsUsed || c.parts || c.requisitions || [];
    const labor = c.mechanicalTasks || c.labor || c.tasks || [];

    const payload = {
      id: card.id,
      job_number: card.jobNumber,
      customer_id: customerObj.id || card.customerId || null,
      vehicle_id: vehicleObj.id || card.vehicleId || null,
      customer_name: customerObj.name || card.customerName || null,
      customer_phone: customerObj.phone || card.customerPhone || null,
      plate_number: vehicleObj.plateNumber || card.vehiclePlate || null,
      status: card.status || 'Draft',
      date_in: card.dateIn || new Date().toISOString().split('T')[0],
      promised_date: card.promisedDate ? new Date(card.promisedDate).toISOString() : null,
      complaints_json: JSON.stringify(complaints),
      parts_json: JSON.stringify(parts),
      labor_json: JSON.stringify(labor),
      company_id: (card as any).companyId || 'comp-1',
      data_json: JSON.stringify(card),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('job_cards')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to upsert job card:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing job card:', err);
    return false;
  }
}

export async function deleteJobCardFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('job_cards').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to delete job card:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleting job card:', err);
    return false;
  }
}

// ============================================================================
// INVOICES CRUD
// ============================================================================

export async function fetchInvoicesFromSupabase(): Promise<Invoice[] | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*, customers(name, phone), job_cards(job_number)')
      .order('created_at', { ascending: false });

    if (error) {
      if (!isNetworkFailure(error)) {
        console.warn('[Supabase] Failed to fetch invoices:', error.message);
      }
      return null;
    }

    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      invoiceNumber: row.invoice_number,
      jobCardId: row.job_card_id || undefined,
      jobNumber: row.job_cards?.job_number || undefined,
      customer: { name: row.customers?.name, phone: row.customers?.phone },
      customerName: row.customers?.name || 'Valued Customer',
      customerPhone: row.customers?.phone || '',
      date: row.date || new Date().toISOString().split('T')[0],
      dueDate: row.due_date || new Date().toISOString().split('T')[0],
      status: (row.payment_status || 'Unpaid') as Invoice['status'],
      laborItems: [],
      partItems: [],
      additionalCharges: [],
      subtotal: Number(row.subtotal || 0),
      discountAmount: Number(row.discount || 0),
      taxAmount: Number(row.tax_amount || 0),
      grandTotal: Number(row.grand_total || 0),
      paidAmount: Number(row.paid_amount || 0),
      balanceAmount: Number(row.balance_amount || 0),
      payments: [],
      isLocked: false
    }));
  } catch (err) {
    console.warn('[Supabase] Error fetching invoices:', err);
    return null;
  }
}

export async function upsertInvoiceToSupabase(invoice: Invoice): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const inv = invoice as any;
    const payload = {
      id: invoice.id,
      invoice_number: invoice.invoiceNumber,
      job_card_id: invoice.jobCardId || null,
      date: invoice.date,
      due_date: invoice.dueDate,
      subtotal: invoice.subtotal || 0,
      discount: invoice.discountAmount || inv.discount || 0,
      tax_amount: invoice.taxAmount || 0,
      grand_total: invoice.grandTotal || 0,
      paid_amount: invoice.paidAmount || 0,
      balance_amount: invoice.balanceAmount || 0,
      payment_status: invoice.status || inv.paymentStatus
    };

    const { error } = await supabase
      .from('invoices')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.warn('[Supabase] Failed to upsert invoice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error syncing invoice:', err);
    return false;
  }
}

export async function deleteInvoiceFromSupabase(id: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  try {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) {
      console.warn('[Supabase] Failed to delete invoice:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Supabase] Error deleting invoice:', err);
    return false;
  }
}

// ============================================================================
// COMPREHENSIVE SUPABASE DATA SYNCHRONIZATION
// ============================================================================

export interface SupabaseSyncResult {
  success: boolean;
  customers: CustomerMasterItem[] | null;
  vehicles: VehicleMasterItem[] | null;
  suppliers: SupplierMasterItem[] | null;
  inventory: InventoryItem[] | null;
  jobCards: JobCard[] | null;
  invoices: Invoice[] | null;
  hasData: boolean;
  error?: string;
  statusCode?: number;
}

export async function syncAllFromSupabase(): Promise<SupabaseSyncResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      customers: null,
      vehicles: null,
      suppliers: null,
      inventory: null,
      jobCards: null,
      invoices: null,
      hasData: false,
      error: 'Supabase credentials not configured',
      statusCode: 400
    };
  }

  const isReachable = await checkSupabaseReachability();
  if (!isReachable) {
    return {
      success: false,
      customers: null,
      vehicles: null,
      suppliers: null,
      inventory: null,
      jobCards: null,
      invoices: null,
      hasData: false,
      error: 'Supabase remote host is currently offline',
      statusCode: 503
    };
  }

  try {
    const [custRes, vehRes, suppRes, invRes, jobRes, invcRes] = await Promise.all([
      fetchCustomersFromSupabase(),
      fetchVehiclesFromSupabase(),
      fetchSuppliersFromSupabase(),
      fetchInventoryFromSupabase(),
      fetchJobCardsFromSupabase(),
      fetchInvoicesFromSupabase(),
    ]);

    const hasData = Boolean(
      (custRes && custRes.length > 0) ||
      (vehRes && vehRes.length > 0) ||
      (suppRes && suppRes.length > 0) ||
      (invRes && invRes.length > 0) ||
      (jobRes && jobRes.length > 0) ||
      (invcRes && invcRes.length > 0)
    );

    return {
      success: true,
      customers: custRes,
      vehicles: vehRes,
      suppliers: suppRes,
      inventory: invRes,
      jobCards: jobRes,
      invoices: invcRes,
      hasData,
      statusCode: 200
    };
  } catch (err: any) {
    if (!isNetworkFailure(err)) {
      console.warn('[Supabase] syncAllFromSupabase notice:', err);
    }
    return {
      success: false,
      customers: null,
      vehicles: null,
      suppliers: null,
      inventory: null,
      jobCards: null,
      invoices: null,
      hasData: false,
      error: err?.message || 'Supabase data synchronization failed',
      statusCode: typeof err?.status === 'number' ? err.status : 500
    };
  }
}

