import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool } from 'pg';
import { PgUnitOfWork } from '../src/uow/pg-uow.js';
import { InvoicePostingService, SalesInvoice, TenantContext } from '@vyapaarkhata/domain';

describe('INT-02: Cross-Tenant Data Isolation Contract Suite', () => {
  let pool: Pool;
  let uow: PgUnitOfWork;
  let service: InvoicePostingService;

  // Tenant A: Acme Corp
  const tenantA: TenantContext = {
    tenantId: '11111111-1111-1111-1111-111111111111',
    installationId: '11111111-1111-1111-1111-111111111111',
  };

  // Tenant B: Beta Enterprises
  const tenantB: TenantContext = {
    tenantId: '22222222-2222-2222-2222-222222222222',
    installationId: '22222222-2222-2222-2222-222222222222',
  };

  const unitId = '10000000-0000-0000-0000-000000000001'; // Pieces (from seeds)

  // Master records for Tenant A
  const tenantABranchId = '11111111-0000-0000-0000-000000000001';
  const tenantALocationId = '11111111-0000-0000-0000-000000000002';
  const tenantAPartyId = '11111111-0000-0000-0000-000000000003';
  const tenantAProductId = '11111111-0000-0000-0000-000000000004';
  const tenantAVariantId = '11111111-0000-0000-0000-000000000005';
  const invoiceAId = '11111111-9999-0000-0000-000000000001';

  // Master records for Tenant B
  const tenantBBranchId = '22222222-0000-0000-0000-000000000001';
  const tenantBLocationId = '22222222-0000-0000-0000-000000000002';
  const tenantBPartyId = '22222222-0000-0000-0000-000000000003';
  const tenantBProductId = '22222222-0000-0000-0000-000000000004';
  const tenantBVariantId = '22222222-0000-0000-0000-000000000005';
  const invoiceBId = '22222222-9999-0000-0000-000000000001';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: 'postgresql://localhost:5432/vyapaarkhata_test',
    });
    uow = new PgUnitOfWork(pool);
    service = new InvoicePostingService(uow);

    // Clean up test data
    await pool.query(`
      DELETE FROM sync_outbox WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM party_ledger_entries WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM stock_movements WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM stock_balances WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM sales_invoice_lines WHERE invoice_id IN ('${invoiceAId}', '${invoiceBId}');
      DELETE FROM sales_invoices WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM product_variants WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM products WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM parties WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM inventory_locations WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM business_locations WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM installations WHERE tenant_id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');
      DELETE FROM tenants WHERE id IN ('${tenantA.tenantId}', '${tenantB.tenantId}');

      -- Insert Tenants
      INSERT INTO tenants (id, brand_id, name, slug, status, created_at)
      VALUES 
        ('${tenantA.tenantId}', '00000000-0000-0000-0000-000000000001', 'Tenant A Corp', 'tenant-a', 'active', NOW()),
        ('${tenantB.tenantId}', '00000000-0000-0000-0000-000000000001', 'Tenant B Ltd', 'tenant-b', 'active', NOW());

      -- Insert Installations
      INSERT INTO installations (id, tenant_id, installation_code, installation_name, platform, is_primary, is_active, created_at)
      VALUES
        ('${tenantA.installationId}', '${tenantA.tenantId}', 'INST-A1', 'Device-A1', 'desktop', true, true, NOW()),
        ('${tenantB.installationId}', '${tenantB.tenantId}', 'INST-B1', 'Device-B1', 'desktop', true, true, NOW());

      -- Master data for Tenant A
      INSERT INTO business_locations (id, tenant_id, name, code, is_active, created_at)
      VALUES ('${tenantABranchId}', '${tenantA.tenantId}', 'Branch A', 'BR-A', true, NOW());
      INSERT INTO inventory_locations (id, tenant_id, business_location_id, name, code, is_default, is_active, created_at)
      VALUES ('${tenantALocationId}', '${tenantA.tenantId}', '${tenantABranchId}', 'Warehouse A', 'WH-A', true, true, NOW());
      INSERT INTO parties (id, tenant_id, party_type, display_name, legal_name, is_active, created_at)
      VALUES ('${tenantAPartyId}', '${tenantA.tenantId}', 'customer', 'Customer A', 'Customer A Ltd', true, NOW());
      INSERT INTO products (id, tenant_id, name, product_type, is_stock_tracked, tracking_method, valuation_method, base_unit_id, is_active, created_at)
      VALUES ('${tenantAProductId}', '${tenantA.tenantId}', 'Product A', 'goods', true, 'none', 'fifo', '${unitId}', true, NOW());
      INSERT INTO product_variants (id, tenant_id, product_id, sku, variant_name, reorder_level, is_active, created_at)
      VALUES ('${tenantAVariantId}', '${tenantA.tenantId}', '${tenantAProductId}', 'SKU-A', 'Variant A', 5.0, true, NOW());
      INSERT INTO stock_balances (id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at)
      VALUES (gen_random_uuid(), '${tenantA.tenantId}', '${tenantALocationId}', '${tenantAVariantId}', 50.0, 50.0, NOW());

      -- Master data for Tenant B
      INSERT INTO business_locations (id, tenant_id, name, code, is_active, created_at)
      VALUES ('${tenantBBranchId}', '${tenantB.tenantId}', 'Branch B', 'BR-B', true, NOW());
      INSERT INTO inventory_locations (id, tenant_id, business_location_id, name, code, is_default, is_active, created_at)
      VALUES ('${tenantBLocationId}', '${tenantB.tenantId}', '${tenantBBranchId}', 'Warehouse B', 'WH-B', true, true, NOW());
      INSERT INTO parties (id, tenant_id, party_type, display_name, legal_name, is_active, created_at)
      VALUES ('${tenantBPartyId}', '${tenantB.tenantId}', 'customer', 'Customer B', 'Customer B Pvt Ltd', true, NOW());
      INSERT INTO products (id, tenant_id, name, product_type, is_stock_tracked, tracking_method, valuation_method, base_unit_id, is_active, created_at)
      VALUES ('${tenantBProductId}', '${tenantB.tenantId}', 'Product B', 'goods', true, 'none', 'fifo', '${unitId}', true, NOW());
      INSERT INTO product_variants (id, tenant_id, product_id, sku, variant_name, reorder_level, is_active, created_at)
      VALUES ('${tenantBVariantId}', '${tenantB.tenantId}', '${tenantBProductId}', 'SKU-B', 'Variant B', 5.0, true, NOW());
      INSERT INTO stock_balances (id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at)
      VALUES (gen_random_uuid(), '${tenantB.tenantId}', '${tenantBLocationId}', '${tenantBVariantId}', 100.0, 100.0, NOW());
    `);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('strictly segregates sales invoices and prevents cross-tenant lookup', async () => {
    // 1. Post Invoice for Tenant A
    const invoiceA: SalesInvoice = {
      id: invoiceAId,
      tenantId: tenantA.tenantId,
      businessLocationId: tenantABranchId,
      invoiceNumber: 'INV-A-001',
      customerId: tenantAPartyId,
      status: 'draft',
      subtotal: 1000,
      taxTotal: 180,
      grandTotal: 1180,
      lines: [
        {
          id: '11111111-9999-0000-0000-000000000002',
          productId: tenantAVariantId,
          variantId: tenantAVariantId,
          locationId: tenantALocationId,
          quantity: 10,
          unitId,
          unitPrice: 100,
          taxAmount: 18,
          lineTotal: 118,
        },
      ],
    };

    await uow.runInTransaction(async (ctx) => {
      await ctx.invoices.save(invoiceA);
    });

    const resultA = await service.postInvoice({
      tenantContext: tenantA,
      invoiceId: invoiceAId,
    });
    expect(resultA.invoice.status).toBe('posted');

    // 2. Query invoice with Tenant A context -> found
    await uow.runInTransaction(async (ctx) => {
      const foundA = await ctx.invoices.findById(tenantA.tenantId, invoiceAId);
      expect(foundA).not.toBeNull();
      expect(foundA?.id).toBe(invoiceAId);
      expect(foundA?.tenantId).toBe(tenantA.tenantId);

      // 3. Query SAME invoice ID with Tenant B context -> MUST BE NULL
      const foundB = await ctx.invoices.findById(tenantB.tenantId, invoiceAId);
      expect(foundB).toBeNull();
    });
  });

  it('prevents Tenant B from modifying or cancelling Tenant A invoice', async () => {
    // Attempting to cancel Tenant A's invoice using Tenant B context must throw not found
    await expect(
      service.cancelInvoice({
        tenantContext: tenantB,
        invoiceId: invoiceAId,
        reason: 'Malicious cross-tenant attempt',
      })
    ).rejects.toThrow(`Invoice ${invoiceAId} not found`);

    // Verify Tenant A's invoice remains 'posted'
    await uow.runInTransaction(async (ctx) => {
      const invA = await ctx.invoices.findById(tenantA.tenantId, invoiceAId);
      expect(invA?.status).toBe('posted');
    });
  });

  it('strictly segregates stock balances and inventory movements across tenants', async () => {
    await uow.runInTransaction(async (ctx) => {
      // Tenant A balance was 50, 10 sold -> 40 remaining
      const balA = await ctx.inventory.getBalance(tenantA.tenantId, tenantAVariantId, tenantALocationId);
      expect(balA?.currentBalance).toBe(40);

      // Tenant B querying Tenant A's location and variant must return NULL
      const balBQueryingA = await ctx.inventory.getBalance(
        tenantB.tenantId,
        tenantAVariantId,
        tenantALocationId
      );
      expect(balBQueryingA).toBeNull();

      // Tenant B's own stock balance must be untouched (100)
      const balB = await ctx.inventory.getBalance(tenantB.tenantId, tenantBVariantId, tenantBLocationId);
      expect(balB?.currentBalance).toBe(100);
    });
  });

  it('strictly segregates party ledgers between tenants', async () => {
    await uow.runInTransaction(async (ctx) => {
      // Tenant A's customer ledger has debit for 1180
      const entriesA = await ctx.partyLedger.listEntriesByDocument(tenantA.tenantId, invoiceAId);
      expect(entriesA.length).toBe(1);
      expect(entriesA[0].amount).toBe(1180);
      expect(entriesA[0].entryType).toBe('debit');

      // Tenant B querying Tenant A's document entries returns empty
      const entriesBQueryingA = await ctx.partyLedger.listEntriesByDocument(tenantB.tenantId, invoiceAId);
      expect(entriesBQueryingA).toEqual([]);
    });
  });

  it('strictly segregates sync outbox events between tenants', async () => {
    const resA = await pool.query(
      `SELECT aggregate_type, aggregate_id FROM sync_outbox WHERE tenant_id = $1`,
      [tenantA.tenantId]
    );
    expect(resA.rows.length).toBeGreaterThanOrEqual(1);
    expect(resA.rows[0].aggregate_id).toBe(invoiceAId);

    const resB = await pool.query(
      `SELECT aggregate_type, aggregate_id FROM sync_outbox WHERE tenant_id = $1`,
      [tenantB.tenantId]
    );
    // Tenant B has emitted 0 outbox events so far
    expect(resB.rows.length).toBe(0);
  });
});
