import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUnitOfWork } from './in-memory-uow.js';
import { PurchasingService } from '../src/services/purchasing-service.js';
import { InvoicePostingService } from '../src/services/invoice-posting-service.js';
import { PaymentService } from '../src/services/payment-service.js';
import {
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseBill,
  SalesInvoice,
  Payment,
  TenantContext,
} from '../src/entities/types.js';

describe('INT-01: Full End-to-End SMB Commercial Lifecycle', () => {
  let uow: InMemoryUnitOfWork;
  let purchasing: PurchasingService;
  let sales: InvoicePostingService;
  let payments: PaymentService;

  const tenantCtx: TenantContext = {
    tenantId: 'tenant-smb-01',
    installationId: 'inst-smb-01',
  };

  const supplierId = 'supp-tmt-steel';
  const customerId = 'cust-apex-builders';
  const variantId = 'var-steel-rod-10mm';
  const locationId = 'loc-main-godown';
  const unitId = 'unit-ton';

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    purchasing = new PurchasingService(uow);
    sales = new InvoicePostingService(uow);
    payments = new PaymentService(uow);

    // Initial stock is exactly 0
    uow.balances.set(`${tenantCtx.tenantId}-${variantId}-${locationId}`, {
      id: 'bal-steel-10mm',
      tenantId: tenantCtx.tenantId,
      productId: variantId,
      locationId,
      currentBalance: 0,
      reorderLevel: 5,
      updatedAt: '2026-11-15T00:00:00Z',
    });
  });

  it('executes complete Procurement -> Bill -> Supplier Pay -> Sale -> Customer Receipt cycle', async () => {
    // -------------------------------------------------------------------------
    // Step 1: Procurement - Purchase Order created & Physical Goods Receipt posted
    // -------------------------------------------------------------------------
    const po: PurchaseOrder = {
      id: 'po-1001',
      tenantId: tenantCtx.tenantId,
      supplierId,
      businessLocationId: 'branch-01',
      orderNumber: 'PO-1001',
      status: 'confirmed',
      subtotal: 50000,
      taxAmount: 9000,
      totalAmount: 59000,
      createdAt: '2026-11-15T09:00:00Z',
      lines: [
        {
          id: 'po-line-1',
          variantId,
          quantity: 20,
          receivedQuantity: 0,
          unitId,
          unitPrice: 2500,
          taxAmount: 450,
          lineTotal: 2950,
        },
      ],
    };
    uow.purchaseOrders.set(po.id, po);

    const receipt: PurchaseReceipt = {
      id: 'grn-1001',
      tenantId: tenantCtx.tenantId,
      supplierId,
      purchaseOrderId: 'po-1001',
      inventoryLocationId: locationId,
      receiptNumber: 'GRN-1001',
      status: 'draft',
      createdAt: '2026-11-15T10:00:00Z',
      lines: [
        {
          id: 'rec-line-1',
          purchaseOrderLineId: 'po-line-1',
          variantId,
          unitId,
          receivedQuantity: 20,
          acceptedQuantity: 20,
          rejectedQuantity: 0,
          unitCost: 2500,
        },
      ],
    };
    uow.purchaseReceipts.set(receipt.id, receipt);

    // Post Goods Receipt: physical stock increases by 20 tons
    await purchasing.postReceipt({ tenantContext: tenantCtx, receiptId: receipt.id });
    expect(uow.balances.get(`${tenantCtx.tenantId}-${variantId}-${locationId}`)?.currentBalance).toBe(20);
    expect(uow.partyLedger.length).toBe(0); // Goods receipt does not create financial liabilities

    // -------------------------------------------------------------------------
    // Step 2: Supplier Bill posted (Accounts Payable liability recorded)
    // -------------------------------------------------------------------------
    const bill: PurchaseBill = {
      id: 'bill-1001',
      tenantId: tenantCtx.tenantId,
      supplierId,
      businessLocationId: 'branch-01',
      billNumber: 'SUPP-INV-887',
      status: 'draft',
      subtotal: 50000,
      taxAmount: 9000,
      totalAmount: 59000,
      amountPaid: 0,
      createdAt: '2026-11-15T11:00:00Z',
      lines: [
        {
          id: 'bill-line-1',
          purchaseReceiptLineId: 'rec-line-1',
          variantId,
          unitId,
          quantity: 20,
          unitPrice: 2500,
          taxAmount: 450,
          lineTotal: 2950,
        },
      ],
    };
    uow.purchaseBills.set(bill.id, bill);

    await purchasing.postBill({ tenantContext: tenantCtx, billId: bill.id });

    // Stock does NOT duplicate
    expect(uow.balances.get(`${tenantCtx.tenantId}-${variantId}-${locationId}`)?.currentBalance).toBe(20);

    // Supplier liability credited
    expect(uow.partyLedger.length).toBe(1);
    expect(uow.partyLedger[0].entryType).toBe('credit');
    expect(uow.partyLedger[0].amount).toBe(59000);
    expect(uow.partyLedger[0].partyId).toBe(supplierId);

    // -------------------------------------------------------------------------
    // Step 3: Outbound Settlement to Supplier (Paying the Bill)
    // -------------------------------------------------------------------------
    const suppPayment: Payment = {
      id: 'pay-supp-01',
      tenantId: tenantCtx.tenantId,
      partyId: supplierId,
      paymentNumber: 'PMT-SUPP-01',
      direction: 'outbound',
      status: 'draft',
      amount: 59000,
      allocations: [],
      createdAt: '2026-11-15T12:00:00Z',
    };
    uow.paymentsList.set(suppPayment.id, suppPayment);

    await payments.postPayment({
      tenantContext: tenantCtx,
      paymentId: suppPayment.id,
      allocations: [{ documentType: 'purchase_bill', documentId: bill.id, amount: 59000 }],
    });

    // Supplier liability debited; net balance for supplier is now 0
    const suppEntries = uow.partyLedger.filter((e) => e.partyId === supplierId);
    expect(suppEntries.length).toBe(2);
    const supplierNetPayable =
      suppEntries.find((e) => e.entryType === 'credit')!.amount -
      suppEntries.find((e) => e.entryType === 'debit')!.amount;
    expect(supplierNetPayable).toBe(0);

    // -------------------------------------------------------------------------
    // Step 4: Sales Order & Invoice to Customer (Selling 12 tons out of 20 tons)
    // -------------------------------------------------------------------------
    const invoice: SalesInvoice = {
      id: 'inv-1001',
      tenantId: tenantCtx.tenantId,
      businessLocationId: 'branch-01',
      invoiceNumber: 'INV-VK-1001',
      customerId,
      status: 'draft',
      subtotal: 36000,
      taxTotal: 6480,
      grandTotal: 42480,
      lines: [
        {
          id: 'inv-line-1',
          productId: variantId,
          variantId,
          locationId,
          quantity: 12,
          unitId,
          unitPrice: 3000,
          taxAmount: 540,
          lineTotal: 3540,
        },
      ],
    };
    uow.invoices.set(invoice.id, invoice);

    // Post Sales Invoice atomically
    const postResult = await sales.postInvoice({
      tenantContext: tenantCtx,
      invoiceId: invoice.id,
      idempotencyKey: 'idem-sale-1001',
    });

    expect(postResult.invoice.status).toBe('posted');

    // Remaining physical stock = 20 - 12 = 8 tons
    expect(uow.balances.get(`${tenantCtx.tenantId}-${variantId}-${locationId}`)?.currentBalance).toBe(8);

    // Customer receivable recorded in party ledger (debit)
    const custEntries = uow.partyLedger.filter((e) => e.partyId === customerId);
    expect(custEntries.length).toBe(1);
    expect(custEntries[0].entryType).toBe('debit');
    expect(custEntries[0].amount).toBe(42480);

    // -------------------------------------------------------------------------
    // Step 5: Customer Inbound Payment (Collection settling the invoice)
    // -------------------------------------------------------------------------
    const custPayment: Payment = {
      id: 'pay-cust-01',
      tenantId: tenantCtx.tenantId,
      partyId: customerId,
      paymentNumber: 'RCPT-CUST-01',
      direction: 'inbound',
      status: 'draft',
      amount: 42480,
      allocations: [],
      createdAt: '2026-11-15T15:00:00Z',
    };
    uow.paymentsList.set(custPayment.id, custPayment);

    await payments.postPayment({
      tenantContext: tenantCtx,
      paymentId: custPayment.id,
      allocations: [{ documentType: 'sales_invoice', documentId: invoice.id, amount: 42480 }],
    });

    // Customer net receivable is now 0
    const finalCustEntries = uow.partyLedger.filter((e) => e.partyId === customerId);
    expect(finalCustEntries.length).toBe(2);
    const customerNetReceivable =
      finalCustEntries.find((e) => e.entryType === 'debit')!.amount -
      finalCustEntries.find((e) => e.entryType === 'credit')!.amount;
    expect(customerNetReceivable).toBe(0);

    // -------------------------------------------------------------------------
    // Step 6: Verify Final Invariant Audits
    // -------------------------------------------------------------------------
    // 1. Stock movements match net balance (20 received - 12 sold = 8 on hand)
    const totalMovements = uow.movements.reduce((acc, m) => acc + m.quantity, 0);
    expect(totalMovements).toBe(8);

    // 2. Transactional outbox contains ordered sync events for all 5 posted actions
    expect(uow.outboxEvents.length).toBe(5);
    expect(uow.outboxEvents.map((e) => e.eventType)).toEqual([
      'purchasing.receipt.posted',
      'purchasing.bill.posted',
      'payment.posted',
      'sales.invoice.posted',
      'payment.posted',
    ]);
  });
});
