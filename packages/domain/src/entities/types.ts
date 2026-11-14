/**
 * vyapaarKhata Domain Entities & Value Objects
 * Phase 2 Domain Foundation
 */

export type EntityId = string;

export interface TenantContext {
  tenantId: EntityId;
  installationId: EntityId;
  userId?: EntityId;
}

export type InvoiceStatus = 'draft' | 'posted' | 'cancelled';

export interface SalesInvoiceLine {
  id: EntityId;
  productId: EntityId;
  variantId?: EntityId;
  locationId: EntityId;
  quantity: number;
  unitId: EntityId;
  unitPrice: number;
  taxRateId?: EntityId;
  taxAmount: number;
  lineTotal: number;
}

export interface SalesInvoice {
  id: EntityId;
  tenantId: EntityId;
  businessLocationId?: EntityId;
  invoiceNumber: string;
  customerId: EntityId;
  status: InvoiceStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  postedAt?: string;
  cancelledAt?: string;
  idempotencyKey?: string;
  lines: SalesInvoiceLine[];
}

export type MovementType =
  | 'sale'
  | 'purchase_receipt'
  | 'transfer_in'
  | 'transfer_out'
  | 'adjustment_in'
  | 'adjustment_out'
  | 'cancellation_reversal';

export interface StockMovement {
  id: EntityId;
  tenantId: EntityId;
  locationId: EntityId;
  productId: EntityId;
  variantId?: EntityId;
  unitId: EntityId;
  movementType: MovementType;
  quantity: number; // positive for additions, negative for deductions
  referenceDocumentType: string;
  referenceDocumentId: EntityId;
  createdAt: string;
}

export interface StockBalance {
  id: EntityId;
  tenantId: EntityId;
  locationId: EntityId;
  productId: EntityId;
  variantId?: EntityId;
  currentBalance: number;
  reorderLevel?: number;
  updatedAt: string;
}

export interface PartyLedgerEntry {
  id: EntityId;
  tenantId: EntityId;
  partyId: EntityId;
  entryType: 'debit' | 'credit';
  amount: number;
  referenceDocumentType: string;
  referenceDocumentId: EntityId;
  createdAt: string;
}

export interface OutboxEvent {
  id: EntityId;
  tenantId: EntityId;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
  isPublished: boolean;
}

// === Purchasing Entities ===

export type PurchaseOrderStatus = 'draft' | 'confirmed' | 'partially_received' | 'received' | 'closed';

export interface PurchaseOrderLine {
  id: EntityId;
  variantId: EntityId;
  quantity: number;
  receivedQuantity: number;
  unitId: EntityId;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseOrder {
  id: EntityId;
  tenantId: EntityId;
  supplierId: EntityId;
  businessLocationId: EntityId;
  orderNumber: string;
  status: PurchaseOrderStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  lines: PurchaseOrderLine[];
  createdAt: string;
}

export type ReceiptStatus = 'draft' | 'posted' | 'cancelled';

export interface PurchaseReceiptLine {
  id: EntityId;
  purchaseOrderLineId?: EntityId;
  variantId: EntityId;
  unitId: EntityId;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  unitCost: number;
}

export interface PurchaseReceipt {
  id: EntityId;
  tenantId: EntityId;
  supplierId: EntityId;
  purchaseOrderId?: EntityId;
  inventoryLocationId: EntityId;
  receiptNumber: string;
  status: ReceiptStatus;
  lines: PurchaseReceiptLine[];
  postedAt?: string;
  createdAt: string;
}

export type PurchaseBillStatus = 'draft' | 'posted' | 'cancelled';

export interface PurchaseBillLine {
  id: EntityId;
  purchaseReceiptLineId?: EntityId;
  variantId: EntityId;
  unitId: EntityId;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
}

export interface PurchaseBill {
  id: EntityId;
  tenantId: EntityId;
  supplierId: EntityId;
  businessLocationId: EntityId;
  billNumber: string;
  supplierInvoiceNumber?: string;
  status: PurchaseBillStatus;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  lines: PurchaseBillLine[];
  postedAt?: string;
  createdAt: string;
}

// === Payment Entities ===

export type PaymentDirection = 'inbound' | 'outbound';
export type PaymentStatus = 'draft' | 'posted' | 'cancelled';

export interface PaymentAllocation {
  id: EntityId;
  tenantId: EntityId;
  paymentId: EntityId;
  documentType: 'sales_invoice' | 'purchase_bill';
  documentId: EntityId;
  allocatedAmount: number;
  createdAt: string;
}

export interface Payment {
  id: EntityId;
  tenantId: EntityId;
  partyId: EntityId;
  financialAccountId?: EntityId;
  paymentMethodId?: EntityId;
  paymentNumber: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  amount: number;
  referenceNumber?: string;
  allocations: PaymentAllocation[];
  postedAt?: string;
  createdAt: string;
}

