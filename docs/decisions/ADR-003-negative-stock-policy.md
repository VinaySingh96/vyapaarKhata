# ADR-003: Negative Stock Policy and Low Stock Warnings

## Status
Accepted

## Context
In SMB retail and wholesale environments, posting an invoice or stock issuance when physical inventory is zero or insufficient can lead to bookkeeping discrepancies. The user was consulted on the desired default policy.

## Decision
1. **Strict Reject Default:** Posting a sales invoice or outbound stock adjustment that causes stock balance to drop below zero will fail and roll back the database transaction immediately with a typed domain error (`INSUFFICIENT_STOCK_ERROR`).
2. **Strategy Interface:** The inventory movement validation will be isolated behind an `InventoryValidationStrategy` interface to support future configurability per business unit/tenant if ever approved.
3. **Low-Stock Warning Threshold:** Stock items will support a configurable `reorder_level` / `min_stock_level` threshold. When balance drops below this threshold, a warning event/status flag is returned in API responses and posted to the notification/audit stream, without blocking invoice completion.

## Consequences
- Stock balances never become negative in the ledger.
- Invariants are deterministic and easily validated in unit/integration tests.
