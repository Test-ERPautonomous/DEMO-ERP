const API_BASE = '/api';

export async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    try {
      token = sessionStorage.getItem('najm_auth_token') || localStorage.getItem('najm_auth_token');
    } catch {}
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options?.headers || {})
    },
    ...options
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Network request failed' }));
    throw new Error(errorData.error || `HTTP error ${res.status}`);
  }
  return res.json();
}

export const api = {
  getBootstrap: () => fetchJson<any>('/bootstrap'),
  getJobCards: () => fetchJson<any[]>('/job-cards'),
  getJobCard: (id: string) => fetchJson<any>(`/job-cards/${id}`),
  createJobCard: (data: any) => fetchJson<any>('/job-cards', { method: 'POST', body: JSON.stringify(data) }),
  updateJobCard: (id: string, data: any) => fetchJson<any>(`/job-cards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateJobStatus: (id: string, status: string, notes?: string) => fetchJson<any>(`/job-cards/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
  issueJobMaterial: (id: string, partId: string, quantity: number, unitCost: number, sellPrice: number) => 
    fetchJson<any>(`/job-cards/${id}/materials`, { method: 'POST', body: JSON.stringify({ partId, quantity, unitCost, sellPrice }) }),

  getInvoices: () => fetchJson<any[]>('/invoices'),
  getInvoice: (id: string) => fetchJson<any>(`/invoices/${id}`),
  createInvoice: (data: any) => fetchJson<any>('/invoices', { method: 'POST', body: JSON.stringify(data) }),
  recordPayment: (id: string, payment: any) => fetchJson<any>(`/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(payment) }),

  getEstimates: () => fetchJson<any[]>('/estimates'),
  createEstimate: (data: any) => fetchJson<any>('/estimates', { method: 'POST', body: JSON.stringify(data) }),

  getInventory: () => fetchJson<any[]>('/inventory'),
  createInventoryItem: (data: any) => fetchJson<any>('/inventory', { method: 'POST', body: JSON.stringify(data) }),
  updateInventoryItem: (id: string, data: any) => fetchJson<any>(`/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adjustStock: (data: { itemId: string; changeQty: number; type: string; reason: string }) => 
    fetchJson<any>('/inventory/adjust', { method: 'POST', body: JSON.stringify(data) }),

  getPurchaseOrders: () => fetchJson<any[]>('/purchase-orders'),
  createPurchaseOrder: (data: any) => fetchJson<any>('/purchase-orders', { method: 'POST', body: JSON.stringify(data) }),
  receivePO: (id: string, data: any) => fetchJson<any>(`/purchase-orders/${id}/receive`, { method: 'POST', body: JSON.stringify(data) }),

  createCounterSale: (data: any) => fetchJson<any>('/counter-sales', { method: 'POST', body: JSON.stringify(data) }),
  getCustomers: () => fetchJson<any[]>('/customers'),
  createCustomer: (data: any) => fetchJson<any>('/customers', { method: 'POST', body: JSON.stringify(data) }),
  getVehicles: () => fetchJson<any[]>('/vehicles'),
  createVehicle: (data: any) => fetchJson<any>('/vehicles', { method: 'POST', body: JSON.stringify(data) }),
  getTechnicians: () => fetchJson<any[]>('/technicians'),
  getLaborRates: () => fetchJson<any[]>('/labor-rates'),
  getPaintCodes: () => fetchJson<any[]>('/paint-codes'),
  getSuppliers: () => fetchJson<any[]>('/suppliers'),
  createSupplier: (data: any) => fetchJson<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  
  getSettings: () => fetchJson<any>('/settings'),
  updateSettings: (data: any) => fetchJson<any>('/settings', { method: 'PUT', body: JSON.stringify(data) }),
  getAuditLogs: () => fetchJson<any[]>('/audit-logs'),
  getFinancialOverview: () => fetchJson<any>('/financial/overview'),
  search: (q: string) => fetchJson<any>(`/search?q=${encodeURIComponent(q)}`)
};
