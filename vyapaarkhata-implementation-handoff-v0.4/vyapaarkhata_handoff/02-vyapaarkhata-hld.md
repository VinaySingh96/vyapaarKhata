# vyapaarKhata — High-Level Design (HLD)

**Document version:** 0.3 — Full implementation handoff draft  
**Status:** Review baseline; architecture spike required for Android server runtime  
**Product:** vyapaarKhata  
**Architecture:** One monorepo, shared React frontend, shared TypeScript domain/application layer, shared Node.js backend source, platform-specific host and persistence adapters

---

## 0. Purpose and design rules

This HLD translates the PRD into the system boundaries, runtime architecture, deployment models, storage strategy, transactional workflows, synchronization, security and operational responsibilities required for implementation.

The central decision is to avoid two independently maintained business applications. Laptop and Android are deployment targets of one application. Shared code includes the frontend, domain rules, application use cases, API contracts, validations, permissions and synchronization semantics. Platform-specific code is limited to host lifecycle, native packaging, process management, storage adapters and deployment integration.

The following rules are mandatory:

1. One source repository and one shared set of business rules.
2. A browser never connects directly to a database.
3. One authoritative writable installation per tenant/business in MVP.
4. Local operations must not synchronously depend on cloud availability.
5. Stock movements, invoice posting and financial posting must be transactional and idempotent.
6. PostgreSQL and SQLite are different physical adapters, not assumed to have identical SQL behavior.
7. The logical DBML schema is the review model; production migrations are separate and versioned per database engine.
8. Android server runtime is a product target, but embedded Node.js/runtime feasibility and Android lifecycle behavior must pass a proof of concept before production commitment.
9. Do not add mandatory Redis/Kafka for the initial local installation. PostgreSQL transactions and an outbox are sufficient for the initial architecture.
10. Delivery, dispatch, challan, trip, vehicle, driver and e-way-bill workflows are excluded from MVP.

## 1. System context

### 1.1 Actors

- Business owner and staff using the primary device.
- LAN clients using laptop/tablet/phone browsers.
- Brand/platform operator managing plans, tenants and licensing.
- Cloud synchronization service.
- Cloud subscription/entitlement service.
- Optional cloud backup/object storage.

### 1.2 External systems

- Internet connectivity, required only for cloud sync, activation checks, updates and optional remote services.
- Local network/Wi-Fi/router for LAN clients.
- Operating system services: Windows/WSL2 and Android lifecycle/network APIs.
- Printers and file/PDF facilities as supported by device.

### 1.3 System boundary

The primary local installation owns business transactions and data. Cloud services handle platform control plane, entitlement validation, synchronization, update distribution and optional backups. LAN clients are presentation/API clients; they do not become separate database authorities.

## 2. Deployment modes

### 2.1 Laptop-primary deployment

**Host:** Windows 10/11, supported versions to be established through testing.

**Host-side component:** Go management agent and compact management UI.

**Managed Linux environment:** WSL2.

**Managed services:**
- containerd runtime.
- nerdctl client and service lifecycle.
- Nginx reverse proxy/static asset server.
- Node.js API server.
- PostgreSQL.
- Node.js sync worker.
- Persistent volume(s) for PostgreSQL and uploaded files.

**Network path:** LAN browser client → Windows host port → configured WSL2/nerdctl service network → Nginx → Node.js API/static assets → PostgreSQL.

The application should be managed as a local appliance. The user should not need to open a terminal, run nerdctl commands or manage WSL2 for normal operation.

#### 2.1.1 Installer responsibilities

The standalone `.exe` installer must:
1. Check operating system version, architecture, free disk space, memory and required virtualization support.
2. Detect or enable/configure WSL2 where permitted and guide the user through any required reboot/admin action.
3. Provision a managed Linux distribution/environment.
4. Install or provision containerd and nerdctl in the managed environment.
5. Configure the application network and persistent volumes.
6. Pull or import application images and required dependencies.
7. Configure PostgreSQL storage and initial database creation.
8. Configure Nginx and backend service routing.
9. Install/register the Go management agent on Windows.
10. Configure Windows Firewall and explicit LAN access rules.
11. Configure port forwarding and hostname discovery/fallback IP details.
12. Start services in dependency order.
13. Run readiness and database health checks.
14. Display a connection URL and QR/onboarding flow.
15. Configure supported startup after Windows login/reboot.
16. Provide uninstall/update behavior that protects business data unless the owner explicitly requests data deletion.

The earlier estimated 300–400 MB download size is not an approved system-size requirement. Measure bootstrapper, image download, installed disk size and offline bundle size separately.

#### 2.1.2 Startup order

1. Windows starts the Go management agent.
2. Agent checks/starts the managed WSL2 environment.
3. Agent checks/starts containerd.
4. Agent starts PostgreSQL and waits for database readiness.
5. Agent starts backend/API and Nginx.
6. Agent starts sync worker.
7. Agent checks HTTP readiness, database health, disk availability and worker status.
8. UI reports ready/degraded/unavailable state.

The worker must not start processing before its database and API dependencies are ready. Restart policies and process supervision must be explicit.

#### 2.1.3 Go management agent

The management agent runs outside business containers. It exposes a restricted local management API and owns host-specific orchestration.

Candidate endpoints (final path/schema to be defined in a separate OpenAPI document):
- `GET /api/v1/health`
- `GET /api/v1/services`
- `GET /api/v1/services/health`
- `GET /api/v1/system/resources`
- `GET /api/v1/sync/status`
- `GET /api/v1/updates`
- `POST /api/v1/services/{service}/restart`
- `POST /api/v1/backups`
- `GET /api/v1/backups`

Security requirements:
- Bind management API to loopback by default.
- Authenticate and authorize management requests.
- Allow only predefined service actions.
- Do not expose arbitrary shell commands.
- Do not expose containerd/nerdctl socket to browser or LAN clients.
- Validate service names against an allowlist.
- Audit restart, update and backup/restore operations.

### 2.2 Android-tablet-primary deployment

**Product intent:** the tablet is the server and the business can operate without a laptop.

**Target components:**
- Android host application/service (minimal native Kotlin/Java layer as needed).
- Embedded Android-compatible Node.js runtime or another runtime approach proven to execute the shared Node.js backend.
- Shared Node.js API application bundle.
- Shared React/Vite frontend build served locally by the backend or lightweight static server.
- SQLite database adapter stored in app-protected storage.
- Shared TypeScript domain and application packages.
- Sync worker core running through an Android-compatible execution strategy.
- Foreground-service integration when continuous LAN server availability is required.
- Health/status UI, storage/backup controls and connection address display.

**Do not design Android as a React Native-only business application by default.** The current shared-codebase direction is to serve the same React web frontend and use the same Node.js backend source. A native Android wrapper/host is permitted for OS lifecycle and permissions, but it must not reimplement business rules.

#### 2.2.1 Android runtime proof of concept

Build a vertical-slice prototype before full product implementation. It must prove:
1. A packaged Android app can start the selected Node.js-compatible runtime.
2. The shared Node.js server can bind to loopback and a LAN interface as intended.
3. Shared React assets can be served and opened from the tablet browser.
4. A second device can reach the tablet server over Wi-Fi.
5. SQLite native integration works from the backend execution context.
6. Transactions, foreign keys, indexes and migration behavior work correctly.
7. Required native dependencies can be packaged for supported Android ABIs.
8. A foreground service can keep the server available within Android platform policy.
9. Screen-off, idle, battery optimization, app switch, low-memory termination and reboot are tested.
10. Server health and unavailability are visible to the user.
11. Backup/restore and abrupt process termination do not corrupt business data.
12. The application can be upgraded without losing the database or files.

The choice of Node embedding library/runtime must be made from a working prototype, not from an assumption that a desktop Node binary can be copied to Android. Native addons, SQLite driver compatibility, ABI, application size and OS-policy constraints must be validated.

#### 2.2.2 Android service lifecycle

Android may restrict background processes and may terminate applications. The implementation must:
- Use Android-supported foreground execution for the server mode when needed.
- Explain persistent notification/foreground operation to the user.
- Start and stop service safely.
- Persist database state before graceful shutdown where possible.
- Recover through SQLite journaling/WAL semantics after abrupt termination.
- Detect loss of server process and show unavailable state.
- Provide a user-visible “Start server”/“Stop server” control if OS behavior requires it.
- Re-evaluate service behavior across approved Android versions and vendors.

Do not promise indefinite server availability when Android or the user has force-stopped the app, revoked permissions, disabled the foreground service or powered off the device.

### 2.3 LAN client mode

A laptop or tablet that is not the primary server may use a browser as a client.

- Browser requests go to the primary installation's HTTP API.
- Static assets may be served by the primary installation.
- Authentication/authorization happen on the primary server.
- No client gets database credentials or database network access.
- LAN clients never maintain independently authoritative stock or invoice ledgers.
- When primary device disappears, show a server connection error and retry policy; do not queue hidden conflicting writes in local browser storage.

### 2.4 Authority and primary-device transfer

Only one installation may be primary/writable for a tenant in MVP.

Primary migration sequence:
1. Owner requests handover.
2. Current primary stops accepting new writes or enters controlled maintenance mode.
3. Create consistent database and file backup.
4. Record backup checksum, logical schema version, application version, tenant and source installation.
5. Transfer/import backup on target device.
6. Run integrity and migration checks.
7. Validate tenant identity and record counts/checksums as appropriate.
8. Register target installation as primary.
9. Fence/disable write access on previous primary.
10. Resume business operations on target.

Do not support automatic merging of two divergent offline databases in the initial release. This avoids ambiguous stock, invoice sequence and accounting conflict resolution.

## 3. Shared codebase architecture

### 3.1 Core decision

Use one monorepo. The laptop and Android editions must compile and package the same frontend, domain, application, contracts and backend source wherever possible.

Shared components:
- React frontend and UI components.
- TypeScript domain models and business policies.
- Application use cases/workflows.
- Validation schemas.
- Permissions/authorization policy definitions.
- OpenAPI contract and DTOs.
- Shared sync event contracts and sync core.
- Shared report calculations where practical.
- Shared domain and acceptance test cases.

Platform-specific components:
- PostgreSQL persistence adapter and migrations.
- SQLite persistence adapter and migrations.
- Windows deployment/management agent (Go).
- Android host/service/packaging and native integrations.
- Process supervision and file/system access.

### 3.2 Proposed monorepo

```text
vyapaarkhata/
├── apps/
│   ├── web/                     # Shared React/Vite frontend
│   ├── api-server/              # Shared Node.js/TypeScript backend
│   ├── sync-worker/             # Shared worker entrypoint/core
│   ├── android-host/            # Android host/service/package wrapper
│   └── windows-agent/           # Go host management agent
│
├── packages/
│   ├── domain/                  # Business entities and pure domain rules
│   │   ├── catalogue/
│   │   ├── inventory/
│   │   ├── purchasing/
│   │   ├── sales/
│   │   ├── parties/
│   │   ├── payments/
│   │   ├── accounting/
│   │   └── tax/
│   ├── application/             # Use cases and transaction workflows
│   ├── ports/                   # Repository, transaction and service interfaces
│   ├── contracts/               # API DTOs, events and shared schemas
│   ├── validation/              # Runtime validation schemas
│   ├── authorization/           # Permission definitions and policies
│   ├── sync-core/               # Shared sync state machine and idempotency logic
│   ├── ui/                      # Shared React components/design primitives
│   ├── reporting/               # Shared report calculations
│   └── test-fixtures/           # Domain test fixtures and contract suites
│
├── adapters/
│   ├── postgres/                # PostgreSQL repositories/transaction manager
│   ├── sqlite/                  # SQLite repositories/transaction manager
│   ├── local-files/             # Local attachment/backup storage
│   └── cloud/                   # Cloud API clients
│
├── database/
│   ├── logical/schema.dbml      # Logical review schema
│   ├── postgres/migrations/     # PostgreSQL migrations
│   └── sqlite/migrations/       # SQLite migrations
│
├── openapi/
│   ├── openapi.yaml             # OpenAPI 3.1 entrypoint
│   ├── paths/
│   └── schemas/
│
├── deployment/
│   ├── laptop/                  # WSL2, nerdctl, containerd, Nginx, installer
│   └── android/                 # Android service, permissions, packaging
│
├── docs/
└── tools/
```

Directory naming is a proposal. Preserve the dependency boundaries even if the exact folder names change.

### 3.3 Dependency direction

- Domain packages contain no database-driver, HTTP, Android or Windows dependencies.
- Application packages depend on domain and ports/interfaces.
- Persistence adapters implement ports.
- API controllers call application use cases; they do not embed business workflows.
- Frontend calls API contracts; it does not directly call persistence.
- Host agents call only supported management interfaces.
- Sync core depends on event contracts and persistence ports, not on platform shell APIs.

### 3.4 Backend on Android

The intended design uses the same Node.js backend source on laptop and Android. Android packages a compatible runtime/host. A native Android layer may start the Node runtime and provide lifecycle callbacks, notifications, network information and file access. It must not contain alternative inventory or invoice business logic.

If the technical spike proves the embedded Node.js approach infeasible on the approved Android matrix, return with an architecture decision record comparing alternatives. Do not silently split business logic into a separate Kotlin/React Native implementation.

## 4. Logical layers and responsibilities

### 4.1 Presentation layer

- React/Vite application.
- Responsive laptop/tablet layouts.
- Login/session management.
- Dashboard and module screens.
- Forms, validation messages, search, filters and tables.
- Draft/post/cancel actions with explicit state labels.
- Server, sync and backup status.
- Printing/export presentation.

The UI may perform convenience validation, but the backend is authoritative.

### 4.2 API layer

- HTTP routing and request parsing.
- Authentication and session validation.
- Tenant membership resolution.
- Permission enforcement.
- Input validation.
- Idempotency key processing.
- Calling application use cases.
- Consistent response/error format.
- Correlation/request IDs.

### 4.3 Application layer

- Use-case orchestration.
- Transaction boundary selection.
- Repository operations.
- Authorization context checks.
- Domain event/outbox creation.
- Workflow status transitions.

Examples:
- `CreateQuotation`
- `CreateSalesInvoiceDraft`
- `PostSalesInvoice`
- `CancelSalesInvoice`
- `ReceivePurchaseGoods`
- `PostPurchaseBill`
- `RecordPayment`
- `AllocatePayment`
- `AdjustStock`
- `TransferStock`
- `PostSalesReturn`
- `PostPurchaseReturn`
- `CreateBackup`
- `TransferPrimaryInstallation`

### 4.4 Domain layer

Pure business concepts, calculations and invariants:
- Catalogue/variant rules.
- Unit conversion and precision.
- Stock availability and movement semantics.
- Invoice calculations.
- Tax calculation interfaces/rules.
- Party balance semantics.
- Payment allocation constraints.
- Journal balancing.
- Document lifecycle transition rules.
- Idempotency rules.

No SQL or HTTP logic in domain code.

### 4.5 Persistence and infrastructure layer

- Repository implementations.
- Database transaction manager.
- Migration runner.
- File storage.
- Backup engine.
- Sync transport.
- Local process/host adapters.
- Cloud service clients.

## 5. Database architecture

### 5.1 Logical schema versus physical migrations

`database/logical/schema.dbml` is the human-review logical model. It describes entities, attributes and intended relationships.

It is not a migration file and must not be run directly against either database.

Maintain separate migration streams:
- PostgreSQL migrations for laptop deployment.
- SQLite migrations for Android deployment.

Both implement the same business schema and invariants, but the physical definitions can differ in:
- UUID storage (native UUID vs text/blob representation).
- Decimal storage/scale and arithmetic strategy.
- Timestamp/date representation.
- Enum implementation (native enum/check constraints/text values).
- JSON storage.
- Index syntax and partial index support.
- Foreign-key and deferred-constraint behavior.
- Locking/concurrency strategy.
- Generated IDs and sequence behavior.

Migrations must be versioned and tested independently. The logical DBML and both migration sets must remain synchronized through review and automated schema checks.

### 5.2 PostgreSQL adapter

- PostgreSQL is authoritative local storage for laptop-primary mode.
- Use transactions for all posting workflows.
- Use connection pooling in Node.js backend.
- Apply tenant-aware constraints and indexes.
- Use row locks or an equivalent safe concurrency strategy for stock posting and document numbering.
- Keep database port private to managed application network; do not expose it to LAN clients.
- Use parameterized queries/prepared statements.
- Use database migrations; do not modify production schema manually.

### 5.3 SQLite adapter

- SQLite is authoritative local storage for Android-primary mode.
- Database file resides in protected application storage.
- Enable and verify foreign-key enforcement.
- Use WAL mode only after testing the selected runtime/driver and backup semantics.
- Serialize conflicting writes as needed.
- Use explicit write transactions for posting workflows.
- Avoid unsupported SQL dialect shortcuts and vendor-only query behavior in shared repository code.
- Use a tested native SQLite bridge/driver compatible with the embedded Node runtime and target Android ABIs.
- Implement SQLite backup/export consistently; copying a live database file without a consistent snapshot is not acceptable.

### 5.4 Repository contracts

Define repository interfaces around business operations rather than exposing raw SQL to domain services. Examples:
- `InvoiceRepository`
- `InventoryRepository`
- `PartyRepository`
- `PaymentRepository`
- `PurchaseRepository`
- `JournalRepository`
- `DocumentSequenceRepository`
- `OutboxRepository`
- `InstallationRepository`

Define a transaction abstraction:

```ts
interface UnitOfWork {
  transaction<T>(work: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
```

`TransactionContext` exposes transaction-scoped repositories. The actual adapter controls commit/rollback and lock semantics.

Shared domain/application code must not assume PostgreSQL `SELECT ... FOR UPDATE` exists in SQLite. Define semantic repository operations such as `loadForPosting`, `reserveDocumentNumber` or `applyStockChange` and implement them with each database's capabilities.

### 5.5 Tenant isolation constraints

- Every tenant-owned table should carry `tenant_id` directly or have an enforced parent relationship that makes tenant scope unambiguous.
- Composite unique constraints should include `tenant_id` where uniqueness is tenant-scoped.
- Where possible, composite foreign keys should prevent a child in one tenant from referencing a parent in another tenant.
- The API resolves tenant context from authenticated membership.
- Never trust raw tenant identifiers submitted by a browser without membership validation.
- PostgreSQL row-level security may be evaluated as defense in depth, but application-level scoping and relational constraints remain required.

## 6. Transactional business workflows

### 6.1 Sales invoice draft

- Draft can be created/edited without stock movement.
- Calculate subtotal, discount, taxable amount, tax components, charges and total using decimal-safe arithmetic.
- Store references to catalogue items plus draft snapshots.
- Validate tenant ownership of customer, variant, price list and unit.
- Assign final document number at the approved point in lifecycle (open decision if number is allocated at draft creation or posting).

### 6.2 Invoice posting

Posting is a single transaction on the local primary database.

```text
HTTP request + idempotency key
          |
          v
Authenticate and resolve tenant/user
          |
          v
Check permission and request identity
          |
          v
Begin database transaction
          |
          v
Load invoice and validate DRAFT state
          |
          v
Validate customer, lines, tax, units and document number
          |
          v
Validate stock safely for all stock-tracked lines
          |
          v
Transition invoice to POSTED and persist snapshots
          |
          v
Insert immutable stock movement rows
          |
          v
Update stock balance projections
          |
          v
Insert party ledger entries
          |
          v
Insert accounting journal entries/lines when enabled
          |
          v
Insert outbox event in same transaction
          |
          v
Commit; return posted invoice result
```

Failure at any stage rolls back all changes.

#### 6.2.1 PostgreSQL concurrency

- Lock the relevant balance rows in deterministic order to reduce deadlocks.
- Validate available quantity while holding appropriate locks.
- Update balances and insert movements in one transaction.
- Use consistent lock ordering across all stock-changing use cases.
- Use unique idempotency keys and document constraints.
- Retry serialization/deadlock failures only with bounded retries and a stable idempotency identity.

#### 6.2.2 SQLite concurrency

- Use a write transaction with appropriate SQLite transaction mode.
- Serialize conflicting stock mutations through the connection/transaction strategy.
- Ensure balance validation and update occur under the same transaction.
- Avoid assuming row-level locking.
- Use bounded handling for busy/locked conditions.

#### 6.2.3 Idempotency

- Client supplies or receives a stable idempotency key for a posting command.
- Store operation identity with tenant and operation type.
- A duplicate request returns the existing result or deterministic conflict, never repeats effects.
- Idempotency records must be committed atomically with the posting operation.
- A timeout after commit must be safely retryable.

### 6.3 Invoice cancellation

- Confirm permission and cancellation reason.
- Confirm invoice is posted and not already cancelled.
- Begin transaction.
- Create reversal stock movements for the original movement set.
- Update stock projections.
- Create party ledger reversals and journal reversals as applicable.
- Mark invoice cancelled with timestamp and actor.
- Create outbox event.
- Commit.
- Preserve original invoice and all original movements/entries.

### 6.4 Purchase receipt

- Receipt is distinct from purchase order and supplier bill.
- Post accepted quantities into the selected inventory location.
- Create purchase-receipt stock movements and update balances transactionally.
- Link receipt to purchase order where applicable.
- Repeated receipt-post request must be idempotent.
- Supplier bill must not cause the same stock quantity to be received again.

### 6.5 Supplier bill

- Bill posts supplier liability and tax/accounting effects as configured.
- It may reference a receipt but is a separate document.
- Differences between ordered, received and billed quantities must be visible.
- Bill tax/price snapshots are immutable after posting.

### 6.6 Sales and purchase returns

- Return records reference source invoice/bill where applicable.
- Return quantity must be validated against returnable quantity and policy.
- Accepted sale returns create stock-in movements; damaged/non-restockable items may require a distinct disposition policy.
- Purchase returns create stock-out movements.
- Financial credit/debit and party ledger effects are posted consistently.
- Return posting is transactional and idempotent.

### 6.7 Payment and allocation

- Payment is persisted independently.
- Allocation rows connect payment to one or more documents.
- Enforce sum of allocations not exceeding the available allocatable amount unless an approved adjustment policy applies.
- Support partial allocation and unallocated advances.
- Reverse allocations/payments through explicit reversal records rather than deletion.

### 6.8 Stock transfers and adjustments

- Transfer from one inventory location to another creates paired outbound/inbound movements in one transaction.
- Adjustment requires permission, reason and actor.
- Adjustment posting creates immutable movement rows and updates balances atomically.

## 7. Inventory ledger and valuation

### 7.1 Ledger model

`stock_movements` is the source of truth. Each movement records tenant, location, variant, movement type, quantity, transaction unit, normalized base quantity, reference document, idempotency identity, timestamps and optional reversal link.

`stock_balances` is a derived current-state projection. It exists for fast availability queries but must be reconcilable from the movement ledger.

### 7.2 Reservations and batches

- `stock_reservations` may represent quantities committed to an order/workflow when reservations are enabled.
- Reservation creation/release/consumption must not be confused with physical stock movement.
- `inventory_batches` may represent lot/batch data if batch tracking is enabled.
- MVP inclusion/activation of reservation and batch workflows remains an open decision; schema presence does not automatically mean UI feature is enabled.

### 7.3 Valuation

Inventory valuation method is not finalized. Weighted average and FIFO have different data-model and posting implications. Avoid hardcoding valuation into the movement table alone. If FIFO is selected, valuation layers/cost allocations may be required. If weighted average is selected, maintain a transactional cost projection and historical valuation records as required. Do not implement COGS/profit reports using purchase total minus sales total.

## 8. API architecture and contracts

### 8.1 OpenAPI

- Use OpenAPI 3.1.
- YAML is the source of truth.
- One contract serves laptop and Android local deployments.
- Organize paths and schemas modularly under `openapi/`.
- Generate TypeScript client/types for frontend and backend boundary types.
- Use Swagger UI or equivalent generated documentation.
- Runtime validation is required at HTTP boundaries; generated types alone are not validation.
- Business logic remains handwritten and tested.

### 8.2 API domains

Proposed `/api/v1` domains:
- `/auth`, `/sessions`, `/users`, `/memberships`, `/roles`, `/permissions`
- `/business-profile`, `/business-locations`, `/settings`
- `/catalog-templates`, `/categories`, `/attributes`, `/products`, `/variants`, `/units`, `/conversions`, `/price-lists`
- `/parties`, `/party-ledger`
- `/inventory/locations`, `/inventory/balances`, `/inventory/movements`, `/inventory/adjustments`, `/inventory/transfers`, `/inventory/counts`, `/inventory/reservations`
- `/purchase-orders`, `/purchase-receipts`, `/purchase-bills`, `/purchase-returns`, `/landed-cost`
- `/quotations`, `/sales-orders`, `/sales-invoices`, `/credit-notes`, `/debit-notes`, `/sales-returns`
- `/payment-methods`, `/financial-accounts`, `/payments`, `/payment-allocations`
- `/expense-categories`, `/expenses`
- `/accounts`, `/fiscal-years`, `/journal-entries`, `/reports`
- `/files`, `/audit-logs`, `/activity`
- `/sync/status`, `/sync/retry`, `/backup`, `/installations`

No delivery, dispatch, challan, trip, vehicle, driver or e-way-bill API routes are to be implemented in MVP.

### 8.3 API mutation requirements

- Use explicit draft/post/cancel endpoints or explicit command actions.
- Use idempotency keys on critical posting and payment operations.
- Use optimistic concurrency/version fields for editable drafts where appropriate.
- Return stable error codes and field-level validation messages.
- Enforce tenant and permission checks server-side.
- Never expose persistence-specific SQL/driver behavior to frontend contracts.

## 9. Offline synchronization architecture

### 9.1 Principle

The local primary installation is the authority for operational business writes. Cloud synchronization is asynchronous. The initial product is not multi-master: two disconnected local databases must not both accept authoritative writes for the same tenant.

### 9.2 Transactional outbox

For each sync-worthy business transaction:
1. Write business records.
2. Write stock/party/journal effects as required.
3. Write one or more outbox events in the same transaction.
4. Commit.
5. Worker reads pending events.
6. Worker sends events to cloud with stable event IDs.
7. Cloud deduplicates by tenant/event ID and acknowledges.
8. Worker marks outbox row synced.

A rolled-back business transaction must not leave an outbox event. A committed transaction must not lose its event.

### 9.3 Worker behavior

- Select pending events in stable order per aggregate/stream as required.
- Mark processing with lease/claim semantics so duplicate workers do not process the same event concurrently.
- Use bounded retry with exponential backoff and jitter.
- Preserve event order where aggregate consistency requires it.
- Move repeated failures to a failed/dead-letter state for inspection and retry.
- Expose pending count, oldest pending age, last successful sync and failure count.
- Resume after process restart.

### 9.4 Inbox and deduplication

For inbound events, maintain an inbox record keyed by tenant and event ID. Process event and inbox state atomically. Repeated event delivery must be harmless.

### 9.5 Conflict policy

MVP avoids general-purpose multi-master conflict resolution. Cloud-originating changes must follow explicit ownership rules (for example, subscription entitlements or catalogue/template updates). Business operational data is owned by the primary installation unless an approved command/API workflow defines otherwise.

Conflicts are recorded, observable and resolved through an explicit policy. Do not apply last-write-wins to stock, invoice numbering, payments or accounting ledgers.

### 9.6 Entitlement sync

- Activation and plan state are obtained from cloud when available.
- Last valid entitlement is cached locally.
- Grace behavior is configurable and visible.
- On outage, local business operations continue within the approved grace rules.
- Expiry/revocation must not erase or make business records inaccessible without an explicit product/legal policy.

## 10. Cloud services and control plane

Cloud responsibilities may include:
- Brand and domain configuration.
- Tenant account and subscription management.
- Plan/feature entitlements.
- Installation activation and revocation.
- Sync ingestion/acknowledgment.
- Optional cloud backup/object storage.
- Update manifest and software distribution.
- Platform-level operational monitoring.

Cloud must not become a synchronous dependency of local sales, purchase receipt or payment entry.

## 11. File storage and attachments

- Database stores file metadata, tenant, entity association and storage key.
- Actual content stored in local protected filesystem/app storage.
- Storage adapter abstracts Windows/WSL volume and Android app-private storage.
- Validate filenames, MIME types, file sizes and access permissions.
- Use opaque storage keys; do not trust user-provided paths.
- Backups include referenced files and metadata.
- Optional cloud backup uploads encrypted objects when internet is available.

## 12. Backup and restore architecture

### 12.1 Laptop

- Use database-consistent PostgreSQL backup (logical or physical method selected by operations design).
- Include file attachments and configuration required to restore.
- Store checksum, schema version, app version, tenant and timestamp.
- Use durable backup location independent of the live database volume.

### 12.2 Android

- Use SQLite-consistent backup/snapshot API or a controlled database checkpoint/close procedure.
- Include attachments and application metadata.
- Avoid copying an actively changing database file without a consistency guarantee.
- Keep backup in app-controlled storage and support export to user-selected storage.

### 12.3 Restore

- Stop writes / enter maintenance mode.
- Validate backup checksum and manifest.
- Validate tenant identity and schema compatibility.
- Restore database and files.
- Run integrity checks and migrations.
- Verify required indexes and foreign keys.
- Reconcile stock projections if required.
- Reconcile outbox state using an approved recovery rule.
- Resume service only after health checks pass.

Cloud sync is not a substitute for backup. Restore must be tested in release automation and pilot operations.

## 13. Security architecture

### 13.1 Authentication

- Local sign-in supported without cloud dependency after business setup.
- Passwords stored as secure salted password hashes using a maintained algorithm/library.
- Session/token storage protected on device.
- Session revocation and user deactivation enforced locally.
- Cloud identity/SSO can be added without changing domain authorization boundaries.

### 13.2 Authorization

- Role-based and permission-based authorization.
- Permissions evaluated in backend/API layer for every protected operation.
- Tenant membership is validated on every request.
- Sensitive actions require dedicated permissions and audit.

### 13.3 Network

- Bind services only to required interfaces.
- Database ports remain private.
- Local management API binds to loopback unless a specific secure administration design requires otherwise.
- Use HTTPS for cloud traffic.
- Evaluate secure local LAN transport and certificate/user experience; do not expose unauthenticated write APIs over Wi-Fi.
- Authentication, authorization and CSRF/origin protections must be designed for browser clients.
- Rate-limit login and sensitive endpoints.

### 13.4 Data protection

- Protect local database and backup files.
- Protect credentials, license tokens and sync secrets.
- Do not log secret values.
- Use least privilege for service accounts and file access.
- Provide explicit authorization before generating support bundles that contain business data.

### 13.5 Audit

Record sensitive operations such as invoice posting/cancellation, payment reversal, stock adjustment, user/role changes, backup/restore, installation transfer and security setting changes.

## 14. Multi-tenancy and white-label architecture

- Brand is a product/white-label identity.
- Tenant is one business.
- Brand may have multiple domains.
- Tenant belongs to one brand under the current design.
- Business locations/godowns belong to tenant; they are not separate tenants.
- Every business record is scoped to one tenant.
- Platform operator tables (brands, plans, features) are separate from tenant operational records.
- Tenant-scoped uniqueness is enforced in DB and application.
- Brand/tenant settings control logo, theme, domain and enabled feature presentation without changing core domain behavior.

## 15. Subscription and licensing architecture

- Plans define billing interval and price.
- Features are independent codes.
- Plan-feature records define entitlement and optional limits.
- Tenant subscription records status, start, expiry and trial information.
- Subscription invoice records platform subscription charges, distinct from tenant sales invoices.
- License activation associates entitlement with installation/device as approved.
- Local entitlement cache stores validated entitlement and last validation time.
- Grace period behavior is defined in PRD decision list.

## 16. Observability and support

### 16.1 Health endpoints

Backend should expose readiness and liveness separately where useful:
- API process health.
- Database connectivity.
- Migration/schema readiness.
- Sync worker health.
- Disk/storage capacity.
- Backup status.
- Installation identity and primary/standby role.

### 16.2 Logs and metrics

- Structured logs with timestamp, severity, service, request ID, tenant/installation identifiers where safe, operation ID and error code.
- Do not log secrets or unnecessary PII.
- Track API errors, transaction failures, DB busy/lock errors, sync lag, outbox count, backup failures and service restarts.
- Expose simple user-facing health instead of raw technical log output.

## 17. Printing, exports and document rendering

- Use shared document models and templates where possible.
- Use browser print/PDF generation for common invoice/quotation output.
- Keep brand and tenant business identity in templates.
- Test laptop and Android browser print behavior.
- Native printer integrations are adapters, not separate invoice business logic.
- No delivery challan print templates are required.

## 18. Update and migration strategy

### 18.1 Application updates

- Version frontend/backend/worker/host package compatibly.
- Update installer/package without losing business data.
- Use signed/verified update artifacts where supported.
- Provide release manifest and compatibility information.
- Health check after update.

### 18.2 Database migrations

- Maintain separate PostgreSQL and SQLite migration versions.
- Migrations must be sequential, deterministic and logged.
- Use expand/contract strategy for changes that need compatibility across app versions.
- Backup before risky migrations.
- Avoid destructive drops without explicit data migration and rollback plan.
- Test upgrade from every supported prior release.
- Ensure app does not serve write traffic against a partially migrated database.

### 18.3 Schema drift control

- DBML is the logical review model.
- PostgreSQL/SQLite migrations implement it.
- Add automated checks or generated reports for tables/columns/indexes/constraints across logical schema and adapters.
- Changes to a business entity require coordinated review of DBML, migration sets, repositories, API contracts, tests and docs.

## 19. Testing strategy

### 19.1 Domain tests

Shared tests for:
- Quantity/unit conversion.
- Pricing, discounts and tax arithmetic.
- Invoice lifecycle.
- Stock movement direction and normalization.
- Negative-stock policy once selected.
- Party balance semantics.
- Payment allocation constraints.
- Return quantity constraints.
- Journal balancing.
- Permission policy.
- Sync event identity and order semantics.

### 19.2 Repository contract tests

Run the same contract suite against PostgreSQL and SQLite adapters:
- Create/read/update within tenant.
- Reject cross-tenant relationship.
- Transaction commit/rollback.
- Idempotency uniqueness.
- Document sequence uniqueness.
- Stock balance mutation.
- Movement immutability/reversal.
- Outbox atomicity.
- Foreign-key behavior.

### 19.3 Integration tests

- Concurrent invoice posts for same stock.
- Concurrent document number allocation.
- Duplicate post after HTTP timeout.
- Error injected midway through posting to verify rollback.
- Invoice cancellation/reversal.
- Purchase receipt followed by bill without duplicate stock.
- Partial payment and multi-document allocation.
- Sync duplicate delivery and process restart.
- Backup/restore with attachments.
- Migration from previous app/database versions.

### 19.4 Laptop platform tests

- Installer on clean Windows environment.
- WSL2 provisioning and reboot.
- containerd/nerdctl service startup.
- Nginx/backend/PostgreSQL readiness.
- Port forwarding and Windows Firewall.
- mDNS hostname and IP fallback.
- LAN client connectivity.
- Go agent authorization and allowlist.
- Update, backup and restore.

### 19.5 Android platform tests

- Installation and first boot.
- Embedded Node runtime startup.
- SQLite driver and native ABI compatibility.
- Tablet localhost UI.
- Second device LAN access.
- Foreground service and persistent notification.
- Screen-off/idle and vendor battery optimization.
- Wi-Fi loss/reconnect and IP change.
- Low-memory kill and force-stop behavior.
- Device reboot.
- Database integrity after abrupt termination.
- App upgrade and migration.
- Backup/export/restore.
- Sustained workload and thermal/battery behavior.

## 20. Capacity and performance design

The system is designed for small and medium businesses with one primary device and multiple LAN clients. Do not introduce distributed microservices, Kafka or Redis as mandatory local infrastructure without measured need.

Benchmark and specify:
- Supported catalogue size.
- Invoice count per year and retained ledger size.
- Number of variants and stock locations.
- LAN client concurrency.
- API latency for common flows.
- Database growth and backup duration.
- Sync backlog catch-up rate.
- Laptop CPU/RAM/storage floor.
- Android RAM/storage/CPU floor.

These limits are product decisions and must be derived from testing on target hardware.

## 21. Architecture risks and mitigations

| Risk | Impact | Mitigation / gate |
|---|---|---|
| Embedded Node runtime not viable on target Android | Android server architecture blocked | Early runtime spike; do not defer until after modules are built |
| Android background restrictions | LAN server becomes unavailable | Foreground service, visible status, lifecycle matrix and clear unsupported states |
| SQLite/PostgreSQL differences | Different behavior by platform | Shared domain tests and repository contract tests |
| SQLite native driver incompatible with embedded Node | Android packaging failure | Validate exact ABI/runtime/driver combination early |
| Multiple offline writable databases | Stock/invoice/accounting conflict | Single authoritative installation in MVP |
| WSL2 LAN reachability varies | Laptop clients cannot connect | Explicit port-forwarding/firewall tests and IP fallback |
| mDNS not consistently resolved | Hostname discovery failure | Provide direct IP and connection QR fallback |
| Installer size larger than expected | Poor adoption/download | Measure bundle, support online bootstrap and optional offline installer |
| Power loss during posting | Data integrity risk | ACID transaction, SQLite/Postgres recovery, idempotency and hardware tests |
| Bad migration | Business data inaccessible | Backup-before-migration, migration tests and recovery tooling |
| Tax configuration changes | Incorrect tax calculations | Effective-dated configuration and CA review |

## 22. Architecture decisions

### Confirmed

- Product name is vyapaarKhata.
- Product is generic/configurable, construction-materials first.
- No delivery/dispatch/challan/trip/vehicle/driver/e-way-bill module in MVP.
- Laptop deployment uses Windows + WSL2 + nerdctl/containerd + React/Vite + Nginx + Node.js + PostgreSQL + Node sync worker + Go management agent.
- Android tablet should be able to act as a standalone primary server.
- One shared codebase is required; avoid two separately maintained business applications.
- One active authoritative writable installation per business in MVP.
- Stock is deducted on posted invoice, not draft.
- Stock movement ledger is source of truth; stock balances are projections.
- Posting must be atomic and idempotent.
- Use OpenAPI 3.1 YAML as API contract.
- DBML is logical review schema; PostgreSQL and SQLite migrations are separate.
- No mandatory Redis/Kafka for local MVP; use transactional outbox.

### Provisional, validate by prototype

- Same Node.js backend source embedded in Android.
- React/Vite assets served by local Node server on Android.
- SQLite as Android local database.
- Android foreground service for server availability.
- mDNS `.local` discovery with IP fallback.

### Open

- Android runtime/embedding library and native bridge.
- Android minimum version and supported tablet matrix.
- PostgreSQL/SQLite decimal precision strategy.
- Inventory valuation method.
- Negative stock policy.
- Reservations/batch tracking in MVP.
- Unit conversion scope.
- Accounting depth.
- GST report scope and statutory review.
- Subscription grace/expiry behavior.
- iPad roadmap.
- Backup retention/encryption.
- Exact workload/capacity objectives.

## 23. Suggested implementation phases

### Phase 0 — Architecture validation

- Create monorepo and TypeScript build setup.
- Build shared React frontend and Node backend hello-world.
- Define a small repository contract.
- Prove PostgreSQL adapter and migration runner.
- Prove SQLite adapter and migration runner.
- Prototype embedded Node server on Android.
- Serve the same React build from Android local server.
- Test LAN access from a second device.
- Test Android foreground service, idle, reboot and process kill.
- Produce architecture decision record with measured results.

### Phase 1 — Platform foundation

- Brand/tenant/business setup.
- Authentication, membership, roles and permissions.
- Local settings and document sequence.
- Installation identity and health.
- Audit framework.
- Backup/restore baseline.
- CI testing for both database adapters.

### Phase 2 — Catalogue and inventory foundation

- Templates, categories, attributes, products, variants.
- Units, conversions, tax configuration and price lists.
- Locations/godowns.
- Opening stock.
- Movement ledger and balance projection.
- Adjustments, transfers, counts.

### Phase 3 — Purchasing

- Purchase orders.
- Receipts.
- Supplier bills.
- Purchase returns.
- Purchase expenses and landed cost.
- Supplier ledger and payment flow.

### Phase 4 — Sales and financial records

- Quotations and sales orders.
- Draft invoices and posting.
- Atomic stock deduction.
- Credit/debit notes and sales returns.
- Payments/allocations.
- Expenses and cashbook.
- Accounting journals and reports at approved scope.

### Phase 5 — Offline sync and subscriptions

- Outbox/inbox.
- Sync worker and cloud API.
- Retry/failure management.
- Entitlement cache and licensing.
- Cloud backup/update metadata.

### Phase 6 — Platform packaging and release hardening

- Windows installer and Go agent.
- Android package/service and supported device matrix.
- Printing and exports.
- Backup/restore drills.
- Migration/upgrade tests.
- Pilot and operational support documentation.

## 24. Deliverables expected from implementation agent

1. Monorepo with package boundaries and documented build commands.
2. Architecture decision record for Android embedded Node runtime.
3. Logical DBML schema and table inventory.
4. PostgreSQL migrations and SQLite migrations.
5. Repository ports and both adapter implementations.
6. Shared domain/application test suite.
7. OpenAPI 3.1 YAML contract and generated types.
8. Shared React/Vite application.
9. Shared Node.js API server.
10. Transactional outbox sync worker.
11. Laptop deployment using WSL2, nerdctl/containerd, Nginx, PostgreSQL and Go agent.
12. Android host/service package running the same backend/frontend source if the spike passes.
13. Backup and restore tooling.
14. Test reports for critical workflows and platform lifecycle.
15. Updated PRD/HLD/schema whenever implementation reveals an approved change.

## 25. Explicit exclusions in implementation

Do not create MVP database tables, endpoints, UI screens, permissions or background jobs for:
- deliveries;
- delivery challans or their lines;
- delivery trips;
- vehicles;
- drivers;
- e-way bills;
- dispatch/route/driver/fleet tracking.

Do not expose direct SQL/database access to browser clients. Do not create two distinct business-rule implementations for laptop and Android. Do not implement multi-master offline conflict merging in MVP.

---

## 26. Operational readiness checklist

- [ ] Fresh install on supported laptop.
- [ ] Fresh install on supported Android tablet.
- [ ] Application starts after supported reboot path.
- [ ] Server health is clearly displayed.
- [ ] Local UI opens on primary device.
- [ ] LAN client can connect.
- [ ] LAN client cannot access database port.
- [ ] User permissions are enforced server-side.
- [ ] Sales posting transaction is atomic.
- [ ] Duplicate posting is idempotent.
- [ ] Stock projection reconciles to movement ledger.
- [ ] Purchase receipt does not double-count bill.
- [ ] Payment allocations reconcile.
- [ ] Outbox is atomic with business writes.
- [ ] Sync resumes after network/process restart.
- [ ] Local backup is restorable.
- [ ] Cloud backup is optional and not required for local restore.
- [ ] Update/migration preserves business data.
- [ ] Android idle/force-stop limitations are communicated.
- [ ] No delivery/dispatch schema/API/UI has slipped into MVP.

## 27. Final implementation instruction

Use this HLD together with the PRD and DBML. Preserve all confirmed requirements and historical business invariants. Treat provisional Android runtime details as a spike, not as already-proven platform capability. Treat unresolved accounting, valuation, tax and negative-stock policies as explicit decisions. Any change that removes a previously listed module or schema entity must be recorded as an approved scope change rather than silently omitted.
