import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { SalesInvoice } from '@vyapaarkhata/domain';
import { InMemoryUnitOfWork } from '../../../packages/domain/test/in-memory-uow.js';

describe('Sales API Endpoints Integration (Fastify)', () => {
  const config = loadConfig({ NODE_ENV: 'test', PORT: '4002', DB_DRIVER: 'sqlite' });
  let uow: InMemoryUnitOfWork;
  let app: any;

  const sampleInvoice: SalesInvoice = {
    id: 'inv-api-01',
    tenantId: '00000000-0000-0000-0000-000000000001',
    invoiceNumber: 'INV-API-2026-001',
    customerId: 'cust-01',
    status: 'draft',
    subtotal: 500,
    taxTotal: 90,
    grandTotal: 590,
    lines: [
      {
        id: 'line-1',
        productId: 'prod-brick',
        locationId: 'loc-yard',
        quantity: 50,
        unitId: 'unit-pcs',
        unitPrice: 10,
        taxAmount: 90,
        lineTotal: 590,
      },
    ],
  };

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    app = buildApp(config, uow);

    // Initial stock: 100 bricks
    uow.balances.set('00000000-0000-0000-0000-000000000001-prod-brick-loc-yard', {
      id: 'bal-brick-01',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productId: 'prod-brick',
      locationId: 'loc-yard',
      currentBalance: 100,
      reorderLevel: 20,
      updatedAt: '2026-11-15T00:00:00Z',
    });

    uow.invoices.set(sampleInvoice.id, sampleInvoice);
  });

  it('POST /api/v1/sales/invoices/:id/post posts invoice and returns updated resource', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/invoices/inv-api-01/post',
      headers: {
        'x-tenant-id': '00000000-0000-0000-0000-000000000001',
        'idempotency-key': 'idem-api-01',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.invoice.status).toBe('posted');
    expect(body.data.isDuplicate).toBe(false);

    // Stock deducted from 100 to 50
    const bal = uow.balances.get('00000000-0000-0000-0000-000000000001-prod-brick-loc-yard');
    expect(bal?.currentBalance).toBe(50);
  });

  it('POST /api/v1/sales/invoices/:id/post rejects when insufficient stock with 400 error', async () => {
    // Reduce available stock to 10 bricks
    uow.balances.set('00000000-0000-0000-0000-000000000001-prod-brick-loc-yard', {
      id: 'bal-brick-01',
      tenantId: '00000000-0000-0000-0000-000000000001',
      productId: 'prod-brick',
      locationId: 'loc-yard',
      currentBalance: 10,
      updatedAt: '2026-11-15T00:00:00Z',
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/invoices/inv-api-01/post',
    });

    expect(res.statusCode).toBe(409);
    const body = res.json();
    expect(body.success).toBe(false);
  });

  it('POST /api/v1/sales/invoices/:id/cancel cancels posted invoice and restores stock', async () => {
    // Post first
    await app.inject({
      method: 'POST',
      url: '/api/v1/sales/invoices/inv-api-01/post',
    });

    expect(
      uow.balances.get('00000000-0000-0000-0000-000000000001-prod-brick-loc-yard')?.currentBalance
    ).toBe(50);

    // Now cancel
    const res = await app.inject({
      method: 'POST',
      url: '/api/v1/sales/invoices/inv-api-01/cancel',
      payload: { reason: 'Order returned by customer' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('cancelled');

    // Stock restored back to 100
    expect(
      uow.balances.get('00000000-0000-0000-0000-000000000001-prod-brick-loc-yard')?.currentBalance
    ).toBe(100);
  });
});
