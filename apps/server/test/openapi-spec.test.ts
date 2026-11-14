import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 3: OpenAPI 3.1 Specification Freeze Verification (API-01)', () => {
  const specPath = path.resolve(process.cwd(), 'docs/spec/openapi.yaml');
  const specContent = fs.readFileSync(specPath, 'utf-8');

  it('verifies openapi.yaml exists and declares OpenAPI 3.1.0', () => {
    expect(specContent).toContain('openapi: 3.1.0');
  });

  it('verifies NO delivery, dispatch, vehicle, driver, or e-way-bill endpoints exist', () => {
    const forbidden = [
      'delivery',
      'deliveries',
      'dispatch',
      'challan',
      'trip',
      'vehicle',
      'driver',
      'eway_bill',
      'e-way-bill',
    ];

    for (const term of forbidden) {
      const regex = new RegExp(`/api/v1/.*${term}.*`, 'i');
      expect(regex.test(specContent)).toBe(false);
    }
  });

  it('verifies explicit draft, post, and cancel operations for sales invoices', () => {
    expect(specContent).toContain('/api/v1/sales/invoices');
    expect(specContent).toContain('/api/v1/sales/invoices/{id}/post');
    expect(specContent).toContain('/api/v1/sales/invoices/{id}/cancel');
  });

  it('verifies distinct purchasing receipt post and bill post endpoints', () => {
    expect(specContent).toContain('/api/v1/purchasing/receipts/{id}/post');
    expect(specContent).toContain('/api/v1/purchasing/bills/{id}/post');
  });

  it('verifies tenant and idempotency headers are documented', () => {
    expect(specContent).toContain('name: x-tenant-id');
    expect(specContent).toContain('name: idempotency-key');
  });
});
