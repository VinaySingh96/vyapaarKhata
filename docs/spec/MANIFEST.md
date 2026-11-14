# vyapaarKhata — Specification Manifest & Canonical Baseline

## Baseline Summary
* **Date Approved:** 2026-11-15
* **Canonical Schema File:** `docs/spec/03-vyapaarkhata-schema.dbml` / `docs/spec/schema.sql`
* **Table Count:** Exactly 96 tables
* **Foreign Key References:** Exactly 180 references
* **PRD:** `docs/spec/01-vyapaarkhata-prd.md` (818 lines)
* **HLD:** `docs/spec/02-vyapaarkhata-hld.md` (1,159 lines)
* **Table Inventory:** `docs/spec/04-schema-table-list.csv` (96 data rows)
* **Reconciliation Record:** `docs/spec/05-schema-reconciliation.md`

## Scope & Exclusions
* **Excluded Workflows (Deferred/Out-of-MVP):** 6 delivery/dispatch/fleet tables (`vehicles`, `drivers`, `deliveries`, `delivery_challans`, `delivery_challan_lines`, `delivery_trips`) and e-way bill generation.
* **Architecture:** Modular monolith. Single authoritative local node on macOS/Windows (PostgreSQL) or Android (SQLite). Offline-first with transactional outbox event sync.
* **Negative Stock Policy:** Strict reject on negative balance with configurable low-stock threshold warning.
