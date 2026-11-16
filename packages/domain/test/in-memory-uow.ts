import {
  UnitOfWork,
  UnitOfWorkContext,
  InvoiceRepository,
  InventoryRepository,
  PartyLedgerRepository,
  OutboxRepository,
  RentalRepository,
} from '../src/ports/repositories.js';
import { RentalIssue, RentalReturn, RentalSettings, DEFAULT_RENTAL_SETTINGS } from '../src/entities/rental-types.js';
import {
  SalesInvoice,
  InvoiceStatus,
  StockBalance,
  StockMovement,
  PartyLedgerEntry,
  OutboxEvent,
  EntityId,
  InventoryLocation,
  Party,
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
  public locations: InventoryLocation[] = [];
  public parties = new Map<string, Party>();
  public rentalIssues = new Map<string, RentalIssue>();
  public rentalReturns = new Map<string, RentalReturn>();
  public rentalSettings = new Map<string, RentalSettings>();

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
    const locationsSnapshot = [...this.locations];
    const rentalIssuesSnapshot = new Map(
      Array.from(this.rentalIssues.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
    );
    const rentalReturnsSnapshot = new Map(
      Array.from(this.rentalReturns.entries()).map(([k, v]) => [k, JSON.parse(JSON.stringify(v))])
    );

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
      listLocations: async (tenantId: EntityId) => this.locations.filter((l) => l.tenantId === tenantId),
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
      findById: async (tenantId: EntityId, id: EntityId) => {
        const p = this.parties.get(id);
        return p && p.tenantId === tenantId ? JSON.parse(JSON.stringify(p)) : null;
      },
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

    const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
    const rentalRepo: RentalRepository = {
      getSettings: async (tenantId) => ({ ...DEFAULT_RENTAL_SETTINGS, ...(this.rentalSettings.get(tenantId) || {}) }),
      saveSettings: async (tenantId, settings) => {
        this.rentalSettings.set(tenantId, { ...settings });
      },
      ensureOnRentLocation: async (tenantId) => {
        let loc = this.locations.find((l) => l.tenantId === tenantId && l.locationType === 'on_rent');
        if (!loc) {
          loc = {
            id: `${tenantId}-on-rent`,
            tenantId,
            name: 'On Rent',
            code: 'ON-RENT',
            locationType: 'on_rent',
            isDefault: false,
            isActive: true,
            createdAt: new Date().toISOString(),
          };
          this.locations.push(loc);
        }
        return clone(loc);
      },
      nextNumber: async (tenantId, kind) => {
        const count =
          kind === 'issue'
            ? Array.from(this.rentalIssues.values()).filter((i) => i.tenantId === tenantId).length
            : Array.from(this.rentalReturns.values()).filter((r) => r.tenantId === tenantId).length;
        return `${kind === 'issue' ? 'RI' : 'RR'}-${String(count + 1).padStart(4, '0')}`;
      },
      saveIssue: async (issue) => {
        this.rentalIssues.set(issue.id, clone(issue));
      },
      findIssueById: async (tenantId, id) => {
        const i = this.rentalIssues.get(id);
        return i && i.tenantId === tenantId ? clone(i) : null;
      },
      listIssues: async (tenantId, filter) =>
        Array.from(this.rentalIssues.values())
          .filter((i) => i.tenantId === tenantId)
          .filter((i) => !filter?.partyId || i.partyId === filter.partyId)
          .filter((i) => !filter?.statuses || filter.statuses.includes(i.status))
          .map(clone),
      saveReturn: async (ret) => {
        this.rentalReturns.set(ret.id, clone(ret));
      },
      findReturnById: async (tenantId, id) => {
        const r = this.rentalReturns.get(id);
        return r && r.tenantId === tenantId ? clone(r) : null;
      },
      listReturns: async (tenantId, issueId) =>
        Array.from(this.rentalReturns.values())
          .filter((r) => r.tenantId === tenantId && r.issueId === issueId)
          .map(clone),
      findReturnByInvoiceId: async (tenantId, invoiceId) => {
        const r = Array.from(this.rentalReturns.values()).find(
          (x) => x.tenantId === tenantId && x.salesInvoiceId === invoiceId
        );
        return r ? clone(r) : null;
      },
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
        rentals: rentalRepo,
      });
    } catch (error) {
      // Rollback: restore snapshots
      this.invoices = invoicesSnapshot;
      this.balances = balancesSnapshot;
      this.movements = movementsSnapshot;
      this.partyLedger = partyLedgerSnapshot;
      this.outboxEvents = outboxSnapshot;
      this.locations = locationsSnapshot;
      this.rentalIssues = rentalIssuesSnapshot;
      this.rentalReturns = rentalReturnsSnapshot;
      throw error;
    }
  }
}
