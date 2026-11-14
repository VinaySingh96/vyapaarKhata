# ADR-002: Dual Database Persistence Strategy (PostgreSQL & SQLite)

## Status
Accepted

## Context
vyapaarKhata must run reliably on:
- Laptop/Desktop: macOS (development) and Windows 10/11 WSL2 / native (production), backed by PostgreSQL for multi-user LAN concurrency.
- Tablet: Android standalone deployment, backed by embedded SQLite for zero-footprint local execution.

Both environments must respect identical business rules, transaction atomicity, and relational constraints.

## Decision
1. **Logical Schema Baseline:** Canonical DBML (`docs/spec/03-vyapaarkhata-schema.dbml`) defines the 96 tables and 180 relations.
2. **Physical Migrations:** Maintain two distinct physical migration streams under `packages/db`:
   - `packages/db/migrations/pg/`: PostgreSQL DDL migrations using standard SQL with `timestamptz`, `uuid`, `numeric(18, 4)`, and JSONB.
   - `packages/db/migrations/sqlite/`: SQLite DDL migrations using compatible types (`TEXT` for UUIDs/timestamps, `INTEGER`/`REAL`/scaled integer text for decimals, strict foreign keys).
3. **Repository Pattern & Unit of Work:** The domain layer accesses persistence exclusively through repository interfaces and Unit of Work abstractions, completely abstracting SQL dialect differences.
4. **Contract Verification:** A shared test suite (`DB-06`) will execute all domain invariants against real PostgreSQL and real SQLite databases before any release.

## Consequences
- No database dialect leaks into business domain code.
- Ensures identical transactional consistency across PostgreSQL and SQLite.
