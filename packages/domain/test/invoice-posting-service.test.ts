import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUnitOfWork } from './in-memory-uow.js';
import { InvoicePostingService } from '../src/services/invoice-posting-service.js';
import { SalesInvoice, TenantContext } from '../src/entities/types.js';

describe('InvoicePostingService Domain Invariants (§4 Master Prompt)', () => {
  let uow: InMemoryUnitOfWork;
  let service: InvoicePostingService;

  const tenantCtx: TenantContext = {
    tenantId: 'tenant-01',
    installationId: 'inst-01',
  };

  const sampleInvoice: SalesInvoice = {
    id: 'inv-101',
    tenantId: 'tenant-01',
    invoiceNumber: 'INV-2026-0001',
    customerId: 'cust-50',
    status: 'draft',
    subtotal: 1000,
    taxTotal: 180,
    grandTotal: 1180,
    lines: [
      {
        id: 'line-1',
        productId: 'prod-cement',
        locationId: 'loc-main',
        quantity: 10,
        unitId: 'unit-bag',
        unitPrice: 100,
        taxAmount: 18,
        lineTotal: 118,
      },
    ],
  };

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    service = new InvoicePostingService(uow);

    // Initial stock: 15 bags with reorder level 5
    uow.balances.set('tenant-01-prod-cement-loc-main', {
      id: 'bal-1',
      tenantId: 'tenant-01',
      productId: 'prod-cement',
      locationId: 'loc-main',
      currentBalance: 15,
      reorderLevel: 5,
      updatedAt: '2026-11-15T00:00:00Z',
    });

    uow.invoices.set(sampleInvoice.id, sampleInvoice);
  });

  it('1. Draft invoice does NOT change stock balance before posting', () => {
    const bal = uow.balances.get('tenant-01-prod-cement-loc-main');
    expect(bal?.currentBalance).toBe(15);
    expect(uow.movements.length).toBe(0);
  });

  it('2. Atomically posts invoice: deducts stock, creates movement, party ledger, and outbox event', async () => {
    const result = await service.postInvoice({
      tenantContext: tenantCtx,
      invoiceId: 'inv-101',
      idempotencyKey: 'idem-key-01',
    });

    expect(result.invoice.status).toBe('posted');
    expect(result.invoice.postedAt).toBeDefined();
    expect(result.isDuplicate).toBe(false);

    // Stock balance deducted from 15 to 5
    const bal = uow.balances.get('tenant-01-prod-cement-loc-main');
    expect(bal?.currentBalance).toBe(5);

    // Stock movement recorded
    expect(uow.movements.length).toBe(1);
    expect(uow.movements[0].movementType).toBe('sale');
    expect(uow.movements[0].quantity).toBe(-10);
    expect(uow.movements[0].referenceDocumentId).toBe('inv-101');

    // Party ledger debited
    expect(uow.partyLedger.length).toBe(1);
    expect(uow.partyLedger[0].entryType).toBe('debit');
    expect(uow.partyLedger[0].amount).toBe(1180);
    expect(uow.partyLedger[0].partyId).toBe('cust-50');

    // Outbox event logged
    expect(uow.outboxEvents.length).toBe(1);
    expect(uow.outboxEvents[0].eventType).toBe('sales.invoice.posted');
    expect(uow.outboxEvents[0].isPublished).toBe(false);
  });

  it('3. Emits low-stock warning when projected stock hits or falls below reorder level', async () => {
    const result = await service.postInvoice({
      tenantContext: tenantCtx,
      invoiceId: 'inv-101',
    });

    // 15 - 10 = 5, which equals reorder level 5
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('at or below reorder level (5 remaining)');
  });

  it('4. Rejects posting and rolls back entirely when stock is insufficient', async () => {
    // Modify initial balance to only 5 bags (attempting to sell 10)
    uow.balances.set('tenant-01-prod-cement-loc-main', {
      id: 'bal-1',
      tenantId: 'tenant-01',
      productId: 'prod-cement',
      locationId: 'loc-main',
      currentBalance: 5,
      updatedAt: '2026-11-15T00:00:00Z',
    });

    await expect(
      service.postInvoice({
        tenantContext: tenantCtx,
        invoiceId: 'inv-101',
      })
    ).rejects.toThrow(/Insufficient stock/);

    // Invariant: Zero state changes
    const bal = uow.balances.get('tenant-01-prod-cement-loc-main');
    expect(bal?.currentBalance).toBe(5);
    expect(uow.movements.length).toBe(0);
    expect(uow.partyLedger.length).toBe(0);
    expect(uow.outboxEvents.length).toBe(0);
    expect(uow.invoices.get('inv-101')?.status).toBe('draft');
  });

  it('5. Handles repeated posting requests idempotently without double-deduction', async () => {
    // First post
    await service.postInvoice({
      tenantContext: tenantCtx,
      invoiceId: 'inv-101',
      idempotencyKey: 'idem-key-repeat',
    });

    // Second post with identical idempotency key
    const duplicateResult = await service.postInvoice({
      tenantContext: tenantCtx,
      invoiceId: 'inv-101',
      idempotencyKey: 'idem-key-repeat',
    });

    expect(duplicateResult.isDuplicate).toBe(true);

    // Invariant: Balance deducted only once (15 - 10 = 5)
    const bal = uow.balances.get('tenant-01-prod-cement-loc-main');
    expect(bal?.currentBalance).toBe(5);
    expect(uow.movements.length).toBe(1);
    expect(uow.partyLedger.length).toBe(1);
    expect(uow.outboxEvents.length).toBe(1);
  });

  it('6. Reverses inventory and ledgers upon cancellation without deleting original records', async () => {
    // First post the invoice
    await service.postInvoice({
      tenantContext: tenantCtx,
      invoiceId: 'inv-101',
    });

    expect(uow.balances.get('tenant-01-prod-cement-loc-main')?.currentBalance).toBe(5);

    // Now cancel the posted invoice
    const cancelled = await service.cancelInvoice({
      tenantContext: tenantCtx,
      invoiceId: 'inv-101',
      reason: 'Customer cancelled order before delivery',
    });

    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancelledAt).toBeDefined();

    // Stock balance restored from 5 back to 15
    const restoredBal = uow.balances.get('tenant-01-prod-cement-loc-main');
    expect(restoredBal?.currentBalance).toBe(15);

    // Both original movement and cancellation reversal exist (audit trail preserved)
    expect(uow.movements.length).toBe(2);
    expect(uow.movements[0].movementType).toBe('sale');
    expect(uow.movements[0].quantity).toBe(-10);
    expect(uow.movements[1].movementType).toBe('cancellation_reversal');
    expect(uow.movements[1].quantity).toBe(10);

    // Both original debit and reversal credit exist
    expect(uow.partyLedger.length).toBe(2);
    expect(uow.partyLedger[0].entryType).toBe('debit');
    expect(uow.partyLedger[1].entryType).toBe('credit');
    expect(uow.partyLedger[1].amount).toBe(1180);

    // Cancellation outbox event recorded
    expect(uow.outboxEvents.length).toBe(2);
    expect(uow.outboxEvents[1].eventType).toBe('sales.invoice.cancelled');
  });
});
