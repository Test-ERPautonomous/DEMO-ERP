/**
 * Centralized API client for communicating with the backend persistent server
 */

export interface ApiResponse<T = any> {
  success?: boolean;
  data?: T;
  error?: string;
  details?: any;
}

export class ApiError extends Error {
  status: number;
  type: 'auth' | 'forbidden' | 'server' | 'network' | 'validation' | 'service_unavailable';
  details?: any;
  endpoint?: string;
  url?: string;

  constructor(
    message: string,
    status: number,
    type: 'auth' | 'forbidden' | 'server' | 'network' | 'validation' | 'service_unavailable',
    details?: any,
    endpoint?: string,
    url?: string
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.type = type;
    this.details = details;
    this.endpoint = endpoint;
    this.url = url;
  }
}

class WorkshopApiClient {
  private token: string | null = null;
  private sessionPromise: Promise<boolean> | null = null;

  constructor() {
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      this.token = localStorage.getItem('najm_auth_token');
    }
  }

  setToken(token: string | null, persist = true) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        if (persist) {
          try { localStorage.setItem('najm_auth_token', token); } catch {}
          try { sessionStorage.removeItem('najm_auth_token'); } catch {}
        } else {
          try { localStorage.removeItem('najm_auth_token'); } catch {}
          try { sessionStorage.setItem('najm_auth_token', token); } catch {}
        }
      } else {
        try { localStorage.removeItem('najm_auth_token'); } catch {}
        try { sessionStorage.removeItem('najm_auth_token'); } catch {}
      }
    }
  }

  getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window === 'undefined') return 'direct-access-token';
    try {
      const sessionTok = sessionStorage.getItem('najm_auth_token');
      if (sessionTok) return sessionTok;
    } catch {}
    try {
      const stored = localStorage.getItem('najm_auth_token');
      if (stored) return stored;
    } catch {}
    return 'direct-access-token';
  }

  async ensureSessionReady(): Promise<boolean> {
    return true;
  }

  private getBaseUrl(): string {
    const envUrl = (typeof import.meta !== 'undefined' && import.meta.env && (
      import.meta.env.VITE_API_URL ||
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_BACKEND_URL
    )) || '';

    if (envUrl) {
      const cleanUrl = envUrl.replace(/\/+$/, '');
      if (typeof window !== 'undefined' && window.location) {
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && hostname !== '127.0.0.1' && (cleanUrl.includes('localhost') || cleanUrl.includes('127.0.0.1'))) {
          return '/api';
        }
      }
      return cleanUrl;
    }
    return '/api';
  }

  private buildUrl(endpoint: string): string {
    const base = this.getBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

    // If base ends with /api and cleanEndpoint starts with /api/, avoid duplicate /api/api
    if (base.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      return `${base.slice(0, -4)}${cleanEndpoint}`;
    }
    if (!base.endsWith('/api') && !cleanEndpoint.startsWith('/api/')) {
      return `${base}/api${cleanEndpoint}`;
    }
    return `${base}${cleanEndpoint}`;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = this.buildUrl(endpoint);

    try {
      const res = await fetch(url, {
        credentials: 'include',
        ...options,
        headers
      });

      let responseText = '';
      let json: any = null;
      try {
        responseText = await res.text();
        json = JSON.parse(responseText);
      } catch {
        json = null;
      }

      if (!res.ok) {
        let errType: 'auth' | 'forbidden' | 'server' | 'validation' | 'service_unavailable' = 'server';
        if (res.status === 401) {
          errType = 'auth';
          if (
            typeof window !== 'undefined' &&
            token &&
            !endpoint.includes('/auth/') &&
            !endpoint.includes('/users')
          ) {
            window.dispatchEvent(new CustomEvent('najm:auth-expired', { detail: { endpoint, status: 401 } }));
          }
        } else if (res.status === 403) {
          errType = 'forbidden';
        } else if (res.status === 400 || res.status === 422) {
          errType = 'validation';
        } else if (res.status === 503) {
          errType = 'service_unavailable';
        }

        let errMsg = '';
        if (json && (json.error || json.message)) {
          errMsg = json.error || json.message;
          if (json.details) {
            errMsg += ` - ${typeof json.details === 'object' ? JSON.stringify(json.details) : json.details}`;
          }
        } else if (responseText && responseText.trim().length > 0 && responseText.length < 300 && !responseText.includes('<!DOCTYPE') && !responseText.includes('<html')) {
          errMsg = `HTTP ${res.status}: ${responseText.trim()}`;
        } else if (res.status === 503) {
          errMsg = `503 Service Unavailable (${res.statusText || 'Backend Unavailable'}): The server at ${url} is temporarily unable to handle the request. This may occur if the service container is cold-starting, undergoing maintenance, or unreachable.`;
        } else {
          errMsg = `HTTP ${res.status} ${res.statusText || 'Error'} from ${url}`;
        }

        throw new ApiError(errMsg, res.status, errType, json?.details || json || responseText, endpoint, url);
      }

      return (json !== null ? json : responseText) as T;
    } catch (err: any) {
      if (err instanceof ApiError) {
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[API ${err.type.toUpperCase()}] ${url}:`, err.message);
        }
        throw err;
      }
      const isNetwork = err?.name === 'TypeError' || err?.message?.includes('Failed to fetch') || err?.message?.includes('NetworkError') || err?.message?.includes('Load failed');
      const networkErr = new ApiError(
        isNetwork ? `Network connection failure (${err?.message || 'Failed to fetch'}). Unable to connect to backend at ${url}.` : (err?.message || 'Unexpected request failure'),
        0,
        isNetwork ? 'network' : 'server',
        err,
        endpoint,
        url
      );
      if (process.env.NODE_ENV !== 'production') {
        console.debug(`[API NETWORK] ${url}:`, networkErr.message);
      }
      throw networkErr;
    }
  }

  // Auth
  async getSetupStatus(): Promise<{ isSetupRequired: boolean; masterEmail?: string }> {
    return this.request('/auth/setup-status');
  }

  async setupMasterAdmin(payload: { password: string; confirmPassword: string; email?: string; fullName?: string; bootstrapSecret?: string }) {
    return this.request('/auth/setup-master-admin', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async sessionLogin(identifier: string, password: string) {
    const res = await this.request('/auth/session-login', {
      method: 'POST',
      body: JSON.stringify({ email: identifier, username: identifier, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async changePassword(currentPassword: string, newPassword: string) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
  }

  async login(username: string, password: string) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async sessionExchange(accessToken: string) {
    const res = await this.request<{ success: boolean; token: string; user: any; diagnostics?: any }>('/auth/session-exchange', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({ accessToken })
    });
    if (res && res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async syncSession(accessToken?: string) {
    try {
      if (accessToken) {
        return await this.sessionExchange(accessToken);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Users
  async getUsers() {
    return this.request('/users');
  }

  async createUser(userData: any) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
  }

  async updateUser(id: string, updates: any) {
    return this.request(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteUser(id: string) {
    return this.request(`/users/${id}`, {
      method: 'DELETE'
    });
  }

  // Bootstrap Database Sync
  async getBootstrap(companyId?: string) {
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    return this.request(`/bootstrap${query}`);
  }

  // Job Cards
  async getJobCards(companyId?: string) {
    const query = companyId ? `?companyId=${encodeURIComponent(companyId)}` : '';
    return this.request<{ success: boolean; jobCards: any[]; count: number }>(`/job-cards${query}`);
  }

  async createJobCard(card: any) {
    return this.request('/job-cards', {
      method: 'POST',
      body: JSON.stringify(card)
    });
  }

  async updateJobCard(id: string, updates: any) {
    return this.request(`/job-cards/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteJobCard(id: string) {
    return this.request(`/job-cards/${id}`, {
      method: 'DELETE'
    });
  }

  async advanceJobStatus(id: string, newStatus: string, reason?: string) {
    return this.request(`/job-cards/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ newStatus, reason })
    });
  }

  async closeAndInvoiceJobCard(id: string, cardData: any) {
    return this.request(`/job-cards/${id}/close-and-invoice`, {
      method: 'POST',
      body: JSON.stringify(cardData)
    });
  }

  async issuePartsToJob(id: string, partId: string, quantity: number, technicianName?: string) {
    return this.request(`/job-cards/${id}/issue-parts`, {
      method: 'POST',
      body: JSON.stringify({ partId, quantity, technicianName })
    });
  }

  async returnPartsFromJob(id: string, partId: string, returnQty: number, reason?: string) {
    return this.request(`/job-cards/${id}/return-parts`, {
      method: 'POST',
      body: JSON.stringify({ partId, returnQty, reason })
    });
  }

  // Inventory
  async createInventoryItem(item: any) {
    return this.request('/inventory', {
      method: 'POST',
      body: JSON.stringify(item)
    });
  }

  async adjustStock(itemId: string, changeQty: number, type?: string, reason?: string) {
    return this.request('/inventory/adjust', {
      method: 'POST',
      body: JSON.stringify({ itemId, changeQty, type, reason })
    });
  }

  // Purchases & GRN
  async createPurchaseOrder(po: any) {
    return this.request('/purchase-orders', {
      method: 'POST',
      body: JSON.stringify(po)
    });
  }

  async updatePurchaseOrder(id: string, updates: any) {
    return this.request(`/purchase-orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deletePurchaseOrder(id: string) {
    return this.request(`/purchase-orders/${id}`, {
      method: 'DELETE'
    });
  }

  async receivePurchaseOrder(id: string, receivedItems: any[] = [], deliveryNoteNumber?: string, notes?: string) {
    return this.request(`/purchase-orders/${id}/receive`, {
      method: 'POST',
      body: JSON.stringify({ receivedItems, deliveryNoteNumber, notes })
    });
  }

  async receivePO(id: string, receivedItems: any[] = [], deliveryNoteNumber?: string, notes?: string) {
    return this.receivePurchaseOrder(id, receivedItems, deliveryNoteNumber, notes);
  }

  // Invoices & Payments
  async createInvoice(invoice: any) {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(invoice)
    });
  }

  async updateInvoice(id: string, updates: any) {
    return this.request(`/invoices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteInvoice(id: string) {
    return this.request(`/invoices/${id}`, {
      method: 'DELETE'
    });
  }

  async recordPayment(invoiceId: string, amount: number, method: string, reference?: string, notes?: string) {
    return this.request(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount, method, reference, notes })
    });
  }

  // Estimates
  async createEstimate(estimate: any) {
    return this.request('/estimates', {
      method: 'POST',
      body: JSON.stringify(estimate)
    });
  }

  async updateEstimate(id: string, updates: any) {
    return this.request(`/estimates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteEstimate(id: string) {
    return this.request(`/estimates/${id}`, {
      method: 'DELETE'
    });
  }

  // Counter Sales
  async getCounterSales() {
    return this.request('/counter-sales');
  }

  async createCounterSale(sale: any) {
    return this.request('/counter-sales', {
      method: 'POST',
      body: JSON.stringify(sale)
    });
  }

  // Labor Rates & Paint Codes Masters
  async getLaborRates() {
    return this.request('/labor-rates');
  }

  async createLaborRate(rate: any) {
    return this.request('/labor-rates', {
      method: 'POST',
      body: JSON.stringify(rate)
    });
  }

  async deleteLaborRate(id: string) {
    return this.request(`/labor-rates/${id}`, { method: 'DELETE' });
  }

  async getPaintCodes() {
    return this.request('/paint-codes');
  }

  async createPaintCode(paintCode: any) {
    return this.request('/paint-codes', {
      method: 'POST',
      body: JSON.stringify(paintCode)
    });
  }

  async deletePaintCode(id: string) {
    return this.request(`/paint-codes/${id}`, { method: 'DELETE' });
  }

  // Scrap
  async createScrapIntake(intake: any) {
    return this.request('/scrap/intakes', {
      method: 'POST',
      body: JSON.stringify(intake)
    });
  }

  async createScrapSale(sale: any) {
    return this.request('/scrap/sales', {
      method: 'POST',
      body: JSON.stringify(sale)
    });
  }

  // Settings
  async updateSettings(settings: any) {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Customers
  async createCustomer(customer: any) {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(customer)
    });
  }

  async updateCustomer(id: string, updates: any) {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteCustomer(id: string) {
    return this.request(`/customers/${id}`, { method: 'DELETE' });
  }

  // Vehicles
  async createVehicle(vehicle: any) {
    return this.request('/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicle)
    });
  }

  async updateVehicle(id: string, updates: any) {
    return this.request(`/vehicles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteVehicle(id: string) {
    return this.request(`/vehicles/${id}`, { method: 'DELETE' });
  }

  // Suppliers
  async createSupplier(supplier: any) {
    return this.request('/suppliers', {
      method: 'POST',
      body: JSON.stringify(supplier)
    });
  }

  async updateSupplier(id: string, updates: any) {
    return this.request(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteSupplier(id: string) {
    return this.request(`/suppliers/${id}`, { method: 'DELETE' });
  }

  // Technicians
  async getTechnicians() {
    return this.request('/technicians');
  }

  async createTechnician(technician: any) {
    return this.request('/technicians', {
      method: 'POST',
      body: JSON.stringify(technician)
    });
  }

  async updateTechnician(id: string, updates: any) {
    return this.request(`/technicians/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async deleteTechnician(id: string) {
    return this.request(`/technicians/${id}`, { method: 'DELETE' });
  }

  // Audit Logs
  async getAuditLogs(module?: string, limit: number = 100) {
    const query = new URLSearchParams();
    if (module) query.append('module', module);
    query.append('limit', String(limit));
    return this.request(`/audit-logs?${query.toString()}`);
  }

  // Document Sequences & Backend Numbering
  async getSequences(companyId: string = 'comp-1') {
    return this.request(`/sequences?companyId=${encodeURIComponent(companyId)}`);
  }

  async getNextDocumentNumber(docType: string, year: number = 0, companyId: string = 'comp-1') {
    const query = new URLSearchParams({ type: docType, companyId });
    if (year) query.append('year', String(year));
    return this.request<{ success: boolean; docType: string; code: string; seq: number; year: number }>(`/sequences/next?${query.toString()}`);
  }

  async generateDocumentNumber(docType: string, year: number = 0, companyId: string = 'comp-1') {
    return this.request<{ success: boolean; docType: string; code: string; seq: number; year: number }>(`/sequences/generate`, {
      method: 'POST',
      body: JSON.stringify({ type: docType, year, companyId })
    });
  }

  async runSequenceVerificationSuite() {
    return this.request('/sequences/run-tests');
  }

  // Safe Demo Reset
  async resetDemoData(confirmationToken: string = 'RESET_NAJM_DEMO_DATA') {
    return this.request('/admin/reset-demo', {
      method: 'POST',
      body: JSON.stringify({ confirmationToken })
    });
  }

  // Financial Module API
  async getFinancialAccounts() {
    return this.request('/financial/accounts');
  }

  async createFinancialAccount(account: any) {
    return this.request('/financial/accounts', {
      method: 'POST',
      body: JSON.stringify(account)
    });
  }

  async updateFinancialAccount(id: string, updates: any) {
    return this.request(`/financial/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  async getFinancialTransactions(params: Record<string, string> = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/financial/transactions${query ? `?${query}` : ''}`);
  }

  async createFinancialTransaction(transaction: any) {
    return this.request('/financial/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction)
    });
  }

  async postFinancialTransaction(id: string) {
    return this.request(`/financial/transactions/${id}/post`, {
      method: 'POST'
    });
  }

  async reverseFinancialTransaction(id: string, reason: string) {
    return this.request(`/financial/transactions/${id}/reverse`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    });
  }

  async applyAdvance(advanceId: string, targetType: 'invoice' | 'purchase_order', targetId: string, amount: number) {
    return this.request('/financial/advances/apply', {
      method: 'POST',
      body: JSON.stringify({ advanceId, targetType, targetId, amount })
    });
  }

  async refundAdvance(advanceId: string, refundAmount: number, accountId: string, paymentMethod: string = 'Cash', notes?: string) {
    return this.request('/financial/advances/refund', {
      method: 'POST',
      body: JSON.stringify({ advanceId, refundAmount, accountId, paymentMethod, notes })
    });
  }

  async getFinancialOverview() {
    return this.request('/financial/overview');
  }

  async getFinancialReports() {
    return this.request('/financial/reports');
  }
}

export const api = new WorkshopApiClient();

