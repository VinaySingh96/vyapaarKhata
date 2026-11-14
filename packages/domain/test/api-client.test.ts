import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from '../src/api-client.js';

describe('Task API-02: Strongly-Typed OpenAPI Client Suite', () => {
  it('sends correct headers and tenant id for /health and /ready', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ status: 'healthy', version: '0.1.0' }),
    });

    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      tenantId: 'tenant-test-01',
      fetchFn: mockFetch as any,
    });

    const res = await client.getHealth();
    expect(res.status).toBe('healthy');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/health',
      expect.objectContaining({
        method: 'GET',
        headers: expect.any(Headers),
      })
    );
  });

  it('sends idempotency-key header when posting an invoice', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true, data: { status: 'posted' } }),
    });

    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      tenantId: 'tenant-test-01',
      fetchFn: mockFetch as any,
    });

    await client.sales.postInvoice('inv-123', 'idemp-key-xyz');

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('http://127.0.0.1:4000/api/v1/sales/invoices/inv-123/post');
    const headers = callArgs[1].headers as Headers;
    expect(headers.get('idempotency-key')).toBe('idemp-key-xyz');
    expect(headers.get('x-tenant-id')).toBe('tenant-test-01');
  });

  it('sends purchasing receipt and bill requests to correct endpoints', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });

    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      fetchFn: mockFetch as any,
    });

    await client.purchasing.postReceipt('rec-99');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/v1/purchasing/receipts/rec-99/post',
      expect.anything()
    );

    await client.purchasing.postBill('bill-88');
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:4000/api/v1/purchasing/bills/bill-88/post',
      expect.anything()
    );
  });

  it('sends payment allocations in JSON payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      json: async () => ({ success: true }),
    });

    const client = createApiClient({
      baseUrl: 'http://127.0.0.1:4000',
      fetchFn: mockFetch as any,
    });

    await client.payments.postPayment('pay-11', [
      { documentType: 'sales_invoice', documentId: 'inv-1', amount: 500 },
    ]);

    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[0]).toBe('http://127.0.0.1:4000/api/v1/payments/pay-11/post');
    const body = JSON.parse(callArgs[1].body);
    expect(body.allocations.length).toBe(1);
    expect(body.allocations[0].amount).toBe(500);
  });
});
