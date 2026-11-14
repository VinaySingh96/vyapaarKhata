import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { PgUnitOfWork } from '../src/uow/pg-uow.js';
import { InvoicePostingService, SalesInvoice, TenantContext } from '@vyapaarkhata/domain';

describe('BE-02 & BE-08: PostgreSQL Real Transactional Invoice Posting Integration', () => {
  let pool: Pool;
  let uow: PgUnitOfWork;
  let service: InvoicePostingService;
  const isPostgresAvailable = true;

  const tenantCtx: TenantContext = {
    tenantId: '00000000-0000-0000-0000-000000000001',
    installationId: '00000000-0000-0000-0000-000000000001',
  };

  const testProductId = 'a0000000-0000-0000-0000-000000000001';
  const testVariantId = 'a0000000-0000-0000-0000-000000000002';
  const testBusinessLocationId = 'b0000000-0000-0000-0000-000000000000';
  const testLocationId = 'b0000000-0000-0000-0000-000000000001';
  const testPartyId = 'c0000000-0000-0000-0000-000000000001';
  const testUnitId = '10000000-0000-0000-0000-000000000001'; // Pieces (from seeds)

  beforeAll(async () => {
    pool = new Pool({
      connectionString: 'postgresql://localhost:5432/vyapaarkhata_test',
    });
    uow = new PgUnitOfWork(pool);
    service = new InvoicePostingService(uow);

    // Seed test master records in vyapaarkhata_test
    await pool.query(`
      DELETE FROM sync_outbox WHERE payload->>'invoiceId' = 'd0000000-0000-0000-0000-000000000001';
      DELETE FROM party_ledger_entries WHERE document_id = 'd0000000-0000-0000-0000-000000000001';
      DELETE FROM stock_movements WHERE reference_id = 'd0000000-0000-0000-0000-000000000001';
      DELETE FROM sales_invoice_lines WHERE invoice_id = 'd0000000-0000-0000-0000-000000000001';
      DELETE FROM sales_invoices WHERE id = 'd0000000-0000-0000-0000-000000000001';

      INSERT INTO business_locations (id, tenant_id, name, code, is_active, created_at)
      VALUES ('${testBusinessLocationId}', '${tenantCtx.tenantId}', 'Main Branch', 'BR-01', true, NOW())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO inventory_locations (id, tenant_id, business_location_id, name, code, is_active, created_at)
      VALUES ('${testLocationId}', '${tenantCtx.tenantId}', '${testBusinessLocationId}', 'Main Yard', 'MY-01', true, NOW())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO parties (id, tenant_id, party_type, display_name, legal_name, is_active, created_at)
      VALUES ('${testPartyId}', '${tenantCtx.tenantId}', 'customer', 'Acme Construction', 'Acme Construction Pvt Ltd', true, NOW())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO products (id, tenant_id, name, product_type, is_stock_tracked, tracking_method, valuation_method, base_unit_id, is_active, created_at)
      VALUES ('${testProductId}', '${tenantCtx.tenantId}', 'Portland Cement', 'goods', true, 'none', 'fifo', '${testUnitId}', true, NOW())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO product_variants (id, tenant_id, product_id, sku, variant_name, reorder_level, is_active, created_at)
      VALUES ('${testVariantId}', '${tenantCtx.tenantId}', '${testProductId}', 'CEM-50KG', '50kg Bag', 5.0000, true, NOW())
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO stock_balances (id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at)
      VALUES ('f0000000-0000-0000-0000-000000000001', '${tenantCtx.tenantId}', '${testLocationId}', '${testVariantId}', 20.0000, 20.0000, NOW())
      ON CONFLICT (id) DO UPDATE SET quantity_on_hand = 20.0000, quantity_available = 20.0000, updated_at = NOW();
    `);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('atomically executes invoice posting against PostgreSQL with row locks and outbox publication', async () => {
    const invoiceId = 'd0000000-0000-0000-0000-000000000001';
    const draftInvoice: SalesInvoice = {
      id: invoiceId,
      tenantId: tenantCtx.tenantId,
      businessLocationId: testBusinessLocationId,
      invoiceNumber: 'INV-PG-001',
      customerId: testPartyId,
      status: 'draft',
      subtotal: 800,
      taxTotal: 144,
      grandTotal: 944,
      lines: [
        {
          id: 'e0000000-0000-0000-0000-000000000001',
          productId: testVariantId,
          variantId: testVariantId,
          locationId: testLocationId,
          quantity: 8,
          unitId: testUnitId,
          unitPrice: 100,
          taxAmount: 18,
          lineTotal: 118,
        },
      ],
    };

    // Save initial draft invoice
    await uow.runInTransaction(async (ctx) => {
      await ctx.invoices.save(draftInvoice);
    });

    // 1. Post the invoice
    const result = await service.postInvoice({
      tenantContext: tenantCtx,
      invoiceId,
      idempotencyKey: 'idem-pg-test-01',
    });

    expect(result.invoice.status).toBe('posted');

    // 2. Query PostgreSQL directly to verify atomic invariants
    const balRes = await pool.query(
      `SELECT quantity_on_hand FROM stock_balances WHERE id = 'f0000000-0000-0000-0000-000000000001'`
    );
    expect(parseFloat(balRes.rows[0].quantity_on_hand)).toBe(12); // 20 - 8 = 12

    const movRes = await pool.query(
      `SELECT movement_type, quantity FROM stock_movements WHERE reference_id = $1`,
      [invoiceId]
    );
    expect(movRes.rows.length).toBe(1);
    expect(movRes.rows[0].movement_type).toBe('sale');
    expect(parseFloat(movRes.rows[0].quantity)).toBe(-8);

    const pleRes = await pool.query(
      `SELECT debit_amount, credit_amount FROM party_ledger_entries WHERE document_id = $1`,
      [invoiceId]
    );
    expect(pleRes.rows.length).toBe(1);
    expect(parseFloat(pleRes.rows[0].debit_amount)).toBe(944);

    const outRes = await pool.query(
      `SELECT event_type FROM sync_outbox WHERE payload->>'invoiceId' = $1`,
      [invoiceId]
    );
    expect(outRes.rows.length).toBe(1);
    expect(outRes.rows[0].event_type).toBe('sales.invoice.posted');

    // 3. Test cancellation reversal
    const cancelled = await service.cancelInvoice({
      tenantContext: tenantCtx,
      invoiceId,
      reason: 'Wrong customer selection',
    });

    expect(cancelled.status).toBe('cancelled');

    // Balance restored back to 20
    const restoredBal = await pool.query(
      `SELECT quantity_on_hand FROM stock_balances WHERE id = 'f0000000-0000-0000-0000-000000000001'`
    );
    expect(parseFloat(restoredBal.rows[0].quantity_on_hand)).toBe(20);

    // Reversal records created
    const revMovRes = await pool.query(
      `SELECT movement_type, quantity FROM stock_movements WHERE reference_id = $1 ORDER BY created_at`,
      [invoiceId]
    );
    expect(revMovRes.rows.length).toBe(2);
    expect(revMovRes.rows[1].movement_type).toBe('cancellation_reversal');
    expect(parseFloat(revMovRes.rows[1].quantity)).toBe(8);

    // Both debit and credit party ledger entries exist
    const revPleRes = await pool.query(
      `SELECT debit_amount, credit_amount FROM party_ledger_entries WHERE document_id = $1 ORDER BY created_at`,
      [invoiceId]
    );
    expect(revPleRes.rows.length).toBe(2);
    expect(parseFloat(revPleRes.rows[0].debit_amount)).toBe(944);
    expect(parseFloat(revPleRes.rows[1].credit_amount)).toBe(944);
  });
});
