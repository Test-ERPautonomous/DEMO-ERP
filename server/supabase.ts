import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dns from 'node:dns/promises';

/**
 * Robust host reachability verification:
 * 1. Attempts standard Node.js DNS lookup with a fast timeout (2.5s).
 * 2. If DNS lookup fails or times out (common in containerized/proxy environments),
 *    falls back to a direct HTTPS probe with a reasonable timeout.
 * 3. Any valid HTTP response indicates host reachability.
 */
async function isHostReachable(urlStr: string, timeoutMs = 5000): Promise<{ reachable: boolean; error?: string }> {
  let hostname = '';
  try {
    const parsed = new URL(urlStr);
    hostname = parsed.hostname;
    if (!hostname) return { reachable: false, error: 'Invalid URL hostname' };
  } catch {
    return { reachable: false, error: 'Malformed URL format' };
  }

  // 1. Try standard Node.js DNS lookup first with a 2.5s timeout
  try {
    const lookupPromise = dns.lookup(hostname);
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('DNS lookup timeout')), 2500)
    );
    await Promise.race([lookupPromise, timeoutPromise]);
    return { reachable: true };
  } catch {
    // Node dns.lookup failed or timed out.
    // In many cloud, container, or VPS environments, system getaddrinfo can fail or block
    // while outbound HTTPS requests through the network stack succeed.
    // Fall back to direct HTTPS probe.
  }

  // 2. Direct HTTPS probe fallback
  const normalized = urlStr.replace(/\/+$/, '');
  const probeEndpoints = [
    `${normalized}/auth/v1/health`,
    `${normalized}/rest/v1/`,
    normalized
  ];

  for (const endpoint of probeEndpoints) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(endpoint, {
          method: 'GET',
          signal: controller.signal,
          headers: {
            'User-Agent': 'Najm-ERP-HealthCheck/1.0',
          }
        });
        // Any HTTP status code indicates the host answered over HTTPS!
        if (response.status > 0) {
          return { reachable: true };
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      // Continue to next probe candidate
    }
  }

  return {
    reachable: false,
    error: `Could not reach ${hostname} via DNS lookup or direct HTTPS probes`
  };
}

export const ACTIVE_SUPABASE_URL = 'https://zigwijbljvsklepgbint.supabase.co';
export const OUTDATED_PROJECT_REFS = [
  'tpbihpzsfjpobqwdbrmm',
  'hqpuloqjsvvgrelsvrzo'
];

export function isNetworkOrDnsError(err: any): boolean {
  if (!err) return false;
  if (err.status === 0) return true;
  const msg = (typeof err === 'string' ? err : `${err.message || ''} ${err.details || ''} ${err.code || ''} ${err.hint || ''}`).toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('ehostunreach') ||
    msg.includes('etimedout') ||
    msg.includes('getaddrinfo')
  );
}

// Safe extraction of environment variables with active Supabase project as single source of truth
export function getSupabaseServerUrl(): string {
  // Check VITE_SUPABASE_URL or SUPABASE_URL
  const rawUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  let normalizedUrl = rawUrl;
  if (normalizedUrl && !/^https?:\/\//i.test(normalizedUrl)) {
    normalizedUrl = `https://${normalizedUrl}`;
  }
  if (normalizedUrl && /^https?:\/\//i.test(normalizedUrl) && !normalizedUrl.includes('your-project-id') && !normalizedUrl.includes('placeholder') && !normalizedUrl.includes('unconfigured')) {
    // Explicitly reject outdated or deleted project reference
    if (!OUTDATED_PROJECT_REFS.some(ref => normalizedUrl.includes(ref))) {
      return normalizedUrl.replace(/\/+$/, '');
    }
  }
  // Fallback: extract project ref from anon key JWT if present and valid
  const key = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  if (key && key.includes('.')) {
    try {
      const parts = key.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload?.ref && !OUTDATED_PROJECT_REFS.includes(payload.ref)) {
          return `https://${payload.ref}.supabase.co`;
        }
      }
    } catch {
      // ignore
    }
  }
  // Primary active Supabase PostgreSQL project
  return ACTIVE_SUPABASE_URL;
}

export const ACTIVE_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InppZ3dpamJsanZza2xlcGdiaW50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4MjE2OTMsImV4cCI6MjEwNzM5NzY5M30.FLeyoB1ljjzo4LXv9wro_AeVNfPKOB20n_mnbzmRLwc';

export function isKeyValidForTarget(key: string, targetUrl: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length < 20 || trimmed.includes('placeholder') || trimmed.includes('your-anon-public-key')) {
    return false;
  }

  // Extract project ref from targetUrl (e.g. zigwijbljvsklepgbint from https://zigwijbljvsklepgbint.supabase.co)
  let targetRef = '';
  try {
    const parsed = new URL(targetUrl);
    targetRef = parsed.hostname.split('.')[0].toLowerCase();
  } catch {
    targetRef = 'zigwijbljvsklepgbint';
  }

  if (trimmed.includes('.')) {
    try {
      const parts = trimmed.split('.');
      if (parts.length >= 2) {
        const payloadStr = Buffer.from(parts[1], 'base64').toString('utf8');
        const payload = JSON.parse(payloadStr);
        if (payload?.ref) {
          // If the key explicitly states a project ref, ensure it is NOT outdated and MATCHES target
          if (OUTDATED_PROJECT_REFS.includes(payload.ref)) return false;
          if (targetRef && targetRef !== 'unconfigured' && payload.ref !== targetRef) return false;
        }
      }
    } catch {
      return false;
    }
  } else if (trimmed.startsWith('sb_secret_') || trimmed.startsWith('sbp_')) {
    // Non-JWT keys: if container URL points to an outdated project, secret was generated for that outdated project
    const rawContainerUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').toLowerCase();
    if (OUTDATED_PROJECT_REFS.some(ref => rawContainerUrl.includes(ref))) {
      return false;
    }
  }

  return true;
}

export function getSupabaseServerKey(): string {
  const targetUrl = getSupabaseServerUrl() || ACTIVE_SUPABASE_URL;
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const rawApiKey = (process.env.SUPABASE_API_KEY || '').trim();
  let apiKeyRole = '';
  if (rawApiKey && rawApiKey.includes('.')) {
    try {
      const payload = JSON.parse(Buffer.from(rawApiKey.split('.')[1], 'base64').toString());
      apiKeyRole = payload?.role || '';
    } catch {
      // ignore
    }
  }

  const effectiveServiceKey = serviceKey || (apiKeyRole === 'service_role' ? rawApiKey : '');
  const isServiceRoleKey = (k?: string) => Boolean(k && (k.startsWith('sb_secret_') || k.toLowerCase().includes('service_role')));

  if (effectiveServiceKey && isKeyValidForTarget(effectiveServiceKey, targetUrl)) {
    return effectiveServiceKey;
  }

  const rawAnonCandidates = [
    process.env.SUPABASE_ANON_KEY,
    process.env.VITE_SUPABASE_ANON_KEY,
    apiKeyRole !== 'service_role' ? rawApiKey : '',
  ];
  const anonCandidate = rawAnonCandidates.find(k => Boolean(k && !isServiceRoleKey(k) && isKeyValidForTarget(k, targetUrl)));
  if (anonCandidate) {
    return anonCandidate.trim();
  }

  return ACTIVE_SUPABASE_ANON_KEY;
}

export function isSupabaseServiceRole(): boolean {
  const activeKey = getSupabaseServerKey();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const rawApiKey = (process.env.SUPABASE_API_KEY || '').trim();
  if (serviceKey && activeKey === serviceKey && serviceKey.length > 20 && !serviceKey.includes('placeholder')) {
    return true;
  }
  if (rawApiKey && activeKey === rawApiKey && rawApiKey.includes('.')) {
    try {
      const payload = JSON.parse(Buffer.from(rawApiKey.split('.')[1], 'base64').toString());
      return payload?.role === 'service_role';
    } catch {
      // ignore
    }
  }
  return false;
}

export const isServerSupabaseConfigured: boolean = Boolean(
  getSupabaseServerUrl() && getSupabaseServerKey()
);

let _cachedServerClient: SupabaseClient | null = null;
let _cachedUrl = '';
let _cachedKey = '';

export function getSupabaseServer(): SupabaseClient {
  const currentUrl = getSupabaseServerUrl() || ACTIVE_SUPABASE_URL || 'https://unconfigured.supabase.co';
  const currentKey = getSupabaseServerKey() || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.unconfigured_server_placeholder_key_must_set_env';
  if (!_cachedServerClient || _cachedUrl !== currentUrl || _cachedKey !== currentKey) {
    _cachedServerClient = createClient(currentUrl, currentKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    });
    _cachedUrl = currentUrl;
    _cachedKey = currentKey;
  }
  return _cachedServerClient;
}

export const supabaseServer: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(target, prop, receiver) {
    return Reflect.get(getSupabaseServer(), prop, receiver);
  }
});

export interface SupabaseConnectionStatus {
  connected: boolean;
  configured: boolean;
  message: string;
  timestamp: string;
  latencyMs?: number;
  url?: string;
  usingServiceRole?: boolean;
  missingEnv?: string[];
  tables?: {
    customers: boolean;
    vehicles: boolean;
    suppliers: boolean;
    inventory_items: boolean;
    job_cards: boolean;
    invoices: boolean;
    settings: boolean;
  };
}

export async function testSupabaseConnection(customUrl?: string, customKey?: string): Promise<SupabaseConnectionStatus> {
  const targetUrl = (customUrl || getSupabaseServerUrl() || '').trim();
  const targetKey = (customKey || getSupabaseServerKey() || '').trim();

  const missing: string[] = [];
  if (!targetUrl) missing.push('SUPABASE_URL (or VITE_SUPABASE_URL)');
  if (!targetKey) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY)');

  if (missing.length > 0) {
    return {
      connected: false,
      configured: false,
      message: `Supabase credentials not configured. Missing: ${missing.join(', ')}. Please configure your Supabase URL and API Key.`,
      missingEnv: missing,
      timestamp: new Date().toISOString()
    };
  }

  // Pre-flight check: ensure the remote host is reachable via DNS or HTTPS probe fallback
  const reachability = await isHostReachable(targetUrl);
  if (!reachability.reachable) {
    return {
      connected: false,
      configured: false,
      url: targetUrl,
      message: `Supabase host "${targetUrl}" is currently unreachable (${reachability.error || 'Network connection failed'}). Please verify the URL and network connectivity.`,
      timestamp: new Date().toISOString()
    };
  }

  const clientToTest: SupabaseClient = createClient(targetUrl, targetKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const isCustom = Boolean(customUrl || customKey);
  const usingServiceRole = isCustom
    ? targetKey.startsWith('sb_secret_') || targetKey.toLowerCase().includes('service_role')
    : isSupabaseServiceRole();

  try {
    const startTime = Date.now();
    
    // Check main tables status
    const tableChecks: Record<string, boolean> = {
      customers: false,
      vehicles: false,
      suppliers: false,
      inventory_items: false,
      job_cards: false,
      invoices: false,
      settings: false,
    };

    const { error: custErr } = await clientToTest
      .from('customers')
      .select('id', { count: 'exact', head: true });
    tableChecks.customers = !custErr;

    const { error: vehErr } = await clientToTest
      .from('vehicles')
      .select('id', { count: 'exact', head: true });
    tableChecks.vehicles = !vehErr;

    const { error: suppErr } = await clientToTest
      .from('suppliers')
      .select('id', { count: 'exact', head: true });
    tableChecks.suppliers = !suppErr;

    const { error: invErr } = await clientToTest
      .from('inventory_items')
      .select('id', { count: 'exact', head: true });
    tableChecks.inventory_items = !invErr;

    const { error: jcErr } = await clientToTest
      .from('job_cards')
      .select('id', { count: 'exact', head: true });
    tableChecks.job_cards = !jcErr;

    const { error: invcErr } = await clientToTest
      .from('invoices')
      .select('id', { count: 'exact', head: true });
    tableChecks.invoices = !invcErr;

    const { error: setErr } = await clientToTest
      .from('settings')
      .select('id', { count: 'exact', head: true });
    tableChecks.settings = !setErr;

    const latencyMs = Date.now() - startTime;
    const allTablesPresent = tableChecks.customers && tableChecks.vehicles && tableChecks.inventory_items && tableChecks.job_cards;

    if (!tableChecks.customers && custErr) {
      const isFetchError = Boolean(
        custErr.message && (
          custErr.message.includes('fetch failed') ||
          custErr.message.includes('TypeError') ||
          custErr.message.includes('ENOTFOUND') ||
          custErr.message.includes('ECONNREFUSED') ||
          custErr.message.includes('ETIMEDOUT') ||
          custErr.message.includes('Failed to fetch') ||
          custErr.message.includes('NetworkError')
        )
      );

      if (isFetchError) {
        return {
          connected: false,
          configured: false,
          url: targetUrl,
          latencyMs,
          usingServiceRole,
          message: 'Supabase remote host is currently offline or unreachable. Operating in local SQLite mode.',
          tables: tableChecks as any,
          timestamp: new Date().toISOString()
        };
      }

      return {
        connected: false,
        configured: true,
        url: targetUrl,
        latencyMs,
        usingServiceRole,
        message: `Connected to Supabase endpoint, but table query returned: ${custErr.message}. Ensure database migrations have been executed in your Supabase SQL editor.`,
        tables: tableChecks as any,
        timestamp: new Date().toISOString()
      };
    }

    return {
      connected: true,
      configured: true,
      url: targetUrl,
      latencyMs,
      usingServiceRole,
      message: allTablesPresent 
        ? `Successfully connected to Supabase PostgreSQL database (${latencyMs}ms latency). All core tables verified.`
        : `Connected to Supabase (${latencyMs}ms latency), some optional tables pending migration.`,
      tables: tableChecks as any,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    return {
      connected: false,
      configured: false,
      url: targetUrl,
      message: 'Supabase remote host is currently offline or unreachable. Operating in local SQLite mode.',
      timestamp: new Date().toISOString()
    };
  }
}

// ============================================================================
// SUPABASE DATABASE SERVICE LAYER (CRUD & DATA ACCESS)
// ============================================================================

let isSupabaseOnline: boolean | null = null;
let lastSupabaseOnlineCheck = 0;

export async function isSupabaseServiceAvailable(): Promise<boolean> {
  if (!isServerSupabaseConfigured) return false;
  const now = Date.now();
  if (isSupabaseOnline !== null && (now - lastSupabaseOnlineCheck < 60000)) {
    return isSupabaseOnline;
  }
  const url = getSupabaseServerUrl();
  if (!url) return false;
  const reachability = await isHostReachable(url);
  isSupabaseOnline = reachability.reachable;
  lastSupabaseOnlineCheck = now;
  return reachability.reachable;
}

export function isSupabaseFetchError(err: any): boolean {
  if (!err) return false;
  const msg = String(err?.message || err || '').toLowerCase();
  return (
    msg.includes('fetch failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('enotfound') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('networkerror') ||
    msg.includes('typeerror')
  );
}

function handleSupabaseServiceError(op: string, err: any): void {
  if (isSupabaseFetchError(err)) {
    isSupabaseOnline = false;
    lastSupabaseOnlineCheck = Date.now();
    return; // Quietly suppress network/fetch errors when Supabase is offline
  }
  console.warn(`[SupabaseService] ${op} notice:`, err?.message || err);
}

export const supabaseDbService = {
  // 1. Customers
  async getCustomers() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseServiceError('getCustomers', err);
      return null;
    }
  },

  async upsertCustomer(customer: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: customer.id,
        name: customer.name,
        phone: customer.phone || customer.contact || null,
        email: customer.email || null,
        address: customer.address || customer.city || null,
        qid_or_crn: customer.qid || customer.qid_or_crn || customer.crNumber || null,
        customer_type: (customer.accountType?.toLowerCase() === 'corporate' || customer.customer_type === 'fleet') ? 'fleet' : 'individual',
        credit_limit: Number(customer.creditLimit || customer.credit_limit || 0),
        outstanding_balance: Number(customer.balance || customer.outstanding_balance || 0),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('customers').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('upsertCustomer', err);
      return false;
    }
  },

  async deleteCustomer(id: string) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const { error } = await supabaseServer.from('customers').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('deleteCustomer', err);
      return false;
    }
  },

  // 2. Vehicles
  async getVehicles() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('vehicles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseServiceError('getVehicles', err);
      return null;
    }
  },

  async upsertVehicle(vehicle: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: vehicle.id,
        customer_id: vehicle.customerId || vehicle.customer_id || null,
        plate_number: vehicle.plateNumber || vehicle.plate_number,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year ? Number(vehicle.year) : null,
        color: vehicle.color || null,
        vin: vehicle.vin || vehicle.chassisNumber || null,
        odometer: Number(vehicle.currentMileage || vehicle.mileage || vehicle.odometer || 0),
        engine_number: vehicle.engineNumber || vehicle.engine_number || null,
        body_type: vehicle.bodyType || vehicle.body_type || 'SUV',
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('vehicles').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('upsertVehicle', err);
      return false;
    }
  },

  async deleteVehicle(id: string) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const { error } = await supabaseServer.from('vehicles').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('deleteVehicle', err);
      return false;
    }
  },

  // 3. Suppliers
  async getSuppliers() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('suppliers')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseServiceError('getSuppliers', err);
      return null;
    }
  },

  async upsertSupplier(supplier: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: supplier.id,
        name: supplier.name,
        contact_person: supplier.contactPerson || supplier.contact_person || null,
        phone: supplier.phone || null,
        email: supplier.email || null,
        address: supplier.address || null,
        category: supplier.category || 'General',
        payment_terms: supplier.paymentTerms || supplier.payment_terms || 'Net 30',
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('suppliers').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('upsertSupplier', err);
      return false;
    }
  },

  async deleteSupplier(id: string) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const { error } = await supabaseServer.from('suppliers').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('deleteSupplier', err);
      return false;
    }
  },

  // 4. Inventory
  async getInventory() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('inventory_items')
        .select('*')
        .order('sku', { ascending: true });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseServiceError('getInventory', err);
      return null;
    }
  },

  async upsertInventoryItem(item: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: item.id,
        sku: item.sku || null,
        name: item.name,
        category: item.category || 'Mechanical Parts',
        brand: item.brand || null,
        fitment: item.fitment || item.vehicle_compatibility || null,
        quantity_on_hand: Number(item.quantityOnHand ?? item.quantity_on_hand ?? item.quantity ?? 0),
        min_reorder_level: Number(item.minReorderLevel ?? item.min_reorder_level ?? 5),
        unit: item.unit || 'pcs',
        unit_cost: Number(item.unitCost ?? item.unit_cost ?? 0),
        selling_price: Number(item.sellingPrice ?? item.selling_price ?? item.unitPrice ?? 0),
        rack_location: item.rackLocation || item.rack_location || null,
        supplier_name: item.supplier || item.supplier_name || null,
        last_restocked_date: item.lastRestocked || item.last_restocked_date || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('inventory_items').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('upsertInventoryItem', err);
      return false;
    }
  },

  async deleteInventoryItem(id: string) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const { error } = await supabaseServer.from('inventory_items').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('deleteInventoryItem', err);
      return false;
    }
  },

  // 5. Job Cards
  async getJobCards() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('job_cards')
        .select('*')
        .order('date_in', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseServiceError('getJobCards', err);
      return null;
    }
  },

  async upsertJobCard(card: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: card.id,
        job_number: card.jobNumber || card.job_number,
        customer_id: card.customerId || card.customer_id || null,
        vehicle_id: card.vehicleId || card.vehicle_id || null,
        job_type: card.jobType || card.job_type || 'Mechanical',
        status: card.status || 'Draft',
        priority: card.priority || 'Normal',
        fuel_level: card.fuelLevel || card.fuel_level || '50%',
        odometer_in: Number(card.odometerIn || card.odometer_in || 0),
        mechanical_labor_cost: Number(card.mechanicalLaborCost || card.mechanical_labor_cost || 0),
        denting_labor_cost: Number(card.dentingLaborCost || card.denting_labor_cost || 0),
        painting_cost: Number(card.paintingCost || card.painting_cost || 0),
        paint_booth_charge: Number(card.paintBoothCharge || card.paint_booth_charge || 0),
        parts_cost: Number(card.partsCost || card.parts_cost || 0),
        consumables_cost: Number(card.consumablesCost || card.consumables_cost || 0),
        discount: Number(card.discount || 0),
        tax_rate: Number(card.taxRate || card.tax_rate || 0),
        total_amount: Number(card.totalAmount || card.total_amount || 0),
        customer_notes: card.customerNotes || card.customer_notes || null,
        customer_complaints: typeof card.customerComplaints === 'string' ? card.customerComplaints : JSON.stringify(card.customerComplaints || []),
        diagnosis_notes: card.diagnosisNotes || card.diagnosis_notes || null,
        internal_notes: card.internalNotes || card.internal_notes || null,
        technician_name: card.technicianName || card.technician_name || null,
        date_in: card.dateIn || card.date_in || null,
        promised_date: card.promisedDate || card.promised_date || null,
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('job_cards').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('upsertJobCard', err);
      return false;
    }
  },

  async deleteJobCard(id: string) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const { error } = await supabaseServer.from('job_cards').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('deleteJobCard', err);
      return false;
    }
  },

  // 6. Invoices
  async getInvoices() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('invoices')
        .select('*')
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    } catch (err: any) {
      handleSupabaseServiceError('getInvoices', err);
      return null;
    }
  },

  async upsertInvoice(invoice: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: invoice.id,
        invoice_number: invoice.invoiceNumber || invoice.invoice_number,
        job_card_id: invoice.jobCardId || invoice.job_card_id || null,
        customer_id: invoice.customerId || invoice.customer_id || null,
        date: invoice.date || null,
        due_date: invoice.dueDate || invoice.due_date || null,
        subtotal: Number(invoice.subtotal || 0),
        discount: Number(invoice.discount || 0),
        tax_amount: Number(invoice.taxAmount || invoice.tax_amount || 0),
        grand_total: Number(invoice.grandTotal || invoice.grand_total || invoice.totalAmount || 0),
        paid_amount: Number(invoice.paidAmount || invoice.paid_amount || 0),
        balance_amount: Number(invoice.balanceAmount || invoice.balance_amount || 0),
        payment_status: invoice.paymentStatus || invoice.payment_status || 'Unpaid',
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('invoices').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('upsertInvoice', err);
      return false;
    }
  },

  async deleteInvoice(id: string) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const { error } = await supabaseServer.from('invoices').delete().eq('id', id);
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('deleteInvoice', err);
      return false;
    }
  },

  // 7. Settings
  async getSettings() {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return null;
    try {
      const { data, error } = await supabaseServer
        .from('settings')
        .select('*')
        .eq('id', 'primary')
        .maybeSingle();
      if (error) throw error;
      return data ? (typeof data.data_json === 'string' ? JSON.parse(data.data_json) : data.data_json) : null;
    } catch (err: any) {
      handleSupabaseServiceError('getSettings', err);
      return null;
    }
  },

  async saveSettings(settings: any) {
    if (!isServerSupabaseConfigured || isSupabaseOnline === false) return false;
    try {
      const payload = {
        id: 'primary',
        data_json: typeof settings === 'string' ? settings : JSON.stringify(settings),
        updated_at: new Date().toISOString()
      };
      const { error } = await supabaseServer.from('settings').upsert(payload, { onConflict: 'id' });
      if (error) throw error;
      return true;
    } catch (err: any) {
      handleSupabaseServiceError('saveSettings', err);
      return false;
    }
  }
};
