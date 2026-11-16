import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryUnitOfWork } from './in-memory-uow.js';
import { InvoicePostingService } from '../src/services/invoice-posting-service.js';
import {
  RentalService,
  suggestRentalDays,
  calculateRentalReturn,
} from '../src/services/rental-service.js';
import { DEFAULT_RENTAL_SETTINGS, RentalIssue } from '../src/entities/rental-types.js';
import { TenantContext } from '../src/entities/types.js';

const T = 'tenant-r';
const tenantContext: TenantContext = { tenantId: T, installationId: 'inst-1' };
const GODOWN = 'loc-godown';
const BALLI = 'var-balli';
const BAMBOO = 'var-bamboo';

function bal(uow: InMemoryUnitOfWork, variantId: string, locationId: string): number {
  return uow.balances.get(`${T}-${variantId}-${locationId}`)?.currentBalance ?? 0;
}

describe('Rental days calculation', () => {
  it('counts issue and return day inclusively by default', () => {
    expect(suggestRentalDays('2026-11-01', '2026-11-10', DEFAULT_RENTAL_SETTINGS)).toBe(10);
  });

  it('supports exclusive counting and a minimum charge', () => {
    expect(suggestRentalDays('2026-11-01', '2026-11-10', { inclusiveDays: false, minDays: 1 })).toBe(9);
    expect(suggestRentalDays('2026-11-01', '2026-11-01', { inclusiveDays: false, minDays: 1 })).toBe(1);
    expect(suggestRentalDays('2026-11-01', '2026-11-02', { inclusiveDays: true, minDays: 7 })).toBe(7);
  });

  it('rejects a return date before the issue date', () => {
    expect(() => suggestRentalDays('2026-11-10', '2026-11-01', DEFAULT_RENTAL_SETTINGS)).toThrow(/before issue date/);
  });
});

describe('RentalService: issue → partial return → complete', () => {
  let uow: InMemoryUnitOfWork;
  let service: RentalService;

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    service = new RentalService(uow, new InvoicePostingService(uow));

    uow.locations.push({
      id: GODOWN,
      tenantId: T,
      businessLocationId: 'bl-1',
      name: 'Main Godown',
      code: 'WH-MAIN',
      locationType: 'warehouse',
      isDefault: true,
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
    uow.parties.set('cust-1', {
      id: 'cust-1',
      tenantId: T,
      partyType: 'customer',
      displayName: 'Sharma Construction',
      openingBalance: 0,
      openingBalanceType: 'debit',
      isActive: true,
      createdAt: '2026-11-01T00:00:00Z',
    });
    for (const [variantId, qty] of [
      [BALLI, 200],
      [BAMBOO, 50],
    ] as const) {
      uow.balances.set(`${T}-${variantId}-${GODOWN}`, {
        id: `bal-${variantId}`,
        tenantId: T,
        productId: variantId,
        variantId,
        locationId: GODOWN,
        currentBalance: qty,
        updatedAt: '2026-11-01T00:00:00Z',
      });
    }
  });

  async function issueSample(): Promise<RentalIssue> {
    return service.issue({
      tenantContext,
      partyId: 'cust-1',
      issueDate: '2026-11-01',
      siteAddress: 'Plot 7, Sector 12',
      lines: [
        { variantId: BALLI, unitId: 'u-pcs', quantity: 150, dailyRate: 1, replacementRate: 80, description: 'Balli 8 ft' },
        { variantId: BAMBOO, unitId: 'u-pcs', quantity: 50, dailyRate: 10, replacementRate: 120, description: 'Bamboo' },
      ],
    });
  }

  it('issue moves stock Godown → On Rent without creating an invoice or ledger entry', async () => {
    const issue = await issueSample();

    expect(issue.issueNumber).toBe('RI-0001');
    expect(issue.status).toBe('open');
    expect(bal(uow, BALLI, GODOWN)).toBe(50);
    expect(bal(uow, BALLI, issue.onRentLocationId)).toBe(150);
    expect(bal(uow, BAMBOO, GODOWN)).toBe(0);
    expect(uow.invoices.size).toBe(0);
    expect(uow.partyLedger.length).toBe(0);
    expect(uow.outboxEvents.map((e) => e.eventType)).toContain('rental.issue.created');
  });

  it('rejects issuing more than available and leaves stock untouched', async () => {
    await expect(
      service.issue({
        tenantContext,
        partyId: 'cust-1',
        issueDate: '2026-11-01',
        lines: [{ variantId: BAMBOO, unitId: 'u-pcs', quantity: 51, dailyRate: 10 }],
      })
    ).rejects.toThrow(/Insufficient stock/);
    expect(bal(uow, BAMBOO, GODOWN)).toBe(50);
    expect(uow.rentalIssues.size).toBe(0);
  });

  it('partial return bills only the returned qty for its days, then complete bills the rest', async () => {
    const issue = await issueSample();
    const balliLine = issue.lines.find((l) => l.variantId === BALLI)!;
    const bambooLine = issue.lines.find((l) => l.variantId === BAMBOO)!;

    // 10 Nov: 50 Balli back (10 days inclusive)
    const r1 = await service.completeReturn({
      tenantContext,
      issueId: issue.id,
      returnDate: '2026-11-10',
      gstRate: 0,
      lines: [{ issueLineId: balliLine.id, qtyReturned: 50 }],
    });
    expect(r1.returnNumber).toBe('RR-0001');
    expect(r1.isFinal).toBe(false);
    expect(r1.rentAmount).toBe(500);
    expect(r1.totalAmount).toBe(500);
    expect(bal(uow, BALLI, GODOWN)).toBe(100);
    expect(bal(uow, BALLI, issue.onRentLocationId)).toBe(100);
    expect(uow.rentalIssues.get(issue.id)!.status).toBe('partially_returned');

    const inv1 = uow.invoices.get(r1.salesInvoiceId!)!;
    expect(inv1.invoiceNumber).toBe('RNT-0001');
    expect(inv1.status).toBe('posted');
    expect(inv1.grandTotal).toBe(500);
    expect(inv1.customerId).toBe('cust-1');
    // Posting a rent bill must not touch stock (no 'sale' movements)
    expect(uow.movements.filter((m) => m.movementType === 'sale').length).toBe(0);
    expect(uow.partyLedger.filter((e) => e.referenceDocumentId === inv1.id)[0].amount).toBe(500);

    // 25 Nov: remaining 100 Balli + 48 Bamboo back, 2 Bamboo lost — with 18% GST
    const r2 = await service.completeReturn({
      tenantContext,
      issueId: issue.id,
      returnDate: '2026-11-25',
      lines: [
        { issueLineId: balliLine.id, qtyReturned: 100 },
        { issueLineId: bambooLine.id, qtyReturned: 48, qtyLost: 2 },
      ],
    });
    // Rent: 100×25×1 + 50×25×10 = 2500 + 12500; loss 2×120 = 240; GST 18% on 15240 = 2743.2
    expect(r2.rentAmount).toBe(15000);
    expect(r2.lossAmount).toBe(240);
    expect(r2.taxAmount).toBe(2743.2);
    expect(r2.totalAmount).toBe(17983.2);
    expect(r2.isFinal).toBe(true);
    expect(uow.rentalIssues.get(issue.id)!.status).toBe('completed');

    expect(bal(uow, BALLI, GODOWN)).toBe(200);
    expect(bal(uow, BAMBOO, GODOWN)).toBe(48);
    expect(bal(uow, BALLI, issue.onRentLocationId)).toBe(0);
    expect(bal(uow, BAMBOO, issue.onRentLocationId)).toBe(0);

    const inv2 = uow.invoices.get(r2.salesInvoiceId!)!;
    expect(inv2.grandTotal).toBe(17983.2);
    expect(inv2.lines.reduce((s, l) => s + l.lineTotal, 0)).toBeCloseTo(17983.2, 2);

    await expect(
      service.completeReturn({ tenantContext, issueId: issue.id, lines: [{ issueLineId: balliLine.id, qtyReturned: 1 }] })
    ).rejects.toThrow(/already completed/);
  });

  it('allows the user to override days per line', async () => {
    const issue = await issueSample();
    const line = issue.lines[0];
    const r = await service.completeReturn({
      tenantContext,
      issueId: issue.id,
      returnDate: '2026-11-10',
      gstRate: 0,
      lines: [{ issueLineId: line.id, qtyReturned: 10, days: 7 }],
    });
    expect(r.lines[0].days).toBe(7);
    expect(r.rentAmount).toBe(70);
  });

  it('rejects returning more than is still on rent', async () => {
    const issue = await issueSample();
    const line = issue.lines.find((l) => l.variantId === BAMBOO)!;
    await expect(
      service.completeReturn({
        tenantContext,
        issueId: issue.id,
        returnDate: '2026-11-05',
        lines: [{ issueLineId: line.id, qtyReturned: 45, qtyLost: 6 }],
      })
    ).rejects.toThrow(/only 50 still on rent/);
    expect(uow.rentalReturns.size).toBe(0);
    expect(uow.invoices.size).toBe(0);
  });

  it('cancelling a return voids its bill and puts the items back on rent', async () => {
    const issue = await issueSample();
    const line = issue.lines.find((l) => l.variantId === BALLI)!;
    const r = await service.completeReturn({
      tenantContext,
      issueId: issue.id,
      returnDate: '2026-11-10',
      lines: [{ issueLineId: line.id, qtyReturned: 50 }],
    });

    await service.cancelReturn({ tenantContext, id: r.id, reason: 'Wrong qty' });

    expect(uow.rentalReturns.get(r.id)!.status).toBe('cancelled');
    expect(uow.invoices.get(r.salesInvoiceId!)!.status).toBe('cancelled');
    expect(bal(uow, BALLI, GODOWN)).toBe(50);
    expect(bal(uow, BALLI, issue.onRentLocationId)).toBe(150);
    const reloaded = uow.rentalIssues.get(issue.id)!;
    expect(reloaded.status).toBe('open');
    expect(reloaded.lines.find((l) => l.id === line.id)!.qtyReturned).toBe(0);
    // Ledger reversed: debit + credit of equal amount
    const entries = uow.partyLedger.filter((e) => e.referenceDocumentId === r.salesInvoiceId);
    expect(entries.map((e) => e.entryType).sort()).toEqual(['credit', 'debit']);
  });

  it('cancelling an untouched issue returns all stock to the godown', async () => {
    const issue = await issueSample();
    await service.cancelIssue({ tenantContext, id: issue.id });
    expect(uow.rentalIssues.get(issue.id)!.status).toBe('cancelled');
    expect(bal(uow, BALLI, GODOWN)).toBe(200);
    expect(bal(uow, BAMBOO, GODOWN)).toBe(50);
  });

  it('refuses to cancel an issue once something was returned', async () => {
    const issue = await issueSample();
    await service.completeReturn({
      tenantContext,
      issueId: issue.id,
      returnDate: '2026-11-03',
      lines: [{ issueLineId: issue.lines[0].id, qtyReturned: 1 }],
    });
    await expect(service.cancelIssue({ tenantContext, id: issue.id })).rejects.toThrow(/already been returned/);
  });

  it('preview matches the posted bill', async () => {
    const issue = await issueSample();
    const input = {
      returnDate: '2026-11-20',
      lines: [{ issueLineId: issue.lines[1].id, qtyReturned: 20, qtyLost: 1 }],
    };
    const preview = calculateRentalReturn(issue, input, DEFAULT_RENTAL_SETTINGS);
    const posted = await service.completeReturn({ tenantContext, issueId: issue.id, ...input });
    expect(posted.totalAmount).toBe(preview.totalAmount);
    expect(preview.suggestedDays).toBe(20);
  });
});
