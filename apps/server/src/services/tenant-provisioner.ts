import { randomUUID } from 'node:crypto';
import { UnitOfWork } from '@vyapaarkhata/domain';

export interface ProvisionTenantInfo {
  id: string;
  name: string;
  legalName?: string;
  storeType?: string;
}

/**
 * Idempotently provisions foundational master records for a newly authenticated tenant
 * in the local database, ensuring sales, inventory, accounting, and billing work seamlessly.
 */
export async function ensureLocalTenantProvisioned(
  uow: UnitOfWork,
  tenant: ProvisionTenantInfo
): Promise<void> {
  await uow.runInTransaction(async (ctx) => {
    if (!ctx.rawQuery) return;

    const tenantId = tenant.id;
    const name = tenant.name || 'vyapaarKhata Store';
    const legalName = tenant.legalName || name;
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${tenantId.slice(0, 8)}`;

    // 1. Tenants table
    await ctx.rawQuery(
      `INSERT INTO tenants (id, brand_id, name, slug, status, country_code, currency, locale, created_at)
       VALUES ($1, $1, $2, $3, 'active', 'IN', 'INR', 'en-IN', NOW())
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'`,
      [tenantId, name, slug]
    );

    // 2. Installations table
    const instRows = await ctx.rawQuery(
      `SELECT id FROM installations WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!instRows.length) {
      await ctx.rawQuery(
        `INSERT INTO installations (id, tenant_id, installation_code, is_primary, is_active, created_at)
         VALUES ($1, $2, $3, TRUE, TRUE, NOW())
         ON CONFLICT (id) DO NOTHING`,
        [randomUUID(), tenantId, `PRIMARY-${tenantId.slice(0, 8).toUpperCase()}`]
      );
    }

    // 3. Business Location
    let businessLocationId: string;
    const blocRows = await ctx.rawQuery(
      `SELECT id FROM business_locations WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!blocRows.length) {
      businessLocationId = randomUUID();
      await ctx.rawQuery(
        `INSERT INTO business_locations (id, tenant_id, name, code, location_type, is_default, is_active, created_at)
         VALUES ($1, $2, $3, 'MAIN', 'store', TRUE, TRUE, NOW())`,
        [businessLocationId, tenantId, name]
      );
    } else {
      businessLocationId = blocRows[0].id;
    }

    // 4. Inventory Location (Warehouse / Godown)
    const invRows = await ctx.rawQuery(
      `SELECT id FROM inventory_locations WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!invRows.length) {
      await ctx.rawQuery(
        `INSERT INTO inventory_locations (id, tenant_id, business_location_id, name, code, location_type, is_default, is_active, created_at)
         VALUES ($1, $2, $3, 'Main Godown', 'WH-MAIN', 'warehouse', TRUE, TRUE, NOW())`,
        [randomUUID(), tenantId, businessLocationId]
      );
    }

    // 5. Payment Methods (Cash, UPI, Bank Transfer, Cheque)
    const pmRows = await ctx.rawQuery(
      `SELECT id FROM payment_methods WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!pmRows.length) {
      const pms = [
        { name: 'Cash', code: 'CASH' },
        { name: 'UPI / QR Code', code: 'UPI' },
        { name: 'Bank Transfer / NEFT', code: 'BANK_TRANSFER' },
        { name: 'Cheque', code: 'CHEQUE' },
      ];
      for (const pm of pms) {
        await ctx.rawQuery(
          `INSERT INTO payment_methods (id, tenant_id, name, code, is_active)
           VALUES ($1, $2, $3, $4, TRUE)`,
          [randomUUID(), tenantId, pm.name, pm.code]
        );
      }
    }

    // 6. Financial Accounts (Cash in Hand, Bank Current Account)
    const faRows = await ctx.rawQuery(
      `SELECT id FROM financial_accounts WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!faRows.length) {
      await ctx.rawQuery(
        `INSERT INTO financial_accounts (id, tenant_id, name, account_type, is_default, is_active, created_at)
         VALUES
         ($1, $2, 'Cash in Hand', 'cash', TRUE, TRUE, NOW()),
         ($3, $2, 'Current Account', 'bank', FALSE, TRUE, NOW())`,
        [randomUUID(), tenantId, randomUUID()]
      );
    }

    // 7. Standard Indian Units of Measure
    const uRows = await ctx.rawQuery(
      `SELECT id FROM units WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!uRows.length) {
      const unitsList = [
        { name: 'Pieces', symbol: 'pcs', dimension: 'count', dec: 0 },
        { name: 'Numbers', symbol: 'nos', dimension: 'count', dec: 0 },
        { name: 'Kilograms', symbol: 'kg', dimension: 'weight', dec: 3 },
        { name: 'Grams', symbol: 'g', dimension: 'weight', dec: 2 },
        { name: 'Meters', symbol: 'm', dimension: 'length', dec: 2 },
        { name: 'Square Feet', symbol: 'sqft', dimension: 'area', dec: 2 },
        { name: 'Cubic Feet', symbol: 'cft', dimension: 'volume', dec: 3 },
        { name: 'Boxes', symbol: 'box', dimension: 'packaging', dec: 0 },
        { name: 'Bags', symbol: 'bag', dimension: 'packaging', dec: 0 },
        { name: 'Metric Tonnes', symbol: 't', dimension: 'weight', dec: 3 },
      ];
      for (const u of unitsList) {
        await ctx.rawQuery(
          `INSERT INTO units (id, tenant_id, name, symbol, dimension, decimal_places, is_system, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE)`,
          [randomUUID(), tenantId, u.name, u.symbol, u.dimension, u.dec]
        );
      }
    }

    // 8. Standard GST Tax Categories & Rates
    const tcRows = await ctx.rawQuery(
      `SELECT id FROM tax_categories WHERE tenant_id = $1 LIMIT 1`,
      [tenantId]
    );
    if (!tcRows.length) {
      const taxes = [
        { name: 'GST 0% (Exempt)', code: 'GST-0', isExempt: true, rateName: 'Zero Rate', rate: 0.0 },
        { name: 'GST 5%', code: 'GST-5', isExempt: false, rateName: '5% Rate', rate: 5.0 },
        { name: 'GST 12%', code: 'GST-12', isExempt: false, rateName: '12% Rate', rate: 12.0 },
        { name: 'GST 18%', code: 'GST-18', isExempt: false, rateName: '18% Rate', rate: 18.0 },
        { name: 'GST 28%', code: 'GST-28', isExempt: false, rateName: '28% Rate', rate: 28.0 },
      ];
      for (const tc of taxes) {
        const catId = randomUUID();
        await ctx.rawQuery(
          `INSERT INTO tax_categories (id, tenant_id, name, code, tax_type, is_exempt, created_at)
           VALUES ($1, $2, $3, $4, 'gst', $5, NOW())`,
          [catId, tenantId, tc.name, tc.code, tc.isExempt]
        );
        await ctx.rawQuery(
          `INSERT INTO tax_rates (id, tenant_id, tax_category_id, name, rate, effective_from, is_active)
           VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, TRUE)`,
          [randomUUID(), tenantId, catId, tc.rateName, tc.rate]
        );
      }
    }

    // 9. Business Profile
    await ctx.rawQuery(
      `INSERT INTO business_profiles (id, tenant_id, trade_name, legal_name, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (tenant_id) DO NOTHING`,
      [randomUUID(), tenantId, name, legalName]
    );
  });
}
