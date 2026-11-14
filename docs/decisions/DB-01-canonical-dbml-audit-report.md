# DB-01: Canonical DBML Audit and Freeze Report

## Audit Metadata
* **Audit Execution Date:** 2026-11-15
* **Target Schema:** `docs/spec/03-vyapaarkhata-schema.dbml` / `docs/spec/schema.sql`
* **Auditor:** Coordinator & Schema Verification Suite (`packages/db/src/audit-schema.ts`)

## Invariants Verified
| Check | Requirement | Result | Status |
|---|---|---|---|
| **Table Count** | Exactly 96 tables | 96 tables detected | PASS |
| **Reference Count** | Exactly 180 foreign key references | 180 references detected | PASS |
| **Removed Fleet/Dispatch Tables** | Exactly 6 tables removed (`vehicles`, `drivers`, `deliveries`, `delivery_challans`, `delivery_challan_lines`, `delivery_trips`) | 0 found in schema | PASS |
| **Primary Server Representation** | `installations.is_primary` present | Present (`boolean [not null, default: false]`) | PASS |
| **Dispatch Column Removal** | `sales_order_lines.dispatched_quantity` removed | Removed (absent) | PASS |
| **Foreign Key Reference Integrity** | All declared `Ref:` endpoints exist and match target table/column | 0 broken references | PASS |

## Conclusion
The logical DBML schema `docs/spec/03-vyapaarkhata-schema.dbml` is **frozen** as the canonical baseline for Phase 1 migrations.
