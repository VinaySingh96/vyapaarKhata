# vyapaarKhata — Product Requirements Document (PRD)

**Document version:** 0.3 — Full implementation handoff draft  
**Status:** Review baseline; not a substitute for resolving the open decisions in §27  
**Product:** vyapaarKhata  
**Initial market:** Indian small and medium-sized businesses; construction-material retailers and wholesalers first  
**Deployment targets:** Windows laptop as local primary server; Android tablet as local primary server  
**Architecture direction:** One monorepo and shared TypeScript application/business logic, with platform-specific host and persistence adapters

---

## 0. Document intent and implementation rules

This document is the product-level source of truth for the first implementation. It is intentionally comprehensive. An implementation agent must not infer that an item is optional merely because it is described in a later phase or marked as an open decision.

Use the following labels:

- **Confirmed:** explicitly established product requirement or decision.
- **MVP scope:** required for the initial useful release unless a dependency blocks it.
- **Provisional:** reasonable design direction that still requires validation.
- **Open decision:** must be resolved before the affected production workflow is finalized.
- **Deferred:** intentionally not part of the initial release.

When a requirement conflicts with an implementation convenience, preserve the business invariant and adapt the implementation. Do not weaken atomicity, auditability, tenant isolation, idempotency or offline usability to make a platform easier to implement.

The product must remain generic and configurable. Construction-material examples are templates and test data, not hard-coded domain assumptions.

## 1. Product vision

vyapaarKhata is an offline-first business-management platform for Indian small and medium-sized businesses. It provides a practical operational system for catalogue management, inventory, purchasing, sales, customer and supplier balances, payments, expenses, accounting-oriented records and reporting.

The first industry template targets construction-material businesses such as cement, steel, sand, aggregate, hardware and building-supply shops. The underlying product model must also support electrical stores, sanitaryware shops, paint dealers, general hardware, kirana businesses, wholesale businesses and other configurable retail/wholesale operations.

A business should be able to buy one supported device, install vyapaarKhata and run its business without purchasing a separate server or maintaining a permanent internet connection. The primary device may be a Windows laptop or an Android tablet. Other devices on the same LAN may connect through a browser.

## 2. Product goals

1. Make day-to-day business operations available offline after installation and activation.
2. Allow a Windows laptop or Android tablet to act as the business's primary local server.
3. Allow other LAN devices to use the same business data through the primary server.
4. Maintain one shared application codebase and one set of domain/business rules across deployment targets.
5. Keep local business operations independent from cloud availability.
6. Synchronize data with cloud services when connectivity is available.
7. Preserve inventory, invoice, payment and ledger correctness under retries, concurrent requests and process restarts.
8. Support white-label brands and multiple tenants/businesses.
9. Support trial and paid subscriptions, monthly and yearly plans, and locally cached entitlements.
10. Keep industry-specific fields and workflows configurable through templates rather than hardcoding them into core tables or business logic.
11. Provide a safe path to backup, restore, upgrade and migrate a business between supported primary devices.

## 3. Non-goals and deferred capabilities

The following are explicitly outside the initial release:

- Delivery management and dispatch management.
- Delivery challans and delivery-challan line items.
- Delivery trips, trip planning and route planning.
- Vehicle, fleet and driver management.
- E-way bill management and e-way bill generation/integration.
- Transporter, driver assignment, delivery tracking and proof-of-delivery workflows.
- Payroll and HR.
- Manufacturing, bill of materials and production planning.
- E-commerce storefront and marketplace integrations.
- Advanced logistics and fleet optimization.
- Multiple independent offline writable installations for the same business (multi-master offline operation).
- Mandatory cloud connectivity for normal sales, purchasing or inventory operations.

These features may be considered as future modules. Their exclusion must not result in delivery, dispatch, vehicle, driver or e-way-bill tables being included in the MVP database. Do not create placeholder UI or API endpoints for deferred delivery/dispatch workflows.

E-invoice or other statutory tax-document submission integrations are also not part of the first operational release. A generic deferred tax-submission record may be retained in the logical schema for a future integration, but it must not be exposed as a working MVP integration without an approved requirement.

## 4. Target customers and users

### 4.1 Business categories

- Construction-material shop or wholesaler.
- Cement and steel dealer.
- Sand, aggregate and gitti supplier.
- Hardware and electrical retailer.
- Paint and sanitaryware dealer.
- Kirana/general merchandise shop.
- Wholesale and distribution business.
- Other small businesses with configurable goods, services, units and tax treatment.

### 4.2 Personas

**Owner**
- Sets up the business, catalogue and locations.
- Monitors sales, collections, dues, purchases, stock and business performance.
- Manages subscription, users, permissions and backups.

**Manager**
- Oversees sales, purchases, inventory and daily activity.
- Reviews exceptions, adjustments and cancellations.
- May access reports without receiving unrestricted owner permissions.

**Sales operator**
- Finds customers and products.
- Creates quotations, sales orders and invoices.
- Records customer receipts and views permitted balances.

**Inventory operator**
- Receives purchases.
- Performs approved stock counts, adjustments and transfers.
- Views stock and movement history.

**Accountant/bookkeeper**
- Reviews party ledgers, payments, expenses and accounting records.
- Manages permitted financial reports and fiscal-period tasks.

**Platform administrator/support operator**
- Supports brand and tenant administration, plans, licensing and platform-level operations.
- Must not gain unrestricted access to customer business data by default. Any support access must be controlled, auditable and explicitly authorized.

## 5. Product terminology and core concepts

- **Brand:** white-label identity under which the product is sold or distributed. A brand may have domains, branding configuration and plan offerings.
- **Tenant:** one customer business/account boundary. A tenant represents one business, not one branch.
- **Business location:** a shop, branch or operating location belonging to one tenant.
- **Inventory location/godown:** a stock-holding place associated with a business location. A business may have multiple godowns.
- **Primary installation:** the one installation that owns the authoritative writable local business database at a time.
- **LAN client:** a browser/device that uses the primary installation's API; it does not own an independent authoritative business database.
- **Product:** general catalogue item, such as cement or TMT steel.
- **Variant:** exact stockable/sellable configuration of a product, such as a specific brand, grade, diameter or size.
- **Unit:** unit used for purchase, sale or stock, such as bag, kg, piece, bundle, tonne, cubic foot, load or roll.
- **Stock movement:** immutable record of a stock-affecting event.
- **Stock balance:** transactional projection of the current quantity at an inventory location; not the source of truth.
- **Draft document:** editable document that has not executed its posting effects.
- **Posted document:** finalized business document whose inventory/financial effects have been committed.
- **Transactional outbox:** event record committed in the same transaction as the business change and later delivered to cloud services.

## 6. Deployment and operating modes

### 6.1 Laptop-primary mode — confirmed target

Supported initial direction:

- Windows 10/11 host, subject to a defined and tested compatibility matrix.
- WSL2 managed Linux environment.
- containerd and nerdctl, not Docker Desktop as a required runtime.
- React/Vite frontend build served locally through Nginx.
- Node.js backend API.
- PostgreSQL database.
- Node.js synchronization worker, potentially using the same backend image with a separate process/entrypoint.
- Go management agent and small management UI running on Windows host outside the business containers.
- Nginx reverse proxy.
- Persistent PostgreSQL and file volumes.
- LAN access for tablets and other devices.
- A standalone Windows installer (`.exe`) that bootstraps and manages the local environment.

The installer must check system prerequisites, provision the managed WSL2 environment, containerd/nerdctl, application images, persistent storage, service networking, hostname/port forwarding, Windows Firewall configuration, the Go agent and health checks. A user must not need to manually operate WSL or container commands for normal use.

The installer must distinguish bootstrapper size from the total download and installed size. The earlier 300–400 MB estimate is not an approved guarantee; measure actual image bundles and installation footprint.

### 6.2 Android-tablet-primary mode — confirmed product direction, runtime proof required

An Android tablet should be capable of acting as the primary local server, not only as a browser client. The intended user experience is that the tablet runs the application locally and other devices access it over LAN.

Target composition:

- Shared React/Vite frontend assets.
- Shared Node.js backend source and business/application logic.
- Android-compatible embedded Node.js runtime or an equivalent validated host approach.
- SQLite database adapter and database in application-protected storage.
- Shared sync/domain packages with Android-compatible process scheduling.
- Android host/service component responsible for starting, stopping, health and lifecycle integration.
- Localhost access on the tablet and LAN access for other devices.

**Important technical gate:** ordinary desktop Node.js deployment assumptions do not automatically work on Android. The team must prove embedded Node runtime packaging, native module/SQLite compatibility, LAN listening, foreground-service behavior, process restart and data recovery in a technical spike. The product direction is Android-as-server; the precise runtime packaging is an implementation decision subject to this spike.

### 6.3 LAN clients

- A LAN client accesses the primary server through the shared HTTP API.
- The client must not connect directly to PostgreSQL or SQLite.
- The primary server is responsible for authentication, authorization, validation and transaction execution.
- Client sessions and permissions must be checked on every protected API operation.
- When the primary device is unavailable, the client must show a clear server-unavailable state; it must not silently switch to an independent writable database.

### 6.4 Authority and device migration

**Confirmed MVP rule:** one authoritative writable installation per business at a time.

- Laptop-primary and Android-primary are alternative deployment modes.
- Other devices connect as clients.
- Multiple separate offline writers for the same tenant are not supported in the initial release.
- Moving primary authority from laptop to tablet or vice versa requires controlled backup/export, restore/import, installation registration and validation.
- The product must not imply that two independently offline databases will automatically merge inventory, invoice numbering or financial ledgers.

## 7. Functional requirements

### 7.1 Brand, tenant and business onboarding

- Support multiple white-label brands.
- Support brand-specific domains and display configuration.
- Create one tenant per customer business.
- Capture legal/display name, contact information, address, GSTIN, state, currency and fiscal year settings.
- Provide business onboarding using an industry template.
- Allow users to configure business profile and operating locations.
- Allow owner to invite/create additional users and assign roles.
- Allow configuration of document numbering, default tax behavior, units and pricing defaults.
- A business may have multiple locations and godowns; branch/location is not a separate tenant.

### 7.2 Industry templates and catalogue configuration

- Provide template metadata and template-defined categories/attributes.
- Allow tenants to use a template as an initial setup, then customize categories and attributes.
- Support product categories and subcategories.
- Support tenant-defined attributes with data types and allowed values.
- Support products with multiple variants.
- Support SKU and optional barcode.
- Support HSN/SAC metadata where applicable.
- Support stock-tracked goods and non-stock/service items.
- Support configurable base unit and purchase/sales units.
- Support unit conversion with explicit dimensions and conversion factors.
- Support multiple price lists and variant prices.
- Preserve historical product/tax/unit snapshots on posted documents.

Construction-material template examples:
- Cement: brand, grade/type, bag size and applicable unit.
- TMT steel: brand, grade, diameter and selling unit.
- Sand: type and unit (for example cubic feet or load, subject to business configuration).
- Gitti/aggregate: size/grade and unit.
- Binding wire: size/weight and roll/bundle configuration.

Do not hardcode the exact meaning or conversion of local terms such as “bhassi”; the business must define the catalogue label, unit and conversion rules.

### 7.3 Units and conversions

- Support common and tenant-defined units.
- A variant has a defined base stock unit.
- Purchases and sales may use a different configured transaction unit if conversion is enabled.
- Persist transaction quantity, unit and normalized base quantity.
- Conversion factor precision must be configurable and tested for rounding.
- Do not assume all units are mutually convertible; dimensions must be compatible.
- Open decision: whether multiple purchase/sales units are mandatory for MVP or can be a later capability.

### 7.4 Inventory and stock control

- Support multiple business locations and inventory locations/godowns.
- Support opening stock entry.
- Maintain stock balances by tenant, inventory location and product variant.
- Maintain immutable stock movement ledger.
- Record purchase receipts, sales posting, sales returns, purchase returns, adjustments and transfers as movements.
- Support controlled stock adjustment with reason, user, date and document reference.
- Support stock counts and variance review.
- Support transfers between godowns/locations with paired stock movement records.
- Support optional reservations for workflows that need committed stock.
- Support optional inventory batches where batch tracking is enabled.
- Support low-stock thresholds/alerts as a configurable feature.
- Display on-hand stock and movement history.
- Support stock valuation reports once a valuation method is approved.

Stock source-of-truth rule:
- `stock_movements` is authoritative.
- `stock_balances` is a transactional projection updated in the same transaction as each stock movement.
- Users cannot directly edit a stock balance.
- A reconciliation routine must be able to compare/rebuild projections from the movement ledger.

Negative stock policy is an **open decision**. The design must be capable of enforcing “do not allow negative stock” if selected, and must safely handle concurrent invoice posts. Do not silently assume negative stock is allowed.

### 7.5 Purchasing

- Maintain supplier master and supplier roles.
- Create purchase orders with lines, rates, quantities, tax and totals.
- Support partial purchase receipts against an order.
- Record physical receipt separately from supplier bill.
- Record supplier bills and supplier invoice references.
- Allow a bill to be associated with a receipt or recorded independently when business workflow requires it.
- Preserve line-level product, unit, quantity, price, discount, HSN/SAC and tax snapshots.
- Track supplier outstanding balances and payment allocations.
- Support purchase returns and their stock/financial effects.
- Support additional purchase expenses and landed-cost allocation to eligible inventory/receipt lines.
- Keep purchase order, goods receipt and supplier bill as separate entities and statuses.

### 7.6 Sales and customer documents

- Maintain customer master and customer roles.
- Create quotations and quotation lines.
- Allow conversion from quotation to sales order where used.
- Create sales orders and track their status.
- Create draft sales invoices.
- Post/finalize sales invoices.
- Support credit notes, debit notes and sales returns as separate business records.
- Support optional invoice charges.
- Preserve customer, product, SKU, HSN/SAC, unit, quantity, price, discount and tax snapshots on posted documents.
- Support configurable document number sequences and fiscal-year numbering.
- Support partial payments and outstanding balances.
- Support invoice printing/export, with browser print and supported local printer paths.

**Stock deduction trigger — confirmed:** stock is reduced when a sales invoice is posted/generated/finalized, not when a draft is saved. The exact UI label may be “Post”, “Finalize” or equivalent, but the state transition must be explicit.

Invoice posting must be idempotent and atomic. Detailed transaction requirements are in §8.

### 7.7 Parties and party balances

- Maintain a common party master that can act as customer, supplier or both.
- Preserve distinct party roles rather than relying only on duplicated customer/supplier records.
- Store contact details and multiple addresses.
- Store credit settings/limits where enabled.
- Track opening balances.
- Maintain party ledger entries for invoices, bills, payments, credits, returns and approved adjustments.
- Provide customer receivable and supplier payable views.
- Distinguish invoice value, amount collected/paid and outstanding balance.

### 7.8 Payments and allocations

- Maintain configurable payment methods such as cash, bank transfer, UPI, cheque and other modes.
- Maintain financial accounts such as cash-in-hand and bank accounts.
- Record incoming receipts and outgoing payments independently of invoices.
- Allocate one payment across multiple documents.
- Support multiple payments against one invoice/bill.
- Support partial allocations, advances and unallocated balances.
- Track references, dates, direction, account, method and status.
- Make posting and allocation operations idempotent.
- Do not delete posted payment records; use reversal/correction entries.

### 7.9 Expenses and cashbook

- Maintain configurable expense categories.
- Record expense date, amount, category, description, payee where appropriate and financial account.
- Support receipt/file attachments.
- Reflect posted expenses in cash/bank activity and applicable accounting entries.
- Provide cashbook and bank summary.
- Distinguish expenses from inventory purchase cost and landed cost.

### 7.10 Accounting foundation and reporting

- Maintain chart of accounts and account hierarchy.
- Maintain fiscal years and closing status.
- Maintain journal entries and journal lines.
- Support opening account balances.
- Support posting of relevant sales, purchase, payment, expense, inventory and adjustment effects.
- Support reversals rather than destructive deletion of posted entries.
- Preserve balanced debits and credits if double-entry accounting is adopted.
- Provide sales reports, collection reports, purchase reports, expense reports, party ledgers, outstanding reports, stock reports, cash/bank summaries and profit-oriented reports.

Accounting depth is an **open decision**: the existing direction is a double-entry-capable foundation with a simplified SMB-facing UI, but the team must confirm which accounting features are mandatory for first launch.

Financial reporting terminology must be precise:
- Revenue/sales is not the same as cash collection.
- Collection is money received, potentially against earlier sales.
- Purchases are not automatically cost of goods sold.
- Profit requires cost of goods sold and operating expenses, not sales minus purchases alone.

### 7.11 GST and tax configuration

- Capture business GSTIN and state details.
- Support HSN/SAC codes.
- Support configurable tax categories, tax rates, components and effective dates.
- Support intra-state and inter-state tax calculation according to configured rules.
- Persist applied tax components and values on posted documents.
- Provide GST-oriented reports and exports required by the agreed MVP.
- Keep statutory rates/rules configuration maintainable and effective-dated.
- Have all GST calculations and statutory report requirements reviewed by a qualified Indian tax professional before production use.
- E-invoice/e-way bill gateway integrations are deferred from MVP.

### 7.12 Users, roles, permissions and audit

- Support users associated with one or more business memberships where permitted.
- Support system-defined and tenant-defined roles.
- Support granular permissions for catalogue, inventory, sales, purchase, payment, expense, accounting, reports, settings, user administration and sensitive operations.
- Use server-side permission checks; frontend hiding is not authorization.
- Record audit entries for sensitive create/update/post/cancel/adjustment operations.
- Record actor, action, entity, timestamp and relevant before/after values while avoiding unsafe storage of secrets.
- Provide activity history for important records.

### 7.13 Files and attachments

- Support document attachments such as supplier bills, expense receipts and other business records.
- Store file metadata in database and content in protected local storage.
- Keep tenant and entity association.
- Include attachment data in local backup and controlled cloud backup.
- Validate file type/size and protect against path traversal and unsafe file execution.

### 7.14 Offline operation and synchronization

- Core business operations must work when internet is absent.
- The local server is authoritative for its business while offline.
- Business writes and outbox event creation must be committed together.
- A sync worker sends pending events when connectivity is available.
- Retries must be idempotent.
- Sync must tolerate worker restart, network failure, duplicate delivery and delayed acknowledgment.
- Failures and conflicts must be observable and recoverable.
- Cloud sync must not block local invoice posting, stock receipt, payment recording or expense entry.
- Store synchronization cursors per installation and stream.
- Maintain inbox deduplication for inbound events where applicable.
- Cache subscription entitlements locally with a defined grace policy.

### 7.15 Subscription, licensing and brand management

- Support multiple white-label brands and brand domains.
- Support trial subscriptions.
- Support monthly and yearly paid plans.
- Support subscription invoices/receipts for platform billing.
- Support feature entitlements and plan-specific limits.
- Support installation activation and device registration.
- Cache latest valid entitlement so local operation can continue during cloud outage within the approved grace period.
- Define what happens when trial expires, subscription expires, device changes or activation is revoked. Do not disable access to business data solely because cloud connectivity is lost.

### 7.16 Printing and exports

- Support printing of quotations, sales invoices, purchase orders and other approved documents.
- Support standard page formats and configurable business header/footer fields.
- Support local browser printing and test supported printer options for laptop and Android.
- Support data export for backup, migration and agreed business reports.
- Printer models, thermal printing and PDF generation specifics remain platform compatibility items to validate.

### 7.17 Backup and recovery

- Support manual and scheduled local backups.
- Support optional cloud backup.
- Record backup metadata, type, checksum, schema version, installation and verification status.
- Provide a restore procedure that is understandable to a business owner/support operator.
- Validate database integrity and migration version after restore.
- Preserve files/attachments alongside database backup.
- Test restore, not just backup creation.
- Backups must be independent from cloud sync; cloud sync is not a backup substitute.

### 7.18 Updates and installation lifecycle

- Laptop installer owns local application setup and service lifecycle.
- Android host owns server startup and status through Android-supported lifecycle behavior.
- Application update must preserve business data.
- Database migration must be versioned and observable.
- Critical update must have a tested rollback or recovery strategy.
- A failed update must not leave the only business database unusable.
- Show application version, database schema version, last backup and server health.

## 8. Critical business rules and invariants

### 8.1 Atomic sales-invoice posting

Posting a draft sales invoice must perform all required effects in one transaction on the primary database:

1. Validate invoice existence, tenant ownership, current status and required fields.
2. Validate customer, product variants, units, document sequence and tax snapshots.
3. Check idempotency key/operation identity.
4. Safely validate/lock stock for all stock-tracked lines.
5. Persist/transition invoice and immutable line snapshots to posted state.
6. Create stock movement rows for the sale.
7. Update corresponding stock-balance projections.
8. Create party ledger entries.
9. Create applicable journal entries/lines when accounting posting is enabled.
10. Insert a transactional sync-outbox event.
11. Commit all writes together; any failure rolls back every effect.

Duplicate requests must not create a second stock deduction, invoice posting, ledger entry or outbox event. A retry after timeout must return the existing result or a deterministic idempotent response.

### 8.2 Cancellation and reversal

- A posted invoice must not be deleted or silently reverted to draft.
- Cancellation must create explicit reversal stock movements and financial/ledger reversals as applicable.
- Original records remain queryable for audit.
- Cancellation must itself be idempotent.
- Permissions and reason capture are required for cancellation.

### 8.3 Draft documents

- Draft invoices do not affect stock, party ledger or financial accounting.
- Draft purchase orders do not increase stock.
- Only a posted/accepted purchase receipt increases stock.
- Supplier bill posting creates supplier liability/accounting effects but must not duplicate a receipt's stock increase.

### 8.4 Inventory ledger and projection

- Every stock mutation has a movement record.
- Movement direction and quantity are explicit and validated.
- Transfer creates an outbound and inbound movement linked to one transfer.
- Return movements must reference the originating document where applicable.
- Projection updates and ledger writes happen in one transaction.
- Stock movement history is immutable; corrections use reversals/adjustments.

### 8.5 Financial consistency

- Payment records are independent entities.
- Allocations connect payment to one or more financial documents.
- Unallocated advances remain visible.
- Party ledger must reconcile to posted source documents and allocations.
- If double-entry accounting is enabled, posted journals must balance.
- Amount calculations use decimal-safe arithmetic; binary floating point must not be used for authoritative currency calculations.

### 8.6 Tenant isolation

- Every business-owned record is tenant-scoped.
- API calls infer/validate tenant context from authenticated membership; never trust a client-supplied tenant ID alone.
- Database queries and relationships must not allow cross-tenant references.
- Composite unique keys and composite foreign-key constraints should be used where required to enforce tenant consistency.

## 9. High-level user journeys

### 9.1 New business setup

1. User downloads the laptop installer or Android app package.
2. Installs and opens vyapaarKhata.
3. Activates trial/license or completes the approved activation flow.
4. Creates business profile.
5. Selects a business template.
6. Reviews categories, units, tax defaults and document numbering.
7. Creates first location/godown and opening stock.
8. Adds customers and suppliers or imports them.
9. Creates user accounts and assigns permissions.
10. Uses the application offline; synchronization begins when internet is available.

### 9.2 Sales invoice

1. Find/create customer.
2. Add products/variants and quantities/units.
3. Calculate price, discount, taxes and totals.
4. Save draft without stock effect.
5. Review invoice.
6. Post invoice.
7. Server validates and commits invoice, movement, balance, ledger and outbox atomically.
8. Print/share invoice.
9. Record payment/allocation when received.

### 9.3 Purchase receipt and bill

1. Create or select purchase order.
2. Record actual received quantities against the relevant inventory location.
3. Validate receipt and post it to stock.
4. Create/record supplier bill separately.
5. Reconcile bill quantities/prices/taxes where applicable.
6. Record additional expenses/landed cost if applicable.
7. Record supplier payment and allocation.

### 9.4 Device as primary server

1. Install the app on laptop or Android tablet.
2. Device starts its local runtime and database.
3. User sees server health and connection address.
4. Other LAN devices connect through a browser.
5. All writes are served by the primary application and database.
6. Internet loss does not prevent local operations.
7. When internet returns, sync resumes.

### 9.5 Move primary device

1. Owner starts a controlled backup/export on current primary.
2. Backup includes database and files with version/checksum metadata.
3. Owner restores to new supported device.
4. New installation validates data, migrations and integrity.
5. Installation authority is transferred/registered.
6. Old primary is demoted or blocked from writes before new primary becomes authoritative.
7. No automatic merge of independent changes is promised.

## 10. Data, document and numbering requirements

- Every tenant-owned document has a stable internal identifier and a human-readable document number.
- Document sequence is tenant- and document-type-scoped; fiscal-year scope may apply.
- Number allocation and document creation/posting must be concurrency-safe.
- Historical descriptions, SKUs, HSN/SAC, units, quantities, rates, discounts and tax breakdowns must be snapshotted.
- Document status changes must be auditable.
- Use explicit timezone policy for timestamps and business-local dates.
- Use `date`-like semantics for invoice/bill business dates and timestamp semantics for events/creation times.
- Use decimal columns/decimal arithmetic for quantity, price, tax and currency calculations.

## 11. Roles and permission domains

Permission codes should be granular and stable, for example:

- `catalogue.read`, `catalogue.write`, `catalogue.archive`
- `inventory.read`, `inventory.adjust`, `inventory.transfer`, `inventory.count`, `inventory.reserve`
- `purchase.read`, `purchase.create`, `purchase.post`, `purchase.cancel`, `purchase.return`
- `sales.read`, `sales.create`, `sales.post_invoice`, `sales.cancel_invoice`, `sales.credit_note`, `sales.debit_note`, `sales.return`
- `payments.read`, `payments.create`, `payments.allocate`, `payments.reverse`
- `expenses.read`, `expenses.create`, `expenses.post`
- `accounting.read`, `accounting.post_journal`, `accounting.close_period`
- `reports.read`, `reports.export`
- `users.manage`, `roles.manage`, `settings.manage`
- `backup.create`, `backup.restore`, `installation.manage`

The exact default role matrix is to be designed and approved. An owner must retain full tenant administration capability. Sensitive permissions should be separately grantable.

## 12. Non-functional requirements

### 12.1 Reliability and data integrity

- ACID transaction semantics for invoice posting, stock movements, payments and accounting entries.
- Idempotent mutation endpoints for retryable operations.
- Crash recovery for local database and worker.
- Durable local storage.
- Backup/restore tests as release gates.

### 12.2 Offline-first

- Normal core workflows must not call a cloud API synchronously as a prerequisite to local commit.
- Cloud sync is asynchronous and retryable.
- Entitlement behavior must be explicit during outage.

### 12.3 Security

- Authentication and server-side authorization.
- Tenant isolation.
- Secure password/session handling.
- Protected local files and backups.
- Restricted LAN exposure.
- No database access from browsers.
- Audit sensitive operations.

### 12.4 Performance and capacity

The product must be tested against realistic SMB workloads, including large catalogues, growing stock ledgers, multiple concurrent LAN clients and years of invoices. Exact minimum hardware, tenant limits, concurrent client count, response-time objectives and database size targets are open decisions and must be benchmarked rather than invented.

### 12.5 Usability

- Clear connection/server status.
- Clear sync status and last-sync time.
- Clear backup status and last successful backup.
- Clear distinction between draft and posted documents.
- Clear stock availability and unit display.
- Useful validation messages for business users.
- Responsive shared web UI for laptop and tablet browser sizes.

### 12.6 Portability and maintainability

- Shared TypeScript domain/application code.
- Shared API contracts.
- Separate, versioned PostgreSQL and SQLite migrations.
- Adapter contract tests.
- Reproducible build and release process.
- No platform-specific business rules duplicated in UI code.

## 13. Success measures

- A business can set up and use the product without a permanent internet connection.
- Laptop-primary installation works through the supported Windows installer.
- Android-primary installation works on the approved tablet/Android matrix.
- LAN clients can connect reliably to the primary installation.
- Draft invoices never change stock.
- Posted invoices result in exactly one stock deduction and corresponding ledger effects.
- Concurrent posting cannot violate the approved negative-stock policy.
- Duplicate retries do not duplicate business effects.
- Sync recovers after network and process interruptions.
- Backup restoration produces a valid working business.
- Business logic tests pass against PostgreSQL and SQLite implementations.

## 14. Acceptance criteria — detailed

### Setup and licensing
- A new tenant can be created under a brand.
- Trial and paid subscription status is represented locally.
- A previously valid entitlement remains usable during the approved grace period without internet.
- Activation/expiration is auditable.

### Catalogue
- Products, variants, categories, attributes, units and price lists can be maintained.
- SKU uniqueness is enforced per tenant.
- Inactive products cannot be added to new transactions unless a deliberate historical-edit policy permits it.
- Historical document snapshots are unaffected by later catalogue edits.

### Inventory
- Opening stock creates movement records and corresponding balance projections.
- Purchase receipt posting increases stock exactly once.
- Invoice posting decreases stock exactly once.
- Transfer decreases source and increases destination in one transaction.
- Adjustment requires permission and reason.
- A reconciliation process can detect balance/projection mismatch.

### Purchasing
- Purchase order, receipt and bill have independent lifecycle states.
- Partial receipt is supported where approved.
- Supplier bill does not duplicate receipt stock effect.
- Purchase return reverses applicable stock and financial effects.

### Sales
- Draft invoice has no stock/ledger posting effect.
- Posting is atomic.
- Duplicate post request is idempotent.
- Cancellation creates reversal records and preserves original history.
- Invoice line tax/price/description snapshots persist.

### Payment and accounting
- Payment can be recorded without an immediate invoice allocation.
- One payment can be allocated across multiple documents.
- Multiple payments can be allocated to one document.
- Payment reversal is auditable.
- If double-entry is enabled, unbalanced journals cannot be posted.

### Sync
- Outbox event exists when business transaction commits.
- No outbox event remains after a rolled-back transaction.
- Replayed event does not produce duplicate cloud-side effect.
- Network failure does not block local operations.

### Android server
- Tablet can start its local server and show health.
- Tablet browser can open the local UI.
- Another LAN device can connect.
- Foreground/lifecycle status is visible.
- Process termination and restart do not corrupt the database.
- Unsupported device/OS combinations fail clearly rather than silently losing service.

### Laptop server
- Installer provisions required environment.
- Services start in the prescribed order.
- Persistent database survives reboots and application updates.
- LAN connectivity and Windows firewall behavior are tested.
- Go management agent exposes only allowlisted operations.

## 15. Reporting definitions

Reports must distinguish:

- Gross sales and net sales.
- Cash/bank collections.
- Customer outstanding.
- Supplier outstanding.
- Purchase value.
- Inventory receipts and issues.
- Stock on hand.
- Stock valuation under the approved valuation method.
- Operating expenses.
- Cost of goods sold.
- Gross profit and net profit, where the accounting model supports reliable calculation.

A report must not label collections as revenue or treat all purchases as expense/COGS.

## 16. Data migration and import

- Opening stock, opening party balances and opening account balances must be supported through controlled opening-balance batches.
- Import routines must validate duplicates, units, references and tenant ownership.
- Failed import rows must be reportable and safely retryable.
- Import must not bypass movement/ledger creation rules.
- Migration from one primary device to another must preserve stable identifiers and sync/installation metadata as required by the chosen cutover process.

## 17. Observability and support requirements

- Display application version and schema version.
- Expose health/readiness status for local services.
- Display database status, sync status, last successful sync, pending count and failure count.
- Display last successful backup and verification state.
- Record structured logs with correlation/operation IDs.
- Avoid logging passwords, tokens, customer secrets or unnecessary sensitive data.
- Provide support bundles with explicit user approval and sensitive-data filtering.

## 18. Release and rollout approach

- Build the shared domain and repository contracts first.
- Implement and validate PostgreSQL laptop deployment as the initial server runtime.
- In parallel or immediately after contract stabilization, prototype Android Node runtime and SQLite adapter.
- Keep Android server target visible in architecture and tests from the start; do not bolt it on after business modules are complete.
- Release Android server only after foreground-service, crash-recovery and LAN reliability gates pass.
- Roll out with a limited pilot and backup/restore support before broad deployment.

## 19. Explicit data-model principles

- Tenant-owned entities include `tenant_id` or derive tenant ownership through a rigorously enforced parent relation.
- Historical documents store snapshots rather than relying on mutable catalogue records.
- Stock movement ledger and party/journal ledgers are append-oriented; corrections are reversals.
- Payments are independent from invoice records.
- Purchase order, receipt and supplier bill are separate entities.
- Stock is reduced only when an invoice is posted.
- One tenant represents one business; one business may have multiple locations/godowns.
- Brand and tenant are separate concepts.
- Subscription billing is separate from the tenant's own customer/supplier sales invoices.

## 20. Deferred product decisions and assumptions

The following require explicit sign-off and must not be silently hardcoded:

1. Inventory valuation: weighted average, FIFO, or multiple methods.
2. Negative-stock policy.
3. Unit conversion flexibility and rounding rules.
4. Whether stock reservations are MVP or phase 2.
5. Whether inventory batches/lot tracking are MVP or phase 2.
6. Double-entry accounting depth at launch.
7. Exact GST reports and CA validation.
8. E-invoice/IRP integration timing.
9. Subscription limits, trial length, grace period and offline expiry behavior.
10. Backup frequency, retention, encryption and destination.
11. Minimum Windows version/build and hardware requirements.
12. Minimum Android version, tablet hardware and supported RAM/storage.
13. Android Node.js runtime and native module strategy.
14. Whether iPad is in the product roadmap; no iPad support is assumed by this document.
15. Printing support and validated printer matrix.
16. Maximum local LAN clients and realistic workload targets.
17. Device migration/cutover and old-primary fencing process.
18. Whether branch-level financial reporting requires additional dimensions.

## 21. Product scope checklist for implementation agent

- [ ] White-label brands and domains.
- [ ] Tenant/business onboarding.
- [ ] Business locations and godowns.
- [ ] Users, memberships, roles and permissions.
- [ ] Subscription plans, features, subscription invoices and license activation.
- [ ] Configurable industry templates, categories and attributes.
- [ ] Products, variants, SKU, units and unit conversions.
- [ ] Tax configuration, HSN/SAC, tax snapshots and price lists.
- [ ] Parties, party roles, contacts, addresses and credit settings.
- [ ] Inventory locations, balances, movements, adjustments, transfers, reservations, batches and counts.
- [ ] Purchase orders, receipts, bills, returns and purchase expenses.
- [ ] Quotations, sales orders, invoices, credit notes, debit notes and sales returns.
- [ ] Payments, allocations, party ledgers and financial accounts.
- [ ] Expenses, expense attachments and cashbook.
- [ ] Chart of accounts, fiscal years, journals and opening balances.
- [ ] Landed-cost documents, lines and allocations.
- [ ] Files, audit and activity logs.
- [ ] Installations, devices, outbox, inbox, cursors, failures, conflicts and backups.
- [ ] Shared React frontend and TypeScript domain/application packages.
- [ ] Node.js backend shared across platform deployments.
- [ ] PostgreSQL and SQLite adapters with separate migration sets.
- [ ] Laptop WSL2/nerdctl/containerd/Nginx/Go-agent deployment.
- [ ] Android server runtime/foreground-service/LAN deployment.
- [ ] No delivery/dispatch/challan/trip/vehicle/driver/e-way-bill MVP feature or table.

---

## 22. Implementation handoff note

This PRD defines product behavior and acceptance criteria. It does not authorize an implementation agent to invent unresolved business policies. Where a decision is open, the agent must:

1. Isolate the policy behind configuration or a small interface where practical.
2. Document the assumption in code and architecture notes.
3. Avoid irreversible data-model choices until the decision is approved.
4. Add tests for the confirmed invariants.
5. Raise a decision record before shipping production behavior that depends on the open item.

The DBML logical schema, HLD, OpenAPI contract and detailed implementation plan must be kept consistent with this PRD.
