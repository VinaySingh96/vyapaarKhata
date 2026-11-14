# ADR-001: Monorepo and Modular Monolith Architecture

## Status
Accepted

## Context
vyapaarKhata is an offline-first SMB business management application designed for Indian retail/wholesale businesses. The application must support desktop laptop installations (PostgreSQL, local HTTP API, React web frontend) and standalone tablet installations (Android, SQLite, local HTTP API, embedded web/client), sharing identical domain logic, validations, and business invariants.

## Decision
1. We will adopt a **pnpm workspaces monorepo** layout:
   - `packages/domain`: Pure TypeScript business logic, entities, value objects, domain invariants, and interfaces. Zero database or web framework dependencies.
   - `packages/db`: Persistence contracts, repository implementations, migration runners, and migrations for both PostgreSQL and SQLite.
   - `apps/server`: Modular monolith Node.js HTTP backend server, handling routing, middleware, authentication, audit, and transactional outbox.
   - `apps/web`: React / Vite frontend application consuming generated OpenAPI client contracts.
2. The backend is a **modular monolith** with clear module boundaries (Catalogue, Parties, Inventory, Purchasing, Sales, Payments, Accounting, Reports, Sync). It will not be split into microservices.

## Consequences
- Shared TypeScript domain invariants run uniformly across laptop and embedded deployments.
- Build, test, and linting pipelines run from a single root configuration.
- Eliminates logic drift between platforms.
