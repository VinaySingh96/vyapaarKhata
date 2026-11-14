/**
 * vyapaarKhata Strongly-Typed API Client
 * Task API-02: Generated contract interface based on openapi.yaml
 */

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

  public readonly purchasing = {
    postReceipt: async (receiptId: string) => {
      return this.request(`/api/v1/purchasing/receipts/${receiptId}/post`, {
        method: 'POST',
      });
    },

    postBill: async (billId: string) => {
      return this.request(`/api/v1/purchasing/bills/${billId}/post`, {
        method: 'POST',
      });
    },
  };

  public readonly payments = {
    postPayment: async (
      paymentId: string,
      allocations?: Array<{
        documentType: 'sales_invoice' | 'purchase_bill';
        documentId: string;
        amount: number;
      }>
    ) => {
      return this.request(`/api/v1/payments/${paymentId}/post`, {
        method: 'POST',
        body: JSON.stringify({ allocations }),
      });
    },
  };
}

export function createApiClient(options: ApiClientOptions): VyapaarKhataApiClient {
  return new VyapaarKhataApiClient(options);
}
