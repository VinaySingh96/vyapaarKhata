import { Pool, PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  UnitOfWork,
  UnitOfWorkContext,
  InvoiceRepository,
  InventoryRepository,
  PartyLedgerRepository,
  OutboxRepository,
  SalesInvoice,
  SalesInvoiceLine,
  InvoiceStatus,
  StockMovement,
  StockBalance,
  PartyLedgerEntry,
  OutboxEvent,
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
      };

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

      const outboxRepo: OutboxRepository = {
        recordEvent: async (event: OutboxEvent): Promise<void> => {
          const installationId =
            (event.payload.installationId as string) || '00000000-0000-0000-0000-000000000001';
          const aggregateId = ensureUuid(
            (event.payload.invoiceId as string) || (event.payload.documentId as string) || event.id
          );

          await client.query(
            `INSERT INTO sync_outbox (
               id, tenant_id, installation_id, event_id, aggregate_type, aggregate_id, sequence_number, event_type, payload, status, attempts, created_at
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', 0, $10)`,
            [
              ensureUuid(event.id),
              event.tenantId,
              installationId,
              randomUUID(),
              'sales_invoice',
              aggregateId,
              Date.now(),
              event.eventType,
              JSON.stringify(event.payload),
              event.createdAt,
            ]
          );
        },
      };

      const result = await work({
        invoices: invoiceRepo,
        inventory: inventoryRepo,
        partyLedger: partyLedgerRepo,
        outbox: outboxRepo,
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
