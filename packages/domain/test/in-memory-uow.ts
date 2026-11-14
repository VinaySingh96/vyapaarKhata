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
      recordMovement: async (movement: StockMovement) => {
        this.movements.push(JSON.parse(JSON.stringify(movement)));
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

    try {
      return await work({
        invoices: invoiceRepo,
        inventory: inventoryRepo,
        partyLedger: partyLedgerRepo,
        outbox: outboxRepo,
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
