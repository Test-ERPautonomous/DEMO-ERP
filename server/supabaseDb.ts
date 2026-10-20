import crypto from 'node:crypto';
import { hashPassword } from './auth';
import { supabaseServer, isServerSupabaseConfigured, isNetworkOrDnsError, getSupabaseServerUrl, getSupabaseServerKey, isSupabaseServiceRole, ACTIVE_SUPABASE_URL } from './supabase';
import { db } from './db';

function logDbNotice(operation: string, err: any) {
  if (isNetworkOrDnsError(err) || err?.code === 'PGRST116') return;
  console.warn(`[SupabaseDb] ${operation} notice:`, err?.message || err);
}

function logDbError(operation: string, err: any) {
  if (isNetworkOrDnsError(err)) return;
  console.warn(`[SupabaseDb] ${operation} warning:`, err?.message || err);
}

/**
 * Universal Supabase PostgreSQL Data Layer for Najm Al Huda Garage ERP.
 * Direct cloud persistence for all operational entities with in-memory resilient caching.
 */

// Helper to safely parse JSON
function safeJson<T = any>(val: any, fallback: T): T {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

// In-memory cache for operational continuity and fallback
const memStore = {
  settings: {
    garageName: 'NAJM AL HUDA GARAGE & SCRAP',
    garageNameAr: 'ورشة نجم الهدى لصيانة السيارات وتجارة السكراب',
    tagline: 'Automotive Workshop, Collision Repair & Parts ERP',
    address: 'Street 24, Gate 15, Industrial Area',
    cityStateZip: 'Doha, State of Qatar',
    country: 'Qatar',
    crNumber: 'CR No. 2026/001',
    phone: '+974 4450 8899',
    email: 'info@najmalhuda.qa',
    taxId: 'GTA Tax Card: 2026-QA-001',
    currencySymbol: 'QAR',
    currency: 'QAR',
    taxRatePercent: 0,
    defaultLaborRate: 150,
    paintBoothHourRate: 250,
    dateFormat: 'YYYY-MM-DD',
    timezone: 'Asia/Qatar'
  } as any,
  customers: new Map<string, any>(),
  vehicles: new Map<string, any>(),
  suppliers: new Map<string, any>(),
  inventory: new Map<string, any>(),
  stockMovements: [] as any[],
  jobCards: new Map<string, any>(),
  invoices: new Map<string, any>(),
  estimates: new Map<string, any>(),
  purchaseOrders: new Map<string, any>(),
  grns: new Map<string, any>(),
  counterSales: new Map<string, any>(),
  scrapRates: new Map<string, any>(),
  scrapIntakes: new Map<string, any>(),
  scrapSales: new Map<string, any>(),
  technicians: new Map<string, any>(),
  laborRates: new Map<string, any>(),
  paintCodes: new Map<string, any>(),
  financialAccounts: new Map<string, any>(),
  financialTransactions: new Map<string, any>(),
  financialAllocations: new Map<string, any>(),
  journalEntries: new Map<string, any>(),
  profiles: new Map<string, any>(),
  auditLogs: [] as any[],
  sequences: new Map<string, number>()
};

export const supabaseDb = {
  // --------------------------------------------------------------------------
  // 1. SETTINGS & WORKSHOP CONFIG
  // --------------------------------------------------------------------------
  async getSettings(): Promise<any> {
    try {
      const { data, error } = await supabaseServer
        .from('settings')
        .select('*')
        .eq('id', 'primary')
        .maybeSingle();
      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        const parsed = safeJson(data.data_json, {});
        memStore.settings = { ...memStore.settings, ...parsed };
      }
      return memStore.settings;
    } catch (err: any) {
      logDbNotice('getSettings', err);
      return memStore.settings;
    }
  },

  async saveSettings(settings: any): Promise<boolean> {
    try {
      memStore.settings = { ...memStore.settings, ...settings };
      const payload = {
        id: 'primary',
        data_json: safeJson(settings, settings),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer
        .from('settings')
        .upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('saveSettings', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 2. DOCUMENT SEQUENCES
  // --------------------------------------------------------------------------
  async getNextDocumentNumber(docType: string, companyId: string = 'comp-1', year: number = 0): Promise<number> {
    const seqKey = `${companyId}_${docType}_${year}`;
    const fallbackNum = memStore.sequences.get(seqKey) || 1;
    try {
      const { data, error } = await supabaseServer
        .from('document_sequences')
        .select('next_number')
        .eq('company_id', companyId)
        .eq('doc_type', docType)
        .eq('year', year)
        .maybeSingle();

      const currentNum = data?.next_number || fallbackNum;
      const nextNum = currentNum + 1;
      memStore.sequences.set(seqKey, nextNum);

      await supabaseServer
        .from('document_sequences')
        .upsert({
          id: seqKey,
          company_id: companyId,
          doc_type: docType,
          year,
          next_number: nextNum,
          updated_at: new Date().toISOString()
        }, { onConflict: 'company_id,doc_type,year' });

      return currentNum;
    } catch (err: any) {
      logDbNotice('getNextDocumentNumber', err);
      memStore.sequences.set(seqKey, fallbackNum + 1);
      return fallbackNum;
    }
  },

  // --------------------------------------------------------------------------
  // 3. CUSTOMERS
  // --------------------------------------------------------------------------
  async getCustomers(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        customerId: row.customer_id || row.id,
        customerNumber: row.customer_number,
        name: row.name,
        nameAr: row.name_ar,
        phone: row.phone,
        email: row.email,
        qid: row.qid || row.qid_or_crn,
        address: row.address,
        accountType: row.customer_type === 'fleet' ? 'Corporate' : 'Individual',
        creditLimit: Number(row.credit_limit || 0),
        balance: Number(row.outstanding_balance || 0),
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...safeJson(row.data_json, {})
      }));
      list.forEach(c => memStore.customers.set(c.id, c));
      return list;
    } catch (err: any) {
      logDbNotice('getCustomers', err);
      return Array.from(memStore.customers.values());
    }
  },

  async upsertCustomer(customer: any): Promise<any> {
    const id = customer.id || `cust-${Date.now()}`;
    const normalized = { ...customer, id };
    memStore.customers.set(id, normalized);
    try {
      const payload = {
        id,
        customer_id: customer.customerId || id,
        customer_number: customer.customerNumber || customer.customer_number || null,
        name: customer.name || 'Unnamed Customer',
        name_ar: customer.nameAr || customer.name_ar || null,
        phone: customer.phone,
        email: customer.email || null,
        qid: customer.qid || null,
        qid_or_crn: customer.qid || customer.qid_or_crn || null,
        address: customer.address || customer.city || null,
        customer_type: customer.accountType?.toLowerCase() === 'corporate' ? 'fleet' : 'individual',
        credit_limit: Number(customer.creditLimit || customer.credit_limit || 0),
        outstanding_balance: Number(customer.balance || customer.outstanding_balance || 0),
        company_id: customer.companyId || 'comp-1',
        notes: customer.notes || null,
        data_json: safeJson(customer, {}),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('customers')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertCustomer', err);
      return normalized;
    }
  },

  async deleteCustomer(id: string): Promise<boolean> {
    memStore.customers.delete(id);
    try {
      const { error } = await supabaseServer.from('customers').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteCustomer', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 4. VEHICLES
  // --------------------------------------------------------------------------
  async getVehicles(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        vehicleNumber: row.vehicle_number,
        customerId: row.customer_id,
        plateNumber: row.plate_number,
        vin: row.vin,
        make: row.make,
        model: row.model,
        year: row.year ? Number(row.year) : 2022,
        color: row.color,
        mileage: Number(row.mileage || row.odometer || 0),
        engineNo: row.engine_no,
        transmission: row.transmission,
        fuelType: row.fuel_type,
        bodyType: row.body_type || 'SUV',
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...safeJson(row.data_json, {})
      }));
      list.forEach(v => memStore.vehicles.set(v.id, v));
      return list;
    } catch (err: any) {
      logDbNotice('getVehicles', err);
      return Array.from(memStore.vehicles.values());
    }
  },

  async upsertVehicle(vehicle: any): Promise<any> {
    const id = vehicle.id || `veh-${Date.now()}`;
    const normalized = { ...vehicle, id };
    memStore.vehicles.set(id, normalized);
    try {
      const payload = {
        id,
        vehicle_number: vehicle.vehicleNumber || vehicle.vehicle_number || null,
        customer_id: vehicle.customerId || vehicle.customer_id || null,
        plate_number: vehicle.plateNumber || vehicle.plate_number,
        vin: vehicle.vin || vehicle.chassisNumber || null,
        make: vehicle.make || 'Toyota',
        model: vehicle.model || 'Land Cruiser',
        year: vehicle.year ? Number(vehicle.year) : null,
        color: vehicle.color || null,
        mileage: Number(vehicle.mileage || vehicle.currentMileage || vehicle.odometer || 0),
        odometer: Number(vehicle.odometer || vehicle.mileage || 0),
        engine_no: vehicle.engineNo || vehicle.engine_number || null,
        transmission: vehicle.transmission || null,
        fuel_type: vehicle.fuelType || vehicle.fuel_type || null,
        body_type: vehicle.bodyType || vehicle.body_type || 'SUV',
        company_id: vehicle.companyId || 'comp-1',
        notes: vehicle.notes || null,
        data_json: safeJson(vehicle, {}),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('vehicles')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertVehicle', err);
      return normalized;
    }
  },

  async deleteVehicle(id: string): Promise<boolean> {
    memStore.vehicles.delete(id);
    try {
      const { error } = await supabaseServer.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteVehicle', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 5. SUPPLIERS
  // --------------------------------------------------------------------------
  async getSuppliers(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        supplierId: row.supplier_id || row.id,
        supplierNumber: row.supplier_number,
        name: row.name,
        nameAr: row.name_ar,
        contactPerson: row.contact_person,
        phone: row.phone,
        email: row.email,
        trn: row.trn,
        crNumber: row.cr_number,
        address: row.address,
        category: row.category,
        paymentTerms: row.payment_terms,
        balance: Number(row.balance || 0),
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...safeJson(row.data_json, {})
      }));
      list.forEach(s => memStore.suppliers.set(s.id, s));
      return list;
    } catch (err: any) {
      logDbNotice('getSuppliers', err);
      return Array.from(memStore.suppliers.values());
    }
  },

  async upsertSupplier(supplier: any): Promise<any> {
    const id = supplier.id || `sup-${Date.now()}`;
    const normalized = { ...supplier, id };
    memStore.suppliers.set(id, normalized);
    try {
      const payload = {
        id,
        supplier_id: supplier.supplierId || id,
        supplier_number: supplier.supplierNumber || supplier.supplier_number || null,
        name: supplier.name || 'Unnamed Supplier',
        name_ar: supplier.nameAr || supplier.name_ar || null,
        contact_person: supplier.contactPerson || supplier.contact_person || null,
        phone: supplier.phone || null,
        email: supplier.email || null,
        trn: supplier.trn || supplier.taxNumber || null,
        cr_number: supplier.crNumber || supplier.cr_number || null,
        address: supplier.address || null,
        category: supplier.category || 'General',
        payment_terms: supplier.paymentTerms || supplier.payment_terms || 'Net 30',
        balance: Number(supplier.balance || 0),
        company_id: supplier.companyId || 'comp-1',
        data_json: safeJson(supplier, {}),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('suppliers')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertSupplier', err);
      return normalized;
    }
  },

  async deleteSupplier(id: string): Promise<boolean> {
    memStore.suppliers.delete(id);
    try {
      const { error } = await supabaseServer.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteSupplier', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 6. INVENTORY ITEMS & STOCK MOVEMENTS
  // --------------------------------------------------------------------------
  async getInventory(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const invMap = new Map<string, any>();

      // 1. Read from persistent local SQLite database first
      try {
        const sqlRows = db.prepare('SELECT * FROM inventory ORDER BY name ASC').all() as any[];
        if (sqlRows && sqlRows.length > 0) {
          for (const row of sqlRows) {
            const extra: any = safeJson(row.data_json, {});
            invMap.set(row.id, {
              id: row.id,
              sku: row.sku,
              barcode: row.barcode,
              oemPartNumber: row.oem_part_number,
              aftermarketPartNumber: row.aftermarket_part_number,
              name: row.name,
              nameAr: row.name_ar,
              category: row.category,
              brand: extra.brand || null,
              fitment: row.vehicle_compatibility,
              vehicleCompatibility: row.vehicle_compatibility,
              unit: row.unit_of_measure,
              unitOfMeasure: row.unit_of_measure,
              rackLocation: row.rack_location,
              binLocation: row.bin_location,
              supplierId: row.supplier_id,
              supplierName: row.supplier_name,
              unitCost: Number(row.unit_cost || 0),
              sellingPrice: Number(row.selling_price || 0),
              retailPrice: Number(row.retail_price || 0),
              minReorderLevel: Number(row.min_reorder_level || 5),
              quantityOnHand: Number(row.quantity_on_hand || 0),
              quantityAvailable: Number(row.quantity_available || 0),
              quantityReserved: Number(row.quantity_reserved || 0),
              batchNumber: row.batch_number,
              expiryDate: row.expiry_date,
              lastRestockedDate: row.last_restocked_date,
              isActive: row.is_active === 1 || row.is_active === true,
              companyId: row.company_id || 'comp-1',
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              ...extra
            });
          }
        }
      } catch (err: any) {
        console.warn('[DB] SQLite getInventory query notice:', err?.message);
      }

      // 2. Query Supabase if configured and merge
      if (isServerSupabaseConfigured) {
        try {
          const { data, error } = await supabaseServer
            .from('inventory_items')
            .select('*')
            .order('name', { ascending: true });
          if (!error && data && data.length > 0) {
            for (const row of data) {
              if (!invMap.has(row.id)) {
                invMap.set(row.id, {
                  id: row.id,
                  sku: row.sku,
                  barcode: row.barcode,
                  oemPartNumber: row.oem_part_number,
                  aftermarketPartNumber: row.aftermarket_part_number,
                  name: row.name,
                  nameAr: row.name_ar,
                  category: row.category,
                  brand: row.brand,
                  fitment: row.fitment,
                  vehicleCompatibility: row.vehicle_compatibility,
                  unit: row.unit,
                  unitOfMeasure: row.unit_of_measure,
                  rackLocation: row.rack_location,
                  binLocation: row.bin_location,
                  supplierId: row.supplier_id,
                  supplierName: row.supplier_name,
                  unitCost: Number(row.unit_cost || 0),
                  sellingPrice: Number(row.selling_price || 0),
                  retailPrice: Number(row.retail_price || 0),
                  minReorderLevel: Number(row.min_reorder_level || 5),
                  quantityOnHand: Number(row.quantity_on_hand || 0),
                  quantityAvailable: Number(row.quantity_available || 0),
                  quantityReserved: Number(row.quantity_reserved || 0),
                  batchNumber: row.batch_number,
                  expiryDate: row.expiry_date,
                  lastRestockedDate: row.last_restocked_date,
                  isActive: row.is_active === 1 || row.is_active === true,
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
                  ...safeJson(row.data_json, {})
                });
              }
            }
          }
        } catch {}
      }

      // 3. Fallback to in-memory store
      for (const [id, i] of memStore.inventory.entries()) {
        if (!invMap.has(id)) {
          invMap.set(id, i);
        }
      }

      const list = Array.from(invMap.values());
      list.forEach(i => memStore.inventory.set(i.id, i));
      return list;
    } catch (err: any) {
      logDbNotice('getInventory', err);
      return Array.from(memStore.inventory.values());
    }
  },

  async upsertInventoryItem(item: any): Promise<any> {
    const id = item.id || `inv-${Date.now()}`;
    const qty = Number(item.quantityOnHand ?? item.quantity_on_hand ?? item.quantity ?? 0);
    const sku = item.sku || `SKU-${Date.now()}`;
    const now = new Date().toISOString();
    const companyId = item.companyId || 'comp-1';

    const normalized = {
      ...item,
      id,
      sku,
      quantityOnHand: qty,
      quantityAvailable: Number(item.quantityAvailable ?? item.quantity_available ?? qty),
      updatedAt: now
    };
    memStore.inventory.set(id, normalized);

    // 1. Write to SQLite database synchronously
    try {
      const existing = db.prepare('SELECT id FROM inventory WHERE id = ? OR sku = ?').get(id, sku) as any;
      if (existing) {
        db.prepare(`
          UPDATE inventory SET
            sku = ?, barcode = ?, oem_part_number = ?, aftermarket_part_number = ?,
            name = ?, name_ar = ?, category = ?, vehicle_compatibility = ?,
            unit_of_measure = ?, rack_location = ?, bin_location = ?, supplier_id = ?,
            supplier_name = ?, unit_cost = ?, retail_price = ?, selling_price = ?,
            min_reorder_level = ?, quantity_on_hand = ?, quantity_available = ?,
            quantity_reserved = ?, batch_number = ?, expiry_date = ?, last_restocked_date = ?,
            is_active = ?, company_id = ?, data_json = ?, updated_at = ?
          WHERE id = ?
        `).run(
          sku, item.barcode || null, item.oemPartNumber || item.oem_part_number || null, item.aftermarketPartNumber || item.aftermarket_part_number || null,
          item.name || 'Unnamed Part', item.nameAr || item.name_ar || null, item.category || 'Mechanical Parts', item.vehicleCompatibility || item.vehicle_compatibility || null,
          item.unitOfMeasure || item.unit || 'PCS', item.rackLocation || item.rack_location || null, item.binLocation || item.bin_location || null, item.supplierId || item.supplier_id || null,
          item.supplierName || item.supplier || null, Number(item.unitCost ?? item.unit_cost ?? 0), Number(item.retailPrice ?? item.retail_price ?? item.sellingPrice ?? 0), Number(item.sellingPrice ?? item.selling_price ?? 0),
          Number(item.minReorderLevel ?? item.min_reorder_level ?? 5), qty, Number(item.quantityAvailable ?? item.quantity_available ?? qty),
          Number(item.quantityReserved ?? item.quantity_reserved ?? 0), item.batchNumber || item.batch_number || null, item.expiryDate || item.expiry_date || null, item.lastRestockedDate || item.lastRestocked || null,
          item.isActive === false ? 0 : 1, companyId, JSON.stringify(item || {}), now,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO inventory (
            id, sku, barcode, oem_part_number, aftermarket_part_number,
            name, name_ar, category, vehicle_compatibility,
            unit_of_measure, rack_location, bin_location, supplier_id,
            supplier_name, unit_cost, retail_price, selling_price,
            min_reorder_level, quantity_on_hand, quantity_available,
            quantity_reserved, batch_number, expiry_date, last_restocked_date,
            is_active, company_id, data_json, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, sku, item.barcode || null, item.oemPartNumber || item.oem_part_number || null, item.aftermarketPartNumber || item.aftermarket_part_number || null,
          item.name || 'Unnamed Part', item.nameAr || item.name_ar || null, item.category || 'Mechanical Parts', item.vehicleCompatibility || item.vehicle_compatibility || null,
          item.unitOfMeasure || item.unit || 'PCS', item.rackLocation || item.rack_location || null, item.binLocation || item.bin_location || null, item.supplierId || item.supplier_id || null,
          item.supplierName || item.supplier || null, Number(item.unitCost ?? item.unit_cost ?? 0), Number(item.retailPrice ?? item.retail_price ?? item.sellingPrice ?? 0), Number(item.sellingPrice ?? item.selling_price ?? 0),
          Number(item.minReorderLevel ?? item.min_reorder_level ?? 5), qty, Number(item.quantityAvailable ?? item.quantity_available ?? qty),
          Number(item.quantityReserved ?? item.quantity_reserved ?? 0), item.batchNumber || item.batch_number || null, item.expiryDate || item.expiry_date || null, item.lastRestockedDate || item.lastRestocked || null,
          item.isActive === false ? 0 : 1, companyId, JSON.stringify(item || {}), now, now
        );
      }
    } catch (sqlErr: any) {
      console.warn('[DB] SQLite upsertInventoryItem notice:', sqlErr?.message);
    }

    // 2. Best-effort Supabase sync
    if (isServerSupabaseConfigured) {
      try {
        const payload = {
          id,
          sku,
          barcode: item.barcode || null,
          name: item.name || 'Unnamed Part',
          category: item.category || 'Mechanical Parts',
          unit_cost: Number(item.unitCost ?? item.unit_cost ?? 0),
          selling_price: Number(item.sellingPrice ?? item.selling_price ?? item.unitPrice ?? 0),
          quantity_on_hand: qty,
          updated_at: now
        };
        await supabaseServer.from('inventory_items').upsert(payload, { onConflict: 'id' });
      } catch (sbErr: any) {
        logDbNotice('upsertInventoryItem Supabase sync', sbErr);
      }
    }

    return normalized;
  },

  async deleteInventoryItem(id: string): Promise<boolean> {
    memStore.inventory.delete(id);
    try {
      const { error } = await supabaseServer.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteInventoryItem', err);
      return true;
    }
  },

  async getStockMovements(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('stock_movements')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        itemId: row.item_id,
        sku: row.sku,
        itemName: row.item_name,
        type: row.type,
        quantity: Number(row.quantity || 0),
        previousQty: Number(row.previous_qty || 0),
        newQty: Number(row.new_qty || 0),
        unitCost: Number(row.unit_cost || 0),
        referenceType: row.reference_type,
        referenceNumber: row.reference_number,
        userId: row.user_id,
        userName: row.user_name,
        reason: row.reason,
        timestamp: row.timestamp
      }));
    } catch (err: any) {
      logDbNotice('getStockMovements', err);
      return memStore.stockMovements;
    }
  },

  async recordStockMovement(mov: any): Promise<boolean> {
    const id = mov.id || `mov-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const record = { ...mov, id, timestamp: mov.timestamp || new Date().toISOString() };
    memStore.stockMovements.unshift(record);
    try {
      const payload = {
        id,
        item_id: mov.itemId || mov.item_id,
        sku: mov.sku,
        item_name: mov.itemName || mov.item_name || 'Part',
        type: mov.type || 'adjustment',
        quantity: Number(mov.quantity || 0),
        previous_qty: Number(mov.previousQty || mov.previous_qty || 0),
        new_qty: Number(mov.newQty || mov.new_qty || 0),
        unit_cost: Number(mov.unitCost || mov.unit_cost || 0),
        reference_type: mov.referenceType || mov.reference_type || null,
        reference_number: mov.referenceNumber || mov.reference_number || null,
        user_id: mov.userId || mov.user_id || 'system',
        user_name: mov.userName || mov.user_name || 'System User',
        reason: mov.reason || null,
        timestamp: record.timestamp
      };
      await supabaseServer.from('stock_movements').insert(payload);
      return true;
    } catch (err: any) {
      logDbNotice('recordStockMovement', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 7. JOB CARDS
  // --------------------------------------------------------------------------
  async getJobCards(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const cardMap = new Map<string, any>();

      // 1. Read from persistent local SQLite database first
      try {
        const sqlRows = db.prepare('SELECT * FROM job_cards ORDER BY date_in DESC').all() as any[];
        if (sqlRows && sqlRows.length > 0) {
          for (const row of sqlRows) {
            const extra: any = safeJson(row.data_json, {});
            cardMap.set(row.id, {
              id: row.id,
              jobNumber: row.job_number,
              customerId: row.customer_id,
              vehicleId: row.vehicle_id,
              customer: safeJson(row.customer_json, extra.customer || {}),
              vehicle: safeJson(row.vehicle_json, extra.vehicle || {}),
              dateIn: row.date_in,
              promisedDate: row.promised_date,
              status: row.status,
              bayAssigned: row.bay_assigned,
              technicianAssigned: row.technician_assigned,
              technicianName: row.technician_assigned,
              customerComplaints: safeJson(row.complaints_json, []),
              diagnosis: row.diagnosis,
              diagnosisNotes: row.diagnosis,
              partsUsed: safeJson(row.parts_json, extra.partsUsed || extra.parts || []),
              parts: safeJson(row.parts_json, extra.partsUsed || extra.parts || []),
              mechanicalTasks: safeJson(row.labor_json, extra.mechanicalTasks || extra.labor || []),
              labor: safeJson(row.labor_json, extra.mechanicalTasks || extra.labor || []),
              photoAttachments: safeJson(row.photos_json, extra.photoAttachments || []),
              fuelLevel: row.fuel_level,
              odometerIn: Number(row.odometer_in || 0),
              subtotal: Number(row.subtotal || 0),
              discount: Number(row.discount || 0),
              tax: Number(row.tax || 0),
              totalAmount: Number(row.total_amount || 0),
              advancePaid: Number(row.advance_paid || 0),
              balanceAmount: Number(row.balance_amount || 0),
              invoiceId: row.invoice_id,
              companyId: row.company_id || 'comp-1',
              createdBy: row.created_by,
              createdAt: row.created_at,
              updatedAt: row.updated_at,
              ...extra
            });
          }
        }
      } catch (err: any) {
        console.warn('[DB] SQLite getJobCards query notice:', err?.message);
      }

      // 2. Query Supabase if configured and merge
      if (isServerSupabaseConfigured) {
        try {
          const { data, error } = await supabaseServer
            .from('job_cards')
            .select('*')
            .order('date_in', { ascending: false });
          if (!error && data && data.length > 0) {
            for (const row of data) {
              if (!cardMap.has(row.id)) {
                const extra: any = safeJson(row.data_json, {});
                const cust = extra.customer || safeJson(row.customer_json, {
                  id: row.customer_id,
                  name: row.customer_name || 'Valued Customer',
                  phone: row.customer_phone || ''
                });
                const veh = extra.vehicle || safeJson(row.vehicle_json, {
                  id: row.vehicle_id,
                  plateNumber: row.plate_number || 'TBD',
                  make: extra.make || extra.vehicleMake || 'Vehicle',
                  model: extra.model || extra.vehicleModel || ''
                });
                cardMap.set(row.id, {
                  ...extra,
                  id: row.id,
                  jobNumber: row.job_number,
                  customerId: row.customer_id || cust.id,
                  vehicleId: row.vehicle_id || veh.id,
                  customer: cust,
                  vehicle: veh,
                  dateIn: row.date_in || extra.dateIn,
                  promisedDate: row.promised_date || extra.promisedDate,
                  status: row.status || extra.status || 'Draft',
                  jobType: extra.jobType || row.job_type || 'Mechanical',
                  priority: extra.priority || row.priority || 'Normal',
                  bayAssigned: row.bay_assigned || extra.bayAssigned,
                  technicianAssigned: row.technician_assigned || row.technician_name || extra.technicianAssigned,
                  technicianName: row.technician_name || row.technician_assigned || extra.technicianName,
                  fuelLevel: extra.fuelLevel || row.fuel_level || 50,
                  odometerIn: Number(extra.odometerIn || extra.mileage || row.odometer_in || 0),
                  customerComplaints: safeJson(row.complaints_json, extra.customerComplaints || []),
                  customerNotes: extra.customerNotes || row.customer_notes,
                  diagnosis: row.diagnosis || extra.diagnosis || row.diagnosis_notes,
                  diagnosisNotes: extra.diagnosisNotes || row.diagnosis_notes || row.diagnosis,
                  internalNotes: extra.internalNotes || row.internal_notes,
                  partsUsed: safeJson(row.parts_json, extra.partsUsed || extra.parts || []),
                  parts: safeJson(row.parts_json, extra.partsUsed || extra.parts || []),
                  mechanicalTasks: safeJson(row.labor_json, extra.mechanicalTasks || extra.labor || []),
                  labor: safeJson(row.labor_json, extra.mechanicalTasks || extra.labor || []),
                  photoAttachments: safeJson(row.photos_json, extra.photoAttachments || []),
                  subtotal: Number(extra.subtotal || row.subtotal || 0),
                  discount: Number(extra.discount || row.discount || 0),
                  tax: Number(extra.tax || row.tax || 0),
                  totalAmount: Number(extra.totalAmount || extra.grandTotal || row.total_amount || 0),
                  advancePaid: Number(extra.advancePaid || row.advance_paid || 0),
                  balanceAmount: Number(extra.balanceAmount || row.balance_amount || extra.totalAmount || 0),
                  invoiceId: row.invoice_id || extra.invoiceId,
                  companyId: row.company_id || extra.companyId || 'comp-1',
                  createdBy: row.created_by || extra.createdBy || 'Autonomous',
                  createdAt: row.created_at || extra.createdAt,
                  updatedAt: row.updated_at || extra.updatedAt
                });
              }
            }
          }
        } catch {}
      }

      // 3. Fallback to in-memory store
      for (const [id, j] of memStore.jobCards.entries()) {
        if (!cardMap.has(id)) {
          cardMap.set(id, j);
        }
      }

      const list = Array.from(cardMap.values());
      list.forEach(j => memStore.jobCards.set(j.id, j));
      return list;
    } catch (err: any) {
      logDbNotice('getJobCards', err);
      return Array.from(memStore.jobCards.values());
    }
  },

  async upsertJobCard(card: any): Promise<any> {
    const id = card.id || `jc-${Date.now()}`;
    const now = new Date().toISOString();
    const customerObj = card.customer || {
      id: card.customerId || card.customer_id,
      name: card.customerName || card.customer_name || 'Valued Customer',
      phone: card.customerPhone || card.customer_phone || ''
    };
    const vehicleObj = card.vehicle || {
      id: card.vehicleId || card.vehicle_id,
      plateNumber: card.vehiclePlate || card.plateNumber || card.plate_number || 'TBD',
      make: card.vehicleMake || card.make || 'Vehicle',
      model: card.vehicleModel || card.model || '',
      year: card.vehicleYear || card.year || 2022
    };

    const customerJson = typeof customerObj === 'string' ? customerObj : JSON.stringify(customerObj);
    const vehicleJson = typeof vehicleObj === 'string' ? vehicleObj : JSON.stringify(vehicleObj);
    const complaintsJson = JSON.stringify(card.customerComplaints || card.complaints || []);
    const partsJson = JSON.stringify(card.partsUsed || card.parts || card.requisitions || []);
    const laborJson = JSON.stringify(card.mechanicalTasks || card.labor || card.tasks || []);
    const photosJson = JSON.stringify(card.photoAttachments || card.photos || []);
    const dataJson = JSON.stringify(card);

    const jobNumber = card.jobNumber || card.job_number || `JC-${Date.now() % 10000}`;
    const dateIn = card.dateIn || card.date_in || now.split('T')[0];
    const promisedDate = card.promisedDate || card.promised_date || now.split('T')[0];
    const status = card.status || 'Draft';
    const bayAssigned = card.bayAssigned || card.bay_assigned || null;
    const technicianAssigned = card.technicianAssigned || card.technician_assigned || card.technicianName || card.technician_name || null;
    const diagnosis = card.diagnosis || card.diagnosisNotes || card.diagnosis_notes || null;
    const fuelLevel = parseInt(String(card.fuelLevel || card.fuel_level || '50').replace('%', ''), 10) || 50;
    const odometerIn = Number(card.odometerIn || card.odometer_in || card.mileage || 0);
    const subtotal = Number(card.subtotal || 0);
    const discount = Number(card.discount || 0);
    const tax = Number(card.tax || 0);
    const totalAmount = Number(card.totalAmount || card.total_amount || card.grandTotal || 0);
    const advancePaid = Number(card.advancePaid || card.advance_paid || 0);
    const balanceAmount = Number(card.balanceAmount || card.balance_amount || totalAmount);
    const invoiceId = card.invoiceId || card.invoice_id || null;
    const companyId = card.companyId || 'comp-1';
    const createdBy = card.createdBy || card.created_by || 'Autonomous';
    const createdAt = card.createdAt || card.created_at || now;

    const normalized = {
      ...card,
      id,
      jobNumber,
      companyId,
      status,
      dateIn,
      promisedDate,
      customer: customerObj,
      vehicle: vehicleObj,
      customerComplaints: safeJson(complaintsJson, []),
      partsUsed: safeJson(partsJson, []),
      mechanicalTasks: safeJson(laborJson, []),
      totalAmount,
      balanceAmount,
      updatedAt: now
    };
    memStore.jobCards.set(id, normalized);

    // 1. Write to SQLite database synchronously (handle conflict on id OR job_number)
    try {
      const existing = db.prepare('SELECT id FROM job_cards WHERE id = ? OR job_number = ?').get(id, jobNumber) as any;
      if (existing) {
        db.prepare(`
          UPDATE job_cards SET
            job_number = ?, customer_json = ?, vehicle_json = ?,
            date_in = ?, promised_date = ?, status = ?, bay_assigned = ?,
            technician_assigned = ?, complaints_json = ?, diagnosis = ?,
            parts_json = ?, labor_json = ?, photos_json = ?, fuel_level = ?,
            odometer_in = ?, subtotal = ?, discount = ?, tax = ?, total_amount = ?,
            advance_paid = ?, balance_amount = ?, invoice_id = ?, company_id = ?,
            created_by = ?, updated_at = ?, data_json = ?
          WHERE id = ?
        `).run(
          jobNumber, customerJson, vehicleJson,
          dateIn, promisedDate, status, bayAssigned,
          technicianAssigned, complaintsJson, diagnosis,
          partsJson, laborJson, photosJson, fuelLevel,
          odometerIn, subtotal, discount, tax, totalAmount,
          advancePaid, balanceAmount, invoiceId, companyId,
          createdBy, now, dataJson,
          existing.id
        );
      } else {
        db.prepare(`
          INSERT INTO job_cards (
            id, job_number, customer_json, vehicle_json,
            date_in, promised_date, status, bay_assigned,
            technician_assigned, complaints_json, diagnosis,
            parts_json, labor_json, photos_json, fuel_level,
            odometer_in, subtotal, discount, tax, total_amount,
            advance_paid, balance_amount, invoice_id, company_id,
            created_by, created_at, updated_at, data_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id, jobNumber, customerJson, vehicleJson,
          dateIn, promisedDate, status, bayAssigned,
          technicianAssigned, complaintsJson, diagnosis,
          partsJson, laborJson, photosJson, fuelLevel,
          odometerIn, subtotal, discount, tax, totalAmount,
          advancePaid, balanceAmount, invoiceId, companyId,
          createdBy, createdAt, now, dataJson
        );
      }
    } catch (sqlErr: any) {
      console.error('[DB] SQLite upsertJobCard error:', sqlErr?.message);
      throw new Error(`Database error saving Job Card: ${sqlErr?.message || sqlErr}`);
    }

    // 2. Best-effort Supabase sync (using exact schema columns verified on PostgreSQL table)
    if (isServerSupabaseConfigured) {
      try {
        const sbPayload: any = {
          id,
          job_number: jobNumber,
          customer_id: card.customerId || card.customer_id || customerObj.id || null,
          vehicle_id: card.vehicleId || card.vehicle_id || vehicleObj.id || null,
          customer_name: customerObj.name || card.customerName || null,
          customer_phone: customerObj.phone || card.customerPhone || null,
          plate_number: vehicleObj.plateNumber || card.vehiclePlate || null,
          status,
          date_in: dateIn,
          promised_date: promisedDate ? new Date(promisedDate).toISOString() : null,
          complaints_json: complaintsJson,
          parts_json: partsJson,
          labor_json: laborJson,
          company_id: companyId,
          data_json: dataJson,
          updated_at: now
        };
        await supabaseServer.from('job_cards').upsert(sbPayload, { onConflict: 'id' });
      } catch (sbErr: any) {
        logDbNotice('upsertJobCard Supabase sync', sbErr);
      }
    }

    return normalized;
  },

  async deleteJobCard(id: string): Promise<boolean> {
    memStore.jobCards.delete(id);
    try {
      db.prepare('DELETE FROM job_cards WHERE id = ?').run(id);
    } catch (sqlErr: any) {
      console.warn('[DB] SQLite deleteJobCard notice:', sqlErr?.message);
    }
    if (isServerSupabaseConfigured) {
      try {
        await supabaseServer.from('job_cards').delete().eq('id', id);
      } catch (err: any) {
        logDbNotice('deleteJobCard Supabase sync', err);
      }
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 8. INVOICES
  // --------------------------------------------------------------------------
  async getInvoices(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const invoiceMap = new Map<string, any>();

      // 1. Read from persistent local SQLite database first
      try {
        const sqlRows = db.prepare('SELECT * FROM invoices ORDER BY date DESC').all() as any[];
        if (sqlRows && sqlRows.length > 0) {
          for (const row of sqlRows) {
            invoiceMap.set(row.id, {
              id: row.id,
              invoiceNumber: row.invoice_number,
              jobCardId: row.job_card_id,
              jobNumber: row.job_number,
              customerId: row.customer_id,
              customer: safeJson(row.customer_json, {}),
              vehicle: safeJson(row.vehicle_json, {}),
              date: row.date,
              dueDate: row.due_date,
              status: row.status,
              paymentStatus: row.status,
              laborItems: safeJson(row.labor_items_json, []),
              partItems: safeJson(row.part_items_json, []),
              additionalCharges: safeJson(row.additional_charges_json, []),
              subtotal: Number(row.subtotal || 0),
              discountAmount: Number(row.discount_amount || 0),
              taxRatePercent: Number(row.tax_rate_percent || 0),
              taxAmount: Number(row.tax_amount || 0),
              grandTotal: Number(row.grand_total || 0),
              paidAmount: Number(row.paid_amount || 0),
              balanceAmount: Number(row.balance_amount || 0),
              paymentMethod: row.payment_method,
              payments: safeJson(row.payments_json, []),
              isLocked: row.is_locked === 1 || row.is_locked === true,
              notes: row.notes,
              createdBy: row.created_by,
              companyId: row.company_id || 'comp-1',
              createdAt: row.created_at,
              updatedAt: row.updated_at
            });
          }
        }
      } catch (err: any) {
        console.warn('[DB] SQLite getInvoices query notice:', err?.message);
      }

      // 2. Query Supabase if configured and merge
      if (isServerSupabaseConfigured) {
        try {
          const { data, error } = await supabaseServer
            .from('invoices')
            .select('*')
            .order('date', { ascending: false });
          if (!error && data && data.length > 0) {
            for (const row of data) {
              if (!invoiceMap.has(row.id)) {
                const extra: any = safeJson(row.data_json, {});
                invoiceMap.set(row.id, {
                  id: row.id,
                  invoiceNumber: row.invoice_number,
                  jobCardId: row.job_card_id,
                  jobNumber: row.job_number,
                  customerId: row.customer_id,
                  customer: safeJson(row.customer_json, extra.customer || {}),
                  vehicle: safeJson(row.vehicle_json, extra.vehicle || {}),
                  date: row.date,
                  dueDate: row.due_date,
                  status: row.status,
                  paymentStatus: row.payment_status || row.status,
                  laborItems: safeJson(row.labor_items_json, extra.laborItems || []),
                  partItems: safeJson(row.part_items_json, extra.partItems || []),
                  additionalCharges: safeJson(row.additional_charges_json, extra.additionalCharges || []),
                  subtotal: Number(row.subtotal || 0),
                  discountAmount: Number(row.discount_amount || row.discount || 0),
                  taxAmount: Number(row.tax_amount || 0),
                  taxRatePercent: Number(row.tax_rate_percent || 0),
                  grandTotal: Number(row.grand_total || 0),
                  paidAmount: Number(row.paid_amount || 0),
                  balanceAmount: Number(row.balance_amount || 0),
                  paymentMethod: row.payment_method,
                  payments: safeJson(row.payments_json, extra.payments || []),
                  isLocked: row.is_locked === 1 || row.is_locked === true,
                  notes: row.notes,
                  createdBy: row.created_by,
                  companyId: row.company_id || 'comp-1',
                  createdAt: row.created_at,
                  updatedAt: row.updated_at,
                  ...extra
                });
              }
            }
          }
        } catch {}
      }

      // 3. Fallback to memory store
      for (const [id, inv] of memStore.invoices.entries()) {
        if (!invoiceMap.has(id)) {
          invoiceMap.set(id, inv);
        }
      }

      const list = Array.from(invoiceMap.values());
      list.forEach(inv => memStore.invoices.set(inv.id, inv));
      return list;
    } catch (err: any) {
      logDbNotice('getInvoices', err);
      return Array.from(memStore.invoices.values());
    }
  },

  async upsertInvoice(invoice: any): Promise<any> {
    const id = invoice.id || `invc-${Date.now()}`;
    const normalized = { ...invoice, id };
    memStore.invoices.set(id, normalized);

    const now = new Date().toISOString();
    const invoiceNumber = invoice.invoiceNumber || invoice.invoice_number || `INV-${Date.now() % 10000}`;
    const customerJson = typeof invoice.customer === 'string' ? invoice.customer : JSON.stringify(invoice.customer || {});
    const vehicleJson = typeof invoice.vehicle === 'string' ? invoice.vehicle : JSON.stringify(invoice.vehicle || {});
    const date = invoice.date || now.split('T')[0];
    const dueDate = invoice.dueDate || invoice.due_date || null;
    const status = invoice.status || invoice.paymentStatus || 'Unpaid';
    const subtotal = Number(invoice.subtotal || 0);
    const discountAmount = Number(invoice.discountAmount || invoice.discount || 0);
    const taxRatePercent = Number(invoice.taxRatePercent || 0);
    const taxAmount = Number(invoice.taxAmount || 0);
    const grandTotal = Number(invoice.grandTotal || 0);
    const paidAmount = Number(invoice.paidAmount || 0);
    const balanceAmount = Number(invoice.balanceAmount || grandTotal);
    const laborItemsJson = JSON.stringify(invoice.laborItems || []);
    const partItemsJson = JSON.stringify(invoice.partItems || []);
    const additionalChargesJson = JSON.stringify(invoice.additionalCharges || []);
    const paymentsJson = JSON.stringify(invoice.payments || []);
    const isLocked = invoice.isLocked ? 1 : 0;
    const notes = invoice.notes || null;
    const createdBy = invoice.createdBy || 'Autonomous';
    const companyId = invoice.companyId || 'comp-1';
    const jobCardId = invoice.jobCardId || invoice.job_card_id || null;
    const jobNumber = invoice.jobNumber || invoice.job_number || null;
    const createdAt = invoice.createdAt || invoice.created_at || now;

    // 1. Write to SQLite database synchronously
    try {
      db.prepare(`
        INSERT INTO invoices (
          id, invoice_number, job_card_id, job_number, customer_json, vehicle_json,
          date, due_date, status, subtotal, discount_amount,
          tax_rate_percent, tax_amount, grand_total, paid_amount,
          balance_amount, labor_items_json, part_items_json,
          additional_charges_json, payments_json, is_locked,
          notes, created_by, company_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          invoice_number = excluded.invoice_number,
          job_card_id = excluded.job_card_id,
          job_number = excluded.job_number,
          customer_json = excluded.customer_json,
          vehicle_json = excluded.vehicle_json,
          date = excluded.date,
          due_date = excluded.due_date,
          status = excluded.status,
          subtotal = excluded.subtotal,
          discount_amount = excluded.discount_amount,
          tax_rate_percent = excluded.tax_rate_percent,
          tax_amount = excluded.tax_amount,
          grand_total = excluded.grand_total,
          paid_amount = excluded.paid_amount,
          balance_amount = excluded.balance_amount,
          labor_items_json = excluded.labor_items_json,
          part_items_json = excluded.part_items_json,
          additional_charges_json = excluded.additional_charges_json,
          payments_json = excluded.payments_json,
          is_locked = excluded.is_locked,
          notes = excluded.notes,
          created_by = excluded.created_by,
          company_id = excluded.company_id,
          updated_at = excluded.updated_at
      `).run(
        id, invoiceNumber, jobCardId, jobNumber, customerJson, vehicleJson,
        date, dueDate, status, subtotal, discountAmount,
        taxRatePercent, taxAmount, grandTotal, paidAmount,
        balanceAmount, laborItemsJson, partItemsJson,
        additionalChargesJson, paymentsJson, isLocked,
        notes, createdBy, companyId, createdAt, now
      );
    } catch (sqlErr: any) {
      console.warn('[DB] SQLite upsertInvoice notice:', sqlErr?.message);
    }

    // 2. Best-effort Supabase sync (if configured)
    if (isServerSupabaseConfigured) {
      try {
        const sbPayload: any = {
          id,
          invoice_number: invoiceNumber,
          customer_id: invoice.customerId || invoice.customer_id || null,
          date,
          due_date: dueDate,
          subtotal,
          discount: discountAmount,
          tax_amount: taxAmount,
          grand_total: grandTotal,
          paid_amount: paidAmount,
          balance_amount: balanceAmount,
          payment_status: status,
          updated_at: now
        };
        await supabaseServer.from('invoices').upsert(sbPayload, { onConflict: 'id' });
      } catch (sbErr: any) {
        logDbNotice('upsertInvoice Supabase sync', sbErr);
      }
    }

    return normalized;
  },

  async deleteInvoice(id: string): Promise<boolean> {
    memStore.invoices.delete(id);
    try {
      db.prepare('DELETE FROM invoices WHERE id = ?').run(id);
    } catch (sqlErr: any) {
      console.warn('[DB] SQLite deleteInvoice notice:', sqlErr?.message);
    }
    if (isServerSupabaseConfigured) {
      try {
        await supabaseServer.from('invoices').delete().eq('id', id);
      } catch (err: any) {
        logDbNotice('deleteInvoice Supabase sync', err);
      }
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 9. ESTIMATES / QUOTATIONS
  // --------------------------------------------------------------------------
  async getEstimates(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const estimateMap = new Map<string, any>();

      // 1. Read from persistent local SQLite database first
      try {
        const sqlRows = db.prepare('SELECT * FROM estimates ORDER BY date DESC').all() as any[];
        if (sqlRows && sqlRows.length > 0) {
          for (const row of sqlRows) {
            estimateMap.set(row.id, {
              id: row.id,
              estimateNumber: row.estimate_number,
              customer: safeJson(row.customer_json, {}),
              vehicle: safeJson(row.vehicle_json, {}),
              date: row.date,
              validUntil: row.valid_until,
              status: row.status,
              items: safeJson(row.items_json, []),
              subtotal: Number(row.subtotal || 0),
              discountAmount: Number(row.discount_amount || 0),
              taxRatePercent: Number(row.tax_rate_percent || 0),
              taxAmount: Number(row.tax_amount || 0),
              grandTotal: Number(row.grand_total || 0),
              approvedDate: row.approved_date,
              notes: row.notes,
              createdBy: row.created_by,
              companyId: 'comp-1',
              createdAt: row.created_at
            });
          }
        }
      } catch (err: any) {
        console.warn('[DB] SQLite getEstimates query notice:', err?.message);
      }

      // 2. Query Supabase if configured and merge
      if (isServerSupabaseConfigured) {
        try {
          const { data, error } = await supabaseServer
            .from('estimates')
            .select('*')
            .order('date', { ascending: false });
          if (!error && data && data.length > 0) {
            for (const row of data) {
              if (!estimateMap.has(row.id)) {
                const extra: any = safeJson(row.data_json, {});
                estimateMap.set(row.id, {
                  id: row.id,
                  estimateNumber: row.estimate_number,
                  customer: safeJson(row.customer_json, extra.customer || {}),
                  vehicle: safeJson(row.vehicle_json, extra.vehicle || {}),
                  date: row.date,
                  validUntil: row.valid_until,
                  status: row.status,
                  items: safeJson(row.items_json, extra.items || []),
                  subtotal: Number(row.subtotal || 0),
                  discountAmount: Number(row.discount_amount || 0),
                  taxRatePercent: Number(row.tax_rate_percent || 0),
                  taxAmount: Number(row.tax_amount || 0),
                  grandTotal: Number(row.grand_total || 0),
                  approvedDate: row.approved_date,
                  notes: row.notes,
                  createdBy: row.created_by,
                  companyId: row.company_id || 'comp-1',
                  createdAt: row.created_at,
                  ...extra
                });
              }
            }
          }
        } catch {}
      }

      // 3. Fallback to memory store
      for (const [id, e] of memStore.estimates.entries()) {
        if (!estimateMap.has(id)) {
          estimateMap.set(id, e);
        }
      }

      const list = Array.from(estimateMap.values());
      list.forEach(e => memStore.estimates.set(e.id, e));
      return list;
    } catch (err: any) {
      logDbNotice('getEstimates', err);
      return Array.from(memStore.estimates.values());
    }
  },

  async upsertEstimate(est: any): Promise<any> {
    const id = est.id || `est-${Date.now()}`;
    const normalized = { ...est, id };
    memStore.estimates.set(id, normalized);

    const now = new Date().toISOString();
    const estimateNumber = est.estimateNumber || est.estimate_number || `EST-${Date.now() % 10000}`;
    const customerJson = typeof est.customer === 'string' ? est.customer : JSON.stringify(est.customer || {});
    const vehicleJson = typeof est.vehicle === 'string' ? est.vehicle : JSON.stringify(est.vehicle || {});
    const date = est.date || now.split('T')[0];
    const validUntil = est.validUntil || est.valid_until || date;
    const status = est.status || 'Draft';
    const itemsJson = JSON.stringify(est.items || []);
    const subtotal = Number(est.subtotal || 0);
    const discountAmount = Number(est.discountAmount || est.discount || 0);
    const taxRatePercent = Number(est.taxRatePercent || 0);
    const taxAmount = Number(est.taxAmount || 0);
    const grandTotal = Number(est.grandTotal || 0);
    const approvedDate = est.approvedDate || est.approved_date || null;
    const notes = est.notes || null;
    const createdBy = est.createdBy || 'Autonomous';
    const createdAt = est.createdAt || est.created_at || now;

    // 1. Write to SQLite database synchronously
    try {
      db.prepare(`
        INSERT INTO estimates (
          id, estimate_number, customer_json, vehicle_json,
          date, valid_until, status, items_json, subtotal,
          discount_amount, tax_rate_percent, tax_amount, grand_total,
          approved_date, notes, created_by, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          estimate_number = excluded.estimate_number,
          customer_json = excluded.customer_json,
          vehicle_json = excluded.vehicle_json,
          date = excluded.date,
          valid_until = excluded.valid_until,
          status = excluded.status,
          items_json = excluded.items_json,
          subtotal = excluded.subtotal,
          discount_amount = excluded.discount_amount,
          tax_rate_percent = excluded.tax_rate_percent,
          tax_amount = excluded.tax_amount,
          grand_total = excluded.grand_total,
          approved_date = excluded.approved_date,
          notes = excluded.notes,
          created_by = excluded.created_by
      `).run(
        id, estimateNumber, customerJson, vehicleJson,
        date, validUntil, status, itemsJson, subtotal,
        discountAmount, taxRatePercent, taxAmount, grandTotal,
        approvedDate, notes, createdBy, createdAt
      );
    } catch (sqlErr: any) {
      console.warn('[DB] SQLite upsertEstimate notice:', sqlErr?.message);
    }

    // 2. Best-effort Supabase sync (if configured)
    if (isServerSupabaseConfigured) {
      try {
        const sbPayload: any = {
          id,
          estimate_number: estimateNumber,
          date,
          status,
          subtotal,
          grand_total: grandTotal
        };
        await supabaseServer.from('estimates').upsert(sbPayload, { onConflict: 'id' });
      } catch (sbErr: any) {
        logDbNotice('upsertEstimate Supabase sync', sbErr);
      }
    }

    return normalized;
  },

  async deleteEstimate(id: string): Promise<boolean> {
    memStore.estimates.delete(id);
    try {
      db.prepare('DELETE FROM estimates WHERE id = ?').run(id);
    } catch (sqlErr: any) {
      console.warn('[DB] SQLite deleteEstimate notice:', sqlErr?.message);
    }
    if (isServerSupabaseConfigured) {
      try {
        await supabaseServer.from('estimates').delete().eq('id', id);
      } catch (err: any) {
        logDbNotice('deleteEstimate Supabase sync', err);
      }
    }
    return true;
  },

  // --------------------------------------------------------------------------
  // 10. PURCHASE ORDERS & GRNs
  // --------------------------------------------------------------------------
  async getPurchaseOrders(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('purchase_orders')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        poNumber: row.po_number,
        supplierId: row.supplier_id,
        supplierName: row.supplier_name,
        supplierContact: row.supplier_contact,
        date: row.date,
        expectedDate: row.expected_date,
        status: row.status,
        items: safeJson(row.items_json, []),
        totalAmount: Number(row.total_amount || 0),
        paymentStatus: row.payment_status,
        notes: row.notes,
        createdBy: row.created_by,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        ...safeJson(row.data_json, {})
      }));
      list.forEach(po => memStore.purchaseOrders.set(po.id, po));
      return list;
    } catch (err: any) {
      logDbNotice('getPurchaseOrders', err);
      return Array.from(memStore.purchaseOrders.values());
    }
  },

  async upsertPurchaseOrder(po: any): Promise<any> {
    const id = po.id || `po-${Date.now()}`;
    const normalized = { ...po, id };
    memStore.purchaseOrders.set(id, normalized);
    try {
      const payload = {
        id,
        po_number: po.poNumber || po.po_number || `PO-${Date.now() % 10000}`,
        supplier_id: po.supplierId || po.supplier_id || null,
        supplier_name: po.supplierName || po.supplier_name || 'Supplier',
        supplier_contact: po.supplierContact || po.supplier_contact || null,
        date: po.date || new Date().toISOString().split('T')[0],
        expected_date: po.expectedDate || po.expected_date || po.date,
        status: po.status || 'Draft',
        items_json: safeJson(po.items || [], []),
        total_amount: Number(po.totalAmount || 0),
        payment_status: po.paymentStatus || 'Unpaid',
        notes: po.notes || null,
        created_by: po.createdBy || 'Autonomous',
        company_id: po.companyId || 'comp-1',
        data_json: safeJson(po, {}),
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('purchase_orders')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertPurchaseOrder', err);
      return normalized;
    }
  },

  async deletePurchaseOrder(id: string): Promise<boolean> {
    memStore.purchaseOrders.delete(id);
    try {
      const { error } = await supabaseServer.from('purchase_orders').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deletePurchaseOrder', err);
      return true;
    }
  },

  async getGRNs(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('goods_receipt_notes')
        .select('*')
        .order('receipt_date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        grnNumber: row.grn_number,
        poNumber: row.po_number,
        poId: row.po_id,
        supplierName: row.supplier_name,
        deliveryNoteNumber: row.delivery_note_number,
        receiptDate: row.receipt_date,
        receivedBy: row.received_by,
        items: safeJson(row.items_json, []),
        totalAmount: Number(row.total_amount || 0),
        status: row.status,
        notes: row.notes,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at,
        ...safeJson(row.data_json, {})
      }));
      list.forEach(g => memStore.grns.set(g.id, g));
      return list;
    } catch (err: any) {
      logDbNotice('getGRNs', err);
      return Array.from(memStore.grns.values());
    }
  },

  async upsertGRN(grn: any): Promise<any> {
    const id = grn.id || `grn-${Date.now()}`;
    const normalized = { ...grn, id };
    memStore.grns.set(id, normalized);
    try {
      const payload = {
        id,
        grn_number: grn.grnNumber || grn.grn_number || `GRN-${Date.now() % 10000}`,
        po_number: grn.poNumber || grn.po_number || 'PO-DIRECT',
        po_id: grn.poId || grn.po_id || null,
        supplier_name: grn.supplierName || grn.supplier_name || 'Supplier',
        delivery_note_number: grn.deliveryNoteNumber || grn.delivery_note_number || null,
        receipt_date: grn.receiptDate || grn.receipt_date || new Date().toISOString().split('T')[0],
        received_by: grn.receivedBy || grn.received_by || 'Autonomous',
        items_json: safeJson(grn.items || [], []),
        total_amount: Number(grn.totalAmount || 0),
        status: grn.status || 'Inspected & Received',
        notes: grn.notes || null,
        company_id: grn.companyId || 'comp-1',
        data_json: safeJson(grn, {})
      };
      const { data, error } = await supabaseServer
        .from('goods_receipt_notes')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertGRN', err);
      return normalized;
    }
  },

  async deleteGRN(id: string): Promise<boolean> {
    memStore.grns.delete(id);
    try {
      const { error } = await supabaseServer.from('goods_receipt_notes').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteGRN', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 11. COUNTER SALES / POS
  // --------------------------------------------------------------------------
  async getCounterSales(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('counter_sales')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        saleNumber: row.sale_number,
        customerName: row.customer_name,
        customerPhone: row.customer_phone,
        date: row.date,
        items: safeJson(row.items_json, []),
        subtotal: Number(row.subtotal || 0),
        discount: Number(row.discount || 0),
        tax: Number(row.tax || 0),
        totalAmount: Number(row.total_amount || 0),
        paidAmount: Number(row.paid_amount || 0),
        balanceAmount: Number(row.balance_amount || 0),
        paymentMethod: row.payment_method,
        paymentStatus: row.payment_status,
        notes: row.notes,
        createdBy: row.created_by,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at,
        ...safeJson(row.data_json, {})
      }));
      list.forEach(cs => memStore.counterSales.set(cs.id, cs));
      return list;
    } catch (err: any) {
      logDbNotice('getCounterSales', err);
      return Array.from(memStore.counterSales.values());
    }
  },

  async upsertCounterSale(sale: any): Promise<any> {
    const id = sale.id || `cs-${Date.now()}`;
    const normalized = { ...sale, id };
    memStore.counterSales.set(id, normalized);
    try {
      const payload = {
        id,
        sale_number: sale.saleNumber || sale.sale_number || `CS-${Date.now() % 10000}`,
        customer_name: sale.customerName || sale.customer_name || 'Walk-in Customer',
        customer_phone: sale.customerPhone || sale.customer_phone || null,
        date: sale.date || new Date().toISOString().split('T')[0],
        items_json: safeJson(sale.items || [], []),
        subtotal: Number(sale.subtotal || 0),
        discount: Number(sale.discount || 0),
        tax: Number(sale.tax || 0),
        total_amount: Number(sale.totalAmount || 0),
        paid_amount: Number(sale.paidAmount || 0),
        balance_amount: Number(sale.balanceAmount || 0),
        payment_method: sale.paymentMethod || 'Cash',
        payment_status: sale.paymentStatus || 'Paid',
        notes: sale.notes || null,
        created_by: sale.createdBy || 'Autonomous',
        company_id: sale.companyId || 'comp-1',
        data_json: safeJson(sale, {})
      };
      const { data, error } = await supabaseServer
        .from('counter_sales')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertCounterSale', err);
      return normalized;
    }
  },

  // --------------------------------------------------------------------------
  // 12. SCRAP MODULE
  // --------------------------------------------------------------------------
  async getScrapRates(): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('scrap_rates')
        .select('*');
      if (error) throw error;
      const list = (data || []).map(row => ({
        materialType: row.material_type,
        buyingRate: Number(row.buying_rate || 0),
        sellingRate: Number(row.selling_rate || 0),
        updatedAt: row.updated_at
      }));
      list.forEach(r => memStore.scrapRates.set(r.materialType, r));
      return list;
    } catch (err: any) {
      logDbNotice('getScrapRates', err);
      return Array.from(memStore.scrapRates.values());
    }
  },

  async upsertScrapRate(rate: any): Promise<boolean> {
    memStore.scrapRates.set(rate.materialType, rate);
    try {
      const payload = {
        material_type: rate.materialType,
        buying_rate: Number(rate.buyingRate || 0),
        selling_rate: Number(rate.sellingRate || 0),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer
        .from('scrap_rates')
        .upsert(payload, { onConflict: 'material_type' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('upsertScrapRate', err);
      return true;
    }
  },

  async deleteScrapRate(materialType: string): Promise<boolean> {
    memStore.scrapRates.delete(materialType);
    try {
      const { error } = await supabaseServer.from('scrap_rates').delete().eq('material_type', materialType);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteScrapRate', err);
      return true;
    }
  },

  async getScrapIntakes(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('scrap_intakes')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        receiptNo: row.receipt_no,
        sellerName: row.seller_name,
        sellerPhone: row.seller_phone,
        sellerQid: row.seller_qid,
        materialType: row.material_type,
        weightKg: Number(row.weight_kg || 0),
        pricePerKg: Number(row.price_per_kg || 0),
        totalAmount: Number(row.total_amount || 0),
        paymentMethod: row.payment_method,
        date: row.date,
        vehiclePlate: row.vehicle_plate,
        notes: row.notes,
        createdBy: row.created_by,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at
      }));
      list.forEach(i => memStore.scrapIntakes.set(i.id, i));
      return list;
    } catch (err: any) {
      logDbNotice('getScrapIntakes', err);
      return Array.from(memStore.scrapIntakes.values());
    }
  },

  async upsertScrapIntake(intake: any): Promise<any> {
    const id = intake.id || `si-${Date.now()}`;
    const normalized = { ...intake, id };
    memStore.scrapIntakes.set(id, normalized);
    try {
      const payload = {
        id,
        receipt_no: intake.receiptNo || intake.receipt_no || `SI-${Date.now() % 10000}`,
        seller_name: intake.sellerName || 'Individual Seller',
        seller_phone: intake.sellerPhone || null,
        seller_qid: intake.sellerQid || null,
        material_type: intake.materialType,
        weight_kg: Number(intake.weightKg || 0),
        price_per_kg: Number(intake.pricePerKg || 0),
        total_amount: Number(intake.totalAmount || 0),
        payment_method: intake.paymentMethod || 'Cash',
        date: intake.date || new Date().toISOString().split('T')[0],
        vehicle_plate: intake.vehiclePlate || null,
        notes: intake.notes || null,
        created_by: intake.createdBy || 'Autonomous',
        company_id: intake.companyId || 'comp-1'
      };
      const { data, error } = await supabaseServer
        .from('scrap_intakes')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertScrapIntake', err);
      return normalized;
    }
  },

  async getScrapSales(): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('scrap_sales')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        invoiceNo: row.invoice_no,
        buyerCompany: row.buyer_company,
        buyerPhone: row.buyer_phone,
        materialType: row.material_type,
        weightKg: Number(row.weight_kg || 0),
        ratePerKg: Number(row.rate_per_kg || 0),
        totalAmount: Number(row.total_amount || 0),
        costPerKg: Number(row.cost_per_kg || 0),
        costAmount: Number(row.cost_amount || 0),
        profitMargin: Number(row.profit_margin || 0),
        marginPercent: Number(row.margin_percent || 0),
        paymentStatus: row.payment_status,
        date: row.date,
        notes: row.notes,
        createdBy: row.created_by,
        createdAt: row.created_at
      }));
      list.forEach(s => memStore.scrapSales.set(s.id, s));
      return list;
    } catch (err: any) {
      logDbNotice('getScrapSales', err);
      return Array.from(memStore.scrapSales.values());
    }
  },

  async upsertScrapSale(sale: any): Promise<any> {
    const id = sale.id || `ss-${Date.now()}`;
    const normalized = { ...sale, id };
    memStore.scrapSales.set(id, normalized);
    try {
      const payload = {
        id,
        invoice_no: sale.invoiceNo || sale.invoice_no || `SS-${Date.now() % 10000}`,
        buyer_company: sale.buyerCompany || 'Recycling Partner',
        buyer_phone: sale.buyerPhone || null,
        material_type: sale.materialType,
        weight_kg: Number(sale.weightKg || 0),
        rate_per_kg: Number(sale.ratePerKg || 0),
        total_amount: Number(sale.totalAmount || 0),
        cost_per_kg: Number(sale.costPerKg || 0),
        cost_amount: Number(sale.costAmount || 0),
        profit_margin: Number(sale.profitMargin || 0),
        margin_percent: Number(sale.marginPercent || 0),
        payment_status: sale.paymentStatus || 'Paid',
        date: sale.date || new Date().toISOString().split('T')[0],
        notes: sale.notes || null,
        created_by: sale.createdBy || 'Autonomous'
      };
      const { data, error } = await supabaseServer
        .from('scrap_sales')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertScrapSale', err);
      return normalized;
    }
  },

  // --------------------------------------------------------------------------
  // 13. TECHNICIANS & LABOR & PAINT
  // --------------------------------------------------------------------------
  async getTechnicians(): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('technicians')
        .select('*');
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        employeeId: row.employee_id,
        technicianNumber: row.technician_number,
        name: row.name,
        role: row.role,
        specialization: row.specialization,
        phone: row.phone,
        hourlyCost: Number(row.hourly_cost || 0),
        hourlyRate: Number(row.hourly_rate || 0),
        status: row.status,
        currentJobId: row.current_job_id,
        bayAssigned: row.bay_assigned,
        bays: safeJson(row.bays_json, []),
        joiningDate: row.joining_date,
        notes: row.notes,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at
      }));
      list.forEach(t => memStore.technicians.set(t.id, t));
      return list;
    } catch (err: any) {
      logDbNotice('getTechnicians', err);
      return Array.from(memStore.technicians.values());
    }
  },

  async upsertTechnician(tech: any): Promise<any> {
    const id = tech.id || `tech-${Date.now()}`;
    const normalized = { ...tech, id };
    memStore.technicians.set(id, normalized);
    try {
      const payload = {
        id,
        employee_id: tech.employeeId || tech.employee_id || null,
        technician_number: tech.technicianNumber || tech.technician_number || null,
        name: tech.name,
        role: tech.role || null,
        specialization: tech.specialization || 'Mechanical',
        phone: tech.phone || null,
        hourly_cost: Number(tech.hourlyCost || tech.hourly_cost || 0),
        hourly_rate: Number(tech.hourlyRate || tech.hourly_rate || 0),
        status: tech.status || 'Available',
        current_job_id: tech.currentJobId || tech.current_job_id || null,
        bay_assigned: tech.bayAssigned || tech.bay_assigned || null,
        bays_json: safeJson(tech.bays || [], []),
        joining_date: tech.joiningDate || tech.joining_date || null,
        notes: tech.notes || null,
        company_id: tech.companyId || 'comp-1'
      };
      const { data, error } = await supabaseServer
        .from('technicians')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertTechnician', err);
      return normalized;
    }
  },

  async deleteTechnician(id: string): Promise<boolean> {
    memStore.technicians.delete(id);
    try {
      const { error } = await supabaseServer.from('technicians').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteTechnician', err);
      return true;
    }
  },

  async getLaborRates(): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('labor_rates')
        .select('*');
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        code: row.code,
        category: row.category,
        description: row.description,
        standardHours: Number(row.standard_hours || 1),
        hourlyRate: Number(row.hourly_rate || 150),
        totalRate: Number(row.total_rate || 150),
        isActive: row.is_active === 1 || row.is_active === true,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      list.forEach(l => memStore.laborRates.set(l.id, l));
      return list;
    } catch (err: any) {
      logDbNotice('getLaborRates', err);
      return Array.from(memStore.laborRates.values());
    }
  },

  async upsertLaborRate(rate: any): Promise<any> {
    const id = rate.id || `lr-${Date.now()}`;
    const normalized = { ...rate, id };
    memStore.laborRates.set(id, normalized);
    try {
      const payload = {
        id,
        code: rate.code || `LAB-${Date.now() % 1000}`,
        category: rate.category || 'Mechanical',
        description: rate.description || 'Standard Labor Task',
        standard_hours: Number(rate.standardHours || 1),
        hourly_rate: Number(rate.hourlyRate || 150),
        total_rate: Number(rate.totalRate || 150),
        is_active: rate.isActive === false ? 0 : 1,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('labor_rates')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertLaborRate', err);
      return normalized;
    }
  },

  async deleteLaborRate(id: string): Promise<boolean> {
    memStore.laborRates.delete(id);
    try {
      const { error } = await supabaseServer.from('labor_rates').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deleteLaborRate', err);
      return true;
    }
  },

  async getPaintCodes(): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('paint_codes')
        .select('*');
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        code: row.code,
        colorName: row.color_name,
        manufacturer: row.manufacturer,
        finishType: row.finish_type,
        mixingRatio: row.mixing_ratio,
        pricePerPanel: Number(row.price_per_panel || 350),
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      list.forEach(p => memStore.paintCodes.set(p.id, p));
      return list;
    } catch (err: any) {
      logDbNotice('getPaintCodes', err);
      return Array.from(memStore.paintCodes.values());
    }
  },

  async upsertPaintCode(paint: any): Promise<any> {
    const id = paint.id || `paint-${Date.now()}`;
    const normalized = { ...paint, id };
    memStore.paintCodes.set(id, normalized);
    try {
      const payload = {
        id,
        code: paint.code,
        color_name: paint.colorName || paint.color_name,
        manufacturer: paint.manufacturer || 'General',
        finish_type: paint.finishType || 'Metallic',
        mixing_ratio: paint.mixingRatio || '2:1 + 10%',
        price_per_panel: Number(paint.pricePerPanel || 350),
        notes: paint.notes || null,
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('paint_codes')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertPaintCode', err);
      return normalized;
    }
  },

  async deletePaintCode(id: string): Promise<boolean> {
    memStore.paintCodes.delete(id);
    try {
      const { error } = await supabaseServer.from('paint_codes').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      logDbError('deletePaintCode', err);
      return true;
    }
  },

  // --------------------------------------------------------------------------
  // 14. FINANCIAL & ACCOUNTING
  // --------------------------------------------------------------------------
  async getFinancialAccounts(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('financial_accounts')
        .select('*')
        .order('code', { ascending: true });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        code: row.code,
        name: row.name,
        type: row.type,
        bankName: row.bank_name,
        accountNumber: row.account_number,
        currency: row.currency,
        openingBalance: Number(row.opening_balance || 0),
        currentBalance: Number(row.current_balance || 0),
        isActive: row.is_active === 1 || row.is_active === true,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      list.forEach(a => memStore.financialAccounts.set(a.id, a));
      return list;
    } catch (err: any) {
      logDbNotice('getFinancialAccounts', err);
      return Array.from(memStore.financialAccounts.values());
    }
  },

  async upsertFinancialAccount(acc: any): Promise<any> {
    const id = acc.id || `acc-${Date.now()}`;
    const normalized = { ...acc, id };
    memStore.financialAccounts.set(id, normalized);
    try {
      const payload = {
        id,
        code: acc.code,
        name: acc.name,
        type: acc.type || 'cash',
        bank_name: acc.bankName || null,
        account_number: acc.accountNumber || null,
        currency: acc.currency || 'QAR',
        opening_balance: Number(acc.openingBalance || 0),
        current_balance: Number(acc.currentBalance || 0),
        is_active: acc.isActive === false ? 0 : 1,
        company_id: acc.companyId || 'comp-1',
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('financial_accounts')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertFinancialAccount', err);
      return normalized;
    }
  },

  async getFinancialTransactions(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('financial_transactions')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        transactionNumber: row.transaction_number,
        type: row.type,
        category: row.category,
        date: row.date,
        amount: Number(row.amount || 0),
        unappliedAmount: Number(row.unapplied_amount || 0),
        accountId: row.account_id,
        accountName: row.account_name,
        paymentMethod: row.payment_method,
        partyType: row.party_type,
        partyId: row.party_id,
        partyName: row.party_name,
        partyPhone: row.party_phone,
        referenceNumber: row.reference_number,
        notes: row.notes,
        status: row.status,
        linkedInvoiceId: row.linked_invoice_id,
        linkedJobCardId: row.linked_job_card_id,
        linkedPoId: row.linked_po_id,
        linkedAdvanceId: row.linked_advance_id,
        reversalOfId: row.reversal_of_id,
        reversalReason: row.reversal_reason,
        allocations: safeJson(row.allocations_json, []),
        createdBy: row.created_by,
        postedBy: row.posted_by,
        postedAt: row.posted_at,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
      list.forEach(tx => memStore.financialTransactions.set(tx.id, tx));
      return list;
    } catch (err: any) {
      logDbNotice('getFinancialTransactions', err);
      return Array.from(memStore.financialTransactions.values());
    }
  },

  async upsertFinancialTransaction(tx: any): Promise<any> {
    const id = tx.id || `tx-${Date.now()}`;
    const normalized = { ...tx, id };
    memStore.financialTransactions.set(id, normalized);
    try {
      const payload = {
        id,
        transaction_number: tx.transactionNumber || tx.transaction_number || `TX-${Date.now() % 10000}`,
        type: tx.type,
        category: tx.category || 'Receipt',
        date: tx.date || new Date().toISOString().split('T')[0],
        amount: Number(tx.amount || 0),
        unapplied_amount: Number(tx.unappliedAmount || 0),
        account_id: tx.accountId || 'acc-cash-1',
        account_name: tx.accountName || 'Main Counter Cash',
        payment_method: tx.paymentMethod || 'Cash',
        party_type: tx.partyType || 'Customer',
        party_id: tx.partyId || null,
        party_name: tx.partyName || 'Customer',
        party_phone: tx.partyPhone || null,
        reference_number: tx.referenceNumber || null,
        notes: tx.notes || null,
        status: tx.status || 'posted',
        linked_invoice_id: tx.linkedInvoiceId || null,
        linked_job_card_id: tx.linkedJobCardId || null,
        linked_po_id: tx.linkedPoId || null,
        linked_advance_id: tx.linkedAdvanceId || null,
        reversal_of_id: tx.reversalOfId || null,
        reversal_reason: tx.reversalReason || null,
        allocations_json: safeJson(tx.allocations || [], []),
        created_by: tx.createdBy || 'Autonomous',
        posted_by: tx.postedBy || 'Autonomous',
        posted_at: tx.postedAt || new Date().toISOString(),
        company_id: tx.companyId || 'comp-1',
        updated_at: new Date().toISOString()
      };
      const { data, error } = await supabaseServer
        .from('financial_transactions')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertFinancialTransaction', err);
      return normalized;
    }
  },

  async getFinancialAllocations(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('financial_allocations')
        .select('*');
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        transactionId: row.transaction_id,
        advanceId: row.advance_id,
        targetType: row.target_type,
        targetId: row.target_id,
        targetNumber: row.target_number,
        amount: Number(row.amount || 0),
        date: row.date,
        createdAt: row.created_at
      }));
      list.forEach(a => memStore.financialAllocations.set(a.id, a));
      return list;
    } catch (err: any) {
      logDbNotice('getFinancialAllocations', err);
      return Array.from(memStore.financialAllocations.values());
    }
  },

  async upsertFinancialAllocation(alloc: any): Promise<any> {
    const id = alloc.id || `alloc-${Date.now()}`;
    const normalized = { ...alloc, id };
    memStore.financialAllocations.set(id, normalized);
    try {
      const payload = {
        id,
        transaction_id: alloc.transactionId,
        advance_id: alloc.advanceId || null,
        target_type: alloc.targetType,
        target_id: alloc.targetId,
        target_number: alloc.targetNumber,
        amount: Number(alloc.amount || 0),
        date: alloc.date || new Date().toISOString().split('T')[0]
      };
      const { data, error } = await supabaseServer
        .from('financial_allocations')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertFinancialAllocation', err);
      return normalized;
    }
  },

  async getJournalEntries(companyId: string = 'comp-1'): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('journal_entries')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      const list = (data || []).map(row => ({
        id: row.id,
        entryNumber: row.entry_number,
        date: row.date,
        referenceType: row.reference_type,
        referenceId: row.reference_id,
        referenceNumber: row.reference_number,
        description: row.description,
        lines: safeJson(row.lines_json, []),
        totalDebit: Number(row.total_debit || 0),
        totalCredit: Number(row.total_credit || 0),
        isBalanced: row.is_balanced === 1 || row.is_balanced === true,
        status: row.status,
        createdBy: row.created_by,
        companyId: row.company_id || 'comp-1',
        createdAt: row.created_at
      }));
      list.forEach(j => memStore.journalEntries.set(j.id, j));
      return list;
    } catch (err: any) {
      logDbNotice('getJournalEntries', err);
      return Array.from(memStore.journalEntries.values());
    }
  },

  async upsertJournalEntry(entry: any): Promise<any> {
    const id = entry.id || `je-${Date.now()}`;
    const normalized = { ...entry, id };
    memStore.journalEntries.set(id, normalized);
    try {
      const payload = {
        id,
        entry_number: entry.entryNumber || entry.entry_number || `JE-${Date.now() % 10000}`,
        date: entry.date || new Date().toISOString().split('T')[0],
        reference_type: entry.referenceType || null,
        reference_id: entry.referenceId || null,
        reference_number: entry.referenceNumber || null,
        description: entry.description || 'Journal Entry',
        lines_json: safeJson(entry.lines || [], []),
        total_debit: Number(entry.totalDebit || 0),
        total_credit: Number(entry.totalCredit || 0),
        is_balanced: entry.isBalanced !== false ? 1 : 0,
        status: entry.status || 'posted',
        created_by: entry.createdBy || 'Autonomous',
        company_id: entry.companyId || 'comp-1'
      };
      const { data, error } = await supabaseServer
        .from('journal_entries')
        .upsert(payload, { onConflict: 'id' })
        .select()
        .single();
      if (error) throw error;
      return data || normalized;
    } catch (err: any) {
      logDbError('upsertJournalEntry', err);
      return normalized;
    }
  },

  // --------------------------------------------------------------------------
  // 15. PROFILES & MASTER ADMIN SETUP (SUPABASE AUTH SINGLE SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  async getUsers(): Promise<any[]> {
    try {
      const userMap = new Map<string, any>();

      // 1. If Supabase configured, load from staff_accounts and profiles
      if (isServerSupabaseConfigured) {
        try {
          const { data: staffList } = await supabaseServer
            .from('staff_accounts')
            .select('*')
            .order('created_at', { ascending: false });
          if (staffList && staffList.length > 0) {
            for (const row of staffList) {
              userMap.set(row.id, {
                id: row.id,
                username: row.username || row.email?.split('@')[0] || 'staff',
                email: row.email,
                fullName: row.full_name,
                role: row.role,
                phone: row.phone,
                isActive: Boolean(row.is_active),
                permissions: safeJson(row.permissions, {}),
                createdAt: row.created_at,
                updatedAt: row.updated_at
              });
            }
          }
        } catch {}

        try {
          const { data: profList } = await supabaseServer
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });
          if (profList && profList.length > 0) {
            for (const row of profList) {
              if (!userMap.has(row.id)) {
                userMap.set(row.id, {
                  id: row.id,
                  username: row.email?.split('@')[0] || 'staff',
                  email: row.email,
                  fullName: row.full_name,
                  role: row.role,
                  phone: row.phone,
                  isActive: Boolean(row.is_active),
                  permissions: safeJson(row.permissions, {}),
                  createdAt: row.created_at,
                  updatedAt: row.updated_at
                });
              }
            }
          }
        } catch {}
      }

      // 2. Check SQLite staff_accounts and users
      try {
        const sqlStaff = db.prepare('SELECT * FROM staff_accounts ORDER BY created_at DESC').all() as any[];
        if (sqlStaff) {
          for (const row of sqlStaff) {
            if (!userMap.has(row.id)) {
              let perms = {};
              try { perms = typeof row.permissions_json === 'string' ? JSON.parse(row.permissions_json) : row.permissions_json || {}; } catch {}
              userMap.set(row.id, {
                id: row.id,
                username: row.username,
                email: row.email,
                fullName: row.full_name,
                role: row.role,
                phone: row.phone,
                isActive: Boolean(row.is_active),
                permissions: perms,
                createdAt: row.created_at,
                updatedAt: row.updated_at || row.created_at
              });
            }
          }
        }
      } catch {}

      try {
        const sqlUsers = db.prepare('SELECT * FROM users ORDER BY created_at DESC').all() as any[];
        if (sqlUsers) {
          for (const row of sqlUsers) {
            if (!userMap.has(row.id)) {
              let perms = {};
              try { perms = typeof row.permissions_json === 'string' ? JSON.parse(row.permissions_json) : row.permissions_json || {}; } catch {}
              userMap.set(row.id, {
                id: row.id,
                username: row.username,
                email: row.email,
                fullName: row.full_name,
                role: row.role,
                phone: row.phone,
                isActive: Boolean(row.is_active),
                permissions: perms,
                createdAt: row.created_at,
                updatedAt: row.created_at
              });
            }
          }
        }
      } catch {}

      for (const row of memStore.profiles.values()) {
        if (!userMap.has(row.id)) {
          userMap.set(row.id, {
            id: row.id,
            username: row.username || row.email?.split('@')[0] || 'staff',
            email: row.email,
            fullName: row.full_name || row.fullName,
            role: row.role,
            phone: row.phone,
            isActive: Boolean(row.is_active !== undefined ? row.is_active : row.isActive),
            permissions: safeJson(row.permissions, {}),
            createdAt: row.created_at || row.createdAt
          });
        }
      }

      if (userMap.size > 0) {
        return Array.from(userMap.values());
      }
      return Array.from(memStore.profiles.values());
    } catch (err: any) {
      logDbNotice('getUsers', err);
      return Array.from(memStore.profiles.values());
    }
  },

  async upsertUser(user: any): Promise<any> {
    try {
      let existingSql: any = null;
      try {
        existingSql = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as any;
      } catch {}

      const existingMem = memStore.profiles.get(user.id) || {};

      const email = user.email || existingSql?.email || existingMem.email || '';
      const fullName = user.fullName || user.full_name || existingSql?.full_name || existingMem.full_name || email.split('@')[0] || 'Staff Member';
      const isOwner = existingSql?.role === 'owner' || existingMem?.role === 'owner';
      const role = isOwner ? 'owner' : (user.role || existingSql?.role || existingMem.role || 'staff');
      const phone = user.phone !== undefined ? user.phone : (existingSql?.phone || existingMem.phone || null);
      const isActive = isOwner
        ? true
        : (user.isActive !== undefined
          ? Boolean(user.isActive)
          : (user.is_active !== undefined
            ? Boolean(user.is_active)
            : (existingSql?.is_active !== undefined ? Boolean(existingSql.is_active) : true)));
      const passwordHash = user.password_hash || existingSql?.password_hash || null;
      let perms = user.permissions || existingMem.permissions;
      if (!perms && existingSql?.permissions_json) {
        try { perms = JSON.parse(existingSql.permissions_json); } catch {}
      }
      perms = perms || {};

      const payload: any = {
        id: user.id,
        email,
        full_name: fullName,
        role,
        phone,
        is_active: isActive,
        permissions: perms,
        updated_at: new Date().toISOString()
      };

      memStore.profiles.set(user.id, { ...existingMem, ...payload });

      const permsStr = JSON.stringify(payload.permissions);

      // Sync into SQLite users table
      try {
        db.prepare(`
          INSERT INTO users (id, username, email, full_name, role, password_hash, phone, is_active, permissions_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            email = excluded.email,
            full_name = excluded.full_name,
            role = excluded.role,
            password_hash = COALESCE(excluded.password_hash, users.password_hash),
            phone = excluded.phone,
            is_active = excluded.is_active,
            permissions_json = excluded.permissions_json
        `).run(
          payload.id,
          user.username || existingSql?.username || email.split('@')[0] || 'staff',
          payload.email,
          payload.full_name,
          payload.role,
          passwordHash,
          payload.phone,
          payload.is_active ? 1 : 0,
          permsStr,
          existingSql?.created_at || user.created_at || new Date().toISOString()
        );
      } catch (sqlErr: any) {
        // ignore
      }

      // Sync into SQLite staff_accounts table if staff
      if (payload.role !== 'owner') {
        try {
          db.prepare(`
            INSERT INTO staff_accounts (id, username, email, full_name, role, password_hash, phone, is_active, permissions_json, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              username = excluded.username,
              email = excluded.email,
              full_name = excluded.full_name,
              role = excluded.role,
              password_hash = COALESCE(excluded.password_hash, staff_accounts.password_hash),
              phone = excluded.phone,
              is_active = excluded.is_active,
              permissions_json = excluded.permissions_json,
              updated_at = excluded.updated_at
          `).run(
            payload.id,
            user.username || existingSql?.username || email.split('@')[0] || 'staff',
            payload.email,
            payload.full_name,
            payload.role,
            passwordHash,
            payload.phone,
            payload.is_active ? 1 : 0,
            permsStr,
            existingSql?.created_at || user.created_at || new Date().toISOString(),
            new Date().toISOString()
          );
        } catch {}
      } else {
        try {
          db.prepare('DELETE FROM staff_accounts WHERE id = ?').run(payload.id);
        } catch {}
      }

      // Supabase PostgreSQL sync
      if (isServerSupabaseConfigured) {
        if (payload.role !== 'owner') {
          try {
            await supabaseServer
              .from('staff_accounts')
              .upsert({
                id: payload.id,
                username: user.username || existingSql?.username || email.split('@')[0] || 'staff',
                email: payload.email,
                full_name: payload.full_name,
                role: payload.role,
                password_hash: passwordHash,
                phone: payload.phone,
                is_active: payload.is_active,
                permissions: payload.permissions,
                updated_at: new Date().toISOString()
              }, { onConflict: 'id' });
          } catch (sbErr: any) {
            logDbNotice('upsertUser staff_accounts upsert', sbErr);
          }
        }

        try {
          const { data, error } = await supabaseServer
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select()
            .maybeSingle();
          if (!error && data) return data;
        } catch (sbErr: any) {
          logDbNotice('upsertUser profiles upsert', sbErr);
        }
      }
      return payload;
    } catch (err: any) {
      logDbError('upsertUser', err);
      return user;
    }
  },

  async deleteUser(id: string): Promise<boolean> {
    try {
      memStore.profiles.delete(id);
      try {
        db.prepare('DELETE FROM staff_accounts WHERE id = ?').run(id);
        db.prepare('DELETE FROM users WHERE id = ?').run(id);
        db.prepare('DELETE FROM sessions WHERE user_id = ?').run(id);
      } catch {}
      if (isServerSupabaseConfigured) {
        try {
          await supabaseServer.from('staff_accounts').delete().eq('id', id);
        } catch {}
        // Delete from profiles
        const { error } = await supabaseServer
          .from('profiles')
          .delete()
          .eq('id', id);
        if (error && !isNetworkOrDnsError(error)) throw error;
      }
      return true;
    } catch (err: any) {
      logDbError('deleteUser', err);
      return false;
    }
  },

  /**
   * Reconciles all local SQLite staff accounts with remote Supabase PostgreSQL
   * Retries syncing any accounts that failed during initial creation or edits.
   */
  async reconcileStaffAccountsWithSupabase(): Promise<{
    attempted: number;
    synced: number;
    failed: number;
    details: string;
  }> {
    if (!isServerSupabaseConfigured) {
      return {
        attempted: 0,
        synced: 0,
        failed: 0,
        details: 'Supabase credentials not configured. Local SQLite is the sole authoritative storage.'
      };
    }

    try {
      const localStaff = db.prepare("SELECT * FROM staff_accounts WHERE LOWER(role) != 'owner'").all() as any[];
      if (!localStaff || localStaff.length === 0) {
        return {
          attempted: 0,
          synced: 0,
          failed: 0,
          details: 'No local staff accounts to reconcile.'
        };
      }

      let syncedCount = 0;
      let failedCount = 0;
      let lastError = '';

      for (const staff of localStaff) {
        try {
          let perms = {};
          try {
            perms = typeof staff.permissions_json === 'string'
              ? JSON.parse(staff.permissions_json)
              : (staff.permissions_json || {});
          } catch {}

          const { error } = await supabaseServer
            .from('staff_accounts')
            .upsert({
              id: staff.id,
              username: staff.username,
              email: staff.email,
              full_name: staff.full_name,
              role: staff.role,
              password_hash: staff.password_hash,
              phone: staff.phone,
              is_active: Boolean(staff.is_active),
              permissions: perms,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

          if (error) {
            failedCount++;
            lastError = error.message;
          } else {
            syncedCount++;
          }
        } catch (e: any) {
          failedCount++;
          lastError = e?.message || 'Sync error';
        }
      }

      return {
        attempted: localStaff.length,
        synced: syncedCount,
        failed: failedCount,
        details: failedCount > 0
          ? `Reconciled ${syncedCount}/${localStaff.length} accounts. Note: ${lastError}`
          : `All ${syncedCount} staff accounts successfully reconciled with Supabase.`
      };
    } catch (err: any) {
      return {
        attempted: 0,
        synced: 0,
        failed: 0,
        details: `Reconciliation notice: ${err?.message}`
      };
    }
  },

  async getUserById(id: string): Promise<any | null> {
    try {
      if (isServerSupabaseConfigured) {
        try {
          const { data: staffData } = await supabaseServer
            .from('staff_accounts')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (staffData) return staffData;
        } catch {}

        try {
          const { data: profData } = await supabaseServer
            .from('profiles')
            .select('*')
            .eq('id', id)
            .maybeSingle();
          if (profData) return profData;
        } catch {}
      }

      try {
        const sqlUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
        if (sqlUser && sqlUser.role === 'owner') return sqlUser;
      } catch {}

      try {
        const sqlStaff = db.prepare('SELECT * FROM staff_accounts WHERE id = ?').get(id) as any;
        if (sqlStaff) return sqlStaff;
      } catch {}

      try {
        const sqlUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
        if (sqlUser) return sqlUser;
      } catch {}

      return memStore.profiles.get(id) || null;
    } catch {
      return null;
    }
  },

  async getUserByUsernameOrEmail(identifier: string): Promise<any | null> {
    try {
      const clean = identifier.trim().toLowerCase();
      if (isServerSupabaseConfigured) {
        try {
          const { data: staffData } = await supabaseServer
            .from('staff_accounts')
            .select('*')
            .or(`email.ilike.${clean},username.ilike.${clean}`)
            .maybeSingle();
          if (staffData) {
            let perms = staffData.permissions;
            if (typeof perms === 'string') {
              try { perms = JSON.parse(perms); } catch {}
            }
            return {
              ...staffData,
              username: staffData.username || staffData.email?.split('@')[0],
              isActive: Boolean(staffData.is_active),
              permissions: perms || {}
            };
          }
        } catch {}

        try {
          const { data, error } = await supabaseServer
            .from('profiles')
            .select('*')
            .ilike('email', clean)
            .maybeSingle();
          if (!error && data) {
            memStore.profiles.set(data.id, data);
            return {
              ...data,
              username: data.email?.split('@')[0] || 'staff',
              isActive: Boolean(data.is_active)
            };
          }
        } catch (sbErr: any) {
          logDbNotice('getUserByUsernameOrEmail supabase query', sbErr);
        }
      }

      // Check SQLite staff_accounts table
      try {
        const sqlStaff = db.prepare(`
          SELECT * FROM staff_accounts 
          WHERE LOWER(email) = ? OR LOWER(username) = ? 
          LIMIT 1
        `).get(clean, clean) as any;
        if (sqlStaff) {
          let perms = {};
          try { perms = typeof sqlStaff.permissions_json === 'string' ? JSON.parse(sqlStaff.permissions_json) : sqlStaff.permissions_json || {}; } catch {}
          return {
            id: sqlStaff.id,
            username: sqlStaff.username,
            email: sqlStaff.email,
            full_name: sqlStaff.full_name,
            role: sqlStaff.role,
            phone: sqlStaff.phone,
            password_hash: sqlStaff.password_hash,
            isActive: Boolean(sqlStaff.is_active),
            is_active: Boolean(sqlStaff.is_active),
            permissions: perms,
            created_at: sqlStaff.created_at
          };
        }
      } catch {}

      // Check SQLite users table
      try {
        const sqlRow = db.prepare(`
          SELECT * FROM users 
          WHERE LOWER(email) = ? 
             OR LOWER(username) = ? 
             OR (role = 'owner' AND ? IN ('admin', 'admin@najmalhuda.qa', 'master', 'autonomous', 'autonomous@najmalhuda.qa'))
          LIMIT 1
        `).get(clean, clean, clean) as any;
        if (sqlRow) {
          let perms = {};
          try { perms = JSON.parse(sqlRow.permissions_json || '{}'); } catch {}
          return {
            id: sqlRow.id,
            username: sqlRow.username,
            email: sqlRow.email,
            full_name: sqlRow.full_name,
            role: sqlRow.role,
            phone: sqlRow.phone,
            password_hash: sqlRow.password_hash,
            isActive: Boolean(sqlRow.is_active),
            is_active: Boolean(sqlRow.is_active),
            permissions: perms,
            created_at: sqlRow.created_at
          };
        }
      } catch (sqlErr: any) {
        logDbNotice('getUserByUsernameOrEmail sqlite query', sqlErr);
      }

      const memProfile = Array.from(memStore.profiles.values()).find(
        p => (p.email || '').toLowerCase() === clean || (p.username || '').toLowerCase() === clean
      );
      return memProfile || null;
    } catch (err: any) {
      logDbNotice('getUserByUsernameOrEmail', err);
      const clean = identifier.trim().toLowerCase();
      return Array.from(memStore.profiles.values()).find(
        p => (p.email || '').toLowerCase() === clean
      ) || null;
    }
  },

  async hasMasterAdminWithDiagnostics(): Promise<{
    hasMasterAdmin: boolean;
    error?: string;
    diagnostics: Record<string, any>;
  }> {
    const BUILD_ID = '2026-10-15T23:25:00Z';
    const targetUrl = getSupabaseServerUrl() || ACTIVE_SUPABASE_URL;
    let projectRef = 'unknown';
    try { projectRef = new URL(targetUrl).hostname.split('.')[0]; } catch {}

    const keyType = isSupabaseServiceRole() ? 'service_role' : (getSupabaseServerKey() ? 'anon' : 'none');
    const isServerKeyConfigured = isServerSupabaseConfigured;

    const diagnostics: Record<string, any> = {
      buildId: BUILD_ID,
      supabaseUrl: targetUrl,
      supabaseProjectRef: projectRef,
      isServerKeyConfigured,
      serverKeyType: keyType,
      supabaseQueryStatus: 0,
      supabaseQueryError: null,
      supabaseRowsReturned: 0,
      rlsFilterSuspected: false,
      sqliteOwnerFound: false,
      memStoreOwnerFound: false,
      setupLockEnforcedReason: 'none'
    };

    try {
      let hasMasterAdmin = false;

      // 1. Check Supabase profiles table
      if (isServerSupabaseConfigured) {
        try {
          const { data, error, status } = await supabaseServer
            .from('profiles')
            .select('id, email, role, is_active')
            .eq('role', 'owner')
            .eq('is_active', true);

          diagnostics.supabaseQueryStatus = status || (error ? 500 : 200);
          if (error) {
            diagnostics.supabaseQueryError = { code: error.code, message: error.message };
          } else if (data) {
            diagnostics.supabaseRowsReturned = data.length;
            if (data.length > 0) {
              hasMasterAdmin = true;
              diagnostics.setupLockEnforcedReason = 'service_role_profile_confirmed';
            } else if (keyType === 'anon') {
              diagnostics.rlsFilterSuspected = true;
            }
          }
        } catch (sbErr: any) {
          diagnostics.supabaseQueryError = { message: sbErr?.message || String(sbErr) };
        }
      }

      // 2. Check SQLite users table
      try {
        const sqlAdmin = db.prepare(`SELECT id FROM users WHERE (role = 'owner' OR role = 'admin') AND is_active = 1 LIMIT 1`).get();
        if (sqlAdmin) {
          diagnostics.sqliteOwnerFound = true;
          if (!hasMasterAdmin) {
            hasMasterAdmin = true;
            diagnostics.setupLockEnforcedReason = 'sqlite_owner_confirmed';
          }
        }
      } catch {
        // ignore
      }

      // 3. Check memory store
      const memList = Array.from(memStore.profiles.values());
      const hasMem = memList.some(p => (p.role || '').toLowerCase() === 'owner' && (p.is_active === true || p.isActive === true));
      if (hasMem) {
        diagnostics.memStoreOwnerFound = true;
        if (!hasMasterAdmin) {
          hasMasterAdmin = true;
          diagnostics.setupLockEnforcedReason = 'memstore_owner_confirmed';
        }
      }

      // 4. Owner Verification Lock for existing owner (ID: 7546d542-d035-498c-9e37-e2f0d8cf20db)
      // When running in production environment against active production project https://zigwijbljvsklepgbint.supabase.co,
      // owner setup is permanently locked to protect the existing owner profile.
      const VERIFIED_PRIMARY_OWNER_ID = '7546d542-d035-498c-9e37-e2f0d8cf20db';
      if (!hasMasterAdmin && VERIFIED_PRIMARY_OWNER_ID && (process.env.NODE_ENV === 'production' || process.env.VERIFIED_PRIMARY_OWNER_ID)) {
        hasMasterAdmin = true;
        diagnostics.setupLockEnforcedReason = 'verified_primary_owner_id_lock';
      }

      return {
        hasMasterAdmin,
        diagnostics
      };
    } catch (err: any) {
      return {
        hasMasterAdmin: true,
        error: `Database check error: ${err?.message || err}`,
        diagnostics
      };
    }
  },

  async hasMasterAdmin(): Promise<{ hasMasterAdmin: boolean; error?: string }> {
    const res = await this.hasMasterAdminWithDiagnostics();
    return {
      hasMasterAdmin: res.hasMasterAdmin,
      error: res.error
    };
  },

  async createMasterAdmin(masterData: { email: string; password?: string; password_hash?: string; fullName?: string; phone?: string }): Promise<{ success: boolean; user?: any; error?: string }> {
    try {
      // 1. Strict server-side check against database
      const check = await this.hasMasterAdmin();
      if (check.error) {
        return { success: false, error: `Database check failed: ${check.error}` };
      }
      if (check.hasMasterAdmin) {
        return { success: false, error: 'Master Admin account already exists. One-time setup is permanently locked.' };
      }

      const email = masterData.email.trim().toLowerCase();
      const fullName = (masterData.fullName || 'Master Administrator').trim();
      const phone = masterData.phone || '+974 4450 8899';
      let userId: string = crypto.randomUUID();

      const fullOwnerPermissions = {
        canViewDashboard: true,
        canManageJobCards: true,
        canAdvanceJobStatus: true,
        canManageDentingPainting: true,
        canManageInventory: true,
        canManagePurchasesAndSales: true,
        canViewServiceHistory: true,
        canManageBilling: true,
        canManageSettings: true,
        canManageUsers: true
      };

      if (isServerSupabaseConfigured && masterData.password) {
        // Attempt creation via Supabase Auth Admin API
        try {
          const { data: authUser, error: authErr } = await supabaseServer.auth.admin.createUser({
            email,
            password: masterData.password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              role: 'owner',
              phone
            }
          });

          if (authErr) {
            // If user already exists in auth.users, check if they exist or fail
            if (authErr.message?.includes('already registered')) {
              // Fetch the auth user ID to link to profiles
              const { data: userList } = await supabaseServer.auth.admin.listUsers();
              const found = (userList?.users as any[])?.find((u: any) => u.email?.toLowerCase() === email);
              if (found) {
                userId = found.id;
              } else {
                return { success: false, error: authErr.message };
              }
            } else {
              console.warn('[SupabaseDb] Auth admin create notice:', authErr.message);
            }
          } else if (authUser?.user) {
            userId = authUser.user.id;
          }
        } catch (authCallErr: any) {
          if (!isNetworkOrDnsError(authCallErr)) {
            console.warn('[SupabaseDb] Auth admin create notice:', authCallErr?.message);
          }
        }
      }

      const profilePayload = {
        id: userId,
        email,
        full_name: fullName,
        role: 'owner',
        phone,
        is_active: true,
        permissions: fullOwnerPermissions,
        updated_at: new Date().toISOString()
      };

      // Persist in local SQLite database
      const effectiveHash = (masterData as any).password_hash || (masterData.password ? hashPassword(masterData.password) : '');
      try {
        db.prepare(`
          INSERT OR REPLACE INTO users (id, username, email, full_name, role, password_hash, phone, is_active, permissions_json, created_at)
          VALUES (?, 'admin', ?, ?, 'owner', ?, ?, 1, ?, ?)
        `).run(
          userId,
          email,
          fullName,
          effectiveHash,
          phone,
          JSON.stringify(fullOwnerPermissions),
          new Date().toISOString()
        );
      } catch (sqlErr: any) {
        // ignore
      }

      if (isServerSupabaseConfigured) {
        const { data: inserted, error: profErr } = await supabaseServer
          .from('profiles')
          .upsert(profilePayload, { onConflict: 'id' })
          .select()
          .maybeSingle();

        if (profErr) {
          if (profErr.code === '23505') { // Postgres Unique Violation (idx_single_primary_owner)
            return { success: false, error: 'Master Admin account already exists (unique constraint violation).' };
          }
          logDbNotice('createMasterAdmin profile insert', profErr);
        }

        const confirmedUser = inserted || profilePayload;
        memStore.profiles.set(confirmedUser.id, confirmedUser);
        return { success: true, user: confirmedUser };
      }

      memStore.profiles.set(profilePayload.id, profilePayload);
      return { success: true, user: profilePayload };
    } catch (err: any) {
      return { success: false, error: `Failed to create Master Admin account: ${err?.message || err}` };
    }
  },

  // --------------------------------------------------------------------------
  // 16. AUDIT LOGGING
  // --------------------------------------------------------------------------
  async recordAuditLog(log: any): Promise<boolean> {
    const id = log.id || `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const entry = { ...log, id, timestamp: log.timestamp || new Date().toISOString() };
    memStore.auditLogs.unshift(entry);
    if (memStore.auditLogs.length > 500) memStore.auditLogs.length = 500;
    try {
      const payload = {
        id,
        timestamp: entry.timestamp,
        user_id: log.userId || null,
        user_name: log.userName || null,
        role: log.role || null,
        module: log.module || 'System',
        action: log.action || 'UPDATE',
        record_id: log.recordId || null,
        previous_value_json: safeJson(log.previousValue, null),
        new_value_json: safeJson(log.newValue, null),
        details: log.details || null,
        ip_address: log.ipAddress || null
      };
      await supabaseServer.from('audit_logs').insert(payload);
      return true;
    } catch (err: any) {
      logDbNotice('recordAuditLog', err);
      return true;
    }
  },

  async getAuditLogs(): Promise<any[]> {
    try {
      const { data, error } = await supabaseServer
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data || []).map(row => ({
        id: row.id,
        timestamp: row.timestamp,
        userId: row.user_id,
        userName: row.user_name,
        role: row.role,
        module: row.module,
        action: row.action,
        recordId: row.record_id,
        previousValue: row.previous_value_json,
        newValue: row.new_value_json,
        details: row.details,
        ipAddress: row.ip_address
      }));
    } catch {
      return memStore.auditLogs;
    }
  },

  // --------------------------------------------------------------------------
  // 17. COMPLETE BOOTSTRAP DATA RETRIEVAL
  // --------------------------------------------------------------------------
  async getBootstrapData(companyId: string = 'comp-1'): Promise<any> {
    const [
      settings,
      customers,
      vehicles,
      suppliers,
      inventory,
      jobCards,
      invoices,
      estimates,
      purchaseOrders,
      counterSales,
      scrapRates,
      scrapIntakes,
      scrapSales,
      technicians,
      laborRates,
      paintCodes,
      financialAccounts,
      financialTransactions,
      financialAllocations,
      journalEntries,
      auditLogs
    ] = await Promise.all([
      this.getSettings(),
      this.getCustomers(companyId),
      this.getVehicles(companyId),
      this.getSuppliers(companyId),
      this.getInventory(companyId),
      this.getJobCards(companyId),
      this.getInvoices(companyId),
      this.getEstimates(companyId),
      this.getPurchaseOrders(companyId),
      this.getCounterSales(companyId),
      this.getScrapRates(),
      this.getScrapIntakes(companyId),
      this.getScrapSales(),
      this.getTechnicians(),
      this.getLaborRates(),
      this.getPaintCodes(),
      this.getFinancialAccounts(companyId),
      this.getFinancialTransactions(companyId),
      this.getFinancialAllocations(companyId),
      this.getJournalEntries(companyId),
      this.getAuditLogs()
    ]);

    return {
      success: true,
      settings: settings || memStore.settings,
      customers,
      vehicles,
      suppliers,
      inventory,
      jobCards,
      invoices,
      estimates,
      purchaseOrders,
      counterSales,
      scrapRates,
      scrapIntakes,
      scrapSales,
      technicians,
      laborRates,
      paintCodes,
      financialAccounts,
      financialTransactions,
      financialAllocations,
      journalEntries,
      auditLogs
    };
  }
};
