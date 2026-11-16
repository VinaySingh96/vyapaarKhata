import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { InMemoryUnitOfWork } from '../../../packages/domain/test/in-memory-uow.js';

const TENANT = '00000000-0000-0000-0000-000000000001';
const headers = { 'x-tenant-id': TENANT };

describe('Rental API (Fastify)', () => {
  const config = loadConfig({ NODE_ENV: 'test', PORT: '4002', DB_DRIVER: 'sqlite' });
  let uow: InMemoryUnitOfWork;
  let app: any;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    app = buildApp(config, uow);
    uow.locations.push({
      id: 'loc-yard',
      tenantId: TENANT,
      name: 'Main Yard',
      code: 'YARD',
      locationType: 'warehouse',
      isDefault: true,
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
    uow.parties.set('cust-01', {
      id: 'cust-01',
      tenantId: TENANT,
      partyType: 'customer',
      displayName: 'Gupta Site',
      openingBalance: 0,
      openingBalanceType: 'debit',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
    uow.balances.set(`${TENANT}-var-plate-loc-yard`, {
      id: 'bal-plate',
      tenantId: TENANT,
      productId: 'var-plate',
      variantId: 'var-plate',
      locationId: 'loc-yard',
      currentBalance: 100,
      updatedAt: '2026-11-01T00:00:00Z',
    });
  });

  const issueBody = {
    partyId: 'cust-01',
    issueDate: '2026-11-01',
    lines: [{ variantId: 'var-plate', unitId: 'u-pcs', quantity: 40, dailyRate: 5, description: 'Centring Plate' }],
  };

  it('is disabled by default and returns 403 until enabled', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/v1/rentals/issues', headers, payload: issueBody });
    expect(res.statusCode).toBe(403);

    const settings = await app.inject({ method: 'GET', url: '/api/v1/rentals/settings', headers });
    expect(settings.json().data.enabled).toBe(false);
  });

  it('runs issue → preview → partial return → complete, and guards rent bills from sales cancel', async () => {
    const enable = await app.inject({
      method: 'PUT',
      url: '/api/v1/rentals/settings',
      headers,
      payload: { enabled: true, defaultGstRate: 0 },
    });
    expect(enable.statusCode).toBe(200);

    const issueRes = await app.inject({ method: 'POST', url: '/api/v1/rentals/issues', headers, payload: issueBody });
    expect(issueRes.statusCode).toBe(201);
    const issue = issueRes.json().data;
    const lineId = issue.lines[0].id;

    const preview = await app.inject({
      method: 'POST',
      url: `/api/v1/rentals/issues/${issue.id}/returns/preview`,
      headers,
      payload: { returnDate: '2026-11-05', lines: [{ issueLineId: lineId, qtyReturned: 10 }] },
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().data.suggestedDays).toBe(5);
    expect(preview.json().data.totalAmount).toBe(250);
    expect(uow.rentalReturns.size).toBe(0);

    const tooMany = await app.inject({
      method: 'POST',
      url: `/api/v1/rentals/issues/${issue.id}/returns`,
      headers,
      payload: { returnDate: '2026-11-05', lines: [{ issueLineId: lineId, qtyReturned: 41 }] },
    });
    expect(tooMany.statusCode).toBe(409);

    const partial = await app.inject({
      method: 'POST',
      url: `/api/v1/rentals/issues/${issue.id}/returns`,
      headers,
      payload: { returnDate: '2026-11-05', lines: [{ issueLineId: lineId, qtyReturned: 10 }] },
    });
    expect(partial.statusCode).toBe(201);
    const ret = partial.json().data;
    expect(ret.totalAmount).toBe(250);

    // Sales screen cannot cancel a rent bill
    const salesCancel = await app.inject({
      method: 'POST',
      url: `/api/v1/sales/invoices/${ret.salesInvoiceId}/cancel`,
      headers,
      payload: { reason: 'x' },
    });
    expect(salesCancel.statusCode).toBe(409);

    const summary = await app.inject({ method: 'GET', url: '/api/v1/rentals/summary', headers });
    expect(summary.json().data.totalQtyOnRent).toBe(30);

    const complete = await app.inject({
      method: 'POST',
      url: `/api/v1/rentals/issues/${issue.id}/returns`,
      headers,
      payload: { returnDate: '2026-11-10', lines: [{ issueLineId: lineId, qtyReturned: 30, days: 8 }] },
    });
    expect(complete.statusCode).toBe(201);
    expect(complete.json().data.isFinal).toBe(true);
    expect(complete.json().data.totalAmount).toBe(1200);

    const detail = await app.inject({ method: 'GET', url: `/api/v1/rentals/issues/${issue.id}`, headers });
    expect(detail.json().data.status).toBe('completed');
    expect(detail.json().data.returns.length).toBe(2);
    expect(uow.balances.get(`${TENANT}-var-plate-loc-yard`)!.currentBalance).toBe(100);
  });
});
