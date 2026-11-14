# Small-agent task prompt templates

Use one copy per subagent. Replace bracketed values. Give each agent only the source files and task scope it needs.

---

## Template A — Database/schema agent

You own task `[TASK-ID]`: `[TASK NAME]`.

Read the PRD/HLD and canonical 96-table DBML. Preserve the schema's existing names and semantics. The six removed tables are exactly `vehicles`, `drivers`, `deliveries`, `delivery_challans`, `delivery_challan_lines`, and `delivery_trips`. Do not remove unrelated tables. Do not add delivery/e-way-bill functionality.

Your allowed file ownership is: `[FILES/DIRECTORIES]`.
You must not modify: `[SHARED FILES OWNED BY COORDINATOR]`.
Dependencies already completed: `[DEPENDENCIES]`.

Deliver:
1. Implementation files/migrations.
2. Tests against the actual target database engine.
3. A concise design note explaining data types, indexes, constraints and tenant isolation decisions.
4. A list of deviations/open questions; never hide them.

Do not silently alter the canonical DBML. If you find a required schema change, create a proposed change/ADR and stop before applying an irreversible migration until approved.

Definition of done: fresh migration succeeds, upgrade path is tested where relevant, constraints work, tests pass, formatting/lint/typecheck pass, and changed files are listed.

---

## Template B — Backend domain/API agent

You own task `[TASK-ID]`: `[MODULE]`.

Use the shared TypeScript domain/application architecture and approved repository/Unit-of-Work interfaces. Implement a modular-monolith feature, not a microservice. Read the relevant PRD requirements and HLD constraints. Use only the frozen DBML and OpenAPI contract. Do not invent endpoint fields or database tables.

Apply LLD and design patterns only when they solve a real problem. Use Repository/Unit of Work at persistence boundaries; Adapter for platform/database differences; Strategy only for genuinely interchangeable policies; explicit state transitions for complex document lifecycles. Prefer simple functions and composition elsewhere. Avoid Singleton, Abstract Factory, generic base repositories, unnecessary interfaces, CQRS and event sourcing unless an ADR demonstrates a concrete need.

Your allowed file ownership is: `[FILES/DIRECTORIES]`.
Do not modify OpenAPI or shared root config without coordinator approval.

Deliver domain/application code, API routes/controllers if in scope, tests against real DB adapters, a short LLD note, and a summary of invariants/error handling/concurrency.

Definition of done: contract compliance, tenant checks, permissions, idempotency where required, atomic transaction behavior, integration tests, lint/typecheck and documentation updates.

---

## Template C — OpenAPI contract agent

You own task `API-01`: finalize OpenAPI 3.1 YAML.

Read the full PRD, HLD and frozen DBML. Define request/response schemas, error model, authentication, tenant context, pagination/filtering, idempotency, document lifecycle commands and all MVP endpoints. Do not include delivery/dispatch/challan/trip/vehicle/driver/e-way-bill paths.

OpenAPI YAML is the single contract source. Validate it with a linter, generate TypeScript types/client and create mock fixtures suitable for frontend work. Ensure no required backend/frontend field is left to guesswork.

Only you may modify `openapi/` during this task. Coordinate with domain agents through review notes. Deliver the contract, generated types/client, mock fixtures, lint output and a contract freeze report.

---

## Template D — Frontend agent (only after OpenAPI freeze)

You own task `[TASK-ID]`: `[SCREEN/MODULE]`.

Use the shared React/Vite application and generated OpenAPI TypeScript client. Implement only the UI scope in your task. Do not access databases, invent endpoints, duplicate business calculations or create a second Android UI codebase. Use the mock server/fixtures until backend APIs are ready.

Your allowed file ownership is: `[FEATURE FOLDER/FILES]`.
Do not edit app router, shared design tokens, root build config or API client generator; those have a designated owner.

Deliver responsive UI, loading/empty/error/offline/server-unavailable states, form validation, permission-aware presentation, and component/UI tests. Use backend responses as authoritative for totals and posting outcomes.

Definition of done: generated contract types only, no guessed endpoints, tests pass, build/typecheck/lint pass, and screenshots/brief UI notes are supplied if the workflow supports them.

---

## Template E — Deployment agent

You own task `[TASK-ID]`: `[PLATFORM DEPLOYMENT]`.

Read the approved HLD and implementation runbooks. Do not change domain logic or database semantics. Laptop production deployment uses Windows + WSL2 + containerd + nerdctl + Nginx + Node.js + PostgreSQL + Go management agent. Android deployment packages the same React frontend/Node backend source using the validated Android runtime + SQLite adapter + Android host/service.

The developer's current machine is macOS. Keep macOS developer scripts separate from Windows production installer scripts. Do not require Docker Desktop for the laptop production target.

Deliver repeatable scripts/package, health/readiness checks, logs, upgrade/backup/recovery steps and platform test evidence. Never deploy to a real customer/production machine without explicit approval.

---

## Template F — LLD review agent

Review module `[MODULE]` for clarity, coupling, cohesion, transaction boundaries, concurrency, failure handling and testability. Check that patterns are used only when useful. Identify unnecessary abstractions, Singleton usage, excessive factories/interfaces/inheritance, generic base classes, duplicated business logic and hidden side effects. Suggest the smallest design that preserves requirements. Do not rewrite unrelated modules.
