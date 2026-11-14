import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUnitOfWork } from './in-memory-uow.js';
import { PurchasingService } from '../src/services/purchasing-service.js';
import { PaymentService } from '../src/services/payment-service.js';
import { PurchaseOrder, PurchaseReceipt, PurchaseBill, Payment, TenantContext } from '../src/entities/types.js';

describe('BE-07 & BE-09: Purchasing & Payment Invariants (§4 Master Prompt)', () => {
  let uow: InMemoryUnitOfWork;
  let purchasing: PurchasingService;
  let payments: PaymentService;

  const tenantCtx: TenantContext = {
    tenantId: 'tenant-01',
    installationId: 'inst-01',
  };

  const samplePO: PurchaseOrder = {
    id: 'po-01',
    tenantId: 'tenant-01',
    supplierId: 'supp-99',
    businessLocationId: 'branch-01',
    orderNumber: 'PO-2026-001',
    status: 'confirmed',
    subtotal: 5000,
    taxAmount: 900,
    totalAmount: 5900,
    createdAt: '2026-11-15T00:00:00Z',
    lines: [
      {
        id: 'po-line-1',
        variantId: 'var-steel-12mm',
        quantity: 100,
        receivedQuantity: 0,
        unitId: 'unit-kg',
        unitPrice: 50,
        taxAmount: 900,
        lineTotal: 5900,
      },
    ],
  };

  const sampleReceipt: PurchaseReceipt = {
    id: 'rec-01',
    tenantId: 'tenant-01',
    supplierId: 'supp-99',
    purchaseOrderId: 'po-01',
    inventoryLocationId: 'yard-01',
    receiptNumber: 'GRN-2026-001',
    status: 'draft',
    createdAt: '2026-11-15T00:00:00Z',
    lines: [
      {
        id: 'rec-line-1',
        purchaseOrderLineId: 'po-line-1',
        variantId: 'var-steel-12mm',
        unitId: 'unit-kg',
        receivedQuantity: 100,
        acceptedQuantity: 95, // 5 rejected
        rejectedQuantity: 5,
        unitCost: 50,
      },
    ],
  };

  const sampleBill: PurchaseBill = {
    id: 'bill-01',
    tenantId: 'tenant-01',
    supplierId: 'supp-99',
    businessLocationId: 'branch-01',
    billNumber: 'BILL-SUPP-1234',
    status: 'draft',
    subtotal: 4750,
    taxAmount: 855,
    totalAmount: 5605,
    amountPaid: 0,
    createdAt: '2026-11-15T00:00:00Z',
    lines: [
      {
        id: 'bill-line-1',
        purchaseReceiptLineId: 'rec-line-1',
        variantId: 'var-steel-12mm',
        unitId: 'unit-kg',
        quantity: 95,
        unitPrice: 50,
        taxAmount: 855,
        lineTotal: 5605,
      },
    ],
  };

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    purchasing = new PurchasingService(uow);
    payments = new PaymentService(uow);

    // Initial stock: 0
    uow.balances.set('tenant-01-var-steel-12mm-yard-01', {
      id: 'bal-steel',
      tenantId: 'tenant-01',
      productId: 'var-steel-12mm',
      locationId: 'yard-01',
      currentBalance: 0,
      updatedAt: '2026-11-15T00:00:00Z',
    });

    uow.purchaseOrders.set(samplePO.id, samplePO);
    uow.purchaseReceipts.set(sampleReceipt.id, sampleReceipt);
    uow.purchaseBills.set(sampleBill.id, sampleBill);
  });

  it('1. Posting physical receipt updates stock and does NOT touch supplier party ledger', async () => {
    const postedReceipt = await purchasing.postReceipt({
      tenantContext: tenantCtx,
      receiptId: 'rec-01',
    });

    expect(postedReceipt.status).toBe('posted');

    // Stock increased by 95 (acceptedQuantity)
    const bal = uow.balances.get('tenant-01-var-steel-12mm-yard-01');
    expect(bal?.currentBalance).toBe(95);

    // Stock movement recorded
    expect(uow.movements.length).toBe(1);
    expect(uow.movements[0].movementType).toBe('purchase_receipt');
    expect(uow.movements[0].quantity).toBe(95);

    // Linked PO receivedQuantity updated
    const po = uow.purchaseOrders.get('po-01');
    expect(po.lines[0].receivedQuantity).toBe(95);
    expect(po.status).toBe('partially_received'); // 95 of 100 received

    // Invariant: Party ledger remains untouched by goods receipt
    expect(uow.partyLedger.length).toBe(0);
  });

  it('2. Posting supplier bill records accounts payable liability and does NOT duplicate stock', async () => {
    // Post receipt first
    await purchasing.postReceipt({
      tenantContext: tenantCtx,
      receiptId: 'rec-01',
    });

    expect(uow.balances.get('tenant-01-var-steel-12mm-yard-01')?.currentBalance).toBe(95);
    expect(uow.movements.length).toBe(1);

    // Post bill
    const postedBill = await purchasing.postBill({
      tenantContext: tenantCtx,
      billId: 'bill-01',
    });

    expect(postedBill.status).toBe('posted');

    // Invariant: Supplier bill does NOT increase stock or add movements
    expect(uow.balances.get('tenant-01-var-steel-12mm-yard-01')?.currentBalance).toBe(95);
    expect(uow.movements.length).toBe(1); // Still 1

    // Invariant: Supplier liability credited in party ledger
    expect(uow.partyLedger.length).toBe(1);
    expect(uow.partyLedger[0].entryType).toBe('credit');
    expect(uow.partyLedger[0].amount).toBe(5605);
    expect(uow.partyLedger[0].partyId).toBe('supp-99');
  });

  it('3. Inbound customer payment records credit and document allocation', async () => {
    const payment: Payment = {
      id: 'pay-01',
      tenantId: 'tenant-01',
      partyId: 'cust-50',
      paymentNumber: 'RCPT-001',
      direction: 'inbound',
      status: 'draft',
      amount: 1000,
      allocations: [],
      createdAt: '2026-11-15T00:00:00Z',
    };
    uow.paymentsList.set(payment.id, payment);

    const postedPay = await payments.postPayment({
      tenantContext: tenantCtx,
      paymentId: 'pay-01',
      allocations: [
        { documentType: 'sales_invoice', documentId: 'inv-101', amount: 800 },
        { documentType: 'sales_invoice', documentId: 'inv-102', amount: 200 },
      ],
    });

    expect(postedPay.status).toBe('posted');
    expect(postedPay.allocations.length).toBe(2);

    // Party ledger credited
    expect(uow.partyLedger.length).toBe(1);
    expect(uow.partyLedger[0].entryType).toBe('credit');
    expect(uow.partyLedger[0].amount).toBe(1000);

    // Outbox event recorded
    expect(uow.outboxEvents.length).toBe(1);
    expect(uow.outboxEvents[0].eventType).toBe('payment.posted');
  });

  it('4. Outbound supplier payment records debit in party ledger', async () => {
    const payment: Payment = {
      id: 'pay-supp-01',
      tenantId: 'tenant-01',
      partyId: 'supp-99',
      paymentNumber: 'PMT-001',
      direction: 'outbound',
      status: 'draft',
      amount: 5000,
      allocations: [],
      createdAt: '2026-11-15T00:00:00Z',
    };
    uow.paymentsList.set(payment.id, payment);

    const postedPay = await payments.postPayment({
      tenantContext: tenantCtx,
      paymentId: 'pay-supp-01',
      allocations: [{ documentType: 'purchase_bill', documentId: 'bill-01', amount: 5000 }],
    });

    expect(postedPay.status).toBe('posted');

    // Debits supplier liability
    expect(uow.partyLedger.length).toBe(1);
    expect(uow.partyLedger[0].entryType).toBe('debit');
    expect(uow.partyLedger[0].amount).toBe(5000);
  });

  it('5. Rejects payment when allocation exceeds total payment amount', async () => {
    const payment: Payment = {
      id: 'pay-invalid',
      tenantId: 'tenant-01',
      partyId: 'cust-50',
      paymentNumber: 'RCPT-002',
      direction: 'inbound',
      status: 'draft',
      amount: 500,
      allocations: [],
      createdAt: '2026-11-15T00:00:00Z',
    };
    uow.paymentsList.set(payment.id, payment);

    await expect(
      payments.postPayment({
        tenantContext: tenantCtx,
        paymentId: 'pay-invalid',
        allocations: [{ documentType: 'sales_invoice', documentId: 'inv-101', amount: 600 }],
      })
    ).rejects.toThrow(/cannot exceed payment amount/);
  });
});
