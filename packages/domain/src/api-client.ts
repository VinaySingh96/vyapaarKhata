/**
 * vyapaarKhata Strongly-Typed API Client
 * Task API-02: Client interface based on OpenAPI specification
 */

import {
  Product,
  ProductCategory,
  UnitOfMeasure,
  TaxCategory,
  StockBalance,
  StockMovement,
  InventoryLocation,
  StockAdjustment,
  StockTransfer,
  Party,
  PartyLedgerEntry,
  SalesInvoice,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseBill,
  Payment,
  Expense,
  ExpenseCategory,
  DashboardMetrics,
} from './entities/types.js';

export interface ApiClientOptions {
  baseUrl: string;
  tenantId?: string;
  authToken?: string;
  fetchFn?: typeof fetch;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export class VyapaarKhataApiClient {
  private readonly baseUrl: string;
  private readonly tenantId: string;
  private readonly authToken?: string;
  private readonly fetch: typeof fetch;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.tenantId = options.tenantId || '00000000-0000-0000-0000-000000000001';
    this.authToken = options.authToken;
    this.fetch = options.fetchFn || globalThis.fetch;
  }

  private async request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init?.headers);

    headers.set('Content-Type', 'application/json');
    if (!headers.has('x-tenant-id')) {
      headers.set('x-tenant-id', this.tenantId);
    }
    if (this.authToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this.authToken}`);
    }

    const response = await this.fetch(url, {
      ...init,
      headers,
    });

    const body = (await response.json()) as ApiResponse<T>;
    return body;
  }

  public async getHealth() {
    return this.request<{ status: string; version: string; uptime: number }>('/health', {
      method: 'GET',
    });
  }

  public async getReady() {
    return this.request<{ status: string; driver: string; isPrimary: boolean }>('/ready', {
      method: 'GET',
    });
  }

  public readonly sales = {
    listInvoices: async (limit?: number) => {
      const q = limit ? `?limit=${limit}` : '';
      return this.request<SalesInvoice[]>(`/api/v1/sales/invoices${q}`, { method: 'GET' });
    },

    getInvoice: async (invoiceId: string) => {
      return this.request<SalesInvoice>(`/api/v1/sales/invoices/${invoiceId}`, { method: 'GET' });
    },

    createInvoice: async (invoice: Partial<SalesInvoice>) => {
      return this.request<SalesInvoice>('/api/v1/sales/invoices', {
        method: 'POST',
        body: JSON.stringify(invoice),
      });
    },

    postInvoice: async (invoiceId: string, idempotencyKey?: string) => {
      const headers: Record<string, string> = {};
      if (idempotencyKey) {
        headers['idempotency-key'] = idempotencyKey;
      }
      return this.request(`/api/v1/sales/invoices/${invoiceId}/post`, {
        method: 'POST',
        headers,
      });
    },

    cancelInvoice: async (invoiceId: string, reason: string) => {
      return this.request(`/api/v1/sales/invoices/${invoiceId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
    },
  };

  public readonly products = {
    list: async (categoryId?: string) => {
      const q = categoryId ? `?categoryId=${categoryId}` : '';
      return this.request<Product[]>(`/api/v1/products${q}`, { method: 'GET' });
    },

    get: async (id: string) => {
      return this.request<Product>(`/api/v1/products/${id}`, { method: 'GET' });
    },

    create: async (product: Partial<Product>) => {
      return this.request<Product>('/api/v1/products', {
        method: 'POST',
        body: JSON.stringify(product),
      });
    },

    listCategories: async () => {
      return this.request<ProductCategory[]>('/api/v1/products/categories', { method: 'GET' });
    },

    createCategory: async (category: Partial<ProductCategory>) => {
      return this.request<ProductCategory>('/api/v1/products/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      });
    },

    listUnits: async () => {
      return this.request<UnitOfMeasure[]>('/api/v1/products/units', { method: 'GET' });
    },

    listTaxCategories: async () => {
      return this.request<TaxCategory[]>('/api/v1/products/taxes', { method: 'GET' });
    },
  };

  public readonly inventory = {
    listBalances: async (locationId?: string) => {
      const q = locationId ? `?locationId=${locationId}` : '';
      return this.request<StockBalance[]>(`/api/v1/inventory/balances${q}`, { method: 'GET' });
    },

    listMovements: async (limit?: number) => {
      const q = limit ? `?limit=${limit}` : '';
      return this.request<StockMovement[]>(`/api/v1/inventory/movements${q}`, { method: 'GET' });
    },

    listLocations: async () => {
      return this.request<InventoryLocation[]>('/api/v1/inventory/locations', { method: 'GET' });
    },

    createLocation: async (location: Partial<InventoryLocation>) => {
      return this.request<InventoryLocation>('/api/v1/inventory/locations', {
        method: 'POST',
        body: JSON.stringify(location),
      });
    },

    createAdjustment: async (adjustment: Partial<StockAdjustment>) => {
      return this.request<StockAdjustment>('/api/v1/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify(adjustment),
      });
    },

    createTransfer: async (transfer: Partial<StockTransfer>) => {
      return this.request<StockTransfer>('/api/v1/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify(transfer),
      });
    },
  };

  public readonly parties = {
    list: async (type?: string) => {
      const q = type ? `?type=${type}` : '';
      return this.request<Party[]>(`/api/v1/parties${q}`, { method: 'GET' });
    },

    get: async (id: string) => {
      return this.request<Party>(`/api/v1/parties/${id}`, { method: 'GET' });
    },

    create: async (party: Partial<Party>) => {
      return this.request<Party>('/api/v1/parties', {
        method: 'POST',
        body: JSON.stringify(party),
      });
    },

    getLedger: async (partyId: string) => {
      return this.request<PartyLedgerEntry[]>(`/api/v1/parties/${partyId}/ledger`, { method: 'GET' });
    },
  };

  public readonly purchasing = {
    listOrders: async () => {
      return this.request<PurchaseOrder[]>('/api/v1/purchasing/orders', { method: 'GET' });
    },

    createOrder: async (order: Partial<PurchaseOrder>) => {
      return this.request<PurchaseOrder>('/api/v1/purchasing/orders', {
        method: 'POST',
        body: JSON.stringify(order),
      });
    },

    listReceipts: async () => {
      return this.request<PurchaseReceipt[]>('/api/v1/purchasing/receipts', { method: 'GET' });
    },

    postReceipt: async (receiptId: string) => {
      return this.request(`/api/v1/purchasing/receipts/${receiptId}/post`, {
        method: 'POST',
      });
    },

    listBills: async () => {
      return this.request<PurchaseBill[]>('/api/v1/purchasing/bills', { method: 'GET' });
    },

    postBill: async (billId: string) => {
      return this.request(`/api/v1/purchasing/bills/${billId}/post`, {
        method: 'POST',
      });
    },
  };

  public readonly payments = {
    list: async () => {
      return this.request<Payment[]>('/api/v1/payments', { method: 'GET' });
    },

    postPayment: async (data: { paymentId: string; allocations?: any[] }) => {
      return this.request(`/api/v1/payments/${data.paymentId}/post`, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    create: async (payment: Partial<Payment>) => {
      return this.request<Payment>('/api/v1/payments', {
        method: 'POST',
        body: JSON.stringify(payment),
      });
    },
  };

  public readonly expenses = {
    list: async () => {
      return this.request<Expense[]>('/api/v1/expenses', { method: 'GET' });
    },

    create: async (expense: Partial<Expense>) => {
      return this.request<Expense>('/api/v1/expenses', {
        method: 'POST',
        body: JSON.stringify(expense),
      });
    },

    listCategories: async () => {
      return this.request<ExpenseCategory[]>('/api/v1/expenses/categories', { method: 'GET' });
    },

    createCategory: async (category: Partial<ExpenseCategory>) => {
      return this.request<ExpenseCategory>('/api/v1/expenses/categories', {
        method: 'POST',
        body: JSON.stringify(category),
      });
    },
  };

  public readonly reports = {
    getDashboard: async () => {
      return this.request<DashboardMetrics>('/api/v1/reports/dashboard', { method: 'GET' });
    },

    getStockValuation: async () => {
      return this.request<any[]>('/api/v1/reports/stock-valuation', { method: 'GET' });
    },
  };
}
