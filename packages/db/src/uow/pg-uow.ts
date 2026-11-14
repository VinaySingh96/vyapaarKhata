import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  UnitOfWork,
  UnitOfWorkContext,
  InvoiceRepository,
  ProductRepository,
  InventoryRepository,
  PartyRepository,
  PartyLedgerRepository,
  OutboxRepository,
  PurchasingRepository,
  PaymentRepository,
  ExpenseRepository,
  ReportRepository,
  SalesInvoice,
  SalesInvoiceLine,
  InvoiceStatus,
  StockMovement,
  StockBalance,
  PartyLedgerEntry,
  OutboxEvent,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseBill,
  Payment,
  PaymentAllocation,
  Product,
  ProductCategory,
  UnitOfMeasure,
  TaxCategory,
  InventoryLocation,
  StockAdjustment,
  StockTransfer,
  Party,
  PartyType,
  Expense,
  ExpenseCategory,
  DashboardMetrics,
  EntityId,
} from '@vyapaarkhata/domain';

function ensureUuid(id: string): string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id) ? id : randomUUID();
}

export class PgUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async runInTransaction<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    const client: PoolClient = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // -----------------------------------------------------------------------
      // Invoices Repository
      // -----------------------------------------------------------------------
      const invoiceRepo: InvoiceRepository = {
        findById: async (tenantId: EntityId, id: EntityId): Promise<SalesInvoice | null> => {
          const invRes = await client.query(
            `SELECT id, tenant_id, invoice_number, party_id, business_location_id, status, subtotal, tax_amount, total_amount, posted_at, created_at
             FROM sales_invoices
             WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
          );

          if (invRes.rows.length === 0) return null;
          const r = invRes.rows[0];

          const locRes = await client.query(
            `SELECT id FROM inventory_locations
             WHERE tenant_id = $1 AND business_location_id = $2 AND is_active = true
             ORDER BY is_default DESC LIMIT 1`,
            [tenantId, r.business_location_id]
          );
          const defaultInventoryLocationId = locRes.rows[0]?.id || r.business_location_id;

          const linesRes = await client.query(
            `SELECT id, invoice_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
             FROM sales_invoice_lines
             WHERE invoice_id = $1`,
            [id]
          );

          const lines: SalesInvoiceLine[] = linesRes.rows.map((l) => ({
            id: l.id,
            productId: l.variant_id,
            variantId: l.variant_id || undefined,
            locationId: defaultInventoryLocationId,
            quantity: parseFloat(l.quantity),
            unitId: l.unit_id,
            unitPrice: parseFloat(l.unit_price),
            taxAmount: parseFloat(l.tax_amount || '0'),
            lineTotal: parseFloat(l.line_total),
          }));

          return {
            id: r.id,
            tenantId: r.tenant_id,
            businessLocationId: r.business_location_id,
            invoiceNumber: r.invoice_number,
            customerId: r.party_id,
            status: r.status as InvoiceStatus,
            subtotal: parseFloat(r.subtotal || '0'),
            taxTotal: parseFloat(r.tax_amount || '0'),
            grandTotal: parseFloat(r.total_amount || '0'),
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            lines,
          };
        },

        list: async (tenantId: EntityId, limit: number = 50): Promise<SalesInvoice[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, invoice_number, party_id, business_location_id, status, subtotal, tax_amount, total_amount, posted_at, created_at
             FROM sales_invoices
             WHERE tenant_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [tenantId, limit]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            businessLocationId: r.business_location_id,
            invoiceNumber: r.invoice_number,
            customerId: r.party_id,
            status: r.status as InvoiceStatus,
            subtotal: parseFloat(r.subtotal || '0'),
            taxTotal: parseFloat(r.tax_amount || '0'),
            grandTotal: parseFloat(r.total_amount || '0'),
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            lines: [],
          }));
        },

        save: async (invoice: SalesInvoice): Promise<void> => {
          const businessLocationId = invoice.businessLocationId || invoice.lines[0]?.locationId;
          const invoiceId = ensureUuid(invoice.id);

          await client.query(
            `INSERT INTO sales_invoices (
               id, tenant_id, party_id, business_location_id, invoice_number, invoice_date, status, subtotal, tax_amount, total_amount, posted_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               posted_at = EXCLUDED.posted_at`,
            [
              invoiceId,
              invoice.tenantId,
              invoice.customerId,
              businessLocationId,
              invoice.invoiceNumber,
              invoice.status,
              invoice.subtotal,
              invoice.taxTotal,
              invoice.grandTotal,
              invoice.postedAt || null,
            ]
          );

          for (const line of invoice.lines) {
            await client.query(
              `INSERT INTO sales_invoice_lines (
                 id, invoice_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING`,
              [
                ensureUuid(line.id),
                invoiceId,
                line.variantId || line.productId,
                line.unitId,
                line.quantity,
                line.unitPrice,
                line.taxAmount,
                line.lineTotal,
              ]
            );
          }
        },

        updateStatus: async (
          tenantId: EntityId,
          id: EntityId,
          status: InvoiceStatus,
          timestamp: string
        ): Promise<void> => {
          const field = status === 'posted' ? 'posted_at' : 'updated_at';
          await client.query(
            `UPDATE sales_invoices SET status = $1, ${field} = $2 WHERE tenant_id = $3 AND id = $4`,
            [status, timestamp, tenantId, id]
          );
        },
      };

      // -----------------------------------------------------------------------
      // Products & Master Catalog Repository
      // -----------------------------------------------------------------------
      const productRepo: ProductRepository = {
        list: async (tenantId: EntityId, categoryId?: EntityId): Promise<Product[]> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.category_id, c.name as category_name, p.product_type, p.name, p.description,
                    p.brand_name, p.hsn_sac_code, p.base_unit_id, u.name as unit_name, u.symbol as unit_symbol,
                    p.is_stock_tracked, p.tracking_method, p.valuation_method, p.is_active, p.created_at,
                    COALESCE(SUM(sb.quantity_on_hand), 0) as total_stock,
                    MIN(pv.purchase_price) as purchase_price,
                    MIN(pv.selling_price) as selling_price,
                    MIN(pv.sku) as sku,
                    MIN(pv.barcode) as barcode,
                    MIN(COALESCE(pv.reorder_level::numeric, 0)) as reorder_level
             FROM products p
             LEFT JOIN product_categories c ON c.id = p.category_id
             LEFT JOIN units u ON u.id = p.base_unit_id
             LEFT JOIN product_variants pv ON pv.product_id = p.id
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
             WHERE p.tenant_id = $1 AND ($2::uuid IS NULL OR p.category_id = $2)
             GROUP BY p.id, c.name, u.name, u.symbol
             ORDER BY p.name ASC`,
            [tenantId, categoryId || null]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            name: r.name,
            description: r.description || undefined,
            categoryId: r.category_id || undefined,
            categoryName: r.category_name || undefined,
            productType: r.product_type as 'goods' | 'service',
            sku: r.sku || undefined,
            barcode: r.barcode || undefined,
            hsnSacCode: r.hsn_sac_code || undefined,
            baseUnitId: r.base_unit_id,
            baseUnitName: r.unit_name || undefined,
            baseUnitSymbol: r.unit_symbol || undefined,
            isTaxInclusive: false,
            purchasePrice: parseFloat(r.purchase_price || '0'),
            sellingPrice: parseFloat(r.selling_price || '0'),
            reorderLevel: parseFloat(r.reorder_level || '0'),
            isStockTracked: r.is_stock_tracked,
            trackingMethod: r.tracking_method,
            valuationMethod: r.valuation_method,
            isActive: r.is_active,
            totalStock: parseFloat(r.total_stock || '0'),
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        findById: async (tenantId: EntityId, id: EntityId): Promise<Product | null> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.category_id, c.name as category_name, p.product_type, p.name, p.description,
                    p.brand_name, p.hsn_sac_code, p.base_unit_id, u.name as unit_name, u.symbol as unit_symbol,
                    p.is_stock_tracked, p.tracking_method, p.valuation_method, p.is_active, p.created_at
             FROM products p
             LEFT JOIN product_categories c ON c.id = p.category_id
             LEFT JOIN units u ON u.id = p.base_unit_id
             WHERE p.tenant_id = $1 AND p.id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];

          const variantsRes = await client.query(
            `SELECT pv.id, pv.product_id, pv.sku, pv.barcode, pv.variant_name, pv.purchase_price, pv.selling_price, pv.mrp, pv.reorder_level, pv.is_active,
                    COALESCE(sb.quantity_on_hand, 0) as stock_on_hand
             FROM product_variants pv
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
             WHERE pv.tenant_id = $1 AND pv.product_id = $2`,
            [tenantId, id]
          );

          const variants = variantsRes.rows.map((v) => ({
            id: v.id,
            tenantId,
            productId: v.product_id,
            sku: v.sku || '',
            barcode: v.barcode || undefined,
            variantName: v.variant_name || 'Standard',
            purchasePrice: parseFloat(v.purchase_price || '0'),
            sellingPrice: parseFloat(v.selling_price || '0'),
            mrp: v.mrp ? parseFloat(v.mrp) : undefined,
            reorderLevel: v.reorder_level ? parseFloat(v.reorder_level) : undefined,
            isActive: v.is_active,
            stockOnHand: parseFloat(v.stock_on_hand || '0'),
            createdAt: new Date().toISOString(),
          }));

          return {
            id: r.id,
            tenantId: r.tenant_id,
            name: r.name,
            description: r.description || undefined,
            categoryId: r.category_id || undefined,
            categoryName: r.category_name || undefined,
            productType: r.product_type,
            hsnSacCode: r.hsn_sac_code || undefined,
            baseUnitId: r.base_unit_id,
            baseUnitName: r.unit_name || undefined,
            baseUnitSymbol: r.unit_symbol || undefined,
            isTaxInclusive: false,
            purchasePrice: variants[0]?.purchasePrice || 0,
            sellingPrice: variants[0]?.sellingPrice || 0,
            reorderLevel: variants[0]?.reorderLevel || 0,
            isStockTracked: r.is_stock_tracked,
            trackingMethod: r.tracking_method,
            valuationMethod: r.valuation_method,
            isActive: r.is_active,
            variants,
            createdAt: new Date(r.created_at).toISOString(),
          };
        },

        save: async (product: Product): Promise<void> => {
          const productId = ensureUuid(product.id);
          await client.query(
            `INSERT INTO products (
               id, tenant_id, category_id, product_type, name, description, is_stock_tracked, tracking_method, valuation_method, base_unit_id, hsn_sac_code, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
             ON CONFLICT (id) DO UPDATE SET
               category_id = EXCLUDED.category_id,
               name = EXCLUDED.name,
               description = EXCLUDED.description,
               base_unit_id = EXCLUDED.base_unit_id,
               hsn_sac_code = EXCLUDED.hsn_sac_code,
               is_active = EXCLUDED.is_active,
               updated_at = NOW()`,
            [
              productId,
              product.tenantId,
              product.categoryId ? ensureUuid(product.categoryId) : null,
              product.productType || 'goods',
              product.name,
              product.description || null,
              product.isStockTracked !== false,
              product.trackingMethod || 'none',
              product.valuationMethod || 'fifo',
              product.baseUnitId ? ensureUuid(product.baseUnitId) : '10000000-0000-0000-0000-000000000001',
              product.hsnSacCode || null,
              product.isActive !== false,
            ]
          );

          // Ensure default variant exists
          const variantId = product.variants?.[0]?.id ? ensureUuid(product.variants[0].id) : randomUUID();
          await client.query(
            `INSERT INTO product_variants (
               id, tenant_id, product_id, sku, barcode, variant_name, purchase_price, selling_price, mrp, reorder_level, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT (id) DO UPDATE SET
               sku = EXCLUDED.sku,
               barcode = EXCLUDED.barcode,
               purchase_price = EXCLUDED.purchase_price,
               selling_price = EXCLUDED.selling_price,
               mrp = EXCLUDED.mrp,
               reorder_level = EXCLUDED.reorder_level,
               updated_at = NOW()`,
            [
              variantId,
              product.tenantId,
              productId,
              product.sku || product.variants?.[0]?.sku || `SKU-${product.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
              product.barcode || product.variants?.[0]?.barcode || null,
              product.variants?.[0]?.variantName || 'Standard',
              product.purchasePrice || 0,
              product.sellingPrice || 0,
              product.mrp ? String(product.mrp) : null,
              product.reorderLevel ? String(product.reorderLevel) : '0',
              product.isActive !== false,
            ]
          );
        },

        listCategories: async (tenantId: EntityId): Promise<ProductCategory[]> => {
          const res = await client.query(
            `SELECT c.id, c.tenant_id, c.parent_id, c.name, c.code, c.description, c.is_active, c.created_at,
                    COUNT(p.id) as product_count
             FROM product_categories c
             LEFT JOIN products p ON p.category_id = c.id
             WHERE c.tenant_id = $1
             GROUP BY c.id
             ORDER BY c.name ASC`,
            [tenantId]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            parentId: r.parent_id || undefined,
            name: r.name,
            code: r.code || undefined,
            description: r.description || undefined,
            isActive: r.is_active,
            productCount: parseInt(r.product_count, 10),
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        saveCategory: async (category: ProductCategory): Promise<void> => {
          await client.query(
            `INSERT INTO product_categories (
               id, tenant_id, parent_id, name, code, description, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               code = EXCLUDED.code,
               description = EXCLUDED.description,
               is_active = EXCLUDED.is_active,
               updated_at = NOW()`,
            [
              ensureUuid(category.id),
              category.tenantId,
              category.parentId ? ensureUuid(category.parentId) : null,
              category.name,
              category.code || null,
              category.description || null,
              category.isActive !== false,
            ]
          );
        },

        listUnits: async (): Promise<UnitOfMeasure[]> => {
          const res = await client.query(
            `SELECT id, name, symbol, dimension, is_active FROM units WHERE is_active = true ORDER BY name ASC`
          );
          return res.rows.map((r) => ({
            id: r.id,
            name: r.name,
            symbol: r.symbol,
            unitType: r.dimension || undefined,
            isActive: r.is_active,
          }));
        },

        listTaxCategories: async (tenantId: EntityId): Promise<TaxCategory[]> => {
          const res = await client.query(
            `SELECT tc.id, tc.tenant_id, tc.name, tc.code, tc.tax_type, tc.is_exempt,
                    tr.id as rate_id, tr.name as rate_name, tr.rate_percentage
             FROM tax_categories tc
             LEFT JOIN tax_rates tr ON tr.tax_category_id = tc.id AND tr.is_active = true
             WHERE tc.tenant_id = $1 OR tc.tenant_id = '00000000-0000-0000-0000-000000000001'
             ORDER BY tc.name ASC`,
            [tenantId]
          );

          const map = new Map<string, TaxCategory>();
          for (const row of res.rows) {
            if (!map.has(row.id)) {
              map.set(row.id, {
                id: row.id,
                tenantId: row.tenant_id,
                name: row.name,
                code: row.code,
                taxType: row.tax_type,
                isExempt: row.is_exempt,
                rates: [],
              });
            }
            if (row.rate_id) {
              map.get(row.id)!.rates!.push({
                id: row.rate_id,
                taxCategoryId: row.id,
                name: row.rate_name,
                ratePercentage: parseFloat(row.rate_percentage),
                isActive: true,
              });
            }
          }
          return Array.from(map.values());
        },
      };

      // -----------------------------------------------------------------------
      // Inventory Repository
      // -----------------------------------------------------------------------
      const inventoryRepo: InventoryRepository = {
        getBalance: async (
          tenantId: EntityId,
          productId: EntityId,
          locationId: EntityId
        ): Promise<StockBalance | null> => {
          const res = await client.query(
            `SELECT id, tenant_id, variant_id, inventory_location_id, quantity_on_hand, quantity_available, updated_at
             FROM stock_balances
             WHERE tenant_id = $1 AND variant_id = $2 AND inventory_location_id = $3
             FOR UPDATE`,
            [tenantId, productId, locationId]
          );

          if (res.rows.length === 0) return null;
          const r = res.rows[0];

          return {
            id: r.id,
            tenantId: r.tenant_id,
            productId: r.variant_id,
            variantId: r.variant_id,
            locationId: r.inventory_location_id,
            currentBalance: parseFloat(r.quantity_on_hand),
            updatedAt: new Date(r.updated_at).toISOString(),
          };
        },

        listBalances: async (tenantId: EntityId, locationId?: EntityId): Promise<StockBalance[]> => {
          const res = await client.query(
            `SELECT sb.id, sb.tenant_id, sb.variant_id, sb.inventory_location_id,
                    sb.quantity_on_hand, sb.quantity_available, sb.updated_at,
                    COALESCE(pv.reorder_level::numeric, 0) as reorder_level
             FROM stock_balances sb
             JOIN product_variants pv ON pv.id = sb.variant_id
             WHERE sb.tenant_id = $1 AND ($2::uuid IS NULL OR sb.inventory_location_id = $2)
             ORDER BY sb.updated_at DESC`,
            [tenantId, locationId || null]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            productId: r.variant_id,
            variantId: r.variant_id,
            locationId: r.inventory_location_id,
            currentBalance: parseFloat(r.quantity_on_hand),
            reorderLevel: parseFloat(r.reorder_level || '0'),
            updatedAt: new Date(r.updated_at).toISOString(),
          }));
        },

        recordMovement: async (movement: StockMovement): Promise<void> => {
          await client.query(
            `INSERT INTO stock_movements (
               id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              ensureUuid(movement.id),
              movement.tenantId,
              movement.locationId,
              movement.variantId || movement.productId,
              movement.movementType,
              movement.quantity,
              movement.unitId,
              movement.referenceDocumentType,
              ensureUuid(movement.referenceDocumentId),
              movement.createdAt,
              movement.createdAt,
            ]
          );
        },

        listMovements: async (tenantId: EntityId, limit: number = 50): Promise<StockMovement[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, inventory_location_id, variant_id, unit_id, movement_type, quantity, reference_type, reference_id, created_at
             FROM stock_movements
             WHERE tenant_id = $1
             ORDER BY created_at DESC
             LIMIT $2`,
            [tenantId, limit]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            locationId: r.inventory_location_id,
            productId: r.variant_id,
            variantId: r.variant_id,
            unitId: r.unit_id,
            movementType: r.movement_type,
            quantity: parseFloat(r.quantity),
            referenceDocumentType: r.reference_type,
            referenceDocumentId: r.reference_id,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        updateBalance: async (balance: StockBalance): Promise<void> => {
          await client.query(
            `INSERT INTO stock_balances (
               id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $5, $6)
             ON CONFLICT (id) DO UPDATE SET
               quantity_on_hand = EXCLUDED.quantity_on_hand,
               quantity_available = EXCLUDED.quantity_available,
               updated_at = EXCLUDED.updated_at`,
            [
              ensureUuid(balance.id),
              balance.tenantId,
              balance.locationId,
              balance.variantId || balance.productId,
              balance.currentBalance,
              balance.updatedAt,
            ]
          );
        },

        listMovementsByDocument: async (
          tenantId: EntityId,
          documentId: EntityId
        ): Promise<StockMovement[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, inventory_location_id, variant_id, unit_id, movement_type, quantity, reference_type, reference_id, created_at
             FROM stock_movements
             WHERE tenant_id = $1 AND reference_id = $2`,
            [tenantId, documentId]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            locationId: r.inventory_location_id,
            productId: r.variant_id,
            variantId: r.variant_id,
            unitId: r.unit_id,
            movementType: r.movement_type,
            quantity: parseFloat(r.quantity),
            referenceDocumentType: r.reference_type,
            referenceDocumentId: r.reference_id,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        listLocations: async (tenantId: EntityId): Promise<InventoryLocation[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, business_location_id, name, code, is_default, is_active, created_at
             FROM inventory_locations
             WHERE tenant_id = $1 AND is_active = true
             ORDER BY is_default DESC, name ASC`,
            [tenantId]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            businessLocationId: r.business_location_id,
            name: r.name,
            code: r.code,
            isDefault: r.is_default,
            isActive: r.is_active,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        saveLocation: async (location: InventoryLocation): Promise<void> => {
          await client.query(
            `INSERT INTO inventory_locations (
               id, tenant_id, business_location_id, name, code, is_default, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
             ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name,
               code = EXCLUDED.code,
               is_default = EXCLUDED.is_default,
               is_active = EXCLUDED.is_active,
               updated_at = NOW()`,
            [
              ensureUuid(location.id),
              location.tenantId,
              ensureUuid(location.businessLocationId || 'b0000000-0000-0000-0000-000000000000'),
              location.name,
              location.code,
              location.isDefault,
              location.isActive !== false,
            ]
          );
        },

        saveAdjustment: async (adjustment: StockAdjustment): Promise<void> => {
          const adjId = ensureUuid(adjustment.id);
          for (const line of adjustment.lines) {
            const movementQty = line.adjustmentType === 'increase' ? line.quantity : -line.quantity;
            await client.query(
              `INSERT INTO stock_movements (
                 id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [
                randomUUID(),
                adjustment.tenantId,
                adjustment.inventoryLocationId,
                line.variantId,
                line.adjustmentType === 'increase' ? 'adjustment_in' : 'adjustment_out',
                movementQty,
                line.unitId,
                'inventory_adjustment',
                adjId,
              ]
            );

            // Upsert stock balance
            await client.query(
              `INSERT INTO stock_balances (
                 id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at
               ) VALUES ($1, $2, $3, $4, $5, $5, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 quantity_on_hand = stock_balances.quantity_on_hand + EXCLUDED.quantity_on_hand,
                 quantity_available = stock_balances.quantity_available + EXCLUDED.quantity_available,
                 updated_at = NOW()`,
              [
                randomUUID(),
                adjustment.tenantId,
                adjustment.inventoryLocationId,
                line.variantId,
                movementQty,
              ]
            );
          }
        },

        saveTransfer: async (transfer: StockTransfer): Promise<void> => {
          const transferId = ensureUuid(transfer.id);
          for (const line of transfer.lines) {
            // Transfer Out from source
            await client.query(
              `INSERT INTO stock_movements (
                 id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
               ) VALUES ($1, $2, $3, $4, 'transfer_out', $5, $6, 'stock_transfer', $7, NOW(), NOW())`,
              [randomUUID(), transfer.tenantId, transfer.sourceLocationId, line.variantId, -line.quantity, line.unitId, transferId]
            );

            // Transfer In to destination
            await client.query(
              `INSERT INTO stock_movements (
                 id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
               ) VALUES ($1, $2, $3, $4, 'transfer_in', $5, $6, 'stock_transfer', $7, NOW(), NOW())`,
              [randomUUID(), transfer.tenantId, transfer.destinationLocationId, line.variantId, line.quantity, line.unitId, transferId]
            );

            // Deduct from source
            await client.query(
              `UPDATE stock_balances
               SET quantity_on_hand = quantity_on_hand - $1, quantity_available = quantity_available - $1, updated_at = NOW()
               WHERE tenant_id = $2 AND inventory_location_id = $3 AND variant_id = $4`,
              [line.quantity, transfer.tenantId, transfer.sourceLocationId, line.variantId]
            );

            // Add to destination
            await client.query(
              `INSERT INTO stock_balances (
                 id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, updated_at
               ) VALUES ($1, $2, $3, $4, $5, $5, NOW())
               ON CONFLICT (id) DO UPDATE SET
                 quantity_on_hand = stock_balances.quantity_on_hand + EXCLUDED.quantity_on_hand,
                 quantity_available = stock_balances.quantity_available + EXCLUDED.quantity_available,
                 updated_at = NOW()`,
              [randomUUID(), transfer.tenantId, transfer.destinationLocationId, line.variantId, line.quantity]
            );
          }
        },
      };

      // -----------------------------------------------------------------------
      // Parties & CRM Repository
      // -----------------------------------------------------------------------
      const partyRepo: PartyRepository = {
        list: async (tenantId: EntityId, partyType?: PartyType): Promise<Party[]> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.party_type, p.display_name, p.legal_name, p.gstin, p.pan, p.email, p.phone, p.is_active, p.created_at,
                    COALESCE(SUM(ple.debit_amount - ple.credit_amount), 0) as current_balance
             FROM parties p
             LEFT JOIN party_ledger_entries ple ON ple.party_id = p.id
             WHERE p.tenant_id = $1 AND ($2::varchar IS NULL OR p.party_type = $2 OR p.party_type = 'both')
             GROUP BY p.id
             ORDER BY p.display_name ASC`,
            [tenantId, partyType || null]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            partyType: r.party_type as PartyType,
            displayName: r.display_name,
            legalName: r.legal_name || undefined,
            gstin: r.gstin || undefined,
            pan: r.pan || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            openingBalance: 0,
            openingBalanceType: 'debit',
            currentBalance: parseFloat(r.current_balance || '0'),
            isActive: r.is_active,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        findById: async (tenantId: EntityId, id: EntityId): Promise<Party | null> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.party_type, p.display_name, p.legal_name, p.gstin, p.pan, p.email, p.phone, p.is_active, p.created_at,
                    COALESCE(SUM(ple.debit_amount - ple.credit_amount), 0) as current_balance
             FROM parties p
             LEFT JOIN party_ledger_entries ple ON ple.party_id = p.id
             WHERE p.tenant_id = $1 AND p.id = $2
             GROUP BY p.id`,
            [tenantId, id]
          );

          if (res.rows.length === 0) return null;
          const r = res.rows[0];

          return {
            id: r.id,
            tenantId: r.tenant_id,
            partyType: r.party_type as PartyType,
            displayName: r.display_name,
            legalName: r.legal_name || undefined,
            gstin: r.gstin || undefined,
            pan: r.pan || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            openingBalance: 0,
            openingBalanceType: 'debit',
            currentBalance: parseFloat(r.current_balance || '0'),
            isActive: r.is_active,
            createdAt: new Date(r.created_at).toISOString(),
          };
        },

        save: async (party: Party): Promise<void> => {
          await client.query(
            `INSERT INTO parties (
               id, tenant_id, party_type, display_name, legal_name, gstin, pan, email, phone, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (id) DO UPDATE SET
               party_type = EXCLUDED.party_type,
               display_name = EXCLUDED.display_name,
               legal_name = EXCLUDED.legal_name,
               gstin = EXCLUDED.gstin,
               pan = EXCLUDED.pan,
               email = EXCLUDED.email,
               phone = EXCLUDED.phone,
               is_active = EXCLUDED.is_active,
               updated_at = NOW()`,
            [
              ensureUuid(party.id),
              party.tenantId,
              party.partyType,
              party.displayName,
              party.legalName || null,
              party.gstin || null,
              party.pan || null,
              party.email || null,
              party.phone || null,
              party.isActive !== false,
            ]
          );
        },

        getBalance: async (tenantId: EntityId, partyId: EntityId): Promise<number> => {
          const res = await client.query(
            `SELECT COALESCE(SUM(debit_amount - credit_amount), 0) as balance
             FROM party_ledger_entries
             WHERE tenant_id = $1 AND party_id = $2`,
            [tenantId, partyId]
          );
          return parseFloat(res.rows[0]?.balance || '0');
        },

        listLedgerEntries: async (tenantId: EntityId, partyId: EntityId): Promise<PartyLedgerEntry[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, party_id, document_type, document_id, debit_amount, credit_amount, created_at
             FROM party_ledger_entries
             WHERE tenant_id = $1 AND party_id = $2
             ORDER BY created_at DESC`,
            [tenantId, partyId]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            partyId: r.party_id,
            entryType: parseFloat(r.debit_amount) > 0 ? 'debit' : 'credit',
            amount: parseFloat(r.debit_amount) > 0 ? parseFloat(r.debit_amount) : parseFloat(r.credit_amount),
            referenceDocumentType: r.document_type,
            referenceDocumentId: r.document_id,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },
      };

      // -----------------------------------------------------------------------
      // Party Ledger Repository
      // -----------------------------------------------------------------------
      const partyLedgerRepo: PartyLedgerRepository = {
        recordEntry: async (entry: PartyLedgerEntry): Promise<void> => {
          await client.query(
            `INSERT INTO party_ledger_entries (
               id, tenant_id, party_id, entry_date, document_type, document_id, debit_amount, credit_amount, created_at
             ) VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6, $7, $8)`,
            [
              ensureUuid(entry.id),
              entry.tenantId,
              entry.partyId,
              entry.referenceDocumentType,
              ensureUuid(entry.referenceDocumentId),
              entry.entryType === 'debit' ? entry.amount : 0,
              entry.entryType === 'credit' ? entry.amount : 0,
              entry.createdAt,
            ]
          );
        },

        listEntriesByDocument: async (
          tenantId: EntityId,
          documentId: EntityId
        ): Promise<PartyLedgerEntry[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, party_id, document_type, document_id, debit_amount, credit_amount, created_at
             FROM party_ledger_entries
             WHERE tenant_id = $1 AND document_id = $2`,
            [tenantId, documentId]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            partyId: r.party_id,
            entryType: parseFloat(r.debit_amount) > 0 ? 'debit' : 'credit',
            amount: parseFloat(r.debit_amount) > 0 ? parseFloat(r.debit_amount) : parseFloat(r.credit_amount),
            referenceDocumentType: r.document_type,
            referenceDocumentId: r.document_id,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },
      };

      // -----------------------------------------------------------------------
      // Outbox Repository
      // -----------------------------------------------------------------------
      const outboxRepo: OutboxRepository = {
        recordEvent: async (event: OutboxEvent): Promise<void> => {
          const payload = event.payload;
          const invoiceId = payload['invoiceId'] ? String(payload['invoiceId']) : undefined;
          const billId = payload['billId'] ? String(payload['billId']) : undefined;
          const receiptId = payload['receiptId'] ? String(payload['receiptId']) : undefined;
          const paymentId = payload['paymentId'] ? String(payload['paymentId']) : undefined;

          const aggregateId = invoiceId || billId || receiptId || paymentId || ensureUuid(event.id);
          const aggregateType = event.eventType.split('.')[0] || 'system';

          await client.query(
            `INSERT INTO sync_outbox (
               id, tenant_id, installation_id, aggregate_type, aggregate_id, event_type, payload, status, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)`,
            [
              ensureUuid(event.id),
              event.tenantId,
              ensureUuid('00000000-0000-0000-0000-000000000001'),
              aggregateType,
              aggregateId,
              event.eventType,
              JSON.stringify(event.payload),
              event.createdAt,
            ]
          );
        },
      };

      // -----------------------------------------------------------------------
      // Purchasing Repository
      // -----------------------------------------------------------------------
      const purchasingRepo: PurchasingRepository = {
        listOrders: async (tenantId: EntityId): Promise<PurchaseOrder[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, business_location_id, order_number, status, subtotal, tax_amount, total_amount, created_at
             FROM purchase_orders WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
            businessLocationId: r.business_location_id,
            orderNumber: r.order_number,
            status: r.status,
            subtotal: parseFloat(r.subtotal || '0'),
            taxAmount: parseFloat(r.tax_amount || '0'),
            totalAmount: parseFloat(r.total_amount || '0'),
            lines: [],
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        findOrderById: async (tenantId: EntityId, id: EntityId) => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, business_location_id, order_number, status, subtotal, tax_amount, total_amount, created_at
             FROM purchase_orders WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const linesRes = await client.query(
            `SELECT id, purchase_order_id, variant_id, unit_id, quantity, received_quantity, unit_price, tax_amount, line_total
             FROM purchase_order_lines WHERE purchase_order_id = $1`,
            [id]
          );
          return {
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
            businessLocationId: r.business_location_id,
            orderNumber: r.order_number,
            status: r.status,
            subtotal: parseFloat(r.subtotal || '0'),
            taxAmount: parseFloat(r.tax_amount || '0'),
            totalAmount: parseFloat(r.total_amount || '0'),
            createdAt: new Date(r.created_at).toISOString(),
            lines: linesRes.rows.map((l: any) => ({
              id: l.id,
              variantId: l.variant_id,
              quantity: parseFloat(l.quantity),
              receivedQuantity: parseFloat(l.received_quantity || '0'),
              unitId: l.unit_id,
              unitPrice: parseFloat(l.unit_price),
              taxAmount: parseFloat(l.tax_amount || '0'),
              lineTotal: parseFloat(l.line_total),
            })),
          };
        },

        saveOrder: async (order: PurchaseOrder) => {
          const orderId = ensureUuid(order.id);
          await client.query(
            `INSERT INTO purchase_orders (
               id, tenant_id, supplier_id, business_location_id, order_number, order_date, status, subtotal, tax_amount, total_amount, created_at
             ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE, $6, $7, $8, $9, NOW())
             ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
            [
              orderId,
              order.tenantId,
              order.supplierId,
              order.businessLocationId,
              order.orderNumber,
              order.status,
              order.subtotal,
              order.taxAmount,
              order.totalAmount,
            ]
          );
          for (const line of order.lines) {
            await client.query(
              `INSERT INTO purchase_order_lines (
                 id, purchase_order_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING`,
              [ensureUuid(line.id), orderId, line.variantId, line.unitId, line.quantity, line.unitPrice, line.taxAmount, line.lineTotal]
            );
          }
        },

        listReceipts: async (tenantId: EntityId): Promise<PurchaseReceipt[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, business_location_id, inventory_location_id, receipt_number, status, posted_at, created_at
             FROM purchase_receipts WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
            businessLocationId: r.business_location_id,
            inventoryLocationId: r.inventory_location_id,
            receiptNumber: r.receipt_number,
            status: r.status,
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            lines: [],
          }));
        },

        findReceiptById: async (tenantId: EntityId, id: EntityId) => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, business_location_id, inventory_location_id, purchase_order_id, receipt_number, status, posted_at, created_at
             FROM purchase_receipts WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const linesRes = await client.query(
            `SELECT id, purchase_receipt_id, purchase_order_line_id, variant_id, unit_id, received_quantity, accepted_quantity, rejected_quantity, unit_cost
             FROM purchase_receipt_lines WHERE purchase_receipt_id = $1`,
            [id]
          );
          return {
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
            purchaseOrderId: r.purchase_order_id || undefined,
            inventoryLocationId: r.inventory_location_id,
            receiptNumber: r.receipt_number,
            status: r.status,
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            lines: linesRes.rows.map((l: any) => ({
              id: l.id,
              purchaseOrderLineId: l.purchase_order_line_id || undefined,
              variantId: l.variant_id,
              unitId: l.unit_id,
              receivedQuantity: parseFloat(l.received_quantity),
              acceptedQuantity: parseFloat(l.accepted_quantity),
              rejectedQuantity: parseFloat(l.rejected_quantity || '0'),
              unitCost: parseFloat(l.unit_cost || '0'),
            })),
          };
        },

        saveReceipt: async (receipt: any) => {
          await client.query(
            `UPDATE purchase_receipts SET status = $1, posted_at = $2 WHERE tenant_id = $3 AND id = $4`,
            [receipt.status, receipt.postedAt || null, receipt.tenantId, receipt.id]
          );
        },

        listBills: async (tenantId: EntityId): Promise<PurchaseBill[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, business_location_id, bill_number, supplier_invoice_number, status, subtotal, tax_amount, total_amount, amount_paid, posted_at, created_at
             FROM purchase_bills WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
            businessLocationId: r.business_location_id,
            billNumber: r.bill_number,
            supplierInvoiceNumber: r.supplier_invoice_number || undefined,
            status: r.status,
            subtotal: parseFloat(r.subtotal || '0'),
            taxAmount: parseFloat(r.tax_amount || '0'),
            totalAmount: parseFloat(r.total_amount || '0'),
            amountPaid: parseFloat(r.amount_paid || '0'),
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            lines: [],
          }));
        },

        findBillById: async (tenantId: EntityId, id: EntityId) => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, business_location_id, bill_number, supplier_invoice_number, status, subtotal, tax_amount, total_amount, amount_paid, posted_at, created_at
             FROM purchase_bills WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const linesRes = await client.query(
            `SELECT id, purchase_bill_id, purchase_receipt_line_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
             FROM purchase_bill_lines WHERE purchase_bill_id = $1`,
            [id]
          );
          return {
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
            businessLocationId: r.business_location_id,
            billNumber: r.bill_number,
            supplierInvoiceNumber: r.supplier_invoice_number || undefined,
            status: r.status,
            subtotal: parseFloat(r.subtotal || '0'),
            taxAmount: parseFloat(r.tax_amount || '0'),
            totalAmount: parseFloat(r.total_amount || '0'),
            amountPaid: parseFloat(r.amount_paid || '0'),
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            lines: linesRes.rows.map((l: any) => ({
              id: l.id,
              purchaseReceiptLineId: l.purchase_receipt_line_id || undefined,
              variantId: l.variant_id,
              unitId: l.unit_id,
              quantity: parseFloat(l.quantity),
              unitPrice: parseFloat(l.unit_price),
              taxAmount: parseFloat(l.tax_amount || '0'),
              lineTotal: parseFloat(l.line_total),
            })),
          };
        },

        saveBill: async (bill: any) => {
          await client.query(
            `UPDATE purchase_bills SET status = $1, posted_at = $2 WHERE tenant_id = $3 AND id = $4`,
            [bill.status, bill.postedAt || null, bill.tenantId, bill.id]
          );
        },
      };

      // -----------------------------------------------------------------------
      // Payments Repository
      // -----------------------------------------------------------------------
      const paymentRepo: PaymentRepository = {
        list: async (tenantId: EntityId): Promise<Payment[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, party_id, financial_account_id, payment_method_id, payment_number, direction, status, amount, reference_number, posted_at, created_at
             FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            partyId: r.party_id,
            financialAccountId: r.financial_account_id || undefined,
            paymentMethodId: r.payment_method_id || undefined,
            paymentNumber: r.payment_number,
            direction: r.direction,
            status: r.status,
            amount: parseFloat(r.amount),
            referenceNumber: r.reference_number || undefined,
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            allocations: [],
          }));
        },

        findPaymentById: async (tenantId: EntityId, id: EntityId) => {
          const res = await client.query(
            `SELECT id, tenant_id, party_id, financial_account_id, payment_method_id, payment_number, direction, status, amount, reference_number, posted_at, created_at
             FROM payments WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const allocRes = await client.query(
            `SELECT id, payment_id, document_type, document_id, allocated_amount, created_at
             FROM payment_allocations WHERE payment_id = $1`,
            [id]
          );
          return {
            id: r.id,
            tenantId: r.tenant_id,
            partyId: r.party_id,
            financialAccountId: r.financial_account_id || undefined,
            paymentMethodId: r.payment_method_id || undefined,
            paymentNumber: r.payment_number,
            direction: r.direction,
            status: r.status,
            amount: parseFloat(r.amount),
            referenceNumber: r.reference_number || undefined,
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            allocations: allocRes.rows.map((a: any) => ({
              id: a.id,
              tenantId: r.tenant_id,
              paymentId: a.payment_id,
              documentType: a.document_type,
              documentId: a.document_id,
              allocatedAmount: parseFloat(a.allocated_amount),
              createdAt: new Date(a.created_at).toISOString(),
            })),
          };
        },

        savePayment: async (payment: any) => {
          await client.query(
            `INSERT INTO payments (
               id, tenant_id, party_id, financial_account_id, payment_method_id, payment_number, payment_date, direction, status, amount, reference_number, posted_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, $10, $11, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               posted_at = EXCLUDED.posted_at`,
            [
              ensureUuid(payment.id),
              payment.tenantId,
              payment.partyId,
              payment.financialAccountId ? ensureUuid(payment.financialAccountId) : null,
              payment.paymentMethodId ? ensureUuid(payment.paymentMethodId) : null,
              payment.paymentNumber,
              payment.direction,
              payment.status,
              payment.amount,
              payment.referenceNumber || null,
              payment.postedAt || null,
            ]
          );
        },

        recordAllocation: async (alloc: any) => {
          await client.query(
            `INSERT INTO payment_allocations (
               id, tenant_id, payment_id, document_type, document_id, allocated_amount, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
            [
              ensureUuid(alloc.id),
              alloc.tenantId,
              ensureUuid(alloc.paymentId),
              alloc.documentType,
              ensureUuid(alloc.documentId),
              alloc.allocatedAmount,
            ]
          );
        },
      };

      // -----------------------------------------------------------------------
      // Expenses Repository
      // -----------------------------------------------------------------------
      const expenseRepo: ExpenseRepository = {
        list: async (tenantId: EntityId): Promise<Expense[]> => {
          const res = await client.query(
            `SELECT e.id, e.tenant_id, e.expense_category_id, ec.name as category_name, e.expense_number,
                    e.expense_date, e.total_amount, e.tax_amount, e.payment_status, e.description, e.created_at
             FROM expenses e
             LEFT JOIN expense_categories ec ON ec.id = e.expense_category_id
             WHERE e.tenant_id = $1
             ORDER BY e.expense_date DESC, e.created_at DESC`,
            [tenantId]
          );

          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            expenseCategoryId: r.expense_category_id,
            categoryName: r.category_name || 'General',
            expenseNumber: r.expense_number || '',
            expenseDate: r.expense_date ? new Date(r.expense_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            amount: parseFloat(r.total_amount || '0'),
            taxAmount: parseFloat(r.tax_amount || '0'),
            paymentMode: r.payment_status || 'paid',
            description: r.description || undefined,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        save: async (expense: Expense): Promise<void> => {
          await client.query(
            `INSERT INTO expenses (
               id, tenant_id, expense_category_id, expense_number, expense_date, taxable_amount, tax_amount, total_amount, payment_status, description, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              ensureUuid(expense.id),
              expense.tenantId,
              ensureUuid(expense.expenseCategoryId),
              expense.expenseNumber || `EXP-${Date.now().toString().slice(-6)}`,
              expense.expenseDate || new Date().toISOString().slice(0, 10),
              expense.amount - (expense.taxAmount || 0),
              expense.taxAmount || 0,
              expense.amount,
              expense.paymentMode || 'paid',
              expense.description || null,
            ]
          );
        },

        listCategories: async (tenantId: EntityId): Promise<ExpenseCategory[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, name, code, is_active FROM expense_categories WHERE tenant_id = $1 ORDER BY name ASC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            name: r.name,
            code: r.code || undefined,
            isActive: r.is_active,
          }));
        },

        saveCategory: async (category: ExpenseCategory): Promise<void> => {
          await client.query(
            `INSERT INTO expense_categories (id, tenant_id, name, code, is_active, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())
             ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code, is_active = EXCLUDED.is_active`,
            [ensureUuid(category.id), category.tenantId, category.name, category.code || null, category.isActive !== false]
          );
        },
      };

      // -----------------------------------------------------------------------
      // Reports Repository
      // -----------------------------------------------------------------------
      const reportRepo: ReportRepository = {
        getDashboardMetrics: async (tenantId: EntityId): Promise<DashboardMetrics> => {
          // Today's Sales
          const salesRes = await client.query(
            `SELECT COALESCE(SUM(total_amount), 0) as today_sales, COUNT(id) as count
             FROM sales_invoices
             WHERE tenant_id = $1 AND status = 'posted' AND invoice_date = CURRENT_DATE`,
            [tenantId]
          );

          // Receivables & Payables
          const recRes = await client.query(
            `SELECT 
               COALESCE(SUM(CASE WHEN p.party_type IN ('customer', 'both') THEN ple.debit_amount - ple.credit_amount ELSE 0 END), 0) as receivables,
               COALESCE(SUM(CASE WHEN p.party_type IN ('supplier', 'both') THEN ple.credit_amount - ple.debit_amount ELSE 0 END), 0) as payables
             FROM party_ledger_entries ple
             JOIN parties p ON p.id = ple.party_id
             WHERE ple.tenant_id = $1`,
            [tenantId]
          );

          // Low Stock Count
          const stockRes = await client.query(
            `SELECT 
               COUNT(pv.id) as low_stock_count,
               COALESCE(SUM(sb.quantity_on_hand * COALESCE(pv.purchase_price, 0)), 0) as total_valuation
             FROM product_variants pv
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
             WHERE pv.tenant_id = $1 AND COALESCE(sb.quantity_on_hand, 0) <= COALESCE(pv.reorder_level::numeric, 0)`,
            [tenantId]
          );

          // Total Product Count
          const prodCountRes = await client.query(
            `SELECT COUNT(id) as total_products FROM products WHERE tenant_id = $1 AND is_active = true`,
            [tenantId]
          );

          // Recent Invoices
          const recentInvoices = await invoiceRepo.list(tenantId, 5);

          // Recent Movements
          const recentMovements = await inventoryRepo.listMovements(tenantId, 5);

          return {
            todaySales: parseFloat(salesRes.rows[0]?.today_sales || '0'),
            todayInvoicesCount: parseInt(salesRes.rows[0]?.count || '0', 10),
            totalReceivables: parseFloat(recRes.rows[0]?.receivables || '0'),
            totalPayables: parseFloat(recRes.rows[0]?.payables || '0'),
            lowStockCount: parseInt(stockRes.rows[0]?.low_stock_count || '0', 10),
            totalProductsCount: parseInt(prodCountRes.rows[0]?.total_products || '0', 10),
            totalStockValuation: parseFloat(stockRes.rows[0]?.total_valuation || '0'),
            recentInvoices,
            recentMovements,
          };
        },

        getStockValuation: async (tenantId: EntityId) => {
          const res = await client.query(
            `SELECT pv.id as variant_id, p.name as product_name,
                    COALESCE(SUM(sb.quantity_on_hand), 0) as quantity,
                    COALESCE(SUM(sb.quantity_on_hand * COALESCE(pv.purchase_price, 0)), 0) as valuation
             FROM products p
             JOIN product_variants pv ON pv.product_id = p.id
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
             WHERE p.tenant_id = $1
             GROUP BY pv.id, p.name
             ORDER BY valuation DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            variantId: r.variant_id,
            productName: r.product_name,
            quantity: parseFloat(r.quantity),
            valuation: parseFloat(r.valuation),
          }));
        },
      };

      const result = await work({
        invoices: invoiceRepo,
        products: productRepo,
        inventory: inventoryRepo,
        parties: partyRepo,
        partyLedger: partyLedgerRepo,
        outbox: outboxRepo,
        purchasing: purchasingRepo,
        payments: paymentRepo,
        expenses: expenseRepo,
        reports: reportRepo,
      });

      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
