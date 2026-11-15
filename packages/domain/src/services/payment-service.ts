import {
  Payment,
  PaymentAllocation,
  TenantContext,
  PartyLedgerEntry,
  OutboxEvent,
} from '../entities/types.js';
import { UnitOfWork } from '../ports/repositories.js';

export interface PostPaymentCommand {
  tenantContext: TenantContext;
  paymentId: string;
  allocations?: Array<{
    documentType: 'sales_invoice' | 'purchase_bill';
    documentId: string;
    amount: number;
    adjustmentAmount?: number;
    adjustmentType?: string;
    notes?: string;
  }>;
  timestamp?: string;
}

export class PaymentService {
  constructor(private readonly uow: UnitOfWork) {}

  /**
   * Post a customer collection or supplier payment.
   * Updates party ledger entries and document allocations atomically.
   */
  async postPayment(command: PostPaymentCommand): Promise<Payment> {
    const { tenantContext, paymentId, allocations } = command;
    const now = command.timestamp || new Date().toISOString();

    return this.uow.runInTransaction(async (ctx) => {
      const payment = await ctx.payments.findPaymentById(tenantContext.tenantId, paymentId);

      if (!payment) {
        throw new Error(`Payment ${paymentId} not found`);
      }

      if (payment.status === 'posted') {
        return payment; // idempotent
      }

      if (payment.status === 'cancelled') {
        throw new Error(`Cannot post cancelled payment ${paymentId}`);
      }

      // 1. Record Party Ledger Entry for Payment
      // Inbound (Customer Collection): Credit customer (reduces receivable asset)
      // Outbound (Supplier Settlement): Debit supplier (reduces payable liability)
      if (payment.amount > 0) {
        const ledgerEntry: PartyLedgerEntry = {
          id: `ple-pay-${payment.id}`,
          tenantId: tenantContext.tenantId,
          partyId: payment.partyId,
          entryType: payment.direction === 'inbound' ? 'credit' : 'debit',
          amount: payment.amount,
          referenceDocumentType: 'payment',
          referenceDocumentId: payment.id,
          createdAt: now,
        };
        await ctx.partyLedger.recordEntry(ledgerEntry);
      }

      // 2. Record Party Ledger Entry for Adjustment / Discount (if any)
      const totalAdj =
        (allocations || []).reduce((sum, a) => sum + (a.adjustmentAmount || 0), 0) ||
        (payment.adjustmentAmount || 0);

      if (totalAdj > 0) {
        const adjLedgerEntry: PartyLedgerEntry = {
          id: `ple-adj-${payment.id}`,
          tenantId: tenantContext.tenantId,
          partyId: payment.partyId,
          entryType: payment.direction === 'inbound' ? 'credit' : 'debit',
          amount: totalAdj,
          referenceDocumentType: 'payment_adjustment',
          referenceDocumentId: payment.id,
          createdAt: now,
        };
        await ctx.partyLedger.recordEntry(adjLedgerEntry);
        payment.adjustmentAmount = totalAdj;
      }

      // 3. Process Allocations if provided (supports partial, full settlement, and adjustments)
      if (allocations && allocations.length > 0) {
        let totalAllocated = 0;
        for (const alloc of allocations) {
          totalAllocated += alloc.amount;
          const allocationEntity: PaymentAllocation = {
            id: `alloc-${payment.id}-${alloc.documentId}`,
            tenantId: tenantContext.tenantId,
            paymentId: payment.id,
            documentType: alloc.documentType,
            documentId: alloc.documentId,
            allocatedAmount: alloc.amount,
            adjustmentAmount: alloc.adjustmentAmount || 0,
            adjustmentType: alloc.adjustmentType || payment.adjustmentType || undefined,
            notes: alloc.notes || payment.notes || undefined,
            createdAt: now,
          };
          await ctx.payments.recordAllocation(allocationEntity);
          payment.allocations.push(allocationEntity);
        }

        if (totalAllocated > payment.amount) {
          throw new Error(
            `Total allocation amount (${totalAllocated}) cannot exceed payment amount (${payment.amount})`
          );
        }
      }

      // 4. Mark payment posted
      payment.status = 'posted';
      payment.postedAt = now;
      await ctx.payments.savePayment(payment);

      // 4. Record transactional outbox event
      const outboxEvent: OutboxEvent = {
        id: `evt-${payment.id}-posted`,
        tenantId: tenantContext.tenantId,
        eventType: 'payment.posted',
        payload: {
          paymentId: payment.id,
          paymentNumber: payment.paymentNumber,
          partyId: payment.partyId,
          direction: payment.direction,
          amount: payment.amount,
          allocations: payment.allocations,
          postedAt: now,
        },
        createdAt: now,
        isPublished: false,
      };
      await ctx.outbox.recordEvent(outboxEvent);

      return payment;
    });
  }
}
