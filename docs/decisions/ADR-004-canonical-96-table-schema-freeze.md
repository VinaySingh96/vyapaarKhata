# ADR-004: Canonical 96-Table Schema Freeze

## Status
Accepted

## Context
The historical schema inventory contained 102 original tables, plus an unverified 108-table CSV which introduced 12 tables not present in the canonical uploaded schema (such as landed cost allocations, opening stock lines, and separate sales/purchase return tables) while omitting 6 dispatch/fleet tables.

## Decision
1. The canonical logical schema is frozen at **exactly 96 tables** and **180 relationships**, as declared in `docs/spec/03-vyapaarkhata-schema.dbml` and `docs/spec/schema.sql`.
2. Exactly 6 delivery/dispatch/fleet tables (`vehicles`, `drivers`, `deliveries`, `delivery_challans`, `delivery_challan_lines`, `delivery_trips`) are excluded from MVP.
3. The dispatch-only column `sales_order_lines.dispatched_quantity` is removed, and `installations.is_primary` is retained.
4. No tables or columns will be added or removed without a formal Architecture Decision Record and user confirmation.

## Consequences
- Single, unambiguous source of truth for Phase 1 database migrations.
- Discrepancies between extended PRD feature descriptions and the 96-table schema are resolved in favor of the canonical schema baseline for MVP.
