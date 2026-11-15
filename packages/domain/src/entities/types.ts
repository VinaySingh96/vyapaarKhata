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
  productName?: string;
  sku?: string;
  unitSymbol?: string;
}

export type InvoicePaymentStatus = 'paid' | 'partial' | 'unpaid' | 'cancelled';

export interface SalesInvoice {
  id: EntityId;
  tenantId: EntityId;
  businessLocationId?: EntityId;
  invoiceNumber: string;
  customerId: EntityId;
  customerName?: string;
  customerAddress?: string;
  customerPhone?: string;
  status: InvoiceStatus;
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid?: number;
  adjustmentAmount?: number;
  balanceDue?: number;
  paymentStatus?: InvoicePaymentStatus;
  paymentMode?: string;
  postedAt?: string;
  cancelledAt?: string;
  idempotencyKey?: string;
  lines: SalesInvoiceLine[];
  payments?: Array<{
    paymentId: string;
    paymentNumber: string;
    amount: number;
    adjustmentAmount?: number;
    adjustmentType?: string;
    paymentMode?: string;
    postedAt?: string;
  }>;
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
  quantityOnHand?: number;
  quantityReserved?: number;
  quantityAvailable?: number;
  reorderLevel?: number;
  itemName?: string;
  itemNameHi?: string;
  sku?: string;
  unit?: string;
  locationName?: string;
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
  adjustmentAmount?: number;
  adjustmentType?: string;
  notes?: string;
  createdAt: string;
}

export interface Payment {
  id: EntityId;
  tenantId: EntityId;
  partyId: EntityId;
  partyName?: string;
  financialAccountId?: EntityId;
  paymentMethodId?: EntityId;
  paymentNumber: string;
  direction: PaymentDirection;
  status: PaymentStatus;
  amount: number;
  adjustmentAmount?: number;
  adjustmentType?: string;
  paymentMode?: string;
  referenceNumber?: string;
  notes?: string;
  allocations: PaymentAllocation[];
  postedAt?: string;
  createdAt: string;
}

// === Product & Catalog Entities ===

export interface ProductVariant {
  id: EntityId;
  tenantId: EntityId;
  productId: EntityId;
  sku: string;
  barcode?: string;
  variantName: string;
  variantNameHi?: string;
  attributeCombination?: Record<string, string>;
  purchasePrice?: number;
  sellingPrice?: number;
  mrp?: number;
  reorderLevel?: number;
  isActive: boolean;
  stockOnHand?: number;
  createdAt: string;
}

export interface Product {
  id: EntityId;
  tenantId: EntityId;
  name: string;
  nameHi?: string;
  slug?: string;
  description?: string;
  categoryId?: EntityId;
  categoryName?: string;
  brandId?: EntityId;
  productType: 'goods' | 'service';
  sku?: string;
  barcode?: string;
  hsnSacCode?: string;
  baseUnitId: EntityId;
  baseUnitName?: string;
  baseUnitSymbol?: string;
  taxCategoryId?: EntityId;
  isTaxInclusive: boolean;
  purchasePrice: number;
  sellingPrice: number;
  mrp?: number;
  minimumSellingPrice?: number;
  reorderLevel: number;
  reorderQuantity?: number;
  isStockTracked: boolean;
  trackingMethod: 'none' | 'batch' | 'serial';
  valuationMethod: 'fifo' | 'moving_average' | 'standard';
  isActive: boolean;
  totalStock?: number;
  defaultVariantId?: EntityId;
  variants?: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
}

export interface ProductCategory {
  id: EntityId;
  tenantId: EntityId;
  parentId?: EntityId;
  name: string;
  code?: string;
  slug?: string;
  description?: string;
  isActive: boolean;
  productCount?: number;
  createdAt: string;
}

export interface UnitOfMeasure {
  id: EntityId;
  name: string;
  symbol: string;
  code?: string;
  unitType?: string;
  isActive: boolean;
}

export interface TaxRate {
  id: EntityId;
  taxCategoryId: EntityId;
  name: string;
  ratePercentage: number;
  isActive: boolean;
}

export interface TaxCategory {
  id: EntityId;
  tenantId?: EntityId;
  name: string;
  code: string;
  taxType: string;
  isExempt: boolean;
  rates?: TaxRate[];
}

// === Inventory & Warehouse Management ===

export interface InventoryLocation {
  id: EntityId;
  tenantId: EntityId;
  businessLocationId?: EntityId;
  name: string;
  code: string;
  locationType?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface StockAdjustmentLine {
  id: EntityId;
  adjustmentId?: EntityId;
  variantId: EntityId;
  unitId: EntityId;
  adjustmentType: 'increase' | 'decrease';
  quantity: number;
  unitCost?: number;
}

export interface StockAdjustment {
  id: EntityId;
  tenantId: EntityId;
  inventoryLocationId: EntityId;
  adjustmentNumber: string;
  reason: string;
  status: 'draft' | 'posted';
  lines: StockAdjustmentLine[];
  createdAt: string;
}

export interface StockTransferLine {
  id: EntityId;
  transferId?: EntityId;
  variantId: EntityId;
  unitId: EntityId;
  quantity: number;
}

export interface StockTransfer {
  id: EntityId;
  tenantId: EntityId;
  sourceLocationId: EntityId;
  destinationLocationId: EntityId;
  transferNumber: string;
  status: 'draft' | 'in_transit' | 'completed' | 'cancelled';
  transferDate: string;
  lines: StockTransferLine[];
  createdAt: string;
}

// === Party & CRM ===

export type PartyType = 'customer' | 'supplier' | 'both' | 'transporter';

export interface Party {
  id: EntityId;
  tenantId: EntityId;
  partyType: PartyType;
  displayName: string;
  legalName?: string;
  phone?: string;
  email?: string;
  pan?: string;
  gstin?: string;
  billingAddress?: string;
  openingBalance: number;
  openingBalanceType: 'debit' | 'credit';
  currentBalance?: number;
  isActive: boolean;
  createdAt: string;
}

// === Expenses & Financial Master ===

export interface ExpenseCategory {
  id: EntityId;
  tenantId: EntityId;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface Expense {
  id: EntityId;
  tenantId: EntityId;
  expenseCategoryId: EntityId;
  categoryName?: string;
  businessLocationId?: EntityId;
  expenseNumber: string;
  expenseDate: string;
  amount: number;
  taxAmount: number;
  paymentMode: string;
  payee?: string;
  description?: string;
  createdAt: string;
}

// === Dashboard & Reports ===

export interface DashboardMetrics {
  todaySales: number;
  todayInvoicesCount: number;
  totalReceivables: number;
  totalPayables: number;
  lowStockCount: number;
  totalProductsCount: number;
  totalStockValuation: number;
  recentInvoices: SalesInvoice[];
  recentMovements: StockMovement[];
}


