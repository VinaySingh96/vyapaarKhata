import {
  SalesInvoice,
  TenantContext,
  StockMovement,
  StockBalance,
  PartyLedgerEntry,
  OutboxEvent,
} from '../entities/types.js';
import { UnitOfWork, UnitOfWorkContext } from '../ports/repositories.js';
import { InventoryValidationStrategy, StrictRejectInventoryStrategy } from '../inventory/inventory-strategy.js';

export interface PostInvoiceCommand {
  tenantContext: TenantContext;
  invoiceId: string;
  idempotencyKey?: string;
  timestamp?: string;
  /**
   * Skip stock validation/deduction. Used by rental bills, whose stock already moved
   * through the rental issue/return flow. Defaults to false (normal sales behaviour).
   */
  skipInventory?: boolean;
}

export interface PostInvoiceResult {
  invoice: SalesInvoice;
  isDuplicate: boolean;
  warnings: string[];
}

export interface CancelInvoiceCommand {
  tenantContext: TenantContext;
  invoiceId: string;
  reason: string;
  timestamp?: string;
  /** Skip stock restoration. Used by rental bills. Defaults to false. */
  skipInventory?: boolean;
}

export class InvoicePostingService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly inventoryStrategy: InventoryValidationStrategy = new StrictRejectInventoryStrategy()
  ) {}

  /**
   * Post a sales invoice atomically.
   * Decreases inventory, updates projected balances, writes party ledger, and logs outbox event.
   */
  async postInvoice(command: PostInvoiceCommand): Promise<PostInvoiceResult> {
    return this.uow.runInTransaction((ctx) => this.postInvoiceInContext(ctx, command));
  }

  /**
   * Same as postInvoice, but joins a transaction already opened by the caller
   * (e.g. RentalService posting a rent bill atomically with the stock return).
   */
  async postInvoiceInContext(ctx: UnitOfWorkContext, command: PostInvoiceCommand): Promise<PostInvoiceResult> {
    const { tenantContext, invoiceId, idempotencyKey } = command;
    const now = command.timestamp || new Date().toISOString();
    const warnings: string[] = [];

    {
      const invoice = await ctx.invoices.findById(tenantContext.tenantId, invoiceId);

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found for tenant ${tenantContext.tenantId}`);
      }

      // Check idempotency: If already posted with identical idempotency key or invoice state
      if (invoice.status === 'posted') {
        if (idempotencyKey && invoice.idempotencyKey === idempotencyKey) {
          return { invoice, isDuplicate: true, warnings: [] };
        }
        if (!idempotencyKey) {
          return { invoice, isDuplicate: true, warnings: [] };
        }
        throw new Error(`Invoice ${invoiceId} is already posted with a different operation`);
      }

      if (invoice.status === 'cancelled') {
        throw new Error(`Cannot post cancelled invoice ${invoiceId}`);
      }

      if (invoice.lines.length === 0) {
        throw new Error(`Invoice ${invoiceId} has no lines`);
      }

      // 1. Validate stock availability for all lines atomically
      const balanceUpdates: StockBalance[] = [];
      const movements: StockMovement[] = [];

      for (const line of command.skipInventory ? [] : invoice.lines) {
        const itemIdentifier = line.variantId || line.productId;
        const balance = await ctx.inventory.getBalance(
          tenantContext.tenantId,
          itemIdentifier,
          line.locationId
        );

        const currentQty = balance ? balance.currentBalance : 0;
        const reorderLevel = balance ? balance.reorderLevel : undefined;
        const locationName = balance?.locationName || 'Main Godown';

        const validation = this.inventoryStrategy.validateMovement({
          productId: line.productId,
          productName: line.productName,
          locationId: line.locationId,
          locationName,
          currentBalance: currentQty,
          quantityChange: -line.quantity, // deduction
          reorderLevel,
        });

        if (!validation.allowed) {
          const itemLabel = line.productName ? `"${line.productName}"` : `product ${line.productId}`;
          throw new Error(validation.reason || `Insufficient stock for ${itemLabel}`);
        }

        if (validation.isLowStockWarning) {
          warnings.push(
            `Product ${line.productId} at location ${line.locationId} is at or below reorder level (${validation.projectedBalance} remaining).`
          );
        }

        balanceUpdates.push({
          id: balance?.id || `${tenantContext.tenantId}-${line.productId}-${line.locationId}`,
          tenantId: tenantContext.tenantId,
          productId: line.productId,
          variantId: line.variantId,
          locationId: line.locationId,
          currentBalance: validation.projectedBalance,
          reorderLevel,
          updatedAt: now,
        });

        movements.push({
          id: `mov-${invoice.id}-${line.id}`,
          tenantId: tenantContext.tenantId,
          productId: line.productId,
          variantId: line.variantId,
          locationId: line.locationId,
          unitId: line.unitId || '10000000-0000-0000-0000-000000000001',
          movementType: 'sale',
          quantity: -line.quantity,
          referenceDocumentType: 'sales_invoice',
          referenceDocumentId: invoice.id,
          createdAt: now,
        });
      }

      // 2. Mark invoice posted
      invoice.status = 'posted';
      invoice.postedAt = now;
      if (idempotencyKey) {
        invoice.idempotencyKey = idempotencyKey;
      }
      await ctx.invoices.save(invoice);

      // 3. Record stock movement ledger entries & update projections
      for (const movement of movements) {
        await ctx.inventory.recordMovement(movement);
      }
      for (const balance of balanceUpdates) {
        await ctx.inventory.updateBalance(balance);
      }

      // 4. Record Party Ledger entry (debit customer receivables)
      const ledgerEntry: PartyLedgerEntry = {
        id: `ple-${invoice.id}`,
        tenantId: tenantContext.tenantId,
        partyId: invoice.customerId,
        entryType: 'debit',
        amount: invoice.grandTotal,
        referenceDocumentType: 'sales_invoice',
        referenceDocumentId: invoice.id,
        createdAt: now,
      };
      await ctx.partyLedger.recordEntry(ledgerEntry);

      // 5. Insert Transactional Outbox Event for reliable sync
      const outboxEvent: OutboxEvent = {
        id: `evt-${invoice.id}-posted`,
        tenantId: tenantContext.tenantId,
        eventType: 'sales.invoice.posted',
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          customerId: invoice.customerId,
          grandTotal: invoice.grandTotal,
          lines: invoice.lines,
          postedAt: now,
        },
        createdAt: now,
        isPublished: false,
      };
      await ctx.outbox.recordEvent(outboxEvent);

      return { invoice, isDuplicate: false, warnings };
    }
  }

  /**
   * Cancel an already posted invoice.
   * Produces explicit reversal stock movements and reversal party ledger entries.
   * Never deletes original posted records.
   */
  async cancelInvoice(command: CancelInvoiceCommand): Promise<SalesInvoice> {
    return this.uow.runInTransaction((ctx) => this.cancelInvoiceInContext(ctx, command));
  }

  /** Same as cancelInvoice, but joins a transaction already opened by the caller. */
  async cancelInvoiceInContext(ctx: UnitOfWorkContext, command: CancelInvoiceCommand): Promise<SalesInvoice> {
    const { tenantContext, invoiceId, reason } = command;
    const now = command.timestamp || new Date().toISOString();

    {
      const invoice = await ctx.invoices.findById(tenantContext.tenantId, invoiceId);

      if (!invoice) {
        throw new Error(`Invoice ${invoiceId} not found`);
      }

      if (invoice.status === 'cancelled') {
        return invoice; // idempotent cancellation
      }

      if (invoice.status !== 'posted') {
        throw new Error(`Cannot cancel invoice in state ${invoice.status}; only posted invoices can be reversed`);
      }

      if ((invoice.amountPaid || 0) > 0.001 || (invoice.adjustmentAmount || 0) > 0.001) {
        throw new Error(
          `Cannot void invoice ${invoice.invoiceNumber || invoiceId} because payments or adjustments have already been recorded against it. Revert payments first.`
        );
      }

      // 1. Revert inventory movements
      for (const line of command.skipInventory ? [] : invoice.lines) {
        const itemIdentifier = line.variantId || line.productId;
        const balance = await ctx.inventory.getBalance(
          tenantContext.tenantId,
          itemIdentifier,
          line.locationId
        );

        const currentQty = balance ? balance.currentBalance : 0;
        const restoredQty = currentQty + line.quantity;

        await ctx.inventory.recordMovement({
          id: `mov-rev-${invoice.id}-${line.id}`,
          tenantId: tenantContext.tenantId,
          productId: line.productId,
          variantId: line.variantId,
          locationId: line.locationId,
          unitId: line.unitId || '10000000-0000-0000-0000-000000000001',
          movementType: 'cancellation_reversal',
          quantity: line.quantity, // positive restoration
          referenceDocumentType: 'sales_invoice_cancellation',
          referenceDocumentId: invoice.id,
          createdAt: now,
        });

        await ctx.inventory.updateBalance({
          id: balance?.id || `${tenantContext.tenantId}-${itemIdentifier}-${line.locationId}`,
          tenantId: tenantContext.tenantId,
          productId: line.productId,
          variantId: line.variantId,
          locationId: line.locationId,
          currentBalance: restoredQty,
          reorderLevel: balance?.reorderLevel,
          updatedAt: now,
        });
      }

      // 2. Revert party ledger with an explicit credit entry
      await ctx.partyLedger.recordEntry({
        id: `ple-rev-${invoice.id}`,
        tenantId: tenantContext.tenantId,
        partyId: invoice.customerId,
        entryType: 'credit',
        amount: invoice.grandTotal,
        referenceDocumentType: 'sales_invoice_cancellation',
        referenceDocumentId: invoice.id,
        createdAt: now,
      });

      // 3. Mark invoice cancelled
      invoice.status = 'cancelled';
      invoice.cancelledAt = now;
      await ctx.invoices.save(invoice);

      // 4. Outbox event for cancellation
      await ctx.outbox.recordEvent({
        id: `evt-${invoice.id}-cancelled`,
        tenantId: tenantContext.tenantId,
        eventType: 'sales.invoice.cancelled',
        payload: {
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          totalAmount: invoice.grandTotal,
          grandTotal: invoice.grandTotal,
          reason,
          cancelledAt: now,
        },
        createdAt: now,
        isPublished: false,
      });

      return invoice;
    }
  }
}
