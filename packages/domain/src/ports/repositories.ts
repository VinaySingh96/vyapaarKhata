import {
  SalesInvoice,
  InvoiceStatus,
  StockMovement,
  StockBalance,
  PartyLedgerEntry,
  OutboxEvent,
  PurchaseOrder,
  PurchaseReceipt,
  PurchaseBill,
  Payment,
  PaymentAllocation,
  EntityId,
} from '../entities/types.js';

export interface InvoiceRepository {
  findById(tenantId: EntityId, id: EntityId): Promise<SalesInvoice | null>;
  save(invoice: SalesInvoice): Promise<void>;
  updateStatus(tenantId: EntityId, id: EntityId, status: InvoiceStatus, timestamp: string): Promise<void>;
}

export interface InventoryRepository {
  getBalance(tenantId: EntityId, productId: EntityId, locationId: EntityId): Promise<StockBalance | null>;
  recordMovement(movement: StockMovement): Promise<void>;
  updateBalance(balance: StockBalance): Promise<void>;
  listMovementsByDocument(tenantId: EntityId, documentId: EntityId): Promise<StockMovement[]>;
}

export interface PartyLedgerRepository {
  recordEntry(entry: PartyLedgerEntry): Promise<void>;
  listEntriesByDocument(tenantId: EntityId, documentId: EntityId): Promise<PartyLedgerEntry[]>;
}

export interface OutboxRepository {
  recordEvent(event: OutboxEvent): Promise<void>;
}

export interface PurchasingRepository {
  findOrderById(tenantId: EntityId, id: EntityId): Promise<PurchaseOrder | null>;
  saveOrder(order: PurchaseOrder): Promise<void>;
  findReceiptById(tenantId: EntityId, id: EntityId): Promise<PurchaseReceipt | null>;
  saveReceipt(receipt: PurchaseReceipt): Promise<void>;
  findBillById(tenantId: EntityId, id: EntityId): Promise<PurchaseBill | null>;
  saveBill(bill: PurchaseBill): Promise<void>;
}

export interface PaymentRepository {
  findPaymentById(tenantId: EntityId, id: EntityId): Promise<Payment | null>;
  savePayment(payment: Payment): Promise<void>;
  recordAllocation(allocation: PaymentAllocation): Promise<void>;
}

export interface UnitOfWorkContext {
  invoices: InvoiceRepository;
  inventory: InventoryRepository;
  partyLedger: PartyLedgerRepository;
  outbox: OutboxRepository;
  purchasing: PurchasingRepository;
  payments: PaymentRepository;
}

export interface UnitOfWork {
  runInTransaction<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T>;
}

