# vyapaarKhata (व्यापार खाता)

> **Modern, offline-first, multi-tenant ERP & business management platform tailored for Indian retail, wholesale, and rental enterprises.**

[![Node.js](https://img.shields.io/badge/Node.js-20.x%2B-green.svg)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.x%2B-orange.svg)](https://pnpm.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://www.fastify.io/)
[![React](https://img.shields.io/badge/React-18.x-61dafb.svg)](https://react.dev/)
[![Tests](https://img.shields.io/badge/Tests-84%20passing-brightgreen.svg)]()

---

## 🌟 Overview

**vyapaarKhata** is an enterprise-grade, offline-first operating system designed for Indian MSMEs (micro, small, and medium enterprises). Built specifically for hardware shops, building material suppliers, centring & scaffolding rental yards, jewellery shops, and wholesale distributors.

A business can install vyapaarKhata on a single local laptop or tablet, operating **100% offline** without internet dependency. Whenever an internet connection is available, the built-in asynchronous sync worker reconciles transactions with the Central Cloud Server.

```
                      ┌─────────────────────────────────────────┐
                      │          Central Cloud Server           │
                      │  Multi-tenant Admin, Licensing & Sync   │
                      │               (:5000)                   │
                      └────────────────────▲────────────────────┘
                                           │
                           HTTPS / Sync Push & Ingestion
                                           │
                      ┌────────────────────▼────────────────────┐
                      │            Local Store Server           │
                      │   Fastify + Pg/SQLite Unit of Work      │
                      │               (:4002)                   │
                      └────────────────────▲────────────────────┘
                                           │
                               REST API / LAN Access
                                           │
                      ┌────────────────────▼────────────────────┐
                      │              Web Client                 │
                      │     React 18 + Vite + TypeScript        │
                      │               (:3002)                   │
                      └─────────────────────────────────────────┘
```

---

## 🚀 Key Modules & Capabilities

- **🛒 Billing & Point of Sale (POS):**
  - Instant GST invoice generation (CGST, SGST, IGST calculation).
  - Cash, credit khata, UPI, bank transfer, and split payments.
  - Print-ready thermal and standard A4 invoice layouts with store branding.
  - Draft quotations with one-click conversion into posted sales invoices.

- **🏗️ Centring & Scaffolding Rental Module:**
  - Dedicated rental lifecycle: **Rental Issue Voucher** ➔ **Partial/Full Returns** ➔ **Automatic Hire Billing**.
  - Automatic calculation of rental tenure (days), daily rental rates, lost/damaged item compensation charges, and security deposits.
  - Real-time rental inventory tracking (in-stock vs. on-hire).

- **📦 Inventory & Stock Control:**
  - Multi-location inventory management (Main Yard, Godown, Shop).
  - Negative stock protection rules, low-stock reorder warnings, and automated movement journals.
  - Bilingual product catalog support (**English & Hindi** / सामग्री नाम).
  - Bulk CSV/Excel catalog import and export with instant sample templates.

- **📒 Customer & Supplier Khata (Parties):**
  - Automated party ledger entries on every purchase, invoice, return, and payment.
  - Track receivables (*To Receive* / लेना है) and payables (*To Pay* / देना है).
  - Credit limit enforcement and customer transaction history.

- **💳 Payments & Expense Management:**
  - Inward customer payments and outward vendor payments with FIFO invoice allocation.
  - Categorized business expense tracking (transport, labor, rent, fuel, utilities).

- **☁️ Central Cloud & Store Licensing:**
  - Multi-tenant cloud dashboard (`/admin`) for franchise and tenant management.
  - Enterprise license key generation with year validation and Luhn checksum.
  - Grace periods, trial activations, and renewal controls.
  - Automated tenant status enforcement (Active, Suspended, Expired, Revoked).

- **🔄 Offline-First Sync Engine:**
  - Transactional Outbox pattern guarantees zero data loss during network drops.
  - Background auto-sync worker with exponential backoff and cursor tracking.

---

## 📂 Monorepo Architecture

The project is structured as a pnpm workspace modular monolith:

```
vyaparkhata/
├── apps/
│   ├── web/               # React 18 frontend (Vite, TypeScript, Tailwind)
│   ├── server/            # Local Store Server (Fastify, REST API, AutoSyncWorker)
│   └── central-server/    # Central Cloud Server (Tenant Admin, Licensing, Sync Hub)
├── packages/
│   ├── domain/            # Pure TypeScript business logic, entities, ports & services
│   └── db/                # 97-table canonical schema, migrations (PG + SQLite), seeds, UoW
├── deployment/            # Docker, nerdctl, and production deployment scripts
├── docs/                  # Architecture Decision Records (ADRs) and PRD specifications
├── scripts/
│   └── dev-local.js       # Zero-config local orchestrator (handles Docker & Native Postgres)
└── package.json           # Workspace scripts & dependencies
```

---

## 🛠️ Prerequisites

Before getting started, ensure you have:

- **Node.js**: `v20.0.0` or higher
- **pnpm**: `v9.0.0` or higher (`corepack enable && corepack prepare pnpm@latest --activate`)
- **PostgreSQL**: `v14` or higher (Homebrew / local system installation **OR** Docker)

---

## ⚡ Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/VinaySingh96/vyapaarKhata.git
cd vyapaarKhata
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build Monorepo Packages

```bash
pnpm build
```

### 4. Start the Full Local Environment

Run the unified dev orchestrator:

```bash
pnpm dev:local
```

> **Note:** The `dev:local` launcher automatically:
> - Auto-detects whether you are using **Native PostgreSQL** (`brew services`, system service) or **Docker PostgreSQL**.
> - Probes and resolves credentials without manual configuration.
> - Auto-creates the required databases (`vyapaarkhata_central`, `vyapaarkhata_patel`).
> - Seeds the Patel Building Materials & Centring store catalog and reference data.
> - Auto-cleans stale port conflicts if an old instance is still running.

Once started, the following services will be live:

| Service | URL | Description |
| :--- | :--- | :--- |
| **Store Web UI** | [http://127.0.0.1:3002](http://127.0.0.1:3002) | Patel Centring & Building Materials Store App |
| **Local Store API** | [http://127.0.0.1:4002](http://127.0.0.1:4002) | Fastify Local Store Backend & OpenAPI endpoints |
| **Central Cloud** | [http://127.0.0.1:5000](http://127.0.0.1:5000) | Central Cloud Server & Sync Ingestion Hub |
| **Tenant Admin** | [http://127.0.0.1:5000/admin](http://127.0.0.1:5000/admin) | Central Franchise & License Management Dashboard |

---

## ⚙️ Environment Variables

Create a `.env` file in the project root if you need custom database ports or credentials (optional, default fallbacks are pre-configured):

```env
# PostgreSQL Configuration (auto-detected by dev:local if omitted)
PG_URL=postgresql://localhost:5432
DATABASE_URL=postgresql://localhost:5432/vyapaarkhata_patel
CENTRAL_DATABASE_URL=postgresql://localhost:5432/vyapaarkhata_central

# Ports
CENTRAL_PORT=5000
STORE_PORT=4002
HOST=127.0.0.1

# Sync & Tenant Context
CENTRAL_TENANT_ID=00000000-0000-0000-0000-000000000001
CENTRAL_SERVER_URL=http://127.0.0.1:5000
ENABLE_AUTO_SYNC=true
SYNC_INTERVAL_MS=600000
```

---

## 🏪 Multi-Store Dev Profiles

vyapaarKhata includes pre-configured tenant configurations and seed datasets:

### 1. Patel Centring & Building Materials (Default Store)
- **Profile:** Construction materials, scaffolding, cement, balli, pipes, plates, and rental hire.
- **Server:** `pnpm dev:patel:server` (Port `4002`, DB: `vyapaarkhata_patel`)
- **Web:** `pnpm dev:patel:web` (Vite config: `vite.patel.config.js`)

### 2. Shreeji Jewellery & Ornaments Store
- **Profile:** Bullion, gold jewelry, silver art works, stone weight deductions, carat-based pricing.
- **Server:** `pnpm dev:jewellery:server` (Port `4003`, DB: `vyapaarkhata_jewellery`)
- **Web:** `pnpm dev:jewellery:web` (Vite config: `vite.jewellery.config.js`)

---

## 📜 Available NPM / PNPM Scripts

| Command | Description |
| :--- | :--- |
| `pnpm dev:local` | Launches Central Cloud, Store Server, and Web together |
| `pnpm dev:local --build` | Builds all packages/servers before launching |
| `pnpm dev:local --kill-stale` | Forces termination of any stale processes on ports 5000/4002 |
| `pnpm build` | Compiles TypeScript across all workspace packages and apps |
| `pnpm test` | Executes the complete Vitest test suite |
| `pnpm typecheck` | Runs TypeScript type checking across all packages |
| `pnpm lint` | Runs linter across all packages |
| `pnpm format` | Formats all code using Prettier |

---

## 🧪 Testing

The repository includes a comprehensive test suite (84+ tests) verifying transactional integrity, cross-tenant data isolation, inventory ledger math, and rental calculations:

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test -- --watch
```

Test coverage includes:
- **Contract Tests:** Verifying Unit of Work implementations for both PostgreSQL and SQLite.
- **Cross-Tenant Data Isolation:** Enforcing tenant boundary guarantees at the database query level.
- **Rental Cycle Tests:** Calculating hire durations, damage compensations, and return lines.
- **Financial & Inventory Posting:** Testing atomic ledger entries, balance rollups, and outbox publications.

---

## 🚢 Production Deployment

For laptop production targets (Windows 10/11 or macOS):
- Backed by **PostgreSQL** or containerized runtime (Docker / nerdctl).
- Reverse proxied via **Nginx** (configurations available under [`deployment/laptop/`](file:///Users/vinaysingh/Desktop/Projects/vyaparkhata/deployment/laptop/)).
- Central cloud deployment can be packaged via standard container images.

---

## 📄 License

This software is licensed under proprietary terms. All rights reserved.
For inquiries, licensing, and white-label deployments, contact [vinayaksingh920@gmail.com](mailto:vinayaksingh920@gmail.com).
