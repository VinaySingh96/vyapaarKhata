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
