import {
  PurchaseReceipt,
  PurchaseBill,
  TenantContext,
  StockMovement,
  StockBalance,
  PartyLedgerEntry,
  OutboxEvent,
} from '../entities/types.js';
import { UnitOfWork } from '../ports/repositories.js';

export interface PostReceiptCommand {
  tenantContext: TenantContext;
  receiptId: string;
  timestamp?: string;
}

export interface PostBillCommand {
  tenantContext: TenantContext;
  billId: string;
  timestamp?: string;
}

export class PurchasingService {
  constructor(private readonly uow: UnitOfWork) {}

  /**
   * Post a goods purchase receipt.
   * Invariant: Updates stock movements and projected stock balances.
   * Does NOT touch supplier party ledger.
   */
  async postReceipt(command: PostReceiptCommand): Promise<PurchaseReceipt> {
    const { tenantContext, receiptId } = command;
    const now = command.timestamp || new Date().toISOString();

    return this.uow.runInTransaction(async (ctx) => {
      const receipt = await ctx.purchasing.findReceiptById(tenantContext.tenantId, receiptId);

      if (!receipt) {
        throw new Error(`Purchase receipt ${receiptId} not found`);
      }

      if (receipt.status === 'posted') {
        return receipt; // idempotent
      }

      if (receipt.status === 'cancelled') {
        throw new Error(`Cannot post cancelled receipt ${receiptId}`);
      }

      // 1. Process physical stock additions
      for (const line of receipt.lines) {
        if (line.acceptedQuantity <= 0) continue;

        const balance = await ctx.inventory.getBalance(
          tenantContext.tenantId,
          line.variantId,
          receipt.inventoryLocationId
        );

        const currentQty = balance ? balance.currentBalance : 0;
        const newQty = currentQty + line.acceptedQuantity;

        const movement: StockMovement = {
          id: `mov-rec-${receipt.id}-${line.id}`,
          tenantId: tenantContext.tenantId,
          locationId: receipt.inventoryLocationId,
          productId: line.variantId,
          variantId: line.variantId,
          unitId: line.unitId,
          movementType: 'purchase_receipt',
          quantity: line.acceptedQuantity, // Positive stock increment
          referenceDocumentType: 'purchase_receipt',
          referenceDocumentId: receipt.id,
          createdAt: now,
        };

        const updatedBalance: StockBalance = {
          id: balance?.id || `${tenantContext.tenantId}-${line.variantId}-${receipt.inventoryLocationId}`,
          tenantId: tenantContext.tenantId,
          locationId: receipt.inventoryLocationId,
          productId: line.variantId,
          variantId: line.variantId,
          currentBalance: newQty,
          reorderLevel: balance?.reorderLevel,
          updatedAt: now,
        };

        await ctx.inventory.recordMovement(movement);
        await ctx.inventory.updateBalance(updatedBalance);
      }

      // 2. Update linked Purchase Order fulfillment if applicable
      if (receipt.purchaseOrderId) {
        const order = await ctx.purchasing.findOrderById(tenantContext.tenantId, receipt.purchaseOrderId);
        if (order) {
          let allReceived = true;
          for (const line of receipt.lines) {
            if (line.purchaseOrderLineId) {
              const poLine = order.lines.find((l) => l.id === line.purchaseOrderLineId);
              if (poLine) {
                poLine.receivedQuantity += line.acceptedQuantity;
                if (poLine.receivedQuantity < poLine.quantity) {
                  allReceived = false;
                }
              }
            }
          }
          order.status = allReceived ? 'received' : 'partially_received';
          await ctx.purchasing.saveOrder(order);
        }
      }

      // 3. Mark receipt posted
      receipt.status = 'posted';
      receipt.postedAt = now;
      await ctx.purchasing.saveReceipt(receipt);

      // 4. Record transactional outbox event
      const outboxEvent: OutboxEvent = {
        id: `evt-${receipt.id}-posted`,
        tenantId: tenantContext.tenantId,
        eventType: 'purchasing.receipt.posted',
        payload: {
          receiptId: receipt.id,
          receiptNumber: receipt.receiptNumber,
          supplierId: receipt.supplierId,
          lines: receipt.lines,
          postedAt: now,
        },
        createdAt: now,
        isPublished: false,
      };
      await ctx.outbox.recordEvent(outboxEvent);

      return receipt;
    });
  }

  /**
   * Post a supplier purchase bill.
   * Invariant: Updates supplier liability in party ledger.
   * Invariant: DOES NOT DUPLICATE stock increase.
   */
  async postBill(command: PostBillCommand): Promise<PurchaseBill> {
    const { tenantContext, billId } = command;
    const now = command.timestamp || new Date().toISOString();

    return this.uow.runInTransaction(async (ctx) => {
      const bill = await ctx.purchasing.findBillById(tenantContext.tenantId, billId);

      if (!bill) {
        throw new Error(`Purchase bill ${billId} not found`);
      }

      if (bill.status === 'posted') {
        return bill; // idempotent
      }

      if (bill.status === 'cancelled') {
        throw new Error(`Cannot post cancelled bill ${billId}`);
      }

      // 1. Credit supplier liability in party ledger (increases accounts payable)
      const ledgerEntry: PartyLedgerEntry = {
        id: `ple-bill-${bill.id}`,
        tenantId: tenantContext.tenantId,
        partyId: bill.supplierId,
        entryType: 'credit', // Credit represents our liability/payable to supplier
        amount: bill.totalAmount,
        referenceDocumentType: 'purchase_bill',
        referenceDocumentId: bill.id,
        createdAt: now,
      };
      await ctx.partyLedger.recordEntry(ledgerEntry);

      // 2. Mark bill posted
      bill.status = 'posted';
      bill.postedAt = now;
      await ctx.purchasing.saveBill(bill);

      // 3. Record transactional outbox event
      const outboxEvent: OutboxEvent = {
        id: `evt-${bill.id}-posted`,
        tenantId: tenantContext.tenantId,
        eventType: 'purchasing.bill.posted',
        payload: {
          billId: bill.id,
          billNumber: bill.billNumber,
          supplierId: bill.supplierId,
          totalAmount: bill.totalAmount,
          postedAt: now,
        },
        createdAt: now,
        isPublished: false,
      };
      await ctx.outbox.recordEvent(outboxEvent);

      return bill;
    });
  }
}
