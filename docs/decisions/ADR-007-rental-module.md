# ADR-007: Rental Module (Issue → Partial Returns → Rent Bills)

## Status
Accepted

## Context
Some tenants (e.g. centring / shuttering stores) rent items out instead of, or in addition to, selling them. Rent cannot be billed when items are issued because the number of days is unknown, and customers often return items in batches. The buy/sell flow must keep working unchanged, and ADR-004 freezes the 96-table baseline unless a new ADR approves additions.

## Decision
1. **Additive schema (migration `002_rental_module`, PG + SQLite):** four new tables, `rental_issues`, `rental_issue_lines`, `rental_returns`, and `rental_return_lines`. No columns are added to or removed from the baseline tables.
2. **Issue = stock move only.** Issuing moves stock from the source godown to a per-tenant virtual inventory location with `location_type = 'on_rent'` (created on first use). No invoice or ledger entry is created. The daily rate and loss charge are locked on each issue line.
3. **Return = bill.** Each partial or final return moves the returned quantity back to the godown, writes lost quantity off at the On Rent location, and creates a regular **sales invoice** (`RNT-` series) for `(returned + lost) × days × daily rate`, plus loss charges and GST. Days are suggested from the dates (inclusive counting, minimum days) and can be overridden per line. The invoice is posted with `skipInventory: true`, so ledger, payments and reports work unchanged.
4. **Shared code changes are opt-in.**
   - `InvoicePostingService` gains `postInvoiceInContext` / `cancelInvoiceInContext`, which let callers join an open transaction, and an optional `skipInventory` flag that defaults to false. Existing calls behave exactly as before.
   - Product stock totals (`/products`) exclude `on_rent` locations, so items out on rent are never offered for sale.
   - Sales invoice creation/posting ignores `on_rent` locations when picking a default location.
   - Voiding a rent bill from the Sales API returns 409; it must be undone from Rentals, which also restores on-rent quantities.
5. **Per-tenant switch.** The tenant setting `tenant_settings['rental'].enabled` is off by default. While it is off, `/api/v1/rentals/*` (except `/settings`) returns 403 and the UI hides the Rentals menu.

## Consequences
- Tenants that never enable rentals see no behavioural change, and no `on_rent` location exists for them.
- Each return is billed independently, which matches how customers settle partial returns. Interim (monthly) billing for items still out is not supported yet. It would need a `billed_till` date per issue line.
- The security deposit is recorded on the issue for reference only. It is not posted to the ledger.
