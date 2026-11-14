# Phase 1: Database & Schema Freeze Milestone

## Freeze Date
2026-11-15

## Baseline Specification
* **Canonical DBML:** `docs/spec/03-vyapaarkhata-schema.dbml` / `docs/spec/schema.sql`
* **Canonical Table Count:** Exactly 96 tables (102 original tables minus 6 delivery/dispatch/fleet tables).
* **Foreign Key References:** Exactly 180 references, 0 broken links.
* **Primary Authority Indicator:** `installations.is_primary` added.
* **Dispatch Field Removal:** `sales_order_lines.dispatched_quantity` removed.

## Physical Migrations Verified
* **PostgreSQL:** `packages/db/migrations/pg/001_initial_schema.sql`
  - Fully migrated on PostgreSQL 18.4 (`vyapaarkhata_dev` and `vyapaarkhata_test`).
  - 97 tables (96 canonical + `schema_migrations`).
  - Types: `UUID`, `TIMESTAMPTZ`, `NUMERIC(15,2)` for amounts, `NUMERIC(18,4)` for quantities, `JSONB`.
  - Composite indexes and tenant isolation indexes verified.
* **SQLite:** `packages/db/migrations/sqlite/001_initial_schema.sql`
  - Fully tested on SQLite 3.54 in-memory and file-based.
  - 97 tables (96 canonical + `schema_migrations`).
  - Types: `TEXT` (UUID/dates), `NUMERIC`/`INTEGER` (quantities/amounts), `INTEGER` (booleans).
  - Foreign key checks pass with 0 errors.

## Seed & Reference Data
* **PostgreSQL Seeds:** `packages/db/src/seeds/001_reference_seeds.sql`
* **SQLite Seeds:** `packages/db/src/seeds/001_reference_seeds_sqlite.sql`
* **Reference Data Injected:**
  - 1 Default Brand & 1 Default Tenant
  - 1 Primary Installation (`PRIMARY-SERVER-01`, `is_primary = true`)
  - 10 Indian standard units (PCS, NOS, KG, GMS, MTR, SQF, CFT, BOX, BAG, TON)
  - 5 Indian standard GST tax categories (GST 0%, GST 5%, GST 12%, GST 18%, GST 28%) and associated rates
  - 4 Standard system roles (Admin, Manager, Cashier, Accountant)
  - 10 System permission records

## Test Verification
All 12 automated unit and persistence contract tests pass:
- Domain tests: Strict negative stock rejection, low-stock threshold warning.
- Persistence tests: Table counts, foreign key enforcement, idempotent re-seeding, and transaction rollbacks on both PostgreSQL and SQLite engines.

## Status
**Phase 1 is officially FROZEN and COMPLETE.**
No further modifications to schema tables or migrations are permitted without an approved ADR.
Phase 2 (Backend modular monolith foundations and domain modules) is unlocked.
