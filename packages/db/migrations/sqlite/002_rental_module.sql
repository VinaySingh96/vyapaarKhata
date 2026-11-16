-- vyapaarKhata SQLite Migration 002
-- Rental Module (ADR-007): additive tables only, no changes to the 96-table baseline.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "rental_issues" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "business_location_id" TEXT,
  "source_location_id" TEXT NOT NULL,
  "on_rent_location_id" TEXT NOT NULL,
  "issue_number" TEXT NOT NULL,
  "issue_date" TEXT NOT NULL,
  "site_address" TEXT,
  "status" TEXT NOT NULL DEFAULT 'open',
  "deposit_amount" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" TEXT,
  "cancelled_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("source_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("on_rent_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_rental_issues_tenant_id" ON "rental_issues" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_rental_issues_tenant_party_status" ON "rental_issues" ("tenant_id", "party_id", "status");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rental_issues_tenant_number" ON "rental_issues" ("tenant_id", "issue_number");

CREATE TABLE IF NOT EXISTS "rental_issue_lines" (
  "id" TEXT PRIMARY KEY,
  "issue_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "description_snapshot" TEXT,
  "qty_issued" REAL NOT NULL,
  "qty_returned" REAL NOT NULL DEFAULT 0,
  "qty_lost" REAL NOT NULL DEFAULT 0,
  "daily_rate" REAL NOT NULL,
  "replacement_rate" REAL NOT NULL DEFAULT 0,
  FOREIGN KEY ("issue_id") REFERENCES "rental_issues" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_rental_issue_lines_issue_id" ON "rental_issue_lines" ("issue_id");

CREATE TABLE IF NOT EXISTS "rental_returns" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "issue_id" TEXT NOT NULL,
  "return_number" TEXT NOT NULL,
  "return_date" TEXT NOT NULL,
  "is_final" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'posted',
  "sales_invoice_id" TEXT,
  "gst_rate" REAL NOT NULL DEFAULT 0,
  "rent_amount" REAL NOT NULL DEFAULT 0,
  "loss_amount" REAL NOT NULL DEFAULT 0,
  "tax_amount" REAL NOT NULL DEFAULT 0,
  "total_amount" REAL NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" TEXT,
  "cancelled_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("issue_id") REFERENCES "rental_issues" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("sales_invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_rental_returns_tenant_id" ON "rental_returns" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_rental_returns_issue_id" ON "rental_returns" ("issue_id");
CREATE INDEX IF NOT EXISTS "idx_rental_returns_sales_invoice_id" ON "rental_returns" ("sales_invoice_id");
CREATE UNIQUE INDEX IF NOT EXISTS "uq_rental_returns_tenant_number" ON "rental_returns" ("tenant_id", "return_number");

CREATE TABLE IF NOT EXISTS "rental_return_lines" (
  "id" TEXT PRIMARY KEY,
  "return_id" TEXT NOT NULL,
  "issue_line_id" TEXT NOT NULL,
  "qty_returned" REAL NOT NULL DEFAULT 0,
  "qty_lost" REAL NOT NULL DEFAULT 0,
  "days" INTEGER NOT NULL,
  "daily_rate" REAL NOT NULL,
  "rent_amount" REAL NOT NULL DEFAULT 0,
  "loss_rate" REAL NOT NULL DEFAULT 0,
  "loss_amount" REAL NOT NULL DEFAULT 0,
  FOREIGN KEY ("return_id") REFERENCES "rental_returns" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("issue_line_id") REFERENCES "rental_issue_lines" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_rental_return_lines_return_id" ON "rental_return_lines" ("return_id");

INSERT OR IGNORE INTO schema_migrations (version) VALUES ('002_rental_module');
