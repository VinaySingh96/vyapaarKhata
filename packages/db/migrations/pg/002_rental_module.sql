-- vyapaarKhata PostgreSQL Migration 002
-- Rental Module (ADR-007): additive tables only, no changes to the 96-table baseline.
-- Safe to re-run (IF NOT EXISTS everywhere).

CREATE TABLE IF NOT EXISTS "rental_issues" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  "party_id" UUID NOT NULL REFERENCES "parties" ("id") ON DELETE RESTRICT,
  "business_location_id" UUID REFERENCES "business_locations" ("id") ON DELETE RESTRICT,
  "source_location_id" UUID NOT NULL REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  "on_rent_location_id" UUID NOT NULL REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  "issue_number" VARCHAR(50) NOT NULL,
  "issue_date" DATE NOT NULL,
  "site_address" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'open',
  "deposit_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" UUID,
  "cancelled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_rental_issues_tenant_id" ON "rental_issues" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_rental_issues_tenant_party_status" ON "rental_issues" ("tenant_id", "party_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rental_issues_tenant_number" ON "rental_issues" ("tenant_id", "issue_number");

CREATE TABLE IF NOT EXISTS "rental_issue_lines" (
  "id" UUID PRIMARY KEY,
  "issue_id" UUID NOT NULL REFERENCES "rental_issues" ("id") ON DELETE RESTRICT,
  "variant_id" UUID NOT NULL REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  "unit_id" UUID NOT NULL REFERENCES "units" ("id") ON DELETE RESTRICT,
  "description_snapshot" VARCHAR(255),
  "qty_issued" NUMERIC(18, 4) NOT NULL,
  "qty_returned" NUMERIC(18, 4) NOT NULL DEFAULT 0,
  "qty_lost" NUMERIC(18, 4) NOT NULL DEFAULT 0,
  "daily_rate" NUMERIC(15, 2) NOT NULL,
  "replacement_rate" NUMERIC(15, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_rental_issue_lines_issue_id" ON "rental_issue_lines" ("issue_id");

CREATE TABLE IF NOT EXISTS "rental_returns" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  "issue_id" UUID NOT NULL REFERENCES "rental_issues" ("id") ON DELETE RESTRICT,
  "return_number" VARCHAR(50) NOT NULL,
  "return_date" DATE NOT NULL,
  "is_final" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" VARCHAR(30) NOT NULL DEFAULT 'posted',
  "sales_invoice_id" UUID REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT,
  "gst_rate" NUMERIC(6, 2) NOT NULL DEFAULT 0,
  "rent_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "loss_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "tax_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "total_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" UUID,
  "cancelled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_rental_returns_tenant_id" ON "rental_returns" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_rental_returns_issue_id" ON "rental_returns" ("issue_id");
CREATE INDEX IF NOT EXISTS "idx_rental_returns_sales_invoice_id" ON "rental_returns" ("sales_invoice_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rental_returns_tenant_number" ON "rental_returns" ("tenant_id", "return_number");

CREATE TABLE IF NOT EXISTS "rental_return_lines" (
  "id" UUID PRIMARY KEY,
  "return_id" UUID NOT NULL REFERENCES "rental_returns" ("id") ON DELETE RESTRICT,
  "issue_line_id" UUID NOT NULL REFERENCES "rental_issue_lines" ("id") ON DELETE RESTRICT,
  "qty_returned" NUMERIC(18, 4) NOT NULL DEFAULT 0,
  "qty_lost" NUMERIC(18, 4) NOT NULL DEFAULT 0,
  "days" INTEGER NOT NULL,
  "daily_rate" NUMERIC(15, 2) NOT NULL,
  "rent_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "loss_rate" NUMERIC(15, 2) NOT NULL DEFAULT 0,
  "loss_amount" NUMERIC(15, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS "idx_rental_return_lines_return_id" ON "rental_return_lines" ("return_id");

INSERT INTO schema_migrations (version) VALUES ('002_rental_module') ON CONFLICT (version) DO NOTHING;
