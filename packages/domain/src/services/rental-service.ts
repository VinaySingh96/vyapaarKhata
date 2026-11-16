import { randomUUID } from 'node:crypto';
import {
  EntityId,
  InventoryLocation,
  SalesInvoice,
  SalesInvoiceLine,
  TenantContext,
} from '../entities/types.js';
import {
  RentalIssue,
  RentalIssueLine,
  RentalIssueStatus,
  RentalReturn,
  RentalReturnLine,
  RentalSettings,
} from '../entities/rental-types.js';
import { RentalRepository, UnitOfWork, UnitOfWorkContext } from '../ports/repositories.js';
import { InvoicePostingService } from './invoice-posting-service.js';

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export interface IssueRentalCommand {
  tenantContext: TenantContext;
  partyId: EntityId;
  issueDate?: string; // YYYY-MM-DD, defaults to today
  sourceLocationId?: EntityId; // defaults to the tenant's default godown
  siteAddress?: string;
  depositAmount?: number;
  notes?: string;
  lines: Array<{
    variantId: EntityId;
    unitId: EntityId;
    quantity: number;
    dailyRate: number;
    replacementRate?: number;
    description?: string;
  }>;
  timestamp?: string;
}

export interface RentalReturnLineInput {
  issueLineId: EntityId;
  qtyReturned?: number;
  qtyLost?: number;
  /** Rent days for this line; defaults to the days suggested from issue/return dates. */
  days?: number;
  /** Per-unit charge for lost/damaged items; defaults to the line's replacement rate. */
  lossRate?: number;
}

export interface RentalReturnCommand {
  tenantContext: TenantContext;
  issueId: EntityId;
  returnDate?: string; // YYYY-MM-DD, defaults to today
  gstRate?: number; // defaults to settings.defaultGstRate
  notes?: string;
  lines: RentalReturnLineInput[];
  timestamp?: string;
}

export interface CancelRentalCommand {
  tenantContext: TenantContext;
  id: EntityId;
  reason?: string;
  timestamp?: string;
}

export interface RentalReturnPreview {
  returnDate: string;
  suggestedDays: number;
  gstRate: number;
  lines: RentalReturnLine[];
  rentAmount: number;
  lossAmount: number;
  taxAmount: number;
  totalAmount: number;
  isFinal: boolean;
}

// ---------------------------------------------------------------------------
// Pure helpers (exported for UI previews and unit tests)
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const EPS = 1e-9;

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value: string, label: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`Invalid ${label} "${value}"; expected YYYY-MM-DD`);
  }
  const ms = Date.UTC(+value.slice(0, 4), +value.slice(5, 7) - 1, +value.slice(8, 10));
  if (isNaN(ms)) throw new Error(`Invalid ${label} "${value}"`);
  return ms;
}

/** Rent days between issue and return as per tenant rules (inclusive counting + minimum days). */
export function suggestRentalDays(
  issueDate: string,
  returnDate: string,
  settings: Pick<RentalSettings, 'inclusiveDays' | 'minDays'>
): number {
  const diff = Math.round(
    (parseIsoDate(returnDate, 'return date') - parseIsoDate(issueDate, 'issue date')) / 86_400_000
  );
  if (diff < 0) {
    throw new Error(`Return date ${returnDate} cannot be before issue date ${issueDate}`);
  }
  return Math.max(settings.minDays, diff + (settings.inclusiveDays ? 1 : 0));
}

export function outstandingQty(line: RentalIssueLine): number {
  return round4(line.qtyIssued - line.qtyReturned - line.qtyLost);
}

function round4(n: number): number {
  return Math.round(n * 10_000) / 10_000;
}

export function deriveIssueStatus(issue: RentalIssue): RentalIssueStatus {
  if (issue.status === 'cancelled') return 'cancelled';
  if (issue.lines.every((l) => outstandingQty(l) <= EPS)) return 'completed';
  if (issue.lines.some((l) => l.qtyReturned > EPS || l.qtyLost > EPS)) return 'partially_returned';
  return 'open';
}

/**
 * Calculates a return bill without persisting anything.
 * rent = (returned + lost) × days × daily rate; loss = lost × loss rate; GST on both.
 */
export function calculateRentalReturn(
  issue: RentalIssue,
  input: { returnDate?: string; gstRate?: number; lines: RentalReturnLineInput[] },
  settings: RentalSettings
): RentalReturnPreview {
  const returnDate = input.returnDate || todayIsoDate();
  const suggestedDays = suggestRentalDays(issue.issueDate, returnDate, settings);
  const gstRate = input.gstRate ?? settings.defaultGstRate;
  if (gstRate < 0 || gstRate > 100) throw new Error(`Invalid GST rate ${gstRate}`);

  const seen = new Set<string>();
  const lines: RentalReturnLine[] = [];

  for (const li of input.lines) {
    const issueLine = issue.lines.find((l) => l.id === li.issueLineId);
    if (!issueLine) throw new Error(`Rental line ${li.issueLineId} not found on ${issue.issueNumber}`);
    if (seen.has(li.issueLineId)) throw new Error(`Rental line ${li.issueLineId} listed twice`);
    seen.add(li.issueLineId);

    const qtyReturned = Number(li.qtyReturned || 0);
    const qtyLost = Number(li.qtyLost || 0);
    if (qtyReturned < 0 || qtyLost < 0) throw new Error('Return quantities cannot be negative');
    if (qtyReturned + qtyLost <= EPS) continue;

    const label = issueLine.description || issueLine.variantId;
    const outstanding = outstandingQty(issueLine);
    if (qtyReturned + qtyLost > outstanding + EPS) {
      throw new Error(
        `Cannot return ${qtyReturned + qtyLost} of "${label}": only ${outstanding} still on rent`
      );
    }

    const days = li.days ?? suggestedDays;
    if (!Number.isInteger(days) || days < 0) {
      throw new Error(`Days for "${label}" must be a whole number of 0 or more`);
    }
    const lossRate = li.lossRate ?? issueLine.replacementRate;
    if (lossRate < 0) throw new Error(`Loss charge for "${label}" cannot be negative`);

    lines.push({
      id: randomUUID(),
      issueLineId: issueLine.id,
      qtyReturned,
      qtyLost,
      days,
      dailyRate: issueLine.dailyRate,
      rentAmount: round2((qtyReturned + qtyLost) * days * issueLine.dailyRate),
      lossRate,
      lossAmount: round2(qtyLost * lossRate),
      description: issueLine.description,
    });
  }

  if (lines.length === 0) {
    throw new Error('Enter a returned or lost quantity for at least one item');
  }

  const rentAmount = round2(lines.reduce((s, l) => s + l.rentAmount, 0));
  const lossAmount = round2(lines.reduce((s, l) => s + l.lossAmount, 0));
  // Taxed per invoice line (rent and loss are separate lines) so totals match the posted bill exactly
  const taxOf = (amount: number) => round2((amount * gstRate) / 100);
  const taxAmount = round2(lines.reduce((s, l) => s + taxOf(l.rentAmount) + taxOf(l.lossAmount), 0));

  const isFinal = issue.lines.every((l) => {
    const r = lines.find((x) => x.issueLineId === l.id);
    return outstandingQty(l) - (r ? r.qtyReturned + r.qtyLost : 0) <= EPS;
  });

  return {
    returnDate,
    suggestedDays,
    gstRate,
    lines,
    rentAmount,
    lossAmount,
    taxAmount,
    totalAmount: round2(rentAmount + lossAmount + taxAmount),
    isFinal,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class RentalService {
  constructor(
    private readonly uow: UnitOfWork,
    private readonly invoicePosting: InvoicePostingService = new InvoicePostingService(uow)
  ) {}

  /** Items go out: Godown → On Rent. No invoice or ledger entry is created. */
  async issue(command: IssueRentalCommand): Promise<RentalIssue> {
    const { tenantContext } = command;
    const tenantId = tenantContext.tenantId;
    const now = command.timestamp || new Date().toISOString();
    const issueDate = command.issueDate || todayIsoDate();
    parseIsoDate(issueDate, 'issue date');

    if (!command.lines || command.lines.length === 0) {
      throw new Error('Add at least one item to issue on rent');
    }
    const variantIds = new Set<string>();
    for (const l of command.lines) {
      if (!(l.quantity > 0)) throw new Error('Issue quantity must be greater than 0');
      if (!(l.dailyRate >= 0)) throw new Error('Daily rate cannot be negative');
      if (variantIds.has(l.variantId)) throw new Error('Each item can be listed only once per issue');
      variantIds.add(l.variantId);
    }

    return this.uow.runInTransaction(async (ctx) => {
      const rentals = requireRentals(ctx);

      const party = await ctx.parties.findById(tenantId, command.partyId);
      if (!party) throw new Error(`Customer ${command.partyId} not found`);

      const onRent = await rentals.ensureOnRentLocation(tenantId);
      const source = await resolveSourceLocation(ctx, tenantId, command.sourceLocationId);
      if (source.id === onRent.id) throw new Error('Cannot issue from the On Rent location');

      const issueId = randomUUID();
      const issue: RentalIssue = {
        id: issueId,
        tenantId,
        partyId: command.partyId,
        partyName: party.displayName,
        businessLocationId: source.businessLocationId,
        sourceLocationId: source.id,
        onRentLocationId: onRent.id,
        issueNumber: await rentals.nextNumber(tenantId, 'issue'),
        issueDate,
        siteAddress: command.siteAddress,
        status: 'open',
        depositAmount: round2(Number(command.depositAmount || 0)),
        notes: command.notes,
        createdBy: tenantContext.userId,
        createdAt: now,
        lines: command.lines.map((l) => ({
          id: randomUUID(),
          issueId,
          variantId: l.variantId,
          unitId: l.unitId,
          description: l.description,
          qtyIssued: l.quantity,
          qtyReturned: 0,
          qtyLost: 0,
          dailyRate: round2(l.dailyRate),
          replacementRate: round2(Number(l.replacementRate || 0)),
        })),
      };

      for (const line of issue.lines) {
        await moveStock(ctx, {
          tenantId,
          variantId: line.variantId,
          unitId: line.unitId,
          label: line.description,
          fromLocationId: source.id,
          toLocationId: onRent.id,
          quantity: line.qtyIssued,
          referenceType: 'rental_issue',
          referenceId: issueId,
          now,
        });
      }

      await rentals.saveIssue(issue);
      await ctx.outbox.recordEvent({
        id: randomUUID(),
        tenantId,
        eventType: 'rental.issue.created',
        payload: { issueId, issueNumber: issue.issueNumber, partyId: issue.partyId, lines: issue.lines },
        createdAt: now,
        isPublished: false,
      });

      return issue;
    });
  }

  /** Calculates days/amounts for a return without saving anything. */
  async previewReturn(
    command: Omit<RentalReturnCommand, 'notes' | 'timestamp'>
  ): Promise<RentalReturnPreview> {
    return this.uow.runInTransaction(async (ctx) => {
      const rentals = requireRentals(ctx);
      const issue = await loadOpenIssue(rentals, command.tenantContext.tenantId, command.issueId);
      const settings = await rentals.getSettings(command.tenantContext.tenantId);
      return calculateRentalReturn(issue, command, settings);
    });
  }

  /**
   * Partial or full return ("Complete"): On Rent → Godown for returned qty, write-off for lost qty,
   * and a posted RNT- sales invoice for the rent of exactly these quantities and days.
   */
  async completeReturn(command: RentalReturnCommand): Promise<RentalReturn> {
    const { tenantContext } = command;
    const tenantId = tenantContext.tenantId;
    const now = command.timestamp || new Date().toISOString();

    return this.uow.runInTransaction(async (ctx) => {
      const rentals = requireRentals(ctx);
      const issue = await loadOpenIssue(rentals, tenantId, command.issueId);
      const settings = await rentals.getSettings(tenantId);
      const calc = calculateRentalReturn(issue, command, settings);

      const returnId = randomUUID();
      const returnNumber = await rentals.nextNumber(tenantId, 'return');

      // 1. Stock: returned items back to the source godown, lost items written off at On Rent
      for (const rl of calc.lines) {
        const il = issue.lines.find((l) => l.id === rl.issueLineId)!;
        if (rl.qtyReturned > EPS) {
          await moveStock(ctx, {
            tenantId,
            variantId: il.variantId,
            unitId: il.unitId,
            label: il.description,
            fromLocationId: issue.onRentLocationId,
            toLocationId: issue.sourceLocationId,
            quantity: rl.qtyReturned,
            referenceType: 'rental_return',
            referenceId: returnId,
            now,
          });
        }
        if (rl.qtyLost > EPS) {
          await adjustStock(ctx, {
            tenantId,
            variantId: il.variantId,
            unitId: il.unitId,
            locationId: issue.onRentLocationId,
            quantity: -rl.qtyLost,
            referenceType: 'rental_return',
            referenceId: returnId,
            now,
          });
        }
        il.qtyReturned = round4(il.qtyReturned + rl.qtyReturned);
        il.qtyLost = round4(il.qtyLost + rl.qtyLost);
      }

      // 2. Rent bill as a regular sales invoice (ledger, payments, reports work unchanged)
      let salesInvoiceId: EntityId | undefined;
      let invoiceNumber: string | undefined;
      if (calc.totalAmount > 0) {
        const invoice = buildRentalInvoice(issue, calc, {
          id: randomUUID(),
          invoiceNumber: returnNumber.replace(/^RR-/, 'RNT-'),
        });
        await ctx.invoices.save(invoice);
        await this.invoicePosting.postInvoiceInContext(ctx, {
          tenantContext,
          invoiceId: invoice.id,
          timestamp: now,
          skipInventory: true,
        });
        salesInvoiceId = invoice.id;
        invoiceNumber = invoice.invoiceNumber;
      }

      // 3. Persist return + updated issue
      const ret: RentalReturn = {
        id: returnId,
        tenantId,
        issueId: issue.id,
        returnNumber,
        returnDate: calc.returnDate,
        isFinal: calc.isFinal,
        status: 'posted',
        salesInvoiceId,
        invoiceNumber,
        gstRate: calc.gstRate,
        rentAmount: calc.rentAmount,
        lossAmount: calc.lossAmount,
        taxAmount: calc.taxAmount,
        totalAmount: calc.totalAmount,
        notes: command.notes,
        createdBy: tenantContext.userId,
        createdAt: now,
        lines: calc.lines.map((l) => ({ ...l, returnId })),
      };
      await rentals.saveReturn(ret);

      issue.status = deriveIssueStatus(issue);
      issue.updatedAt = now;
      await rentals.saveIssue(issue);

      await ctx.outbox.recordEvent({
        id: randomUUID(),
        tenantId,
        eventType: 'rental.return.completed',
        payload: {
          returnId,
          returnNumber,
          issueId: issue.id,
          issueNumber: issue.issueNumber,
          salesInvoiceId,
          totalAmount: calc.totalAmount,
          isFinal: calc.isFinal,
        },
        createdAt: now,
        isPublished: false,
      });

      return ret;
    });
  }

  /** Undo a return: voids its rent bill and puts the quantities back on rent. */
  async cancelReturn(command: CancelRentalCommand): Promise<RentalReturn> {
    const { tenantContext } = command;
    const tenantId = tenantContext.tenantId;
    const now = command.timestamp || new Date().toISOString();

    return this.uow.runInTransaction(async (ctx) => {
      const rentals = requireRentals(ctx);
      const ret = await rentals.findReturnById(tenantId, command.id);
      if (!ret) throw new Error(`Rental return ${command.id} not found`);
      if (ret.status === 'cancelled') return ret;

      const issue = await rentals.findIssueById(tenantId, ret.issueId);
      if (!issue) throw new Error(`Rental issue ${ret.issueId} not found`);

      if (ret.salesInvoiceId) {
        await this.invoicePosting.cancelInvoiceInContext(ctx, {
          tenantContext,
          invoiceId: ret.salesInvoiceId,
          reason: command.reason || `Rental return ${ret.returnNumber} cancelled`,
          timestamp: now,
          skipInventory: true,
        });
      }

      for (const rl of ret.lines) {
        const il = issue.lines.find((l) => l.id === rl.issueLineId);
        if (!il) throw new Error(`Rental line ${rl.issueLineId} not found`);
        if (rl.qtyReturned > EPS) {
          await moveStock(ctx, {
            tenantId,
            variantId: il.variantId,
            unitId: il.unitId,
            label: il.description,
            fromLocationId: issue.sourceLocationId,
            toLocationId: issue.onRentLocationId,
            quantity: rl.qtyReturned,
            referenceType: 'rental_return_cancellation',
            referenceId: ret.id,
            now,
          });
        }
        if (rl.qtyLost > EPS) {
          await adjustStock(ctx, {
            tenantId,
            variantId: il.variantId,
            unitId: il.unitId,
            locationId: issue.onRentLocationId,
            quantity: rl.qtyLost,
            referenceType: 'rental_return_cancellation',
            referenceId: ret.id,
            now,
          });
        }
        il.qtyReturned = round4(il.qtyReturned - rl.qtyReturned);
        il.qtyLost = round4(il.qtyLost - rl.qtyLost);
      }

      ret.status = 'cancelled';
      ret.cancelledAt = now;
      await rentals.saveReturn(ret);

      issue.status = deriveIssueStatus(issue);
      issue.updatedAt = now;
      await rentals.saveIssue(issue);

      await ctx.outbox.recordEvent({
        id: randomUUID(),
        tenantId,
        eventType: 'rental.return.cancelled',
        payload: { returnId: ret.id, returnNumber: ret.returnNumber, issueId: issue.id, reason: command.reason },
        createdAt: now,
        isPublished: false,
      });

      return ret;
    });
  }

  /** Cancel an issue entered by mistake. Only allowed before anything has been returned. */
  async cancelIssue(command: CancelRentalCommand): Promise<RentalIssue> {
    const { tenantContext } = command;
    const tenantId = tenantContext.tenantId;
    const now = command.timestamp || new Date().toISOString();

    return this.uow.runInTransaction(async (ctx) => {
      const rentals = requireRentals(ctx);
      const issue = await rentals.findIssueById(tenantId, command.id);
      if (!issue) throw new Error(`Rental issue ${command.id} not found`);
      if (issue.status === 'cancelled') return issue;
      if (issue.lines.some((l) => l.qtyReturned > EPS || l.qtyLost > EPS)) {
        throw new Error(
          `Cannot cancel ${issue.issueNumber}: items have already been returned. Cancel those returns first.`
        );
      }

      for (const line of issue.lines) {
        await moveStock(ctx, {
          tenantId,
          variantId: line.variantId,
          unitId: line.unitId,
          label: line.description,
          fromLocationId: issue.onRentLocationId,
          toLocationId: issue.sourceLocationId,
          quantity: line.qtyIssued,
          referenceType: 'rental_issue_cancellation',
          referenceId: issue.id,
          now,
        });
      }

      issue.status = 'cancelled';
      issue.cancelledAt = now;
      issue.updatedAt = now;
      await rentals.saveIssue(issue);

      await ctx.outbox.recordEvent({
        id: randomUUID(),
        tenantId,
        eventType: 'rental.issue.cancelled',
        payload: { issueId: issue.id, issueNumber: issue.issueNumber, reason: command.reason },
        createdAt: now,
        isPublished: false,
      });

      return issue;
    });
  }
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function requireRentals(ctx: UnitOfWorkContext): RentalRepository {
  if (!ctx.rentals) throw new Error('Rental module is not available for this database');
  return ctx.rentals;
}

async function loadOpenIssue(rentals: RentalRepository, tenantId: EntityId, issueId: EntityId): Promise<RentalIssue> {
  const issue = await rentals.findIssueById(tenantId, issueId);
  if (!issue) throw new Error(`Rental issue ${issueId} not found`);
  if (issue.status === 'cancelled' || issue.status === 'completed') {
    throw new Error(`Rental ${issue.issueNumber} is already ${issue.status}`);
  }
  return issue;
}

async function resolveSourceLocation(
  ctx: UnitOfWorkContext,
  tenantId: EntityId,
  requestedId?: EntityId
): Promise<InventoryLocation> {
  const locations = (await ctx.inventory.listLocations(tenantId)).filter((l) => l.locationType !== 'on_rent');
  const loc = requestedId
    ? locations.find((l) => l.id === requestedId)
    : locations.find((l) => l.isDefault) || locations[0];
  if (!loc) {
    throw new Error(requestedId ? `Stock location ${requestedId} not found` : 'No stock location configured');
  }
  return loc;
}

async function moveStock(
  ctx: UnitOfWorkContext,
  m: {
    tenantId: EntityId;
    variantId: EntityId;
    unitId: EntityId;
    label?: string;
    fromLocationId: EntityId;
    toLocationId: EntityId;
    quantity: number;
    referenceType: string;
    referenceId: EntityId;
    now: string;
  }
): Promise<void> {
  const from = await ctx.inventory.getBalance(m.tenantId, m.variantId, m.fromLocationId);
  const fromQty = from ? from.currentBalance : 0;
  if (fromQty + EPS < m.quantity) {
    const where = from?.locationName ? ` at ${from.locationName}` : '';
    throw new Error(
      `Insufficient stock for "${m.label || from?.itemName || m.variantId}"${where}: available ${fromQty}, requested ${m.quantity}`
    );
  }

  await ctx.inventory.recordMovement({
    id: randomUUID(),
    tenantId: m.tenantId,
    productId: m.variantId,
    variantId: m.variantId,
    locationId: m.fromLocationId,
    unitId: m.unitId,
    movementType: 'transfer_out',
    quantity: -m.quantity,
    referenceDocumentType: m.referenceType,
    referenceDocumentId: m.referenceId,
    createdAt: m.now,
  });
  await ctx.inventory.updateBalance({
    id: from?.id || randomUUID(),
    tenantId: m.tenantId,
    productId: m.variantId,
    variantId: m.variantId,
    locationId: m.fromLocationId,
    currentBalance: round4(fromQty - m.quantity),
    reorderLevel: from?.reorderLevel,
    updatedAt: m.now,
  });

  await adjustStock(ctx, {
    tenantId: m.tenantId,
    variantId: m.variantId,
    unitId: m.unitId,
    locationId: m.toLocationId,
    quantity: m.quantity,
    referenceType: m.referenceType,
    referenceId: m.referenceId,
    now: m.now,
    movementType: 'transfer_in',
  });
}

async function adjustStock(
  ctx: UnitOfWorkContext,
  a: {
    tenantId: EntityId;
    variantId: EntityId;
    unitId: EntityId;
    locationId: EntityId;
    quantity: number; // signed
    referenceType: string;
    referenceId: EntityId;
    now: string;
    movementType?: 'transfer_in' | 'adjustment_in' | 'adjustment_out';
  }
): Promise<void> {
  const bal = await ctx.inventory.getBalance(a.tenantId, a.variantId, a.locationId);
  const current = bal ? bal.currentBalance : 0;
  if (current + a.quantity < -EPS) {
    throw new Error(`Insufficient stock to write off ${-a.quantity} units at location ${a.locationId}`);
  }
  await ctx.inventory.recordMovement({
    id: randomUUID(),
    tenantId: a.tenantId,
    productId: a.variantId,
    variantId: a.variantId,
    locationId: a.locationId,
    unitId: a.unitId,
    movementType: a.movementType || (a.quantity >= 0 ? 'adjustment_in' : 'adjustment_out'),
    quantity: a.quantity,
    referenceDocumentType: a.referenceType,
    referenceDocumentId: a.referenceId,
    createdAt: a.now,
  });
  await ctx.inventory.updateBalance({
    id: bal?.id || randomUUID(),
    tenantId: a.tenantId,
    productId: a.variantId,
    variantId: a.variantId,
    locationId: a.locationId,
    currentBalance: round4(current + a.quantity),
    reorderLevel: bal?.reorderLevel,
    updatedAt: a.now,
  });
}

function buildRentalInvoice(
  issue: RentalIssue,
  calc: RentalReturnPreview,
  ids: { id: EntityId; invoiceNumber: string }
): SalesInvoice {
  const lines: SalesInvoiceLine[] = [];
  const taxOf = (amount: number) => round2((amount * calc.gstRate) / 100);

  for (const rl of calc.lines) {
    const il = issue.lines.find((l) => l.id === rl.issueLineId)!;
    const name = il.description || 'Rental item';
    const qty = rl.qtyReturned + rl.qtyLost;
    const unit = il.unitSymbol || 'pcs';

    if (rl.rentAmount > 0) {
      const tax = taxOf(rl.rentAmount);
      lines.push({
        id: randomUUID(),
        productId: il.variantId,
        variantId: il.variantId,
        locationId: issue.onRentLocationId,
        quantity: qty,
        unitId: il.unitId,
        unitPrice: round2(rl.days * rl.dailyRate),
        taxAmount: tax,
        lineTotal: round2(rl.rentAmount + tax),
        description: `Rent: ${name} (${qty} ${unit} × ${rl.days} days @ ₹${rl.dailyRate}/day)`,
      });
    }
    if (rl.lossAmount > 0) {
      const tax = taxOf(rl.lossAmount);
      lines.push({
        id: randomUUID(),
        productId: il.variantId,
        variantId: il.variantId,
        locationId: issue.onRentLocationId,
        quantity: rl.qtyLost,
        unitId: il.unitId,
        unitPrice: rl.lossRate,
        taxAmount: tax,
        lineTotal: round2(rl.lossAmount + tax),
        description: `Lost/Damaged: ${name}`,
      });
    }
  }

  return {
    id: ids.id,
    tenantId: issue.tenantId,
    businessLocationId: issue.businessLocationId,
    invoiceNumber: ids.invoiceNumber,
    invoiceDate: calc.returnDate,
    customerId: issue.partyId,
    status: 'draft',
    subtotal: round2(calc.rentAmount + calc.lossAmount),
    taxTotal: calc.taxAmount,
    grandTotal: calc.totalAmount,
    lines,
  };
}
