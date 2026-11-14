# DB-02: Database Data Types, Numeric Precision, and Physical Constraints ADR

## Status
Proposed for physical migrations (Preserves canonical DBML text)

## Context
In the canonical DBML (`docs/spec/03-vyapaarkhata-schema.dbml`), several quantitative and monetary columns are represented as `varchar` or untyped numeric syntax (e.g., `rate varchar`, `quantity varchar`, `total_amount varchar`, `balance varchar`). Storing financial amounts and stock quantities as `varchar` in real databases causes:
- Failure of database-level aggregation (`SUM()`, `AVG()`).
- Inability to enforce sign constraints (`CHECK (quantity >= 0)` or strict non-negative balance invariants).
- Flawed alphanumeric sorting and range queries.

## Decision
1. **Logical Schema Preservation:** The canonical DBML text remains unchanged to maintain historical fidelity and dbdiagram.io compatibility.
2. **PostgreSQL Physical Types:**
   - **Monetary Amounts & Totals:** `numeric(15, 2)` (e.g., `subtotal`, `tax_amount`, `discount_amount`, `grand_total`, `allocated_amount`, `party_balance`).
   - **Quantities & Conversions:** `numeric(18, 4)` (e.g., `quantity`, `received_quantity`, `conversion_factor`, `stock_balance`).
   - **Tax Rates & Percentages:** `numeric(6, 4)` (e.g., `gst_rate`, `discount_percentage`).
   - **Identifiers:** Native `uuid` with `uuid_generate_v4()` or application-generated UUID v4.
   - **Timestamps:** `timestamptz` (UTC timestamp with time zone).
   - **JSON / Metadata:** `jsonb` for queryable configuration and document snapshot payload.
3. **SQLite Physical Types:**
   - **Monetary & Quantitative Fields:** `NUMERIC` (or 64-bit integer scaled to paise/micro-units where strict fixed-point arithmetic is required).
   - **Identifiers & Timestamps:** `TEXT` (ISO 8601 strings and standard UUID strings).
   - **JSON Metadata:** `TEXT` with SQLite `json_extract()` capability.
4. **Tenant Isolation Invariants:**
   - Every transactional and master entity (products, parties, movements, invoices, payments, journals) must include a non-nullable `tenant_id` foreign key referencing `tenants(id)`.
   - Unique constraints on business documents must be composite with `tenant_id` (e.g., `UNIQUE(tenant_id, invoice_number)`).

## Consequences
- Guarantees financial precision without floating-point inaccuracies.
- Safe, standard migration foundation for both PostgreSQL and SQLite.
