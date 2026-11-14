-- vyapaarKhata PostgreSQL Migration 001
-- Canonical 96-Table Baseline
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "brands" (
  "id" UUID PRIMARY KEY,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "logo_url" TEXT,
  "primary_color" VARCHAR(255),
  "secondary_color" VARCHAR(255),
  "support_email" VARCHAR(255),
  "support_phone" VARCHAR(255),
  "default_locale" VARCHAR(255),
  "default_currency" VARCHAR(10),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "brand_domains" (
  "id" UUID PRIMARY KEY,
  "brand_id" UUID NOT NULL,
  "domain" VARCHAR(255),
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_verified" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" UUID PRIMARY KEY,
  "brand_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "slug" VARCHAR(255),
  "status" VARCHAR(255) NOT NULL DEFAULT 'trial',
  "country_code" VARCHAR(10),
  "timezone" VARCHAR(255),
  "currency" VARCHAR(10),
  "locale" VARCHAR(255),
  "trial_starts_at" TIMESTAMPTZ,
  "trial_ends_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "business_profiles" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL UNIQUE,
  "legal_name" VARCHAR(255),
  "trade_name" VARCHAR(255),
  "business_type" VARCHAR(255),
  "gstin" VARCHAR(255),
  "pan" VARCHAR(255),
  "email" VARCHAR(255),
  "phone" VARCHAR(255),
  "website" VARCHAR(255),
  "logo_url" TEXT,
  "financial_year_start_month" INTEGER NOT NULL DEFAULT 4,
  "default_tax_inclusive" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_business_profiles_tenant_id" ON "business_profiles" ("tenant_id");
CREATE TABLE IF NOT EXISTS "business_locations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "location_type" VARCHAR(255),
  "phone" VARCHAR(255),
  "email" VARCHAR(255),
  "address_line_1" VARCHAR(255),
  "address_line_2" VARCHAR(255),
  "city" VARCHAR(255),
  "district" VARCHAR(255),
  "state_code" VARCHAR(255),
  "postal_code" VARCHAR(255),
  "country_code" VARCHAR(10),
  "gstin" VARCHAR(255),
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_business_locations_tenant_id" ON "business_locations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "users" (
  "id" UUID PRIMARY KEY,
  "email" VARCHAR(255),
  "phone" VARCHAR(255),
  "full_name" VARCHAR(255),
  "password_hash" TEXT,
  "auth_provider" VARCHAR(255),
  "auth_provider_user_id" VARCHAR(255),
  "is_platform_admin" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_login_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "user_memberships" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'invited',
  "is_owner" BOOLEAN NOT NULL DEFAULT FALSE,
  "joined_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_user_memberships_tenant_id" ON "user_memberships" ("tenant_id");
CREATE TABLE IF NOT EXISTS "roles" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "description" TEXT,
  "is_system_role" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_roles_tenant_id" ON "roles" ("tenant_id");
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" UUID PRIMARY KEY,
  "code" VARCHAR(255),
  "module" VARCHAR(255),
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" UUID NOT NULL,
  "permission_id" UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS "membership_roles" (
  "membership_id" UUID NOT NULL,
  "role_id" UUID NOT NULL
);

CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "setting_key" VARCHAR(255),
  "setting_value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tenant_settings_tenant_id" ON "tenant_settings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" UUID PRIMARY KEY,
  "code" VARCHAR(255),
  "name" VARCHAR(255),
  "description" TEXT,
  "monthly_price" NUMERIC(15, 2),
  "yearly_price" NUMERIC(15, 2),
  "trial_days" INTEGER NOT NULL DEFAULT 14,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS "features" (
  "id" UUID PRIMARY KEY,
  "code" VARCHAR(255),
  "name" VARCHAR(255),
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id" UUID PRIMARY KEY,
  "plan_id" UUID NOT NULL,
  "feature_id" UUID NOT NULL,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "usage_limit" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "plan_id" UUID NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "billing_cycle" VARCHAR(255),
  "starts_at" TIMESTAMPTZ NOT NULL,
  "ends_at" TIMESTAMPTZ,
  "trial_ends_at" TIMESTAMPTZ,
  "cancelled_at" TIMESTAMPTZ,
  "external_subscription_id" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_tenant_id" ON "tenant_subscriptions" ("tenant_id");
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "subscription_id" UUID NOT NULL,
  "invoice_number" VARCHAR(255),
  "amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "total_amount" NUMERIC(15, 2),
  "currency" VARCHAR(10),
  "status" VARCHAR(255),
  "due_at" TIMESTAMPTZ,
  "paid_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_tenant_id" ON "subscription_invoices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "license_activations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_id" UUID,
  "subscription_id" UUID NOT NULL,
  "activation_token_hash" TEXT NOT NULL,
  "activated_at" TIMESTAMPTZ,
  "last_validated_at" TIMESTAMPTZ,
  "grace_until" TIMESTAMPTZ,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_license_activations_tenant_id" ON "license_activations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "catalog_templates" (
  "id" UUID PRIMARY KEY,
  "brand_id" UUID,
  "code" VARCHAR(255),
  "name" VARCHAR(255),
  "description" TEXT,
  "industry" VARCHAR(255),
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS "template_categories" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "template_attributes" (
  "id" UUID PRIMARY KEY,
  "template_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "data_type" VARCHAR(255),
  "is_required" BOOLEAN NOT NULL DEFAULT FALSE,
  "allowed_values" JSONB
);

CREATE TABLE IF NOT EXISTS "product_categories" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_product_categories_tenant_id" ON "product_categories" ("tenant_id");
CREATE TABLE IF NOT EXISTS "attribute_definitions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "data_type" VARCHAR(255),
  "unit_id" UUID,
  "allowed_values" JSONB,
  "is_required" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_attribute_definitions_tenant_id" ON "attribute_definitions" ("tenant_id");
CREATE TABLE IF NOT EXISTS "category_attributes" (
  "category_id" UUID NOT NULL,
  "attribute_id" UUID NOT NULL,
  "is_required" BOOLEAN NOT NULL DEFAULT FALSE,
  "sort_order" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "category_id" UUID,
  "product_type" VARCHAR(255) NOT NULL DEFAULT 'goods',
  "name" VARCHAR(255),
  "description" TEXT,
  "brand_name" VARCHAR(255),
  "manufacturer" VARCHAR(255),
  "is_stock_tracked" BOOLEAN NOT NULL DEFAULT TRUE,
  "tracking_method" VARCHAR(255) NOT NULL DEFAULT 'quantity',
  "valuation_method" VARCHAR(255) NOT NULL DEFAULT 'weighted_average',
  "base_unit_id" UUID NOT NULL,
  "default_purchase_unit_id" UUID,
  "default_sales_unit_id" UUID,
  "default_tax_category_id" UUID,
  "hsn_sac_code" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_products_tenant_id" ON "products" ("tenant_id");
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "product_id" UUID NOT NULL,
  "sku" VARCHAR(255),
  "barcode" VARCHAR(255),
  "variant_name" VARCHAR(255),
  "purchase_price" NUMERIC(15, 2),
  "selling_price" NUMERIC(15, 2),
  "mrp" VARCHAR(255),
  "reorder_level" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_product_variants_tenant_id" ON "product_variants" ("tenant_id");
CREATE TABLE IF NOT EXISTS "variant_attribute_values" (
  "id" UUID PRIMARY KEY,
  "variant_id" UUID NOT NULL,
  "attribute_id" UUID NOT NULL,
  "value_text" TEXT,
  "value_number" VARCHAR(255),
  "value_boolean" BOOLEAN,
  "value_json" JSONB
);

CREATE TABLE IF NOT EXISTS "units" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "name" VARCHAR(255),
  "symbol" VARCHAR(255),
  "dimension" VARCHAR(255),
  "decimal_places" INTEGER NOT NULL DEFAULT 2,
  "is_system" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "idx_units_tenant_id" ON "units" ("tenant_id");
CREATE TABLE IF NOT EXISTS "unit_conversions" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "from_unit_id" UUID NOT NULL,
  "to_unit_id" UUID NOT NULL,
  "conversion_factor" NUMERIC(18, 4),
  "product_id" UUID,
  "variant_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_unit_conversions_tenant_id" ON "unit_conversions" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_categories" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "tax_type" VARCHAR(255) NOT NULL DEFAULT 'gst',
  "is_exempt" BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tax_categories_tenant_id" ON "tax_categories" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "tax_category_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "rate" NUMERIC(6, 4),
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "idx_tax_rates_tenant_id" ON "tax_rates" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_components" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "tax_rate_id" UUID NOT NULL,
  "component_name" VARCHAR(255),
  "component_code" VARCHAR(255),
  "rate" NUMERIC(6, 4)
);

CREATE INDEX IF NOT EXISTS "idx_tax_components_tenant_id" ON "tax_components" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_rules" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "tax_category_id" UUID NOT NULL,
  "source_state_code" VARCHAR(255),
  "destination_state_code" VARCHAR(255),
  "customer_type" VARCHAR(255),
  "is_interstate" BOOLEAN,
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_tax_rules_tenant_id" ON "tax_rules" ("tenant_id");
CREATE TABLE IF NOT EXISTS "price_lists" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "currency" VARCHAR(10),
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "valid_from" DATE,
  "valid_to" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_price_lists_tenant_id" ON "price_lists" ("tenant_id");
CREATE TABLE IF NOT EXISTS "product_prices" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "price_list_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "price" NUMERIC(15, 2),
  "min_quantity" NUMERIC(18, 4),
  "valid_from" DATE,
  "valid_to" DATE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_product_prices_tenant_id" ON "product_prices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "parties" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_type" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255),
  "legal_name" VARCHAR(255),
  "gstin" VARCHAR(255),
  "pan" VARCHAR(255),
  "email" VARCHAR(255),
  "phone" VARCHAR(255),
  "alternate_phone" VARCHAR(255),
  "notes" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ,
  "deleted_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_parties_tenant_id" ON "parties" ("tenant_id");
CREATE TABLE IF NOT EXISTS "party_roles" (
  "party_id" UUID NOT NULL,
  "role" VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS "party_contacts" (
  "id" UUID PRIMARY KEY,
  "party_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "designation" VARCHAR(255),
  "phone" VARCHAR(255),
  "email" VARCHAR(255),
  "is_primary" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "party_addresses" (
  "id" UUID PRIMARY KEY,
  "party_id" UUID NOT NULL,
  "address_type" VARCHAR(255) NOT NULL,
  "address_line_1" VARCHAR(255),
  "address_line_2" VARCHAR(255),
  "city" VARCHAR(255),
  "district" VARCHAR(255),
  "state_code" VARCHAR(255),
  "postal_code" VARCHAR(255),
  "country_code" VARCHAR(10),
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "party_credit_settings" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "credit_limit" VARCHAR(255),
  "credit_days" INTEGER,
  "allow_credit" BOOLEAN NOT NULL DEFAULT TRUE,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_party_credit_settings_tenant_id" ON "party_credit_settings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "inventory_locations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "business_location_id" UUID NOT NULL,
  "parent_id" UUID,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "location_type" VARCHAR(255),
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_inventory_locations_tenant_id" ON "inventory_locations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_balances" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "inventory_location_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "quantity_on_hand" VARCHAR(255),
  "quantity_reserved" VARCHAR(255),
  "quantity_available" VARCHAR(255),
  "average_unit_cost" VARCHAR(255),
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stock_balances_tenant_id" ON "stock_balances" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "inventory_location_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "movement_type" VARCHAR(255) NOT NULL,
  "quantity" NUMERIC(18, 4),
  "unit_id" UUID NOT NULL,
  "base_quantity" NUMERIC(18, 4),
  "unit_cost" VARCHAR(255),
  "total_cost" VARCHAR(255),
  "reference_type" VARCHAR(255),
  "reference_id" UUID,
  "idempotency_key" VARCHAR(255),
  "notes" TEXT,
  "occurred_at" TIMESTAMPTZ NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stock_movements_tenant_id" ON "stock_movements" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "adjustment_number" VARCHAR(255),
  "inventory_location_id" UUID NOT NULL,
  "reason" VARCHAR(255),
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "adjustment_date" DATE NOT NULL,
  "notes" TEXT,
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_tenant_id" ON "stock_adjustments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_adjustment_lines" (
  "id" UUID PRIMARY KEY,
  "adjustment_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "system_quantity" NUMERIC(18, 4),
  "counted_quantity" NUMERIC(18, 4),
  "difference_quantity" NUMERIC(18, 4),
  "unit_cost" VARCHAR(255),
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "transfer_number" VARCHAR(255),
  "source_location_id" UUID NOT NULL,
  "destination_location_id" UUID NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "transfer_date" DATE NOT NULL,
  "notes" TEXT,
  "created_by" UUID,
  "completed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stock_transfers_tenant_id" ON "stock_transfers" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_transfer_lines" (
  "id" UUID PRIMARY KEY,
  "transfer_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "quantity" NUMERIC(18, 4),
  "base_quantity" NUMERIC(18, 4)
);

CREATE TABLE IF NOT EXISTS "stock_reservations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "inventory_location_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "reference_type" VARCHAR(255),
  "reference_id" UUID NOT NULL,
  "quantity" NUMERIC(18, 4),
  "status" VARCHAR(255),
  "expires_at" TIMESTAMPTZ,
  "released_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stock_reservations_tenant_id" ON "stock_reservations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "inventory_batches" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "inventory_location_id" UUID NOT NULL,
  "batch_number" VARCHAR(255),
  "manufacture_date" DATE,
  "expiry_date" DATE,
  "quantity_received" VARCHAR(255),
  "quantity_remaining" VARCHAR(255),
  "unit_cost" VARCHAR(255),
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_inventory_batches_tenant_id" ON "inventory_batches" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_counts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "count_number" VARCHAR(255),
  "inventory_location_id" UUID NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "count_date" DATE NOT NULL,
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_stock_counts_tenant_id" ON "stock_counts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_count_lines" (
  "id" UUID PRIMARY KEY,
  "stock_count_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "system_quantity" NUMERIC(18, 4),
  "counted_quantity" NUMERIC(18, 4),
  "difference_quantity" NUMERIC(18, 4),
  "unit_id" UUID NOT NULL,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "business_location_id" UUID NOT NULL,
  "order_number" VARCHAR(255),
  "order_date" DATE NOT NULL,
  "expected_date" DATE,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "total_amount" NUMERIC(15, 2),
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_purchase_orders_tenant_id" ON "purchase_orders" ("tenant_id");
CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id" UUID PRIMARY KEY,
  "purchase_order_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "description_snapshot" VARCHAR(255),
  "unit_id" UUID NOT NULL,
  "quantity" NUMERIC(18, 4),
  "received_quantity" NUMERIC(18, 4),
  "unit_price" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "tax_rate" NUMERIC(6, 4),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "purchase_receipts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "purchase_order_id" UUID,
  "inventory_location_id" UUID NOT NULL,
  "receipt_number" VARCHAR(255),
  "receipt_date" DATE NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "supplier_delivery_reference" VARCHAR(255),
  "notes" TEXT,
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_purchase_receipts_tenant_id" ON "purchase_receipts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "purchase_receipt_lines" (
  "id" UUID PRIMARY KEY,
  "receipt_id" UUID NOT NULL,
  "purchase_order_line_id" UUID,
  "variant_id" UUID NOT NULL,
  "unit_id" UUID NOT NULL,
  "received_quantity" NUMERIC(18, 4),
  "accepted_quantity" NUMERIC(18, 4),
  "rejected_quantity" NUMERIC(18, 4),
  "unit_cost" VARCHAR(255),
  "batch_id" UUID,
  "notes" TEXT
);

CREATE TABLE IF NOT EXISTS "purchase_bills" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "supplier_id" UUID NOT NULL,
  "business_location_id" UUID NOT NULL,
  "bill_number" VARCHAR(255),
  "supplier_invoice_number" VARCHAR(255),
  "bill_date" DATE NOT NULL,
  "due_date" DATE,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "other_charges" VARCHAR(255),
  "total_amount" NUMERIC(15, 2),
  "amount_paid" VARCHAR(255),
  "notes" TEXT,
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_purchase_bills_tenant_id" ON "purchase_bills" ("tenant_id");
CREATE TABLE IF NOT EXISTS "purchase_bill_lines" (
  "id" UUID PRIMARY KEY,
  "purchase_bill_id" UUID NOT NULL,
  "purchase_receipt_line_id" UUID,
  "variant_id" UUID,
  "description_snapshot" VARCHAR(255),
  "hsn_sac_code" VARCHAR(255),
  "unit_id" UUID NOT NULL,
  "quantity" NUMERIC(18, 4),
  "unit_price" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "purchase_expense_allocations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "purchase_bill_id" UUID NOT NULL,
  "expense_id" UUID,
  "description" VARCHAR(255),
  "allocation_method" VARCHAR(255),
  "amount" NUMERIC(15, 2),
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_purchase_expense_allocations_tenant_id" ON "purchase_expense_allocations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "quotations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "business_location_id" UUID NOT NULL,
  "quotation_number" VARCHAR(255),
  "quotation_date" DATE NOT NULL,
  "valid_until" DATE,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "total_amount" NUMERIC(15, 2),
  "terms" TEXT,
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_quotations_tenant_id" ON "quotations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "quotation_lines" (
  "id" UUID PRIMARY KEY,
  "quotation_id" UUID NOT NULL,
  "variant_id" UUID,
  "description_snapshot" VARCHAR(255),
  "sku_snapshot" VARCHAR(255),
  "hsn_sac_snapshot" VARCHAR(255),
  "unit_id" UUID NOT NULL,
  "quantity" NUMERIC(18, 4),
  "unit_price" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "business_location_id" UUID NOT NULL,
  "order_number" VARCHAR(255),
  "order_date" DATE NOT NULL,
  "expected_delivery_date" DATE,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "total_amount" NUMERIC(15, 2),
  "notes" TEXT,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sales_orders_tenant_id" ON "sales_orders" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sales_order_lines" (
  "id" UUID PRIMARY KEY,
  "sales_order_id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "description_snapshot" VARCHAR(255),
  "sku_snapshot" VARCHAR(255),
  "unit_id" UUID NOT NULL,
  "quantity" NUMERIC(18, 4),
  "reserved_quantity" NUMERIC(18, 4),
  "unit_price" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "sales_invoices" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "business_location_id" UUID NOT NULL,
  "invoice_number" VARCHAR(255),
  "invoice_date" DATE NOT NULL,
  "due_date" DATE,
  "financial_year" VARCHAR(255),
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "place_of_supply_state_code" VARCHAR(255),
  "billing_address_snapshot" JSONB,
  "shipping_address_snapshot" JSONB,
  "customer_name_snapshot" VARCHAR(255),
  "customer_gstin_snapshot" VARCHAR(255),
  "subtotal" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "round_off" VARCHAR(255),
  "total_amount" NUMERIC(15, 2),
  "amount_paid" VARCHAR(255),
  "notes" TEXT,
  "terms" TEXT,
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL,
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_id" ON "sales_invoices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sales_invoice_lines" (
  "id" UUID PRIMARY KEY,
  "invoice_id" UUID NOT NULL,
  "variant_id" UUID,
  "description_snapshot" VARCHAR(255),
  "sku_snapshot" VARCHAR(255),
  "hsn_sac_snapshot" VARCHAR(255),
  "unit_name_snapshot" VARCHAR(255),
  "unit_id" UUID,
  "quantity" NUMERIC(18, 4),
  "base_quantity" NUMERIC(18, 4),
  "unit_price" NUMERIC(15, 2),
  "discount_amount" NUMERIC(15, 2),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "invoice_tax_components" (
  "id" UUID PRIMARY KEY,
  "invoice_line_id" UUID NOT NULL,
  "tax_name_snapshot" VARCHAR(255),
  "tax_code_snapshot" VARCHAR(255),
  "rate" NUMERIC(6, 4),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "invoice_charges" (
  "id" UUID PRIMARY KEY,
  "invoice_id" UUID NOT NULL,
  "description" VARCHAR(255),
  "charge_type" VARCHAR(255),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "amount" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "credit_notes" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "invoice_id" UUID,
  "credit_note_number" VARCHAR(255),
  "credit_note_date" DATE NOT NULL,
  "reason" TEXT,
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "total_amount" NUMERIC(15, 2),
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_credit_notes_tenant_id" ON "credit_notes" ("tenant_id");
CREATE TABLE IF NOT EXISTS "credit_note_lines" (
  "id" UUID PRIMARY KEY,
  "credit_note_id" UUID NOT NULL,
  "invoice_line_id" UUID,
  "variant_id" UUID,
  "description_snapshot" VARCHAR(255),
  "quantity" NUMERIC(18, 4),
  "unit_id" UUID,
  "unit_price" NUMERIC(15, 2),
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "debit_notes" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "purchase_bill_id" UUID,
  "debit_note_number" VARCHAR(255),
  "debit_note_date" DATE NOT NULL,
  "reason" TEXT,
  "total_amount" NUMERIC(15, 2),
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_debit_notes_tenant_id" ON "debit_notes" ("tenant_id");
CREATE TABLE IF NOT EXISTS "debit_note_lines" (
  "id" UUID PRIMARY KEY,
  "debit_note_id" UUID NOT NULL,
  "purchase_bill_line_id" UUID,
  "variant_id" UUID,
  "description_snapshot" VARCHAR(255),
  "quantity" NUMERIC(18, 4),
  "unit_id" UUID,
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "line_total" NUMERIC(15, 2)
);

CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "idx_payment_methods_tenant_id" ON "payment_methods" ("tenant_id");
CREATE TABLE IF NOT EXISTS "financial_accounts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "account_type" VARCHAR(255),
  "bank_name" VARCHAR(255),
  "account_number_masked" VARCHAR(255),
  "opening_balance" NUMERIC(15, 2),
  "is_default" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_financial_accounts_tenant_id" ON "financial_accounts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "payments" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID,
  "financial_account_id" UUID,
  "payment_method_id" UUID NOT NULL,
  "payment_number" VARCHAR(255),
  "direction" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "payment_date" DATE NOT NULL,
  "amount" NUMERIC(15, 2),
  "reference_number" VARCHAR(255),
  "notes" TEXT,
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_payments_tenant_id" ON "payments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "payment_allocations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "payment_id" UUID NOT NULL,
  "document_type" VARCHAR(255),
  "document_id" UUID NOT NULL,
  "allocated_amount" NUMERIC(15, 2),
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_payment_allocations_tenant_id" ON "payment_allocations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "party_ledger_entries" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID NOT NULL,
  "entry_date" DATE NOT NULL,
  "document_type" VARCHAR(255),
  "document_id" UUID NOT NULL,
  "debit_amount" NUMERIC(15, 2),
  "credit_amount" NUMERIC(15, 2),
  "narration" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_party_ledger_entries_tenant_id" ON "party_ledger_entries" ("tenant_id");
CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "code" VARCHAR(255),
  "parent_id" UUID,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS "idx_expense_categories_tenant_id" ON "expense_categories" ("tenant_id");
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "party_id" UUID,
  "expense_category_id" UUID NOT NULL,
  "financial_account_id" UUID,
  "expense_number" VARCHAR(255),
  "expense_date" DATE NOT NULL,
  "description" TEXT,
  "taxable_amount" NUMERIC(15, 2),
  "tax_amount" NUMERIC(15, 2),
  "total_amount" NUMERIC(15, 2),
  "payment_status" VARCHAR(255),
  "created_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_expenses_tenant_id" ON "expenses" ("tenant_id");
CREATE TABLE IF NOT EXISTS "expense_attachments" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "expense_id" UUID NOT NULL,
  "file_name" VARCHAR(255),
  "file_url" TEXT NOT NULL,
  "content_type" VARCHAR(255),
  "file_size" BIGINT,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_expense_attachments_tenant_id" ON "expense_attachments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "parent_id" UUID,
  "account_code" VARCHAR(255),
  "name" VARCHAR(255),
  "account_type" VARCHAR(255),
  "normal_balance" NUMERIC(15, 2),
  "is_system_account" BOOLEAN NOT NULL DEFAULT FALSE,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_id" ON "accounts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "fiscal_years" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "name" VARCHAR(255),
  "starts_on" DATE NOT NULL,
  "ends_on" DATE NOT NULL,
  "is_closed" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS "idx_fiscal_years_tenant_id" ON "fiscal_years" ("tenant_id");
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "fiscal_year_id" UUID,
  "journal_number" VARCHAR(255),
  "entry_date" DATE NOT NULL,
  "narration" TEXT,
  "reference_type" VARCHAR(255),
  "reference_id" UUID,
  "status" VARCHAR(255) NOT NULL DEFAULT 'draft',
  "total_debit" VARCHAR(255),
  "total_credit" VARCHAR(255),
  "created_by" UUID,
  "posted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_id" ON "journal_entries" ("tenant_id");
CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" UUID PRIMARY KEY,
  "journal_entry_id" UUID NOT NULL,
  "account_id" UUID NOT NULL,
  "party_id" UUID,
  "description" TEXT,
  "debit_amount" NUMERIC(15, 2),
  "credit_amount" NUMERIC(15, 2),
  "line_number" INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS "file_attachments" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "entity_type" VARCHAR(255),
  "entity_id" UUID NOT NULL,
  "file_name" VARCHAR(255),
  "storage_key" TEXT NOT NULL,
  "content_type" VARCHAR(255),
  "file_size" BIGINT,
  "uploaded_by" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_file_attachments_tenant_id" ON "file_attachments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "user_id" UUID,
  "entity_type" VARCHAR(255),
  "entity_id" UUID,
  "action" VARCHAR(255),
  "old_values" JSONB,
  "new_values" JSONB,
  "ip_address" VARCHAR(255),
  "device_id" UUID,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_id" ON "audit_logs" ("tenant_id");
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "user_id" UUID,
  "activity_type" VARCHAR(255),
  "description" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_id" ON "activity_logs" ("tenant_id");
CREATE TABLE IF NOT EXISTS "installations" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_code" VARCHAR(255),
  "installation_name" VARCHAR(255),
  "platform" VARCHAR(255),
  "is_primary" BOOLEAN NOT NULL DEFAULT TRUE,
  "app_version" VARCHAR(255),
  "database_version" VARCHAR(255),
  "last_seen_at" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_installations_tenant_id" ON "installations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "installation_devices" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_id" UUID NOT NULL,
  "device_code" VARCHAR(255),
  "device_name" VARCHAR(255),
  "device_type" VARCHAR(255),
  "last_seen_at" TIMESTAMPTZ,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_installation_devices_tenant_id" ON "installation_devices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_outbox" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_id" UUID NOT NULL,
  "event_id" UUID NOT NULL UNIQUE,
  "aggregate_type" VARCHAR(255),
  "aggregate_id" UUID NOT NULL,
  "aggregate_version" BIGINT,
  "sequence_number" BIGINT NOT NULL,
  "event_type" VARCHAR(255),
  "payload" JSONB NOT NULL,
  "status" VARCHAR(255) NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TIMESTAMPTZ,
  "last_error" TEXT,
  "created_at" TIMESTAMPTZ NOT NULL,
  "acknowledged_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_sync_outbox_tenant_id" ON "sync_outbox" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_inbox" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "source_installation_id" UUID NOT NULL,
  "event_id" UUID NOT NULL,
  "event_type" VARCHAR(255),
  "payload_hash" VARCHAR(255),
  "processed_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sync_inbox_tenant_id" ON "sync_inbox" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_cursors" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_id" UUID NOT NULL,
  "stream_name" VARCHAR(255),
  "last_acknowledged_sequence" BIGINT NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sync_cursors_tenant_id" ON "sync_cursors" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_failures" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "outbox_event_id" UUID NOT NULL,
  "failure_type" VARCHAR(255),
  "error_message" TEXT,
  "attempt_number" INTEGER NOT NULL,
  "failed_at" TIMESTAMPTZ NOT NULL,
  "resolved_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_sync_failures_tenant_id" ON "sync_failures" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_conflicts" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_id" UUID NOT NULL,
  "entity_type" VARCHAR(255),
  "entity_id" UUID NOT NULL,
  "local_version" BIGINT,
  "cloud_version" BIGINT,
  "local_payload" JSONB,
  "cloud_payload" JSONB,
  "resolution_strategy" VARCHAR(255),
  "resolved_by" UUID,
  "resolved_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_sync_conflicts_tenant_id" ON "sync_conflicts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID,
  "setting_key" VARCHAR(255),
  "setting_value" JSONB NOT NULL,
  "updated_at" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_system_settings_tenant_id" ON "system_settings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "backup_records" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "installation_id" UUID NOT NULL,
  "backup_type" VARCHAR(255),
  "storage_location" TEXT NOT NULL,
  "file_size" BIGINT,
  "checksum" VARCHAR(255),
  "status" VARCHAR(255),
  "started_at" TIMESTAMPTZ NOT NULL,
  "completed_at" TIMESTAMPTZ,
  "error_message" TEXT
);

CREATE INDEX IF NOT EXISTS "idx_backup_records_tenant_id" ON "backup_records" ("tenant_id");
CREATE TABLE IF NOT EXISTS "hsn_sac_codes" (
  "id" UUID PRIMARY KEY,
  "code" VARCHAR(255),
  "description" TEXT,
  "code_type" VARCHAR(255),
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS "document_sequences" (
  "id" UUID PRIMARY KEY,
  "tenant_id" UUID NOT NULL,
  "business_location_id" UUID,
  "document_type" VARCHAR(255),
  "financial_year" VARCHAR(255),
  "prefix" VARCHAR(255),
  "next_number" BIGINT NOT NULL DEFAULT 1,
  "padding_length" INTEGER NOT NULL DEFAULT 4
);

CREATE INDEX IF NOT EXISTS "idx_document_sequences_tenant_id" ON "document_sequences" ("tenant_id");

-- Foreign Key Constraints
ALTER TABLE "brand_domains" ADD CONSTRAINT "fk_brand_domains_brand_id_brands" FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE RESTRICT;
ALTER TABLE "tenants" ADD CONSTRAINT "fk_tenants_brand_id_brands" FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE RESTRICT;
ALTER TABLE "business_profiles" ADD CONSTRAINT "fk_business_profiles_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "business_locations" ADD CONSTRAINT "fk_business_locations_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "user_memberships" ADD CONSTRAINT "fk_user_memberships_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
ALTER TABLE "user_memberships" ADD CONSTRAINT "fk_user_memberships_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "roles" ADD CONSTRAINT "fk_roles_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_role_id_roles" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT;
ALTER TABLE "role_permissions" ADD CONSTRAINT "fk_role_permissions_permission_id_permissions" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE RESTRICT;
ALTER TABLE "membership_roles" ADD CONSTRAINT "fk_membership_roles_membership_id_user_memberships" FOREIGN KEY ("membership_id") REFERENCES "user_memberships" ("id") ON DELETE RESTRICT;
ALTER TABLE "membership_roles" ADD CONSTRAINT "fk_membership_roles_role_id_roles" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT;
ALTER TABLE "tenant_settings" ADD CONSTRAINT "fk_tenant_settings_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "plan_features" ADD CONSTRAINT "fk_plan_features_plan_id_subscription_plans" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE RESTRICT;
ALTER TABLE "plan_features" ADD CONSTRAINT "fk_plan_features_feature_id_features" FOREIGN KEY ("feature_id") REFERENCES "features" ("id") ON DELETE RESTRICT;
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "fk_tenant_subscriptions_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "tenant_subscriptions" ADD CONSTRAINT "fk_tenant_subscriptions_plan_id_subscription_plans" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE RESTRICT;
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "fk_subscription_invoices_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "subscription_invoices" ADD CONSTRAINT "fk_subscription_invoices_subscription_id_tenant_subscriptions" FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions" ("id") ON DELETE RESTRICT;
ALTER TABLE "license_activations" ADD CONSTRAINT "fk_license_activations_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "license_activations" ADD CONSTRAINT "fk_license_activations_subscription_id_tenant_subscriptions" FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions" ("id") ON DELETE RESTRICT;
ALTER TABLE "license_activations" ADD CONSTRAINT "fk_license_activations_installation_id_installations" FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "catalog_templates" ADD CONSTRAINT "fk_catalog_templates_brand_id_brands" FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE RESTRICT;
ALTER TABLE "template_categories" ADD CONSTRAINT "fk_template_categories_template_id_catalog_templates" FOREIGN KEY ("template_id") REFERENCES "catalog_templates" ("id") ON DELETE RESTRICT;
ALTER TABLE "template_categories" ADD CONSTRAINT "fk_template_categories_parent_id_template_categories" FOREIGN KEY ("parent_id") REFERENCES "template_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "template_attributes" ADD CONSTRAINT "fk_template_attributes_template_id_catalog_templates" FOREIGN KEY ("template_id") REFERENCES "catalog_templates" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_categories" ADD CONSTRAINT "fk_product_categories_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_categories" ADD CONSTRAINT "fk_product_categories_parent_id_product_categories" FOREIGN KEY ("parent_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "fk_attribute_definitions_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "category_attributes" ADD CONSTRAINT "fk_category_attributes_category_id_product_categories" FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "category_attributes" ADD CONSTRAINT "fk_category_attributes_attribute_id_attribute_definitions" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions" ("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_category_id_product_categories" FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_base_unit_id_units" FOREIGN KEY ("base_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_default_purchase_unit_id_units" FOREIGN KEY ("default_purchase_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_default_sales_unit_id_units" FOREIGN KEY ("default_sales_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "products" ADD CONSTRAINT "fk_products_default_tax_category_id_tax_categories" FOREIGN KEY ("default_tax_category_id") REFERENCES "tax_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_product_id_products" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_variants" ADD CONSTRAINT "fk_product_variants_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "fk_variant_attribute_values_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "variant_attribute_values" ADD CONSTRAINT "fk_variant_attribute_values_attribute_id_attribute_definitions" FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions" ("id") ON DELETE RESTRICT;
ALTER TABLE "unit_conversions" ADD CONSTRAINT "fk_unit_conversions_from_unit_id_units" FOREIGN KEY ("from_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "unit_conversions" ADD CONSTRAINT "fk_unit_conversions_to_unit_id_units" FOREIGN KEY ("to_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "unit_conversions" ADD CONSTRAINT "fk_unit_conversions_product_id_products" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT;
ALTER TABLE "unit_conversions" ADD CONSTRAINT "fk_unit_conversions_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "attribute_definitions" ADD CONSTRAINT "fk_attribute_definitions_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "tax_categories" ADD CONSTRAINT "fk_tax_categories_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "tax_rates" ADD CONSTRAINT "fk_tax_rates_tax_category_id_tax_categories" FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "tax_components" ADD CONSTRAINT "fk_tax_components_tax_rate_id_tax_rates" FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates" ("id") ON DELETE RESTRICT;
ALTER TABLE "tax_rules" ADD CONSTRAINT "fk_tax_rules_tax_category_id_tax_categories" FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "price_lists" ADD CONSTRAINT "fk_price_lists_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_prices" ADD CONSTRAINT "fk_product_prices_price_list_id_price_lists" FOREIGN KEY ("price_list_id") REFERENCES "price_lists" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_prices" ADD CONSTRAINT "fk_product_prices_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "product_prices" ADD CONSTRAINT "fk_product_prices_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "parties" ADD CONSTRAINT "fk_parties_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_roles" ADD CONSTRAINT "fk_party_roles_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_contacts" ADD CONSTRAINT "fk_party_contacts_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_addresses" ADD CONSTRAINT "fk_party_addresses_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_credit_settings" ADD CONSTRAINT "fk_party_credit_settings_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_credit_settings" ADD CONSTRAINT "fk_party_credit_settings_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_locations" ADD CONSTRAINT "fk_inventory_locations_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_locations" ADD CONSTRAINT "fk_inventory_locations_business_location_id_business_locations" FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_locations" ADD CONSTRAINT "fk_inventory_locations_parent_id_inventory_locations" FOREIGN KEY ("parent_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_balances" ADD CONSTRAINT "fk_stock_balances_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_balances" ADD CONSTRAINT "fk_stock_balances_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_movements" ADD CONSTRAINT "fk_stock_movements_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_adjustments" ADD CONSTRAINT "fk_stock_adjustments_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "fk_stock_adjustment_lines_adjustment_id_stock_adjustments" FOREIGN KEY ("adjustment_id") REFERENCES "stock_adjustments" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "fk_stock_adjustment_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_adjustment_lines" ADD CONSTRAINT "fk_stock_adjustment_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "fk_stock_transfers_source_location_id_inventory_locations" FOREIGN KEY ("source_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_transfers" ADD CONSTRAINT "fk_stock_transfers_destination_location_id_inventory_locations" FOREIGN KEY ("destination_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "fk_stock_transfer_lines_transfer_id_stock_transfers" FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "fk_stock_transfer_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "fk_stock_transfer_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "fk_stock_reservations_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_reservations" ADD CONSTRAINT "fk_stock_reservations_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_batches" ADD CONSTRAINT "fk_inventory_batches_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "inventory_batches" ADD CONSTRAINT "fk_inventory_batches_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_counts" ADD CONSTRAINT "fk_stock_counts_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "fk_stock_count_lines_stock_count_id_stock_counts" FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "fk_stock_count_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "stock_count_lines" ADD CONSTRAINT "fk_stock_count_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_supplier_id_parties" FOREIGN KEY ("supplier_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_orders" ADD CONSTRAINT "fk_purchase_orders_business_location_id_business_locations" FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "fk_purchase_order_lines_purchase_order_id_purchase_orders" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "fk_purchase_order_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "fk_purchase_order_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "fk_purchase_receipts_supplier_id_parties" FOREIGN KEY ("supplier_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "fk_purchase_receipts_purchase_order_id_purchase_orders" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "fk_purchase_receipts_inventory_location_id_inventory_locations" FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "fk_purchase_receipt_lines_receipt_id_purchase_receipts" FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "fk_purchase_receipt_lines_purchase_order_line_id_purchase_order_lines" FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "fk_purchase_receipt_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "fk_purchase_receipt_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_receipt_lines" ADD CONSTRAINT "fk_purchase_receipt_lines_batch_id_inventory_batches" FOREIGN KEY ("batch_id") REFERENCES "inventory_batches" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "fk_purchase_bills_supplier_id_parties" FOREIGN KEY ("supplier_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_bills" ADD CONSTRAINT "fk_purchase_bills_business_location_id_business_locations" FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_purchase_bill_id_purchase_bills" FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_purchase_receipt_line_id_purchase_receipt_lines" FOREIGN KEY ("purchase_receipt_line_id") REFERENCES "purchase_receipt_lines" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "fk_purchase_bill_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_expense_allocations" ADD CONSTRAINT "fk_purchase_expense_allocations_purchase_bill_id_purchase_bills" FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills" ("id") ON DELETE RESTRICT;
ALTER TABLE "purchase_expense_allocations" ADD CONSTRAINT "fk_purchase_expense_allocations_expense_id_expenses" FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE RESTRICT;
ALTER TABLE "quotations" ADD CONSTRAINT "fk_quotations_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "quotations" ADD CONSTRAINT "fk_quotations_business_location_id_business_locations" FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "quotation_lines" ADD CONSTRAINT "fk_quotation_lines_quotation_id_quotations" FOREIGN KEY ("quotation_id") REFERENCES "quotations" ("id") ON DELETE RESTRICT;
ALTER TABLE "quotation_lines" ADD CONSTRAINT "fk_quotation_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "quotation_lines" ADD CONSTRAINT "fk_quotation_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_orders" ADD CONSTRAINT "fk_sales_orders_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_orders" ADD CONSTRAINT "fk_sales_orders_business_location_id_business_locations" FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_sales_order_id_sales_orders" FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "fk_sales_order_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_invoices" ADD CONSTRAINT "fk_sales_invoices_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_invoices" ADD CONSTRAINT "fk_sales_invoices_business_location_id_business_locations" FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "fk_sales_invoice_lines_invoice_id_sales_invoices" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "fk_sales_invoice_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "fk_sales_invoice_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "invoice_tax_components" ADD CONSTRAINT "fk_invoice_tax_components_invoice_line_id_sales_invoice_lines" FOREIGN KEY ("invoice_line_id") REFERENCES "sales_invoice_lines" ("id") ON DELETE RESTRICT;
ALTER TABLE "invoice_charges" ADD CONSTRAINT "fk_invoice_charges_invoice_id_sales_invoices" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT;
ALTER TABLE "credit_notes" ADD CONSTRAINT "fk_credit_notes_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "credit_notes" ADD CONSTRAINT "fk_credit_notes_invoice_id_sales_invoices" FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT;
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "fk_credit_note_lines_credit_note_id_credit_notes" FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes" ("id") ON DELETE RESTRICT;
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "fk_credit_note_lines_invoice_line_id_sales_invoice_lines" FOREIGN KEY ("invoice_line_id") REFERENCES "sales_invoice_lines" ("id") ON DELETE RESTRICT;
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "fk_credit_note_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "credit_note_lines" ADD CONSTRAINT "fk_credit_note_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "debit_notes" ADD CONSTRAINT "fk_debit_notes_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "debit_notes" ADD CONSTRAINT "fk_debit_notes_purchase_bill_id_purchase_bills" FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills" ("id") ON DELETE RESTRICT;
ALTER TABLE "debit_note_lines" ADD CONSTRAINT "fk_debit_note_lines_debit_note_id_debit_notes" FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes" ("id") ON DELETE RESTRICT;
ALTER TABLE "debit_note_lines" ADD CONSTRAINT "fk_debit_note_lines_purchase_bill_line_id_purchase_bill_lines" FOREIGN KEY ("purchase_bill_line_id") REFERENCES "purchase_bill_lines" ("id") ON DELETE RESTRICT;
ALTER TABLE "debit_note_lines" ADD CONSTRAINT "fk_debit_note_lines_variant_id_product_variants" FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT;
ALTER TABLE "debit_note_lines" ADD CONSTRAINT "fk_debit_note_lines_unit_id_units" FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT;
ALTER TABLE "payment_methods" ADD CONSTRAINT "fk_payment_methods_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "financial_accounts" ADD CONSTRAINT "fk_financial_accounts_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_financial_account_id_financial_accounts" FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts" ("id") ON DELETE RESTRICT;
ALTER TABLE "payments" ADD CONSTRAINT "fk_payments_payment_method_id_payment_methods" FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("id") ON DELETE RESTRICT;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "fk_payment_allocations_payment_id_payments" FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT;
ALTER TABLE "payment_allocations" ADD CONSTRAINT "fk_payment_allocations_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_ledger_entries" ADD CONSTRAINT "fk_party_ledger_entries_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "party_ledger_entries" ADD CONSTRAINT "fk_party_ledger_entries_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "expense_categories" ADD CONSTRAINT "fk_expense_categories_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "expense_categories" ADD CONSTRAINT "fk_expense_categories_parent_id_expense_categories" FOREIGN KEY ("parent_id") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_expense_category_id_expense_categories" FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT;
ALTER TABLE "expenses" ADD CONSTRAINT "fk_expenses_financial_account_id_financial_accounts" FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts" ("id") ON DELETE RESTRICT;
ALTER TABLE "expense_attachments" ADD CONSTRAINT "fk_expense_attachments_expense_id_expenses" FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE RESTRICT;
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "accounts" ADD CONSTRAINT "fk_accounts_parent_id_accounts" FOREIGN KEY ("parent_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT;
ALTER TABLE "fiscal_years" ADD CONSTRAINT "fk_fiscal_years_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "journal_entries" ADD CONSTRAINT "fk_journal_entries_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "journal_entries" ADD CONSTRAINT "fk_journal_entries_fiscal_year_id_fiscal_years" FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years" ("id") ON DELETE RESTRICT;
ALTER TABLE "journal_lines" ADD CONSTRAINT "fk_journal_lines_journal_entry_id_journal_entries" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries" ("id") ON DELETE RESTRICT;
ALTER TABLE "journal_lines" ADD CONSTRAINT "fk_journal_lines_account_id_accounts" FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT;
ALTER TABLE "journal_lines" ADD CONSTRAINT "fk_journal_lines_party_id_parties" FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT;
ALTER TABLE "file_attachments" ADD CONSTRAINT "fk_file_attachments_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "audit_logs" ADD CONSTRAINT "fk_audit_logs_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
ALTER TABLE "activity_logs" ADD CONSTRAINT "fk_activity_logs_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "activity_logs" ADD CONSTRAINT "fk_activity_logs_user_id_users" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT;
ALTER TABLE "installations" ADD CONSTRAINT "fk_installations_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "installation_devices" ADD CONSTRAINT "fk_installation_devices_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "installation_devices" ADD CONSTRAINT "fk_installation_devices_installation_id_installations" FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_outbox" ADD CONSTRAINT "fk_sync_outbox_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_outbox" ADD CONSTRAINT "fk_sync_outbox_installation_id_installations" FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_inbox" ADD CONSTRAINT "fk_sync_inbox_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_inbox" ADD CONSTRAINT "fk_sync_inbox_source_installation_id_installations" FOREIGN KEY ("source_installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_cursors" ADD CONSTRAINT "fk_sync_cursors_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_cursors" ADD CONSTRAINT "fk_sync_cursors_installation_id_installations" FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_failures" ADD CONSTRAINT "fk_sync_failures_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_failures" ADD CONSTRAINT "fk_sync_failures_outbox_event_id_sync_outbox" FOREIGN KEY ("outbox_event_id") REFERENCES "sync_outbox" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "fk_sync_conflicts_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "sync_conflicts" ADD CONSTRAINT "fk_sync_conflicts_installation_id_installations" FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "backup_records" ADD CONSTRAINT "fk_backup_records_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
ALTER TABLE "backup_records" ADD CONSTRAINT "fk_backup_records_installation_id_installations" FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT;
ALTER TABLE "system_settings" ADD CONSTRAINT "fk_system_settings_tenant_id_tenants" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT;
