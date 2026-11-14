import {
  UnitOfWork,
  UnitOfWorkContext,
  InvoiceRepository,
  InventoryRepository,
  PartyLedgerRepository,
  OutboxRepository,
} from '../src/ports/repositories.js';
import {
  SalesInvoice,
  InvoiceStatus,
  StockBalance,
  StockMovement,
  PartyLedgerEntry,
  OutboxEvent,
  EntityId,
} from '../src/entities/types.js';

export class InMemoryUnitOfWork implements UnitOfWork {
  public invoices = new Map<string, SalesInvoice>();
  public balances = new Map<string, StockBalance>();
  public movements: StockMovement[] = [];
  public partyLedger: PartyLedgerEntry[] = [];
  public outboxEvents: OutboxEvent[] = [];
  public purchaseOrders = new Map<string, any>();
  public purchaseReceipts = new Map<string, any>();
  public purchaseBills = new Map<string, any>();
  public paymentsList = new Map<string, any>();
  public allocationsList: any[] = [];

  async runInTransaction<T>(work: (ctx: UnitOfWorkContext) => Promise<T>): Promise<T> {
    // Snapshot state before running transaction to simulate database rollback
    const invoicesSnapshot = new Map(
      Array.from(this.invoices.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
    );
    const balancesSnapshot = new Map(
      Array.from(this.balances.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
    );
    const movementsSnapshot = [...this.movements];
    const partyLedgerSnapshot = [...this.partyLedger];
    const outboxSnapshot = [...this.outboxEvents];

    const invoiceRepo: InvoiceRepository = {
      findById: async (tenantId: EntityId, id: EntityId) => {
        const inv = this.invoices.get(id);
        return inv && inv.tenantId === tenantId ? JSON.parse(JSON.stringify(inv)) : null;
      },
      list: async (tenantId: EntityId) => {
        return Array.from(this.invoices.values()).filter((i) => i.tenantId === tenantId);
      },
      save: async (invoice: SalesInvoice) => {
        this.invoices.set(invoice.id, JSON.parse(JSON.stringify(invoice)));
      },
      updateStatus: async (tenantId: EntityId, id: EntityId, status: InvoiceStatus, timestamp: string) => {
        const inv = this.invoices.get(id);
        if (inv && inv.tenantId === tenantId) {
          inv.status = status;
          if (status === 'posted') inv.postedAt = timestamp;
          if (status === 'cancelled') inv.cancelledAt = timestamp;
        }
      },
    };

    const inventoryRepo: InventoryRepository = {
      getBalance: async (tenantId: EntityId, productId: EntityId, locationId: EntityId) => {
        const key = `${tenantId}-${productId}-${locationId}`;
        const bal = this.balances.get(key);
        return bal ? JSON.parse(JSON.stringify(bal)) : null;
      },
      listBalances: async (tenantId: EntityId) => {
        return Array.from(this.balances.values()).filter((b) => b.tenantId === tenantId);
      },
      recordMovement: async (movement: StockMovement) => {
        this.movements.push(JSON.parse(JSON.stringify(movement)));
      },
      listMovements: async (tenantId: EntityId) => {
        return this.movements.filter((m) => m.tenantId === tenantId);
      },
      updateBalance: async (balance: StockBalance) => {
        const key = `${balance.tenantId}-${balance.productId}-${balance.locationId}`;
        this.balances.set(key, JSON.parse(JSON.stringify(balance)));
      },
      listMovementsByDocument: async (tenantId: EntityId, documentId: EntityId) => {
        return this.movements.filter(
          (m) => m.tenantId === tenantId && m.referenceDocumentId === documentId
        );
      },
      listLocations: async () => [],
      saveLocation: async () => {},
      saveAdjustment: async () => {},
      saveTransfer: async () => {},
    };

    const partyLedgerRepo: PartyLedgerRepository = {
      recordEntry: async (entry: PartyLedgerEntry) => {
        this.partyLedger.push(JSON.parse(JSON.stringify(entry)));
      },
      listEntriesByDocument: async (tenantId: EntityId, documentId: EntityId) => {
        return this.partyLedger.filter(
          (e) => e.tenantId === tenantId && e.referenceDocumentId === documentId
        );
      },
    };

    const outboxRepo: OutboxRepository = {
      recordEvent: async (event: OutboxEvent) => {
        this.outboxEvents.push(JSON.parse(JSON.stringify(event)));
      },
    };

    const purchasingRepo = {
      listOrders: async (tenantId: string) => Array.from(this.purchaseOrders.values()).filter(o => o.tenantId === tenantId),
      findOrderById: async (tenantId: string, id: string) => {
        const o = this.purchaseOrders.get(id);
        return o && o.tenantId === tenantId ? JSON.parse(JSON.stringify(o)) : null;
      },
      saveOrder: async (order: any) => {
        this.purchaseOrders.set(order.id, JSON.parse(JSON.stringify(order)));
      },
      listReceipts: async (tenantId: string) => Array.from(this.purchaseReceipts.values()).filter(r => r.tenantId === tenantId),
      findReceiptById: async (tenantId: string, id: string) => {
        const r = this.purchaseReceipts.get(id);
        return r && r.tenantId === tenantId ? JSON.parse(JSON.stringify(r)) : null;
      },
      saveReceipt: async (receipt: any) => {
        this.purchaseReceipts.set(receipt.id, JSON.parse(JSON.stringify(receipt)));
      },
      listBills: async (tenantId: string) => Array.from(this.purchaseBills.values()).filter(b => b.tenantId === tenantId),
      findBillById: async (tenantId: string, id: string) => {
        const b = this.purchaseBills.get(id);
        return b && b.tenantId === tenantId ? JSON.parse(JSON.stringify(b)) : null;
      },
      saveBill: async (bill: any) => {
        this.purchaseBills.set(bill.id, JSON.parse(JSON.stringify(bill)));
      },
    };

    const paymentRepo = {
      list: async (tenantId: string) => Array.from(this.paymentsList.values()).filter(p => p.tenantId === tenantId),
      findPaymentById: async (tenantId: string, id: string) => {
        const p = this.paymentsList.get(id);
        return p && p.tenantId === tenantId ? JSON.parse(JSON.stringify(p)) : null;
      },
      savePayment: async (payment: any) => {
        this.paymentsList.set(payment.id, JSON.parse(JSON.stringify(payment)));
      },
      recordAllocation: async (alloc: any) => {
        this.allocationsList.push(JSON.parse(JSON.stringify(alloc)));
      },
    };

    const productRepo = {
      list: async () => [],
      findById: async () => null,
      save: async () => {},
      listCategories: async () => [],
      saveCategory: async () => {},
      listUnits: async () => [],
      listTaxCategories: async () => [],
    };

    const partyRepo = {
      list: async () => [],
      findById: async () => null,
      save: async () => {},
      getBalance: async () => 0,
      listLedgerEntries: async () => [],
    };

    const expenseRepo = {
      list: async () => [],
      save: async () => {},
      listCategories: async () => [],
      saveCategory: async () => {},
    };

    const reportRepo = {
      getDashboardMetrics: async () => ({
        todaySales: 0,
        todayInvoicesCount: 0,
        totalReceivables: 0,
        totalPayables: 0,
        lowStockCount: 0,
        totalProductsCount: 0,
        totalStockValuation: 0,
        recentInvoices: [],
        recentMovements: [],
      }),
      getStockValuation: async () => [],
    };

    try {
      return await work({
        invoices: invoiceRepo,
        products: productRepo,
        inventory: inventoryRepo,
        parties: partyRepo,
        partyLedger: partyLedgerRepo,
        outbox: outboxRepo,
        purchasing: purchasingRepo,
        payments: paymentRepo,
        expenses: expenseRepo,
        reports: reportRepo,
      });
    } catch (error) {
      // Rollback: restore snapshots
      this.invoices = invoicesSnapshot;
      this.balances = balancesSnapshot;
      this.movements = movementsSnapshot;
      this.partyLedger = partyLedgerSnapshot;
      this.outboxEvents = outboxSnapshot;
      throw error;
    }
  }
}
