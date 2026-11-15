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
  Product,
  ProductCategory,
  UnitOfMeasure,
  TaxCategory,
  InventoryLocation,
  StockAdjustment,
  StockTransfer,
  Party,
  PartyType,
  Expense,
  ExpenseCategory,
  DashboardMetrics,
  EntityId,
} from '../entities/types.js';

export interface InvoiceRepository {
  findById(tenantId: EntityId, id: EntityId): Promise<SalesInvoice | null>;
  list(tenantId: EntityId, limit?: number): Promise<SalesInvoice[]>;
  save(invoice: SalesInvoice): Promise<void>;
  updateStatus(tenantId: EntityId, id: EntityId, status: InvoiceStatus, timestamp: string): Promise<void>;
}

export interface ProductRepository {
  list(tenantId: EntityId, categoryId?: EntityId): Promise<Product[]>;
  findById(tenantId: EntityId, id: EntityId): Promise<Product | null>;
  save(product: Product): Promise<void>;
  listCategories(tenantId: EntityId): Promise<ProductCategory[]>;
  saveCategory(category: ProductCategory): Promise<void>;
  listUnits(): Promise<UnitOfMeasure[]>;
  listTaxCategories(tenantId: EntityId): Promise<TaxCategory[]>;
}

export interface InventoryRepository {
  getBalance(tenantId: EntityId, productId: EntityId, locationId: EntityId): Promise<StockBalance | null>;
  listBalances(tenantId: EntityId, locationId?: EntityId): Promise<StockBalance[]>;
  recordMovement(movement: StockMovement): Promise<void>;
  listMovements(tenantId: EntityId, limit?: number): Promise<StockMovement[]>;
  updateBalance(balance: StockBalance): Promise<void>;
  listMovementsByDocument(tenantId: EntityId, documentId: EntityId): Promise<StockMovement[]>;
  listLocations(tenantId: EntityId): Promise<InventoryLocation[]>;
  saveLocation(location: InventoryLocation): Promise<void>;
  saveAdjustment(adjustment: StockAdjustment): Promise<void>;
  saveTransfer(transfer: StockTransfer): Promise<void>;
}

export interface PartyLedgerRepository {
  recordEntry(entry: PartyLedgerEntry): Promise<void>;
  listEntriesByDocument(tenantId: EntityId, documentId: EntityId): Promise<PartyLedgerEntry[]>;
}

export interface PartyRepository {
  list(tenantId: EntityId, partyType?: PartyType): Promise<Party[]>;
  findById(tenantId: EntityId, id: EntityId): Promise<Party | null>;
  save(party: Party): Promise<void>;
  getBalance(tenantId: EntityId, partyId: EntityId): Promise<number>;
  listLedgerEntries(tenantId: EntityId, partyId: EntityId): Promise<PartyLedgerEntry[]>;
}

export interface OutboxRepository {
  recordEvent(event: OutboxEvent): Promise<void>;
  listPending(tenantId: EntityId, limit?: number): Promise<any[]>;
  markSynced(tenantId: EntityId, eventIds: EntityId[]): Promise<void>;
}

export interface PurchasingRepository {
  listOrders(tenantId: EntityId): Promise<PurchaseOrder[]>;
  findOrderById(tenantId: EntityId, id: EntityId): Promise<PurchaseOrder | null>;
  saveOrder(order: PurchaseOrder): Promise<void>;
  listReceipts(tenantId: EntityId): Promise<PurchaseReceipt[]>;
  findReceiptById(tenantId: EntityId, id: EntityId): Promise<PurchaseReceipt | null>;
  saveReceipt(receipt: PurchaseReceipt): Promise<void>;
  listBills(tenantId: EntityId): Promise<PurchaseBill[]>;
  findBillById(tenantId: EntityId, id: EntityId): Promise<PurchaseBill | null>;
  saveBill(bill: PurchaseBill): Promise<void>;
}

export interface PaymentRepository {
  list(tenantId: EntityId): Promise<Payment[]>;
  findPaymentById(tenantId: EntityId, id: EntityId): Promise<Payment | null>;
  savePayment(payment: Payment): Promise<void>;
  recordAllocation(allocation: PaymentAllocation): Promise<void>;
}

export interface ExpenseRepository {
  list(tenantId: EntityId): Promise<Expense[]>;
  save(expense: Expense): Promise<void>;
  listCategories(tenantId: EntityId): Promise<ExpenseCategory[]>;
  saveCategory(category: ExpenseCategory): Promise<void>;
}

export interface ReportRepository {
  getDashboardMetrics(tenantId: EntityId): Promise<DashboardMetrics>;
  getStockValuation(tenantId: EntityId): Promise<{ variantId: string; productName: string; quantity: number; valuation: number }[]>;
}

export interface StoreSettings {
  tenantId: EntityId;
  storeName: string;
  tradeName?: string;
  legalName?: string;
  gstin?: string;
  phone?: string;
  address?: string;
  currency?: string;
  locale?: string;
  updatedAt?: string;
}

export interface SettingsRepository {
  getSettings(tenantId: EntityId): Promise<StoreSettings>;
  updateSettings(tenantId: EntityId, settings: Partial<StoreSettings>): Promise<StoreSettings>;
}

export interface UnitOfWorkContext {
  invoices: InvoiceRepository;
  products: ProductRepository;
  inventory: InventoryRepository;
  parties: PartyRepository;
  partyLedger: PartyLedgerRepository;
  outbox: OutboxRepository;
  purchasing: PurchasingRepository;
  payments: PaymentRepository;
  expenses: ExpenseRepository;
  reports: ReportRepository;
  settings: SettingsRepository;
}

export interface UnitOfWork {
  runInTransaction<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T>;
}

