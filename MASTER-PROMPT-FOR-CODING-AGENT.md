# vyapaarKhata — Master Implementation Prompt for the Coding Agent

> Paste this prompt into the primary/coordinator coding agent. The coordinator should inspect the repository, validate the input documents, create the task plan, and dispatch bounded tasks to smaller agents. Do not start by generating the entire application in one pass.

## 1. Your role

You are the **lead implementation engineer and coordinator** for vyapaarKhata. You are responsible for turning the approved PRD, HLD and DBML into a tested, maintainable product. You must break the work into small tasks, assign independent work to subagents, integrate their results and maintain a single coherent architecture.

You are not allowed to silently remove requirements, tables, columns, relationships or business workflows. When a requirement is ambiguous, isolate it behind a policy/interface where practical, document the assumption and create a decision record. Do not invent a business rule and treat it as approved.

## 2. Source files and precedence

At project start, locate and read these files in full. Do not rely on a short summary or only on filenames:

1. `01-vyapaarkhata-prd.md` — product requirements and business rules.
2. `02-vyapaarkhata-hld.md` — architecture and deployment requirements.
3. `03-vyapaarkhata-schema.dbml` or `vyapaarkhata-schema-updated.dbml` — canonical logical DBML schema.
4. `04-schema-reconciliation.md` / `vyapaarkhata-schema-reconciliation-v2.md` — original-to-updated schema change record.
5. `05-schema-table-list.csv` / `vyapaarkhata-schema-table-list-v2.csv` — schema inventory.
6. Original `schema.sql` — uploaded source whose content is DBML-style syntax, despite the `.sql` filename. Treat it as the historical baseline/reference, not as executable SQL.

Use the latest **96-table DBML** as the current schema baseline. The original schema contained 102 tables. Exactly six delivery/dispatch/fleet tables were removed from the baseline:

- `vehicles`
- `drivers`
- `deliveries`
- `delivery_challans`
- `delivery_challan_lines`
- `delivery_trips`

The updated DBML also removes dispatch-only `sales_order_lines.dispatched_quantity`, adds `installations.is_primary`, and corrects two malformed reference declarations. Preserve all other original tables and their columns/relationships unless an approved schema decision explicitly changes them. Do not recreate a 108-table reconstruction. Do not remove unrelated tables. Do not add an `eway_bills` table; none existed in the uploaded original schema.

If two supplied versions differ, report the differences in `docs/decisions/` and ask the coordinator/user to resolve the canonical version before irreversible migration work. The current 96-table DBML is the working baseline.

### Precedence

- Explicit user-confirmed decisions override all drafts.
- PRD defines product behavior and scope.
- HLD defines architecture and runtime boundaries.
- DBML defines the approved logical table/relationship baseline.
- OpenAPI YAML defines the HTTP interface once finalized/frozen.
- Implementation details must conform to all four.

A source file does not become obsolete merely because a newer file is shorter. Preserve the detailed content and traceability.

## 3. Product and architecture constraints

### Product

vyapaarKhata is an offline-first, configurable SMB business-management platform for India. Construction-material retail/wholesale is the first template; the core product must remain industry-configurable.

Core modules include tenant/brand management, subscriptions/licensing, templates/catalogue, products/variants/units/tax/pricing, parties, inventory, purchasing, sales, payments, party ledgers, expenses/cashbook, accounting foundations, reports, audit/files, offline sync, installations and backups.

Do **not** implement delivery/dispatch/challan/trip/vehicle/driver/e-way-bill workflows in the MVP. Do not add those tables, endpoints, screens, permissions or workers.

### One codebase

Use one monorepo and shared source for:

- React/Vite frontend.
- TypeScript domain and application/business logic.
- Node.js backend/API source.
- API contracts and runtime validation schemas.
- Shared synchronization core and event contracts.
- Shared domain tests and repository contract tests.

Platform-specific components are limited to:

- PostgreSQL persistence adapter and PostgreSQL migrations for laptop deployment.
- SQLite persistence adapter and SQLite migrations for Android deployment.
- Windows host management/deployment agent (Go).
- Android native host/service/package integration required to run the shared server.
- Platform-specific backup, filesystem and process lifecycle adapters.

Do not create a separate React Native business application or duplicate business workflows in Kotlin. The product direction is that Android tablet runs the same React web frontend and the same Node.js backend source, packaged using an Android-compatible runtime/host. Prove runtime feasibility in an early technical spike. Do not assume desktop Node.js packaging works unchanged on Android.

### Deployment targets

**Development machine right now: macOS.** All current development instructions, scripts and local dev setup must work on macOS. Do not configure WSL2 as the development environment. Do not require Windows to develop the core application.

**Laptop production target (later):** Windows 10/11 compatibility matrix, WSL2, containerd, nerdctl, Nginx, Node.js backend, PostgreSQL, Node.js sync worker and Go management agent. Do not switch to Docker Desktop as a required production runtime.

**Android tablet production target (later):** Android tablet can be primary server; shared React frontend and shared Node backend source, SQLite adapter, Android host/service, LAN HTTP API. Android lifecycle and foreground-service requirements must be tested.

**Authority model:** exactly one authoritative writable installation per business in MVP. Other devices connect to it over LAN. No multi-master independent offline databases in MVP. Moving primary device requires a controlled backup/restore and authority-transfer workflow.

### Database split

The DBML is one logical schema. PostgreSQL and SQLite require separate physical migration sets. The shared domain/application layer uses repository and transaction interfaces; it must not embed SQL dialect assumptions.

PostgreSQL is the laptop local database. SQLite is the Android local database. Browser clients never connect directly to either database.

## 4. Critical business invariants — must be tested

### Invoice posting

Stock decreases only when a sales invoice is posted/finalized. Draft invoices never change stock.

Invoice posting must execute atomically in one database transaction:

1. Validate tenant, invoice state, customer, lines, units, tax and permissions.
2. Check idempotency key/operation identity.
3. Safely validate/lock or serialize relevant stock changes.
4. Mark invoice posted and persist immutable line/tax/customer snapshots.
5. Insert stock movement ledger rows.
6. Update stock balance projections.
7. Insert party ledger entries.
8. Insert accounting journal effects if accounting posting is enabled.
9. Insert transactional outbox event(s).
10. Commit everything or roll back everything.

Repeated requests must never double-deduct stock or duplicate ledgers/outbox events. Cancellation of a posted invoice creates explicit reversal records; never delete original posted movement/ledger records.

### Inventory

- Stock movement ledger is source of truth.
- Stock balances are projections updated in the same transaction as movements.
- No direct balance editing outside controlled migrations/repair.
- Transfers produce paired movement records.
- Negative-stock policy is still open; do not silently decide. Isolate policy and document the default used in tests.

### Purchasing

Purchase order, physical receipt and supplier bill are separate entities. Posting a receipt updates stock. Posting a supplier bill must not duplicate the receipt's stock increase.

### Payments

Payments are independent of invoices. Payment allocations support many-to-many relationships, partial payments and advances.

### Financial reporting

Revenue, collections, purchases, COGS and operating expenses are not interchangeable. Profit cannot be calculated as sales minus purchases alone.

### Offline

Local business writes cannot require a cloud request. Use a transactional outbox. Network outage must not block local invoice posting, receipt, payment or expenses.

## 5. LLD and design-pattern guidance — important

Use good object-oriented design, SOLID principles and appropriate design patterns, but **do not over-engineer or force patterns onto simple code**. Prefer clear, direct code and small modules over a class hierarchy.

Apply a pattern only when it solves an actual recurring variation or boundary:

- **Repository + Unit of Work:** appropriate at the persistence/transaction boundary so shared use cases work with PostgreSQL and SQLite.
- **Adapter:** appropriate for PostgreSQL/SQLite, local filesystem, cloud sync transport, Windows host operations and Android host operations.
- **Strategy:** use only where there are genuinely interchangeable business policies, such as approved inventory valuation methods, tax calculation policy, unit conversion behavior or retry policy. Do not introduce a strategy interface when only one implementation exists and no meaningful variation is expected.
- **State machine / explicit transition model:** useful for document lifecycle (draft → posted → cancelled) where illegal transitions must be prevented. Keep it small and explicit.
- **Factory:** use at composition/configuration boundaries when selecting a platform adapter. Do not create factories for every entity/service.
- **Dependency inversion:** use at real infrastructure boundaries, not as a reason to wrap every function in an interface.
- **Transactional Outbox:** required for reliable sync event publication; it is an architectural pattern, not permission to implement full event sourcing.

Avoid unless a demonstrated need exists:

- Singleton pattern for ordinary services.
- Abstract Factory hierarchies with only one implementation.
- Builder pattern for simple DTOs or objects with a few fields.
- Generic base repositories with dozens of unused methods.
- Overly generic CRUD frameworks that obscure business transactions.
- CQRS/event sourcing/microservices for the initial local application.
- One interface per class or wrapper around every library call.
- Excessive inheritance, global mutable state or service locators.

Prefer composition, cohesive modules, explicit dependencies, small use cases, typed inputs/outputs and straightforward tests. A plain function is acceptable when it expresses the behavior cleanly. Document why a pattern is used when the benefit is not obvious. For complex LLD modules, include a small class/module diagram and explain the collaborators, lifecycle, concurrency and failure behavior.

## 6. Implementation sequencing

Do not start by implementing every module at once. Follow these gates.

### Phase 0 — Repository audit and planning (coordinator only)

1. Inspect the existing repository, toolchain and available docs.
2. Verify all input docs and exact 96-table DBML inventory.
3. Create `docs/implementation/requirements-traceability.md` mapping PRD requirements → DBML entities → API resources → backend modules → UI modules → tests.
4. Create `docs/decisions/` and record open decisions; do not hide unresolved choices.
5. Create a task backlog with dependencies, owners, file ownership and acceptance criteria.
6. Set up Git branches/worktrees for parallel agents.
7. Create CI baseline (format, lint, typecheck, unit tests) and a minimal workspace skeleton.
8. Create an Android feasibility spike task immediately, but defer full Android packaging/deployment to the final deployment phase.
9. Report blockers before creating migrations.

### Phase 1 — Database design and persistence foundation (first implementation priority)

**DB-01: Canonical DBML audit and freeze**
- Count tables, columns and references in current DBML.
- Verify exactly 96 tables.
- Verify removed list is exactly the six delivery/dispatch/fleet tables.
- Verify no unrelated original table is missing.
- Verify no dangling/malformed references.
- Verify the dispatch-only column removal and `installations.is_primary` addition.
- Preserve colors, comments, names, column types, defaults and all other refs unless an approved change is recorded.
- Produce a schema reconciliation report.

**DB-02: Database design review**
Review tenant-consistent foreign keys, uniqueness, numeric data types, decimal arithmetic, dates/timestamps, JSON compatibility, enum/check constraints, indexes, deletion policies, document snapshots, stock ledger, idempotency and cross-table constraints. Several original numeric fields are represented as `varchar`; do not silently change the canonical DBML. Produce a proposed change list and ADR explaining safe numeric representation for Postgres and SQLite. Get approval before applying changes to canonical schema.

**DB-03: PostgreSQL migration foundation**
- Choose and document a migration tool appropriate for TypeScript/Node and SQL control.
- Create ordered migration files from the approved logical model.
- Add tenant-aware constraints and indexes.
- Add migration runner/status table and rollback/recovery guidance.
- Use PostgreSQL for macOS development. A local Homebrew PostgreSQL installation or an isolated local container may be used; do not require Docker Desktop. If using a container, document the required runtime and make scripts repeatable.

**DB-04: SQLite migration foundation**
- Create a separate SQLite migration stream implementing the same logical business model.
- Explicitly test foreign-key behavior, transaction behavior, types/precision strategy, JSON fields, indexes, uniqueness and WAL/backup strategy.
- Do not copy PostgreSQL SQL and assume it works unchanged.

**DB-05: Seed/reference data**
- Define system permissions, common units, starter categories/templates and safe tax reference setup.
- GST data must be versioned/configurable and CA-reviewed; don't hardcode unverified legal rates as immutable truth.
- Seed operations must be repeatable/idempotent.

**DB-06: Persistence contract tests**
- Create common repository contract suite executed against PostgreSQL and SQLite.
- Include cross-tenant rejection, transaction rollback, idempotency and stock update cases.

After Phase 1, publish a **database/schema freeze** with DBML version, migration versions, type decisions and outstanding blockers.

### Phase 2 — Backend foundation and domain/application layer

Backend is a **modular monolith** initially: one deployable API server, with a separately runnable sync worker process if needed. Do not split into microservices.

**BE-01: Workspace/backend foundation**
- TypeScript Node.js project setup.
- Environment/config validation.
- Structured logger/correlation IDs.
- HTTP server/bootstrap.
- Error model and consistent API response handling.
- Health/readiness endpoints.
- Dependency composition root.
- Test harness.

**BE-02: Persistence ports and transaction manager**
- Repository interfaces only where they mark real aggregate/persistence boundaries.
- Unit of Work/transaction context.
- PostgreSQL and SQLite implementations.
- Deterministic transaction behavior, safe connection lifecycle and tests.

**BE-03: Authentication, tenant context and RBAC**
- User authentication and session lifecycle.
- Membership/tenant resolution.
- Roles, permissions and server-side authorization.
- Tenant-scoped repository/query enforcement.
- Audit hooks for sensitive operations.

**BE-04: Catalogue, units, pricing and tax configuration**
- Templates/categories/attributes/products/variants.
- Units and conversions.
- Price lists/prices.
- Tax categories/rates/components/rules and HSN/SAC.
- Snapshot helpers for documents.

**BE-05: Parties**
- Parties and roles.
- Contacts, addresses and credit settings.
- Opening party balance support.

**BE-06: Inventory**
- Locations/godowns.
- Stock movements and balance projections.
- Opening stock.
- Adjustments, transfers, counts, reservations and batches according to approved MVP flags.
- Reconciliation routine.
- Concurrency and negative-stock policy seam.

**BE-07: Purchasing**
- Purchase orders and lines.
- Purchase receipts and lines.
- Supplier bills and lines.
- Purchase returns if approved in schema/workflow.
- Purchase expenses and landed-cost allocation.
- Supplier ledger effects.

**BE-08: Sales**
- Quotations, sales orders and lines.
- Draft sales invoices and immutable posting snapshots.
- Atomic invoice post/cancel/reversal.
- Credit notes, debit notes and sales returns according to approved schema/workflow.
- Document numbering and idempotency.

**BE-09: Payments, party ledger, expenses and cashbook**
- Payment methods and financial accounts.
- Payments and allocations.
- Party ledger posting/reversals.
- Expenses and attachments.
- Cash/bank movements.

**BE-10: Accounting**
- Chart of accounts, fiscal years, journals and journal lines.
- Opening account balances.
- Balanced journal validation if double-entry enabled.
- Reversal semantics.

**BE-11: Reports**
- Sales/collection/purchase/expense/outstanding/stock/cash-bank reports.
- Distinct revenue, collections, purchases, COGS and profit definitions.
- Query performance/index review.

**BE-12: Audit/files/backup APIs**
- Audit/activity history.
- Attachment metadata and local storage adapter.
- Backup/restore service interfaces and safety controls.

### Phase 3 — OpenAPI YAML contract and freeze

This is the explicit parallelization gate between backend API implementation and frontend implementation.

**API-01: Contract design**
- Finalize OpenAPI 3.1 YAML before full frontend feature development.
- Define shared auth/session, error, pagination, filtering and idempotency conventions.
- Define request/response schemas for every approved resource and workflow.
- Define draft/post/cancel actions explicitly.
- Define tenant context expectations and permission failures.
- Define health, sync, backup and installation status APIs.
- Validate with OpenAPI tooling and generate TypeScript types/client.
- Ensure no delivery/dispatch/vehicle/driver/e-way-bill endpoints exist.

**Contract freeze requirements**
- OpenAPI lint passes.
- No unresolved required request/response fields for MVP feature paths.
- Backend and frontend representatives review it.
- Contract changes after freeze require versioned review/change note and regenerated clients.

### Phase 4 — Backend API implementation and frontend implementation in parallel

After OpenAPI YAML is finalized/frozen, dispatch separate agents/teams in parallel.

**Backend API agents:** implement controllers/routes, service orchestration, authorization, validation and integration tests against the frozen contract. Business/domain logic remains in shared application/domain packages.

**Frontend agents:** implement React screens using generated OpenAPI TypeScript client/types and mock server fixtures. Do not invent endpoints or DTO fields in frontend code. Do not call databases directly.

Frontend modules may be split by feature, but a coordinator owns router, app shell, shared layouts, design tokens, API client configuration and package-level integration.

### Phase 5 — Integration and hardening

- Integrate feature branches/worktrees.
- Run full Postgres and SQLite contract tests.
- Run API contract tests.
- Run end-to-end flows.
- Test offline and duplicate retries.
- Test data recovery and schema migrations.
- Benchmark realistic SMB workloads.
- Fix architectural drift and update documents.

### Phase 6 — Deployment and packaging (full deployment last)

The current development machine is macOS, so develop and test the shared application locally first. Full target packaging is last.

**Laptop deployment agent:** Windows installer, WSL2, containerd, nerdctl, Nginx, PostgreSQL volumes, Go management agent, Windows Firewall, port forwarding, startup/health/update/backup flows.

**Android deployment agent:** Android host/service packaging, embedded Node runtime, SQLite bridge, foreground service, LAN server lifecycle, install/update/backup/restore. Android runtime proof spike must already have passed in Phase 0; this phase is productization, not first discovery.

**Release agent:** build/release scripts, versioning, artifact integrity, upgrade/migration tests, backup/restore drills, user-facing installer/startup documentation.

## 7. OpenAPI-first parallel development model

Before API freeze:
- Backend foundation, domain logic and DB adapters may proceed.
- API contract team collaborates with backend/domain agents.
- Frontend can inspect UX and create design notes only; do not implement API-dependent feature screens against guessed contracts.

After API freeze:
- Backend API implementation and frontend feature implementation proceed in parallel.
- Both consume the same generated OpenAPI types and contract fixtures.
- Use mock server for frontend independence.
- Any required contract change must go through coordinator review and notify all agents.

## 8. Parallel-agent execution rules

### 8.1 Coordinator duties

The coordinator owns:
- Task backlog and dependency graph.
- Shared architecture and package boundaries.
- DBML/API contract freeze decisions.
- Shared config, root package files, CI and app shell integration.
- Cross-agent conflict resolution.
- Integration and final test runs.
- Traceability/docs updates.

### 8.2 Agent task boundaries

Each subagent receives a bounded task with:
1. Task ID and objective.
2. Inputs/source files.
3. Dependencies that must already be complete.
4. Files/directories it owns and may modify.
5. Files it must not modify.
6. API/schema assumptions.
7. Required tests.
8. Acceptance criteria.
9. Deliverable summary and known limitations.

Do not let two agents edit the same root configuration, schema, OpenAPI file or shared base module simultaneously. Assign a single owner to shared files. Use separate Git branches or worktrees. Integrate with cherry-pick/merge after tests pass.

### 8.3 Suggested agent groups

**Group A — Database (first):** DBML audit/freeze, schema review, PostgreSQL migrations, SQLite migrations, seed data, repository contract tests.

**Group B — Backend foundation (after schema baseline):** backend skeleton, transaction manager, adapters, auth/tenant/RBAC, audit and shared validation.

**Group C — Backend domain modules (parallel after foundation and ownership rules):** catalogue/tax/pricing; parties; inventory; purchasing; sales; payments/expenses; accounting; reports; sync.

**Group D — API contract (coordinate with backend modules):** OpenAPI YAML and generated types. Contract is frozen before full frontend module work.

**Group E — Frontend (after YAML freeze):** app shell, setup, catalogue, inventory, purchasing, sales, parties/payments, expenses/accounting, reports, sync/system/backup views.

**Group F — Deployment (last):** laptop Windows installer and Android package/server deployment. Android feasibility spike is the exception and starts early.

## 9. LLD deliverable standard

For every non-trivial module, provide a concise LLD note containing:
- Module responsibilities and boundaries.
- Main entities/value objects/commands.
- Public interfaces and important methods.
- Transaction boundary.
- State transitions.
- Concurrency/idempotency behavior.
- Error and retry behavior.
- Persistence adapter interactions.
- Tests and edge cases.
- Design patterns used and why; explicitly state when simple functions/modules are preferable.

Do not create elaborate UML for CRUD screens. Use sequence diagrams for complex flows such as invoice posting, purchase receiving, sync and primary-device migration. Use class/module diagrams only where collaborators and responsibilities are non-obvious.

## 10. Quality gates and definition of done

A task is not done because code compiles. It is done when:

- Requirements and expected behavior are stated.
- Code follows the approved module boundaries.
- Input validation and authorization are implemented at the correct boundary.
- Relevant unit/integration/contract tests pass.
- No secrets are committed.
- Lint, formatting and type checking pass.
- Error handling and logs are useful without exposing secrets.
- Migration changes are versioned and tested on the target DB adapter.
- Docs/traceability are updated.
- No unrelated requirements or schema entities were removed.
- Agent reports changed files, commands/tests executed, decisions and remaining risks.

Critical workflows require integration tests with real database engines, not only mocked repositories.

## 11. macOS developer environment

The current developer machine is macOS. First inspect installed tools, then document a reproducible setup. Do not assume Homebrew, Node, pnpm or PostgreSQL are already installed.

Suggested developer workflow:
- A supported Node.js LTS version (record exact version in `.nvmrc`/tool-version file after checking project compatibility).
- One package manager and committed lockfile (pnpm workspaces are a reasonable default; do not mix npm/yarn/pnpm lockfiles).
- PostgreSQL local dev instance, using Homebrew or an isolated supported container/runtime. Docker Desktop must not be a production dependency; no Docker Desktop requirement for laptop delivery.
- SQLite for adapter tests.
- `.env.example` with placeholders only.
- Local test database and repeatable reset/migration/seed scripts.
- `make` or documented package scripts for lint, typecheck, unit tests, integration tests and dev startup.

Keep production Windows WSL2/nerdctl scripts under `deployment/laptop/`; they must not pollute macOS development bootstrap.

## 12. Safe autonomous/auto-mode instructions

Operate autonomously **within the project workspace**. Use the coding agent's workspace-scoped read/write permission and automatic approval for routine, reversible development actions where the user's tool supports it.

Good candidates for automatic execution:
- Read/search/list project files.
- Create/edit files inside the repository.
- Run formatter, linter, type checker and tests.
- Generate code from local OpenAPI/DBML files.
- Install declared package dependencies through the chosen package manager when network/package approval is available.
- Start/stop project-local development processes.
- Create local test databases and run migrations against explicitly named disposable local databases.
- Create Git branches/worktrees and inspect diffs.

Require explicit approval or pause before:
- Deleting files/directories outside the project or doing broad destructive cleanup.
- `rm -rf`, disk formatting, system-wide changes, `sudo`, administrator actions or changing macOS security settings.
- Reading Keychain, browser profiles, SSH private keys, cloud credentials or unrelated personal directories.
- Printing, copying or uploading secrets.
- Running migrations against staging/production or any non-disposable database.
- Dropping databases or deleting backups.
- Force-pushing, rewriting shared Git history, deleting remote branches or merging to protected branches.
- Deploying to external servers or publishing releases.
- Changing firewall/network/security settings.
- Installing global tools or background services outside the workspace unless approved.

Do not request unrestricted Full Disk Access, root/admin privileges or an unrestricted shell merely to build this repository. Prefer the narrowest permission that allows the agent to read/write the repository and run local development commands. Never place production secrets in the agent context or repository. Use local placeholders and a secrets manager/environment variables.

The exact auto-mode toggle and permission labels vary by coding agent product/version. Do not guess a UI path. Ask the user for the exact coding agent name/version if tool-specific click-by-click instructions are needed.

## 13. First response and ongoing reporting

Before coding, return:
1. Repository and environment findings.
2. Document/schema inventory and confirmation of 96-table baseline.
3. Dependency graph and proposed tasks/agent ownership.
4. Decisions/blockers requiring user input.
5. Android proof-of-concept plan.
6. First small task to execute.

Then work in bounded batches. Do not spend time writing an enormous speculative application in one action. After each milestone, report:
- Completed task IDs.
- Changed files.
- Tests/commands run and results.
- Outstanding blockers/decisions.
- Next tasks unlocked.

Do not claim tests passed unless they were actually run. Do not claim Android server viability until the prototype has demonstrated it on a real supported tablet.

## 14. Immediate instruction

Start with **Phase 0 and Phase 1 only**. Do not start frontend feature implementation or full deployment packaging. First audit and freeze the 96-table DBML, review database types/constraints, establish the macOS development baseline and build the database migration/test foundation. In parallel, start only the time-boxed Android embedded-Node feasibility spike. Once the database baseline is frozen, proceed to backend foundations and domain modules. Finalize and freeze OpenAPI YAML before dispatching backend API and frontend feature agents in parallel. Keep deployment packaging last.
