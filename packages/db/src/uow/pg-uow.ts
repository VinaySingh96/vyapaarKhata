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
  ProductVariant,
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
  StoreSettings,
  SettingsRepository,
  AuditLogEntry,
  AuditRepository,
  EntityId,
} from '@vyapaarkhata/domain';

function ensureUuid(id?: string | null): string {
  if (!id) return randomUUID();
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
            `SELECT si.id, si.tenant_id, si.invoice_number, si.party_id, p.display_name as customer_name,
                    p.phone as customer_phone,
                    (SELECT pa.address_line_1 FROM party_addresses pa WHERE pa.party_id = p.id AND pa.is_default = true LIMIT 1) as customer_address,
                    si.business_location_id, si.status, si.subtotal, si.tax_amount, si.total_amount,
                    si.posted_at, si.created_at,
                    COALESCE((SELECT SUM(alloc.allocated_amount) FROM payment_allocations alloc WHERE alloc.document_id = si.id AND alloc.document_type = 'sales_invoice'), 0) as amount_paid,
                    COALESCE((SELECT SUM(alloc.adjustment_amount) FROM payment_allocations alloc WHERE alloc.document_id = si.id AND alloc.document_type = 'sales_invoice'), 0) as adjustment_amount
             FROM sales_invoices si
             LEFT JOIN parties p ON p.id = si.party_id
             WHERE si.tenant_id = $1 AND si.id = $2`,
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
            `SELECT sil.id, sil.invoice_id, sil.variant_id, sil.unit_id, sil.quantity, sil.unit_price, sil.tax_amount, sil.line_total,
                    COALESCE(pv.variant_name, p.name, 'Catalog Item') as product_name, pv.sku, u.symbol as unit_symbol
             FROM sales_invoice_lines sil
             LEFT JOIN product_variants pv ON pv.id = sil.variant_id
             LEFT JOIN products p ON p.id = pv.product_id
             LEFT JOIN units u ON u.id = sil.unit_id
             WHERE sil.invoice_id = $1`,
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
            productName: l.product_name,
            sku: l.sku,
            unitSymbol: l.unit_symbol || 'pcs',
          }));

          // Fetch payment allocations for this invoice
          const payRes = await client.query(
            `SELECT p.id as payment_id, p.payment_number, p.amount, p.direction, p.payment_mode,
                    p.reference_number, p.posted_at,
                    alloc.allocated_amount, alloc.adjustment_amount, alloc.adjustment_type, alloc.notes
             FROM payment_allocations alloc
             JOIN payments p ON p.id = alloc.payment_id
             WHERE alloc.document_id = $1 AND alloc.document_type = 'sales_invoice'
             ORDER BY p.posted_at DESC, alloc.created_at DESC`,
            [id]
          );

          const grandTotal = parseFloat(r.total_amount || '0');
          const amountPaid = parseFloat(r.amount_paid || '0');
          const adjustmentAmount = parseFloat(r.adjustment_amount || '0');
          const balanceDue = Math.max(0, grandTotal - (amountPaid + adjustmentAmount));
          let paymentStatus: any = 'unpaid';
          if (r.status === 'cancelled') {
            paymentStatus = 'cancelled';
          } else if (balanceDue <= 0.001) {
            paymentStatus = 'paid';
          } else if (amountPaid + adjustmentAmount > 0) {
            paymentStatus = 'partial';
          } else {
            paymentStatus = 'unpaid';
          }

          return {
            id: r.id,
            tenantId: r.tenant_id,
            businessLocationId: r.business_location_id,
            invoiceNumber: r.invoice_number,
            customerId: r.party_id,
            customerName: r.customer_name || 'Counter Customer',
            customerAddress: r.customer_address || undefined,
            customerPhone: r.customer_phone || undefined,
            status: r.status as InvoiceStatus,
            subtotal: parseFloat(r.subtotal || '0'),
            taxTotal: parseFloat(r.tax_amount || '0'),
            grandTotal,
            amountPaid,
            adjustmentAmount,
            balanceDue,
            paymentStatus,
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            lines,
            payments: payRes.rows.map((pr: any) => ({
              paymentId: pr.payment_id,
              paymentNumber: pr.payment_number,
              amount: parseFloat(pr.allocated_amount || pr.amount || '0'),
              adjustmentAmount: parseFloat(pr.adjustment_amount || '0'),
              adjustmentType: pr.adjustment_type || undefined,
              paymentMode: pr.payment_mode || undefined,
              postedAt: pr.posted_at ? new Date(pr.posted_at).toISOString() : undefined,
            })),
          };
        },

        list: async (tenantId: EntityId, limit: number = 50): Promise<SalesInvoice[]> => {
          const res = await client.query(
            `SELECT si.id, si.tenant_id, si.invoice_number, si.party_id, p.display_name as customer_name,
                    p.phone as customer_phone,
                    (SELECT pa.address_line_1 FROM party_addresses pa WHERE pa.party_id = p.id AND pa.is_default = true LIMIT 1) as customer_address,
                    si.business_location_id, si.status, si.subtotal, si.tax_amount, si.total_amount,
                    si.posted_at, si.created_at,
                    COALESCE((SELECT SUM(alloc.allocated_amount) FROM payment_allocations alloc WHERE alloc.document_id = si.id AND alloc.document_type = 'sales_invoice'), 0) as amount_paid,
                    COALESCE((SELECT SUM(alloc.adjustment_amount) FROM payment_allocations alloc WHERE alloc.document_id = si.id AND alloc.document_type = 'sales_invoice'), 0) as adjustment_amount
             FROM sales_invoices si
             LEFT JOIN parties p ON p.id = si.party_id
             WHERE si.tenant_id = $1
             ORDER BY si.created_at DESC
             LIMIT $2`,
            [tenantId, limit]
          );

          return res.rows.map((r) => {
            const grandTotal = parseFloat(r.total_amount || '0');
            const amountPaid = parseFloat(r.amount_paid || '0');
            const adjustmentAmount = parseFloat(r.adjustment_amount || '0');
            const balanceDue = Math.max(0, grandTotal - (amountPaid + adjustmentAmount));
            let paymentStatus: any = 'unpaid';
            if (r.status === 'cancelled') {
              paymentStatus = 'cancelled';
            } else if (balanceDue <= 0.001) {
              paymentStatus = 'paid';
            } else if (amountPaid + adjustmentAmount > 0) {
              paymentStatus = 'partial';
            } else {
              paymentStatus = 'unpaid';
            }

            return {
              id: r.id,
              tenantId: r.tenant_id,
              businessLocationId: r.business_location_id,
              invoiceNumber: r.invoice_number,
              customerId: r.party_id,
              customerName: r.customer_name || 'Counter Customer',
              customerAddress: r.customer_address || undefined,
              customerPhone: r.customer_phone || undefined,
              status: r.status as InvoiceStatus,
              subtotal: parseFloat(r.subtotal || '0'),
              taxTotal: parseFloat(r.tax_amount || '0'),
              grandTotal,
              amountPaid,
              adjustmentAmount,
              balanceDue,
              paymentStatus,
              postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
              lines: [],
            };
          });
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
            let variantId = (line as any).variantId || (line as any).productVariantId || line.productId;
            const vRes = await client.query(
              `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
              [variantId]
            );
            if (vRes.rows.length > 0) {
              variantId = vRes.rows[0].id;
            }

            let unitId = line.unitId;
            if (!unitId) {
              const uRes = await client.query(
                `SELECT p.base_unit_id 
                 FROM product_variants pv 
                 JOIN products p ON p.id = pv.product_id 
                 WHERE pv.id = $1 LIMIT 1`,
                [variantId]
              );
              unitId = uRes.rows[0]?.base_unit_id || '10000000-0000-0000-0000-000000000001';
            }

            await client.query(
              `INSERT INTO sales_invoice_lines (
                 id, invoice_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING`,
              [
                ensureUuid(line.id),
                invoiceId,
                ensureUuid(variantId),
                ensureUuid(unitId),
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
            `SELECT p.id, p.tenant_id, p.category_id, c.name as category_name, p.product_type, p.name, p.name_hi, p.description,
                    p.brand_name, p.hsn_sac_code, p.base_unit_id, u.name as unit_name, u.symbol as unit_symbol,
                    p.is_stock_tracked, p.tracking_method, p.valuation_method, p.is_active, p.created_at,
                    COALESCE(SUM(sb.quantity_on_hand::numeric), 0) as total_stock,
                    MIN(pv.id::text) as default_variant_id,
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
             GROUP BY p.id, p.name_hi, c.name, u.name, u.symbol
             ORDER BY p.name ASC`,
            [tenantId, categoryId || null]
          );

          // Fetch all variants with their individual stock_on_hand
          const variantsRes = await client.query(
            `SELECT pv.id, pv.product_id, pv.sku, pv.barcode, pv.variant_name, pv.variant_name_hi,
                    pv.purchase_price, pv.selling_price, pv.mrp, pv.reorder_level, pv.is_active,
                    COALESCE(SUM(CASE WHEN sb.quantity_on_hand ~ '^[0-9]+(\.[0-9]+)?$' THEN sb.quantity_on_hand::numeric ELSE 0 END), 0) as stock_on_hand
             FROM product_variants pv
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
             WHERE pv.tenant_id = $1
             GROUP BY pv.id
             ORDER BY pv.variant_name ASC`,
            [tenantId]
          );

          const variantsByProduct = new Map<string, ProductVariant[]>();
          for (const vr of variantsRes.rows) {
            const list = variantsByProduct.get(vr.product_id) || [];
            list.push({
              id: vr.id,
              tenantId,
              productId: vr.product_id,
              sku: vr.sku,
              barcode: vr.barcode || undefined,
              variantName: vr.variant_name,
              variantNameHi: vr.variant_name_hi || undefined,
              purchasePrice: parseFloat(vr.purchase_price || '0'),
              sellingPrice: parseFloat(vr.selling_price || '0'),
              mrp: vr.mrp ? parseFloat(vr.mrp) : undefined,
              reorderLevel: parseFloat(vr.reorder_level || '0'),
              isActive: vr.is_active,
              stockOnHand: parseFloat(vr.stock_on_hand || '0'),
              createdAt: new Date().toISOString(),
            });
            variantsByProduct.set(vr.product_id, list);
          }

          return res.rows.map((r) => {
            const prodVariants = variantsByProduct.get(r.id) || [];
            const inStockVariant = prodVariants.find((v) => (v.stockOnHand || 0) > 0);
            const defaultVarId = inStockVariant?.id || r.default_variant_id || r.id;

            return {
              id: r.id,
              tenantId: r.tenant_id,
              name: r.name,
              nameHi: r.name_hi || undefined,
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
              defaultVariantId: defaultVarId,
              variants: prodVariants,
              createdAt: new Date(r.created_at).toISOString(),
            };
          });
        },

        findById: async (tenantId: EntityId, id: EntityId): Promise<Product | null> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.category_id, c.name as category_name, p.product_type, p.name, p.name_hi, p.description,
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
            `SELECT pv.id, pv.product_id, pv.sku, pv.barcode, pv.variant_name, pv.variant_name_hi, pv.purchase_price, pv.selling_price, pv.mrp, pv.reorder_level, pv.is_active,
                    COALESCE(SUM(CASE WHEN sb.quantity_on_hand ~ '^[0-9]+(\.[0-9]+)?$' THEN sb.quantity_on_hand::numeric ELSE 0 END), 0) as stock_on_hand
             FROM product_variants pv
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id
             WHERE pv.tenant_id = $1 AND pv.product_id = $2
             GROUP BY pv.id`,
            [tenantId, id]
          );

          const variants = variantsRes.rows.map((v) => ({
            id: v.id,
            tenantId,
            productId: v.product_id,
            sku: v.sku || '',
            barcode: v.barcode || undefined,
            variantName: v.variant_name || 'Standard',
            variantNameHi: v.variant_name_hi || undefined,
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
            nameHi: r.name_hi || undefined,
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
               id, tenant_id, category_id, product_type, name, name_hi, description, is_stock_tracked, tracking_method, valuation_method, base_unit_id, hsn_sac_code, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
             ON CONFLICT (id) DO UPDATE SET
               category_id = EXCLUDED.category_id,
               name = EXCLUDED.name,
               name_hi = EXCLUDED.name_hi,
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
              product.nameHi || null,
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
          let variantId = product.variants?.[0]?.id ? ensureUuid(product.variants[0].id) : undefined;
          if (!variantId && product.id) {
            const existingVar = await client.query(
              `SELECT id FROM product_variants WHERE product_id = $1 LIMIT 1`,
              [productId]
            );
            if (existingVar.rows.length > 0) {
              variantId = existingVar.rows[0].id;
            }
          }
          if (!variantId) {
            variantId = randomUUID();
          }
          await client.query(
            `INSERT INTO product_variants (
               id, tenant_id, product_id, sku, barcode, variant_name, variant_name_hi, purchase_price, selling_price, mrp, reorder_level, is_active, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
             ON CONFLICT (id) DO UPDATE SET
               sku = EXCLUDED.sku,
               barcode = EXCLUDED.barcode,
               variant_name = EXCLUDED.variant_name,
               variant_name_hi = EXCLUDED.variant_name_hi,
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
              product.variants?.[0]?.variantName || product.name || 'Standard',
              product.variants?.[0]?.variantNameHi || product.nameHi || null,
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

        findCategoryById: async (tenantId: EntityId, id: EntityId): Promise<ProductCategory | null> => {
          const res = await client.query(
            `SELECT c.id, c.tenant_id, c.parent_id, c.name, c.code, c.description, c.is_active, c.created_at,
                    COUNT(p.id) as product_count
             FROM product_categories c
             LEFT JOIN products p ON p.category_id = c.id
             WHERE c.tenant_id = $1 AND c.id = $2
             GROUP BY c.id`,
            [tenantId, ensureUuid(id)]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          return {
            id: r.id,
            tenantId: r.tenant_id,
            parentId: r.parent_id || undefined,
            name: r.name,
            code: r.code || undefined,
            description: r.description || undefined,
            isActive: r.is_active,
            productCount: parseInt(r.product_count, 10),
            createdAt: new Date(r.created_at).toISOString(),
          };
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

        deleteCategory: async (tenantId: EntityId, id: EntityId): Promise<void> => {
          const catId = ensureUuid(id);
          const pRes = await client.query(
            `SELECT COUNT(*) as count FROM products WHERE tenant_id = $1 AND category_id = $2`,
            [tenantId, catId]
          );
          const count = parseInt(pRes.rows[0]?.count || '0', 10);
          if (count > 0) {
            throw new Error(`Cannot delete category: ${count} product(s) are currently assigned to this category. Please reassign or delete the products first.`);
          }
          await client.query(
            `DELETE FROM product_categories WHERE tenant_id = $1 AND id = $2`,
            [tenantId, catId]
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
                    tr.id as rate_id, tr.name as rate_name, tr.rate as rate_percentage
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
            `SELECT sb.id, sb.tenant_id, sb.variant_id, sb.inventory_location_id,
                    sb.quantity_on_hand, sb.quantity_reserved, sb.quantity_available, sb.updated_at,
                    COALESCE(pv.reorder_level::numeric, 0) as reorder_level,
                    pv.variant_name, il.name as location_name
             FROM stock_balances sb
             JOIN product_variants pv ON pv.id = sb.variant_id
             LEFT JOIN inventory_locations il ON il.id = sb.inventory_location_id
             WHERE sb.tenant_id = $1 
               AND (sb.variant_id = $2 OR pv.product_id = $2)
               AND sb.inventory_location_id = $3
             FOR UPDATE OF sb
             LIMIT 1`,
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
            locationName: r.location_name,
            itemName: r.variant_name,
            currentBalance: parseFloat(r.quantity_on_hand || '0'),
            quantityOnHand: parseFloat(r.quantity_on_hand || '0'),
            quantityReserved: parseFloat(r.quantity_reserved || '0'),
            quantityAvailable: parseFloat(r.quantity_available || '0'),
            reorderLevel: parseFloat(r.reorder_level || '0'),
            updatedAt: new Date(r.updated_at).toISOString(),
          };
        },

        listBalances: async (tenantId: EntityId, locationId?: EntityId): Promise<StockBalance[]> => {
          const res = await client.query(
            `SELECT COALESCE(sb.id, gen_random_uuid()) as id,
                    pv.tenant_id,
                    pv.id as variant_id,
                    p.id as product_id,
                    COALESCE(sb.inventory_location_id, (SELECT id FROM inventory_locations WHERE tenant_id = $1 AND is_default = true LIMIT 1)) as inventory_location_id,
                    COALESCE(sb.quantity_on_hand::numeric, 0) as quantity_on_hand,
                    COALESCE(sb.quantity_reserved::numeric, 0) as quantity_reserved,
                    COALESCE(sb.quantity_available::numeric, 0) as quantity_available,
                    COALESCE(sb.updated_at, pv.created_at) as updated_at,
                    COALESCE(pv.reorder_level::numeric, 0) as reorder_level,
                    pv.variant_name, pv.variant_name_hi, pv.sku, p.name as product_name, p.name_hi as product_name_hi,
                    u.symbol as unit_symbol,
                    COALESCE(il.name, (SELECT name FROM inventory_locations WHERE tenant_id = $1 AND is_default = true LIMIT 1), 'Main Godown') as location_name
             FROM product_variants pv
             JOIN products p ON p.id = pv.product_id
             LEFT JOIN stock_balances sb ON sb.variant_id = pv.id AND ($2::uuid IS NULL OR sb.inventory_location_id = $2)
             LEFT JOIN units u ON u.id = p.base_unit_id
             LEFT JOIN inventory_locations il ON il.id = sb.inventory_location_id
             WHERE pv.tenant_id = $1 AND pv.is_active = true
             ORDER BY (COALESCE(sb.quantity_available::numeric, 0) <= COALESCE(pv.reorder_level::numeric, 0)) DESC,
                      COALESCE(sb.quantity_available::numeric, 0) ASC,
                      pv.variant_name ASC`,
            [tenantId, locationId || null]
          );

          return res.rows.map((r) => {
            const onHand = isNaN(parseFloat(r.quantity_on_hand)) ? 0 : parseFloat(r.quantity_on_hand);
            const reserved = isNaN(parseFloat(r.quantity_reserved)) ? 0 : parseFloat(r.quantity_reserved);
            const available = isNaN(parseFloat(r.quantity_available)) ? (onHand - reserved) : parseFloat(r.quantity_available);
            const reorder = isNaN(parseFloat(r.reorder_level)) ? 0 : parseFloat(r.reorder_level);

            const rawVar = r.variant_name?.trim();
            const rawProd = r.product_name?.trim();
            const isStandard = !rawVar || rawVar.toLowerCase() === 'standard' || rawVar.toLowerCase() === 'default';
            const itemName = isStandard ? (rawProd || rawVar) : rawVar;
            const rawVarHi = r.variant_name_hi?.trim();
            const rawProdHi = r.product_name_hi?.trim();
            const itemNameHi = (isStandard ? rawProdHi : rawVarHi) || rawProdHi || rawVarHi || undefined;

            return {
              id: r.id,
              tenantId: r.tenant_id,
              productId: r.product_id,
              variantId: r.variant_id,
              locationId: r.inventory_location_id,
              currentBalance: onHand,
              quantityOnHand: onHand,
              quantityReserved: reserved,
              quantityAvailable: available,
              reorderLevel: reorder,
              itemName,
              itemNameHi,
              sku: r.sku,
              unit: r.unit_symbol,
              locationName: r.location_name,
              updatedAt: new Date(r.updated_at).toISOString(),
            };
          });
        },

        recordMovement: async (movement: StockMovement): Promise<void> => {
          let variantId = movement.variantId || movement.productId;
          const vRes = await client.query(
            `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
            [variantId]
          );
          if (vRes.rows.length > 0) {
            variantId = vRes.rows[0].id;
          }

          let unitId = movement.unitId;
          if (!unitId) {
            const pRes = await client.query(
              `SELECT p.base_unit_id 
               FROM product_variants pv 
               JOIN products p ON p.id = pv.product_id 
               WHERE pv.id = $1 LIMIT 1`,
              [variantId]
            );
            unitId = pRes.rows[0]?.base_unit_id || '10000000-0000-0000-0000-000000000001';
          }

          await client.query(
            `INSERT INTO stock_movements (
               id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
            [
              ensureUuid(movement.id),
              movement.tenantId,
              movement.locationId,
              ensureUuid(variantId),
              movement.movementType,
              movement.quantity,
              ensureUuid(unitId),
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
          let variantId = balance.variantId || balance.productId;
          const vRes = await client.query(
            `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
            [variantId]
          );
          if (vRes.rows.length > 0) {
            variantId = vRes.rows[0].id;
          }

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
              ensureUuid(variantId),
              balance.currentBalance,
              balance.updatedAt ? new Date(balance.updatedAt) : new Date(),
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
               is_active = EXCLUDED.is_active`,
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
            let variantId = line.variantId;
            const vRes = await client.query(
              `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
              [variantId]
            );
            if (vRes.rows.length > 0) {
              variantId = vRes.rows[0].id;
            }

            const movementQty = line.adjustmentType === 'increase' ? line.quantity : -line.quantity;
            await client.query(
              `INSERT INTO stock_movements (
                 id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
              [
                randomUUID(),
                adjustment.tenantId,
                adjustment.inventoryLocationId,
                ensureUuid(variantId),
                line.adjustmentType === 'increase' ? 'adjustment_in' : 'adjustment_out',
                movementQty,
                line.unitId,
                'inventory_adjustment',
                adjId,
              ]
            );

            // Upsert stock balance
            const updateRes = await client.query(
              `UPDATE stock_balances
               SET quantity_on_hand = GREATEST(0, (COALESCE(NULLIF(quantity_on_hand, '')::numeric, 0) + $1))::text,
                   quantity_available = GREATEST(0, (COALESCE(NULLIF(quantity_available, '')::numeric, 0) + $1))::text,
                   updated_at = NOW()
               WHERE tenant_id = $2 AND inventory_location_id = $3 AND variant_id = $4
               RETURNING id`,
              [movementQty, adjustment.tenantId, adjustment.inventoryLocationId, ensureUuid(variantId)]
            );

            if (updateRes.rows.length === 0) {
              const newOnHand = Math.max(0, movementQty);
              await client.query(
                `INSERT INTO stock_balances (
                   id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, average_unit_cost, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $5, 0, NOW())`,
                [randomUUID(), adjustment.tenantId, adjustment.inventoryLocationId, ensureUuid(variantId), newOnHand]
              );
            }
          }
        },

        saveTransfer: async (transfer: StockTransfer): Promise<void> => {
          const transferId = ensureUuid(transfer.id);
          for (const line of transfer.lines) {
            let variantId = line.variantId;
            const vRes = await client.query(
              `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
              [variantId]
            );
            if (vRes.rows.length > 0) {
              variantId = vRes.rows[0].id;
            }

            // Transfer Out from source
            await client.query(
              `INSERT INTO stock_movements (
                 id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
               ) VALUES ($1, $2, $3, $4, 'transfer_out', $5, $6, 'stock_transfer', $7, NOW(), NOW())`,
              [randomUUID(), transfer.tenantId, transfer.sourceLocationId, ensureUuid(variantId), -line.quantity, line.unitId, transferId]
            );

            // Transfer In to destination
            await client.query(
              `INSERT INTO stock_movements (
                 id, tenant_id, inventory_location_id, variant_id, movement_type, quantity, unit_id, reference_type, reference_id, occurred_at, created_at
               ) VALUES ($1, $2, $3, $4, 'transfer_in', $5, $6, 'stock_transfer', $7, NOW(), NOW())`,
              [randomUUID(), transfer.tenantId, transfer.destinationLocationId, ensureUuid(variantId), line.quantity, line.unitId, transferId]
            );

            // Deduct from source
            await client.query(
              `UPDATE stock_balances
               SET quantity_on_hand = GREATEST(0, (COALESCE(NULLIF(quantity_on_hand, '')::numeric, 0) - $1))::text,
                   quantity_available = GREATEST(0, (COALESCE(NULLIF(quantity_available, '')::numeric, 0) - $1))::text,
                   updated_at = NOW()
               WHERE tenant_id = $2 AND inventory_location_id = $3 AND variant_id = $4`,
              [line.quantity, transfer.tenantId, transfer.sourceLocationId, ensureUuid(variantId)]
            );

            // Add to destination
            const destUpdateRes = await client.query(
              `UPDATE stock_balances
               SET quantity_on_hand = (COALESCE(NULLIF(quantity_on_hand, '')::numeric, 0) + $1)::text,
                   quantity_available = (COALESCE(NULLIF(quantity_available, '')::numeric, 0) + $1)::text,
                   updated_at = NOW()
               WHERE tenant_id = $2 AND inventory_location_id = $3 AND variant_id = $4
               RETURNING id`,
              [line.quantity, transfer.tenantId, transfer.destinationLocationId, ensureUuid(variantId)]
            );

            if (destUpdateRes.rows.length === 0) {
              await client.query(
                `INSERT INTO stock_balances (
                   id, tenant_id, inventory_location_id, variant_id, quantity_on_hand, quantity_available, average_unit_cost, updated_at
                 ) VALUES ($1, $2, $3, $4, $5, $5, 0, NOW())`,
                [randomUUID(), transfer.tenantId, transfer.destinationLocationId, ensureUuid(variantId), line.quantity]
              );
            }
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
                    (SELECT pa.address_line_1 FROM party_addresses pa WHERE pa.party_id = p.id AND pa.is_default = true LIMIT 1) as billing_address,
                    COALESCE((SELECT (ple.debit_amount - ple.credit_amount) FROM party_ledger_entries ple WHERE ple.party_id = p.id AND ple.document_type = 'opening_balance' LIMIT 1), 0) as opening_balance,
                    COALESCE((SELECT SUM(ple.debit_amount - ple.credit_amount) FROM party_ledger_entries ple WHERE ple.party_id = p.id), 0) as current_balance
             FROM parties p
             WHERE p.tenant_id = $1 AND ($2::varchar IS NULL OR p.party_type = $2 OR p.party_type = 'both')
             ORDER BY p.display_name ASC`,
            [tenantId, partyType || null]
          );

          return res.rows.map((r) => {
            const obVal = parseFloat(r.opening_balance || '0');
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
              billingAddress: r.billing_address || undefined,
              openingBalance: Math.abs(obVal),
              openingBalanceType: obVal < 0 ? 'credit' : 'debit',
              currentBalance: parseFloat(r.current_balance || '0'),
              isActive: r.is_active,
              createdAt: new Date(r.created_at).toISOString(),
            };
          });
        },

        findById: async (tenantId: EntityId, id: EntityId): Promise<Party | null> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.party_type, p.display_name, p.legal_name, p.gstin, p.pan, p.email, p.phone, p.is_active, p.created_at,
                    (SELECT pa.address_line_1 FROM party_addresses pa WHERE pa.party_id = p.id AND pa.is_default = true LIMIT 1) as billing_address,
                    COALESCE((SELECT (ple.debit_amount - ple.credit_amount) FROM party_ledger_entries ple WHERE ple.party_id = p.id AND ple.document_type = 'opening_balance' LIMIT 1), 0) as opening_balance,
                    COALESCE((SELECT SUM(ple.debit_amount - ple.credit_amount) FROM party_ledger_entries ple WHERE ple.party_id = p.id), 0) as current_balance
             FROM parties p
             WHERE p.tenant_id = $1 AND p.id = $2`,
            [tenantId, id]
          );

          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const obVal = parseFloat(r.opening_balance || '0');

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
            billingAddress: r.billing_address || undefined,
            openingBalance: Math.abs(obVal),
            openingBalanceType: obVal < 0 ? 'credit' : 'debit',
            currentBalance: parseFloat(r.current_balance || '0'),
            isActive: r.is_active,
            createdAt: new Date(r.created_at).toISOString(),
          };
        },

        save: async (party: Party): Promise<void> => {
          const partyId = ensureUuid(party.id);
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
              partyId,
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

          if (party.billingAddress) {
            const addrRes = await client.query(
              `SELECT id FROM party_addresses WHERE party_id = $1 LIMIT 1`,
              [partyId]
            );
            if (addrRes.rows.length > 0) {
              await client.query(
                `UPDATE party_addresses SET address_line_1 = $1, is_default = true WHERE id = $2`,
                [party.billingAddress, addrRes.rows[0].id]
              );
            } else {
              await client.query(
                `INSERT INTO party_addresses (id, party_id, address_type, address_line_1, is_default)
                 VALUES ($1, $2, 'billing', $3, true)`,
                [randomUUID(), partyId, party.billingAddress]
              );
            }
          }

          if (party.openingBalance && Math.abs(party.openingBalance) > 0) {
            const existingOpening = await client.query(
              `SELECT id FROM party_ledger_entries WHERE party_id = $1 AND document_type = 'opening_balance' LIMIT 1`,
              [partyId]
            );
            if (existingOpening.rows.length === 0) {
              const isDebit = party.openingBalanceType === 'credit' ? false : true;
              const debitAmount = isDebit ? Math.abs(party.openingBalance) : 0;
              const creditAmount = !isDebit ? Math.abs(party.openingBalance) : 0;
              await client.query(
                `INSERT INTO party_ledger_entries (id, tenant_id, party_id, document_type, document_id, debit_amount, credit_amount, created_at)
                 VALUES ($1, $2, $3, 'opening_balance', $1, $4, $5, NOW())`,
                [randomUUID(), party.tenantId, partyId, debitAmount, creditAmount]
              );
            }
          }
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

          const rawAggregateId = invoiceId || billId || receiptId || paymentId || event.id;
          const aggregateId = ensureUuid(rawAggregateId);
          const aggregateType = event.eventType.split('.')[0] || 'system';

          await client.query(
            `INSERT INTO sync_outbox (
               id, tenant_id, installation_id, event_id, aggregate_type, aggregate_id, sequence_number, event_type, payload, status, created_at
             ) VALUES (
               $1, $2, $3, $4, $5, $6,
               COALESCE((SELECT MAX(sequence_number) + 1 FROM sync_outbox WHERE tenant_id = $2), 1),
               $7, $8, 'pending', $9
             )`,
            [
              randomUUID(),
              event.tenantId,
              ensureUuid('00000000-0000-0000-0000-000000000001'),
              ensureUuid(event.id),
              aggregateType,
              aggregateId,
              event.eventType,
              JSON.stringify(event.payload),
              event.createdAt ? new Date(event.createdAt) : new Date(),
            ]
          );
        },

        listPending: async (tenantId: EntityId, limit: number = 50): Promise<any[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, installation_id, event_id, sequence_number, aggregate_type, aggregate_id, event_type, payload, status, created_at
             FROM sync_outbox
             WHERE tenant_id = $1 AND status = 'pending'
             ORDER BY sequence_number ASC
             LIMIT $2`,
            [tenantId, limit]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            installationId: r.installation_id,
            eventId: r.event_id,
            sequenceNumber: r.sequence_number,
            aggregateType: r.aggregate_type,
            aggregateId: r.aggregate_id,
            eventType: r.event_type,
            payload: typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload,
            status: r.status,
            createdAt: new Date(r.created_at).toISOString(),
          }));
        },

        markSynced: async (tenantId: EntityId, eventIds: EntityId[]): Promise<void> => {
          if (!eventIds.length) return;
          await client.query(
            `UPDATE sync_outbox
             SET status = 'synced', acknowledged_at = NOW()
             WHERE tenant_id = $1 AND event_id = ANY($2::uuid[])`,
            [tenantId, eventIds]
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
            let variantId = line.variantId;
            const vRes = await client.query(
              `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
              [variantId]
            );
            if (vRes.rows.length > 0) {
              variantId = vRes.rows[0].id;
            }

            await client.query(
              `INSERT INTO purchase_order_lines (
                 id, purchase_order_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
               ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (id) DO NOTHING`,
              [ensureUuid(line.id), orderId, ensureUuid(variantId), ensureUuid(line.unitId), line.quantity, line.unitPrice, line.taxAmount, line.lineTotal]
            );
          }
        },

        listReceipts: async (tenantId: EntityId): Promise<PurchaseReceipt[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, supplier_id, inventory_location_id, receipt_number, status, posted_at, created_at
             FROM purchase_receipts WHERE tenant_id = $1 ORDER BY created_at DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            supplierId: r.supplier_id,
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
            `SELECT id, tenant_id, supplier_id, inventory_location_id, purchase_order_id, receipt_number, status, posted_at, created_at
             FROM purchase_receipts WHERE tenant_id = $1 AND id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const linesRes = await client.query(
            `SELECT id, receipt_id, purchase_order_line_id, variant_id, unit_id, received_quantity, accepted_quantity, rejected_quantity, unit_cost
             FROM purchase_receipt_lines WHERE receipt_id = $1`,
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
            `INSERT INTO purchase_receipts (
               id, tenant_id, supplier_id, purchase_order_id, inventory_location_id, receipt_number, receipt_date, status, posted_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               posted_at = EXCLUDED.posted_at`,
            [
              ensureUuid(receipt.id),
              receipt.tenantId,
              ensureUuid(receipt.supplierId),
              receipt.purchaseOrderId ? ensureUuid(receipt.purchaseOrderId) : null,
              ensureUuid(receipt.inventoryLocationId),
              receipt.receiptNumber,
              receipt.status,
              receipt.postedAt ? new Date(receipt.postedAt) : null,
            ]
          );

          if (receipt.lines && receipt.lines.length > 0) {
            for (const line of receipt.lines) {
              let variantId = line.variantId;
              const vRes = await client.query(
                `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
                [variantId]
              );
              if (vRes.rows.length > 0) {
                variantId = vRes.rows[0].id;
              }

              await client.query(
                `INSERT INTO purchase_receipt_lines (
                   id, receipt_id, purchase_order_line_id, variant_id, unit_id, received_quantity, accepted_quantity, rejected_quantity, unit_cost
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  ensureUuid(line.id),
                  ensureUuid(receipt.id),
                  line.purchaseOrderLineId ? ensureUuid(line.purchaseOrderLineId) : null,
                  ensureUuid(variantId),
                  ensureUuid(line.unitId),
                  line.receivedQuantity,
                  line.acceptedQuantity,
                  line.rejectedQuantity || 0,
                  line.unitCost || 0,
                ]
              );
            }
          }
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
            `INSERT INTO purchase_bills (
               id, tenant_id, supplier_id, business_location_id, bill_number, supplier_invoice_number, bill_date, status, subtotal, tax_amount, total_amount, amount_paid, posted_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, $10, $11, $12, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               amount_paid = EXCLUDED.amount_paid,
               posted_at = EXCLUDED.posted_at`,
            [
              ensureUuid(bill.id),
              bill.tenantId,
              ensureUuid(bill.supplierId),
              ensureUuid(bill.businessLocationId),
              bill.billNumber,
              bill.supplierInvoiceNumber || null,
              bill.status,
              bill.subtotal || 0,
              bill.taxAmount || 0,
              bill.totalAmount || 0,
              bill.amountPaid || 0,
              bill.postedAt ? new Date(bill.postedAt) : null,
            ]
          );

          if (bill.lines && bill.lines.length > 0) {
            for (const line of bill.lines) {
              let variantId = line.variantId;
              const vRes = await client.query(
                `SELECT id FROM product_variants WHERE id = $1 OR product_id = $1 LIMIT 1`,
                [variantId]
              );
              if (vRes.rows.length > 0) {
                variantId = vRes.rows[0].id;
              }

              await client.query(
                `INSERT INTO purchase_bill_lines (
                   id, purchase_bill_id, purchase_receipt_line_id, variant_id, unit_id, quantity, unit_price, tax_amount, line_total
                 ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                 ON CONFLICT (id) DO NOTHING`,
                [
                  ensureUuid(line.id),
                  ensureUuid(bill.id),
                  line.purchaseReceiptLineId ? ensureUuid(line.purchaseReceiptLineId) : null,
                  ensureUuid(variantId),
                  ensureUuid(line.unitId),
                  line.quantity,
                  line.unitPrice,
                  line.taxAmount || 0,
                  line.lineTotal,
                ]
              );
            }
          }
        },
      };

      // -----------------------------------------------------------------------
      // Payments Repository
      // -----------------------------------------------------------------------
      const paymentRepo: PaymentRepository = {
        list: async (tenantId: EntityId): Promise<Payment[]> => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.party_id, p.financial_account_id, p.payment_method_id, p.payment_number, p.direction, p.status, p.amount, p.reference_number, p.adjustment_amount, p.adjustment_type, p.payment_mode, p.notes, p.posted_at, p.created_at,
                    COALESCE(prt.display_name, prt.legal_name, 'Unknown Party') as party_name
             FROM payments p
             LEFT JOIN parties prt ON prt.id = p.party_id
             WHERE p.tenant_id = $1 ORDER BY p.created_at DESC`,
            [tenantId]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            partyId: r.party_id,
            partyName: r.party_name,
            financialAccountId: r.financial_account_id || undefined,
            paymentMethodId: r.payment_method_id || undefined,
            paymentNumber: r.payment_number,
            direction: r.direction,
            status: r.status,
            amount: parseFloat(r.amount),
            adjustmentAmount: r.adjustment_amount ? parseFloat(r.adjustment_amount) : 0,
            adjustmentType: r.adjustment_type || undefined,
            paymentMode: r.payment_mode || undefined,
            notes: r.notes || undefined,
            referenceNumber: r.reference_number || undefined,
            postedAt: r.posted_at ? new Date(r.posted_at).toISOString() : undefined,
            createdAt: new Date(r.created_at).toISOString(),
            allocations: [],
          }));
        },

        findPaymentById: async (tenantId: EntityId, id: EntityId) => {
          const res = await client.query(
            `SELECT p.id, p.tenant_id, p.party_id, p.financial_account_id, p.payment_method_id, p.payment_number, p.direction, p.status, p.amount, p.reference_number, p.adjustment_amount, p.adjustment_type, p.payment_mode, p.notes, p.posted_at, p.created_at,
                    COALESCE(prt.display_name, prt.legal_name, 'Unknown Party') as party_name
             FROM payments p
             LEFT JOIN parties prt ON prt.id = p.party_id
             WHERE p.tenant_id = $1 AND p.id = $2`,
            [tenantId, id]
          );
          if (res.rows.length === 0) return null;
          const r = res.rows[0];
          const allocRes = await client.query(
            `SELECT id, payment_id, document_type, document_id, allocated_amount, adjustment_amount, adjustment_type, notes, created_at
             FROM payment_allocations WHERE payment_id = $1`,
            [id]
          );
          return {
            id: r.id,
            tenantId: r.tenant_id,
            partyId: r.party_id,
            partyName: r.party_name,
            financialAccountId: r.financial_account_id || undefined,
            paymentMethodId: r.payment_method_id || undefined,
            paymentNumber: r.payment_number,
            direction: r.direction,
            status: r.status,
            amount: parseFloat(r.amount),
            adjustmentAmount: r.adjustment_amount ? parseFloat(r.adjustment_amount) : 0,
            adjustmentType: r.adjustment_type || undefined,
            paymentMode: r.payment_mode || undefined,
            notes: r.notes || undefined,
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
              adjustmentAmount: a.adjustment_amount ? parseFloat(a.adjustment_amount) : 0,
              adjustmentType: a.adjustment_type || undefined,
              notes: a.notes || undefined,
              createdAt: new Date(a.created_at).toISOString(),
            })),
          };
        },

        savePayment: async (payment: any) => {
          let paymentMethodId = payment.paymentMethodId;
          if (!paymentMethodId) {
            const pmRes = await client.query(
              `SELECT id FROM payment_methods WHERE tenant_id = $1 ORDER BY id LIMIT 1`,
              [payment.tenantId]
            );
            paymentMethodId = pmRes.rows[0]?.id || 'e0000000-0000-0000-0000-000000000001';
          }

          await client.query(
            `INSERT INTO payments (
               id, tenant_id, party_id, financial_account_id, payment_method_id, payment_number, payment_date, direction, status, amount, reference_number, adjustment_amount, adjustment_type, payment_mode, notes, posted_at, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
             ON CONFLICT (id) DO UPDATE SET
               status = EXCLUDED.status,
               amount = EXCLUDED.amount,
               adjustment_amount = EXCLUDED.adjustment_amount,
               adjustment_type = EXCLUDED.adjustment_type,
               payment_mode = EXCLUDED.payment_mode,
               notes = EXCLUDED.notes,
               posted_at = EXCLUDED.posted_at`,
            [
              ensureUuid(payment.id),
              payment.tenantId,
              ensureUuid(payment.partyId),
              payment.financialAccountId ? ensureUuid(payment.financialAccountId) : null,
              ensureUuid(paymentMethodId),
              payment.paymentNumber,
              payment.direction,
              payment.status,
              payment.amount,
              payment.referenceNumber || null,
              payment.adjustmentAmount || 0,
              payment.adjustmentType || null,
              payment.paymentMode || null,
              payment.notes || null,
              payment.postedAt ? new Date(payment.postedAt) : null,
            ]
          );
        },

        recordAllocation: async (alloc: any) => {
          await client.query(
            `INSERT INTO payment_allocations (
               id, tenant_id, payment_id, document_type, document_id, allocated_amount, adjustment_amount, adjustment_type, notes, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
            [
              ensureUuid(alloc.id),
              alloc.tenantId,
              ensureUuid(alloc.paymentId),
              alloc.documentType,
              ensureUuid(alloc.documentId),
              alloc.allocatedAmount,
              alloc.adjustmentAmount || 0,
              alloc.adjustmentType || null,
              alloc.notes || null,
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
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
             ON CONFLICT (id) DO UPDATE SET
               expense_category_id = EXCLUDED.expense_category_id,
               expense_date = EXCLUDED.expense_date,
               taxable_amount = EXCLUDED.taxable_amount,
               tax_amount = EXCLUDED.tax_amount,
               total_amount = EXCLUDED.total_amount,
               payment_status = EXCLUDED.payment_status,
               description = EXCLUDED.description`,
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
            `INSERT INTO expense_categories (id, tenant_id, name, code, is_active)
             VALUES ($1, $2, $3, $4, $5)
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

          // Receivables & Payables (computed per party so advances don't net against other parties)
          const recRes = await client.query(
            `SELECT 
               COALESCE(SUM(CASE WHEN p.party_type IN ('customer', 'both') AND balances.net_bal > 0 THEN balances.net_bal ELSE 0 END), 0) as receivables,
               COALESCE(SUM(CASE WHEN p.party_type IN ('supplier', 'both') AND balances.net_bal < 0 THEN -balances.net_bal ELSE 0 END), 0) as payables
             FROM (
               SELECT party_id, SUM(debit_amount - credit_amount) as net_bal
               FROM party_ledger_entries
               WHERE tenant_id = $1
               GROUP BY party_id
             ) balances
             JOIN parties p ON p.id = balances.party_id
             WHERE p.tenant_id = $1`,
            [tenantId]
          );

          // Low Stock Count and Total Stock Valuation (aggregated per variant across locations)
          const stockRes = await client.query(
            `SELECT 
               COUNT(CASE WHEN COALESCE(sb_agg.total_qty, 0) <= COALESCE(NULLIF(pv.reorder_level, '')::numeric, 0) THEN 1 END) as low_stock_count,
               COALESCE(SUM(COALESCE(sb_agg.total_qty, 0) * COALESCE(pv.purchase_price, 0)), 0) as total_valuation
             FROM product_variants pv
             LEFT JOIN (
               SELECT variant_id, SUM(CASE WHEN quantity_on_hand ~ '^[0-9]+(\\.[0-9]+)?$' THEN quantity_on_hand::numeric ELSE 0 END) as total_qty
               FROM stock_balances
               WHERE tenant_id = $1
               GROUP BY variant_id
             ) sb_agg ON sb_agg.variant_id = pv.id
             WHERE pv.tenant_id = $1 AND pv.is_active = true`,
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

          const rawValuation = parseFloat(stockRes.rows[0]?.total_valuation || '0');
          const totalStockValuation = isNaN(rawValuation) ? 0 : rawValuation;

          return {
            todaySales: parseFloat(salesRes.rows[0]?.today_sales || '0'),
            todayInvoicesCount: parseInt(salesRes.rows[0]?.count || '0', 10),
            totalReceivables: parseFloat(recRes.rows[0]?.receivables || '0'),
            totalPayables: parseFloat(recRes.rows[0]?.payables || '0'),
            lowStockCount: parseInt(stockRes.rows[0]?.low_stock_count || '0', 10),
            totalProductsCount: parseInt(prodCountRes.rows[0]?.total_products || '0', 10),
            totalStockValuation,
            recentInvoices,
            recentMovements,
          };
        },

        getStockValuation: async (tenantId: EntityId) => {
          const res = await client.query(
            `SELECT pv.id as variant_id, p.name as product_name,
                    COALESCE(SUM(CASE WHEN sb.quantity_on_hand ~ '^[0-9]+(\.[0-9]+)?$' THEN sb.quantity_on_hand::numeric ELSE 0 END), 0) as quantity,
                    COALESCE(SUM(CASE WHEN sb.quantity_on_hand ~ '^[0-9]+(\.[0-9]+)?$' THEN sb.quantity_on_hand::numeric * COALESCE(pv.purchase_price, 0) ELSE 0 END), 0) as valuation
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
            quantity: isNaN(parseFloat(r.quantity)) ? 0 : parseFloat(r.quantity),
            valuation: isNaN(parseFloat(r.valuation)) ? 0 : parseFloat(r.valuation),
          }));
        },
      };

      // -----------------------------------------------------------------------
      // Settings Repository
      // -----------------------------------------------------------------------
      const settingsRepo: SettingsRepository = {
        getSettings: async (tenantId: EntityId): Promise<StoreSettings> => {
          const res = await client.query(
            `SELECT t.id as tenant_id, t.name as store_name, t.currency, t.locale,
                    bp.trade_name, bp.legal_name, bp.gstin, bp.phone,
                    bl.address_line_1, bl.city, bl.state_code, bl.postal_code
             FROM tenants t
             LEFT JOIN business_profiles bp ON bp.tenant_id = t.id
             LEFT JOIN business_locations bl ON bl.tenant_id = t.id
             WHERE t.id = $1
             LIMIT 1`,
            [tenantId]
          );

          if (res.rows.length === 0) {
            return {
              tenantId,
              storeName: 'vyapaarKhata Wholesale & Retail Depot',
              currency: 'INR',
              locale: 'en-IN',
            };
          }

          const r = res.rows[0];
          let fullAddress = r.address_line_1 || '';
          if (!fullAddress) {
            fullAddress = [r.city, r.state_code, r.postal_code].filter(Boolean).join(', ');
          }

          return {
            tenantId: r.tenant_id,
            storeName: r.trade_name || r.store_name || 'vyapaarKhata Wholesale & Retail Depot',
            tradeName: r.trade_name || undefined,
            legalName: r.legal_name || undefined,
            gstin: r.gstin || undefined,
            phone: r.phone || undefined,
            address: fullAddress || undefined,
            currency: r.currency || 'INR',
            locale: r.locale || 'en-IN',
            updatedAt: new Date().toISOString(),
          };
        },

        updateSettings: async (tenantId: EntityId, settings: Partial<StoreSettings>): Promise<StoreSettings> => {
          const storeName = settings.storeName || settings.tradeName || 'vyapaarKhata Store';

          // 1. Update tenants table
          await client.query(
            `UPDATE tenants
             SET name = $1, currency = COALESCE($2, currency), updated_at = NOW()
             WHERE id = $3`,
            [storeName, settings.currency || null, tenantId]
          );

          // 2. Upsert business_profiles table
          const bpId = randomUUID();
          await client.query(
            `INSERT INTO business_profiles (
               id, tenant_id, trade_name, legal_name, gstin, phone, created_at, updated_at
             ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             ON CONFLICT (tenant_id) DO UPDATE SET
               trade_name = EXCLUDED.trade_name,
               legal_name = EXCLUDED.legal_name,
               gstin = EXCLUDED.gstin,
               phone = EXCLUDED.phone,
               updated_at = NOW()`,
            [
              bpId,
              tenantId,
              storeName,
              settings.legalName || storeName,
              settings.gstin || null,
              settings.phone || null,
            ]
          );

          // 3. Upsert/Update business_locations table
          if (settings.address || storeName) {
            await client.query(
              `UPDATE business_locations
               SET name = $1, address_line_1 = COALESCE($2, address_line_1), phone = COALESCE($3, phone)
               WHERE tenant_id = $4`,
              [storeName, settings.address || null, settings.phone || null, tenantId]
            );
          }

          return settingsRepo.getSettings(tenantId);
        },
      };

      // -----------------------------------------------------------------------
      // Audit Logs Repository
      // -----------------------------------------------------------------------
      const auditRepo: AuditRepository = {
        record: async (entry: Partial<AuditLogEntry>): Promise<void> => {
          await client.query(
            `INSERT INTO audit_logs (
               id, tenant_id, user_id, entity_type, entity_id, action, old_values, new_values, ip_address, device_id, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
            [
              entry.id ? ensureUuid(entry.id) : randomUUID(),
              entry.tenantId ? ensureUuid(entry.tenantId) : null,
              entry.userId ? ensureUuid(entry.userId) : null,
              entry.entityType || null,
              entry.entityId ? ensureUuid(entry.entityId) : null,
              entry.action || 'MUTATION',
              entry.oldValues ? JSON.stringify(entry.oldValues) : null,
              entry.newValues ? JSON.stringify(entry.newValues) : null,
              entry.ipAddress || null,
              entry.deviceId ? ensureUuid(entry.deviceId) : null,
            ]
          );
        },

        list: async (tenantId: EntityId, limit: number = 50): Promise<AuditLogEntry[]> => {
          const res = await client.query(
            `SELECT id, tenant_id, user_id, entity_type, entity_id, action, old_values, new_values, ip_address, device_id, created_at
             FROM audit_logs
             WHERE tenant_id = $1 OR tenant_id IS NULL
             ORDER BY created_at DESC
             LIMIT $2`,
            [tenantId, limit]
          );
          return res.rows.map((r) => ({
            id: r.id,
            tenantId: r.tenant_id,
            userId: r.user_id,
            entityType: r.entity_type,
            entityId: r.entity_id,
            action: r.action,
            oldValues: r.old_values,
            newValues: r.new_values,
            ipAddress: r.ip_address,
            deviceId: r.device_id,
            createdAt: new Date(r.created_at).toISOString(),
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
        settings: settingsRepo,
        audit: auditRepo,
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

  async recordAuditLog(entry: Partial<AuditLogEntry>): Promise<void> {
    const logClient = await this.pool.connect();
    try {
      await logClient.query(
        `INSERT INTO audit_logs (
           id, tenant_id, user_id, entity_type, entity_id, action, old_values, new_values, ip_address, device_id, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          entry.id ? ensureUuid(entry.id) : randomUUID(),
          entry.tenantId ? ensureUuid(entry.tenantId) : null,
          entry.userId ? ensureUuid(entry.userId) : null,
          entry.entityType || null,
          entry.entityId ? ensureUuid(entry.entityId) : null,
          entry.action || 'MUTATION',
          entry.oldValues ? JSON.stringify(entry.oldValues) : null,
          entry.newValues ? JSON.stringify(entry.newValues) : null,
          entry.ipAddress || null,
          entry.deviceId ? ensureUuid(entry.deviceId) : null,
        ]
      );
    } finally {
      logClient.release();
    }
  }
}
