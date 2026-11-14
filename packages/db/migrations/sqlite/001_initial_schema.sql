-- vyapaarKhata SQLite Migration 001
-- Canonical 96-Table Baseline
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS "brands" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT,
  "code" TEXT,
  "logo_url" TEXT,
  "primary_color" TEXT,
  "secondary_color" TEXT,
  "support_email" TEXT,
  "support_phone" TEXT,
  "default_locale" TEXT,
  "default_currency" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "brand_domains" (
  "id" TEXT PRIMARY KEY,
  "brand_id" TEXT NOT NULL,
  "domain" TEXT,
  "is_primary" INTEGER NOT NULL DEFAULT 0,
  "is_verified" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT PRIMARY KEY,
  "brand_id" TEXT NOT NULL,
  "name" TEXT,
  "slug" TEXT,
  "status" TEXT NOT NULL DEFAULT 'trial',
  "country_code" TEXT,
  "timezone" TEXT,
  "currency" TEXT,
  "locale" TEXT,
  "trial_starts_at" TEXT,
  "trial_ends_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  "deleted_at" TEXT,
  FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "business_profiles" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL UNIQUE,
  "legal_name" TEXT,
  "trade_name" TEXT,
  "business_type" TEXT,
  "gstin" TEXT,
  "pan" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "logo_url" TEXT,
  "financial_year_start_month" INTEGER NOT NULL DEFAULT 4,
  "default_tax_inclusive" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_business_profiles_tenant_id" ON "business_profiles" ("tenant_id");
CREATE TABLE IF NOT EXISTS "business_locations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "location_type" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "city" TEXT,
  "district" TEXT,
  "state_code" TEXT,
  "postal_code" TEXT,
  "country_code" TEXT,
  "gstin" TEXT,
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_business_locations_tenant_id" ON "business_locations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT,
  "phone" TEXT,
  "full_name" TEXT,
  "password_hash" TEXT,
  "auth_provider" TEXT,
  "auth_provider_user_id" TEXT,
  "is_platform_admin" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "last_login_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "user_memberships" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'invited',
  "is_owner" INTEGER NOT NULL DEFAULT 0,
  "joined_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_user_memberships_tenant_id" ON "user_memberships" ("tenant_id");
CREATE TABLE IF NOT EXISTS "roles" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT,
  "name" TEXT,
  "code" TEXT,
  "description" TEXT,
  "is_system_role" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_roles_tenant_id" ON "roles" ("tenant_id");
CREATE TABLE IF NOT EXISTS "permissions" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "module" TEXT,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "role_permissions" (
  "role_id" TEXT NOT NULL,
  "permission_id" TEXT NOT NULL,
  FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "membership_roles" (
  "membership_id" TEXT NOT NULL,
  "role_id" TEXT NOT NULL,
  FOREIGN KEY ("membership_id") REFERENCES "user_memberships" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "tenant_settings" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "setting_key" TEXT,
  "setting_value" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_tenant_settings_tenant_id" ON "tenant_settings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "subscription_plans" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "name" TEXT,
  "description" TEXT,
  "monthly_price" NUMERIC,
  "yearly_price" NUMERIC,
  "trial_days" INTEGER NOT NULL DEFAULT 14,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT
);

CREATE TABLE IF NOT EXISTS "features" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "name" TEXT,
  "description" TEXT
);

CREATE TABLE IF NOT EXISTS "plan_features" (
  "id" TEXT PRIMARY KEY,
  "plan_id" TEXT NOT NULL,
  "feature_id" TEXT NOT NULL,
  "enabled" INTEGER NOT NULL DEFAULT 1,
  "usage_limit" TEXT,
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("feature_id") REFERENCES "features" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "tenant_subscriptions" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "plan_id" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "billing_cycle" TEXT,
  "starts_at" TEXT NOT NULL,
  "ends_at" TEXT,
  "trial_ends_at" TEXT,
  "cancelled_at" TEXT,
  "external_subscription_id" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("plan_id") REFERENCES "subscription_plans" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_tenant_subscriptions_tenant_id" ON "tenant_subscriptions" ("tenant_id");
CREATE TABLE IF NOT EXISTS "subscription_invoices" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "subscription_id" TEXT NOT NULL,
  "invoice_number" TEXT,
  "amount" NUMERIC,
  "tax_amount" NUMERIC,
  "total_amount" NUMERIC,
  "currency" TEXT,
  "status" TEXT,
  "due_at" TEXT,
  "paid_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_subscription_invoices_tenant_id" ON "subscription_invoices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "license_activations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_id" TEXT,
  "subscription_id" TEXT NOT NULL,
  "activation_token_hash" TEXT NOT NULL,
  "activated_at" TEXT,
  "last_validated_at" TEXT,
  "grace_until" TEXT,
  "revoked_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("subscription_id") REFERENCES "tenant_subscriptions" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_license_activations_tenant_id" ON "license_activations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "catalog_templates" (
  "id" TEXT PRIMARY KEY,
  "brand_id" TEXT,
  "code" TEXT,
  "name" TEXT,
  "description" TEXT,
  "industry" TEXT,
  "version" INTEGER NOT NULL DEFAULT 1,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "template_categories" (
  "id" TEXT PRIMARY KEY,
  "template_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "name" TEXT,
  "code" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("template_id") REFERENCES "catalog_templates" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("parent_id") REFERENCES "template_categories" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "template_attributes" (
  "id" TEXT PRIMARY KEY,
  "template_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "data_type" TEXT,
  "is_required" INTEGER NOT NULL DEFAULT 0,
  "allowed_values" TEXT,
  FOREIGN KEY ("template_id") REFERENCES "catalog_templates" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "product_categories" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "name" TEXT,
  "code" TEXT,
  "description" TEXT,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("parent_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_product_categories_tenant_id" ON "product_categories" ("tenant_id");
CREATE TABLE IF NOT EXISTS "attribute_definitions" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "data_type" TEXT,
  "unit_id" TEXT,
  "allowed_values" TEXT,
  "is_required" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_attribute_definitions_tenant_id" ON "attribute_definitions" ("tenant_id");
CREATE TABLE IF NOT EXISTS "category_attributes" (
  "category_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "is_required" INTEGER NOT NULL DEFAULT 0,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "products" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "category_id" TEXT,
  "product_type" TEXT NOT NULL DEFAULT 'goods',
  "name" TEXT,
  "description" TEXT,
  "brand_name" TEXT,
  "manufacturer" TEXT,
  "is_stock_tracked" INTEGER NOT NULL DEFAULT 1,
  "tracking_method" TEXT NOT NULL DEFAULT 'quantity',
  "valuation_method" TEXT NOT NULL DEFAULT 'weighted_average',
  "base_unit_id" TEXT NOT NULL,
  "default_purchase_unit_id" TEXT,
  "default_sales_unit_id" TEXT,
  "default_tax_category_id" TEXT,
  "hsn_sac_code" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  "deleted_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("category_id") REFERENCES "product_categories" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("base_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("default_purchase_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("default_sales_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("default_tax_category_id") REFERENCES "tax_categories" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_products_tenant_id" ON "products" ("tenant_id");
CREATE TABLE IF NOT EXISTS "product_variants" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "product_id" TEXT NOT NULL,
  "sku" TEXT,
  "barcode" TEXT,
  "variant_name" TEXT,
  "purchase_price" NUMERIC,
  "selling_price" NUMERIC,
  "mrp" TEXT,
  "reorder_level" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_product_variants_tenant_id" ON "product_variants" ("tenant_id");
CREATE TABLE IF NOT EXISTS "variant_attribute_values" (
  "id" TEXT PRIMARY KEY,
  "variant_id" TEXT NOT NULL,
  "attribute_id" TEXT NOT NULL,
  "value_text" TEXT,
  "value_number" TEXT,
  "value_boolean" INTEGER,
  "value_json" TEXT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "units" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT,
  "name" TEXT,
  "symbol" TEXT,
  "dimension" TEXT,
  "decimal_places" INTEGER NOT NULL DEFAULT 2,
  "is_system" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS "idx_units_tenant_id" ON "units" ("tenant_id");
CREATE TABLE IF NOT EXISTS "unit_conversions" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "from_unit_id" TEXT NOT NULL,
  "to_unit_id" TEXT NOT NULL,
  "conversion_factor" NUMERIC,
  "product_id" TEXT,
  "variant_id" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("from_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("to_unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_unit_conversions_tenant_id" ON "unit_conversions" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_categories" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "tax_type" TEXT NOT NULL DEFAULT 'gst',
  "is_exempt" INTEGER NOT NULL DEFAULT 0,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_tax_categories_tenant_id" ON "tax_categories" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_rates" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "tax_category_id" TEXT NOT NULL,
  "name" TEXT,
  "rate" NUMERIC,
  "effective_from" TEXT NOT NULL,
  "effective_to" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_tax_rates_tenant_id" ON "tax_rates" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_components" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "tax_rate_id" TEXT NOT NULL,
  "component_name" TEXT,
  "component_code" TEXT,
  "rate" NUMERIC,
  FOREIGN KEY ("tax_rate_id") REFERENCES "tax_rates" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_tax_components_tenant_id" ON "tax_components" ("tenant_id");
CREATE TABLE IF NOT EXISTS "tax_rules" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "tax_category_id" TEXT NOT NULL,
  "source_state_code" TEXT,
  "destination_state_code" TEXT,
  "customer_type" TEXT,
  "is_interstate" INTEGER,
  "effective_from" TEXT NOT NULL,
  "effective_to" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_tax_rules_tenant_id" ON "tax_rules" ("tenant_id");
CREATE TABLE IF NOT EXISTS "price_lists" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "currency" TEXT,
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "valid_from" TEXT,
  "valid_to" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_price_lists_tenant_id" ON "price_lists" ("tenant_id");
CREATE TABLE IF NOT EXISTS "product_prices" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "price_list_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "price" NUMERIC,
  "min_quantity" NUMERIC,
  "valid_from" TEXT,
  "valid_to" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("price_list_id") REFERENCES "price_lists" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_product_prices_tenant_id" ON "product_prices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "parties" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_type" TEXT NOT NULL,
  "display_name" TEXT,
  "legal_name" TEXT,
  "gstin" TEXT,
  "pan" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "alternate_phone" TEXT,
  "notes" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  "deleted_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_parties_tenant_id" ON "parties" ("tenant_id");
CREATE TABLE IF NOT EXISTS "party_roles" (
  "party_id" TEXT NOT NULL,
  "role" TEXT,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "party_contacts" (
  "id" TEXT PRIMARY KEY,
  "party_id" TEXT NOT NULL,
  "name" TEXT,
  "designation" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "is_primary" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "party_addresses" (
  "id" TEXT PRIMARY KEY,
  "party_id" TEXT NOT NULL,
  "address_type" TEXT NOT NULL,
  "address_line_1" TEXT,
  "address_line_2" TEXT,
  "city" TEXT,
  "district" TEXT,
  "state_code" TEXT,
  "postal_code" TEXT,
  "country_code" TEXT,
  "is_default" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "party_credit_settings" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "credit_limit" TEXT,
  "credit_days" INTEGER,
  "allow_credit" INTEGER NOT NULL DEFAULT 1,
  "updated_at" TEXT NOT NULL,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_party_credit_settings_tenant_id" ON "party_credit_settings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "inventory_locations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "business_location_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "name" TEXT,
  "code" TEXT,
  "location_type" TEXT,
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("parent_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_inventory_locations_tenant_id" ON "inventory_locations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_balances" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "inventory_location_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "quantity_on_hand" TEXT,
  "quantity_reserved" TEXT,
  "quantity_available" TEXT,
  "average_unit_cost" TEXT,
  "updated_at" TEXT NOT NULL,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_stock_balances_tenant_id" ON "stock_balances" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_movements" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "inventory_location_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "movement_type" TEXT NOT NULL,
  "quantity" NUMERIC,
  "unit_id" TEXT NOT NULL,
  "base_quantity" NUMERIC,
  "unit_cost" TEXT,
  "total_cost" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "idempotency_key" TEXT,
  "notes" TEXT,
  "occurred_at" TEXT NOT NULL,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_stock_movements_tenant_id" ON "stock_movements" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_adjustments" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "adjustment_number" TEXT,
  "inventory_location_id" TEXT NOT NULL,
  "reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "adjustment_date" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_stock_adjustments_tenant_id" ON "stock_adjustments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_adjustment_lines" (
  "id" TEXT PRIMARY KEY,
  "adjustment_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "system_quantity" NUMERIC,
  "counted_quantity" NUMERIC,
  "difference_quantity" NUMERIC,
  "unit_cost" TEXT,
  "notes" TEXT,
  FOREIGN KEY ("adjustment_id") REFERENCES "stock_adjustments" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "stock_transfers" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "transfer_number" TEXT,
  "source_location_id" TEXT NOT NULL,
  "destination_location_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "transfer_date" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" TEXT,
  "completed_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("source_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("destination_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_stock_transfers_tenant_id" ON "stock_transfers" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_transfer_lines" (
  "id" TEXT PRIMARY KEY,
  "transfer_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "quantity" NUMERIC,
  "base_quantity" NUMERIC,
  FOREIGN KEY ("transfer_id") REFERENCES "stock_transfers" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "stock_reservations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "inventory_location_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "reference_type" TEXT,
  "reference_id" TEXT NOT NULL,
  "quantity" NUMERIC,
  "status" TEXT,
  "expires_at" TEXT,
  "released_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_stock_reservations_tenant_id" ON "stock_reservations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "inventory_batches" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "inventory_location_id" TEXT NOT NULL,
  "batch_number" TEXT,
  "manufacture_date" TEXT,
  "expiry_date" TEXT,
  "quantity_received" TEXT,
  "quantity_remaining" TEXT,
  "unit_cost" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_inventory_batches_tenant_id" ON "inventory_batches" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_counts" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "count_number" TEXT,
  "inventory_location_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "count_date" TEXT NOT NULL,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_stock_counts_tenant_id" ON "stock_counts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "stock_count_lines" (
  "id" TEXT PRIMARY KEY,
  "stock_count_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "system_quantity" NUMERIC,
  "counted_quantity" NUMERIC,
  "difference_quantity" NUMERIC,
  "unit_id" TEXT NOT NULL,
  "notes" TEXT,
  FOREIGN KEY ("stock_count_id") REFERENCES "stock_counts" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "purchase_orders" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "business_location_id" TEXT NOT NULL,
  "order_number" TEXT,
  "order_date" TEXT NOT NULL,
  "expected_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC,
  "discount_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "total_amount" NUMERIC,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("supplier_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_purchase_orders_tenant_id" ON "purchase_orders" ("tenant_id");
CREATE TABLE IF NOT EXISTS "purchase_order_lines" (
  "id" TEXT PRIMARY KEY,
  "purchase_order_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "description_snapshot" TEXT,
  "unit_id" TEXT NOT NULL,
  "quantity" NUMERIC,
  "received_quantity" NUMERIC,
  "unit_price" NUMERIC,
  "discount_amount" NUMERIC,
  "tax_rate" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "purchase_receipts" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "purchase_order_id" TEXT,
  "inventory_location_id" TEXT NOT NULL,
  "receipt_number" TEXT,
  "receipt_date" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "supplier_delivery_reference" TEXT,
  "notes" TEXT,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("supplier_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("inventory_location_id") REFERENCES "inventory_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_purchase_receipts_tenant_id" ON "purchase_receipts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "purchase_receipt_lines" (
  "id" TEXT PRIMARY KEY,
  "receipt_id" TEXT NOT NULL,
  "purchase_order_line_id" TEXT,
  "variant_id" TEXT NOT NULL,
  "unit_id" TEXT NOT NULL,
  "received_quantity" NUMERIC,
  "accepted_quantity" NUMERIC,
  "rejected_quantity" NUMERIC,
  "unit_cost" TEXT,
  "batch_id" TEXT,
  "notes" TEXT,
  FOREIGN KEY ("receipt_id") REFERENCES "purchase_receipts" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("purchase_order_line_id") REFERENCES "purchase_order_lines" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("batch_id") REFERENCES "inventory_batches" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "purchase_bills" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "supplier_id" TEXT NOT NULL,
  "business_location_id" TEXT NOT NULL,
  "bill_number" TEXT,
  "supplier_invoice_number" TEXT,
  "bill_date" TEXT NOT NULL,
  "due_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC,
  "discount_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "other_charges" TEXT,
  "total_amount" NUMERIC,
  "amount_paid" TEXT,
  "notes" TEXT,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("supplier_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_purchase_bills_tenant_id" ON "purchase_bills" ("tenant_id");
CREATE TABLE IF NOT EXISTS "purchase_bill_lines" (
  "id" TEXT PRIMARY KEY,
  "purchase_bill_id" TEXT NOT NULL,
  "purchase_receipt_line_id" TEXT,
  "variant_id" TEXT,
  "description_snapshot" TEXT,
  "hsn_sac_code" TEXT,
  "unit_id" TEXT NOT NULL,
  "quantity" NUMERIC,
  "unit_price" NUMERIC,
  "discount_amount" NUMERIC,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("purchase_receipt_line_id") REFERENCES "purchase_receipt_lines" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "purchase_expense_allocations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "purchase_bill_id" TEXT NOT NULL,
  "expense_id" TEXT,
  "description" TEXT,
  "allocation_method" TEXT,
  "amount" NUMERIC,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_purchase_expense_allocations_tenant_id" ON "purchase_expense_allocations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "quotations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "business_location_id" TEXT NOT NULL,
  "quotation_number" TEXT,
  "quotation_date" TEXT NOT NULL,
  "valid_until" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC,
  "discount_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "total_amount" NUMERIC,
  "terms" TEXT,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_quotations_tenant_id" ON "quotations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "quotation_lines" (
  "id" TEXT PRIMARY KEY,
  "quotation_id" TEXT NOT NULL,
  "variant_id" TEXT,
  "description_snapshot" TEXT,
  "sku_snapshot" TEXT,
  "hsn_sac_snapshot" TEXT,
  "unit_id" TEXT NOT NULL,
  "quantity" NUMERIC,
  "unit_price" NUMERIC,
  "discount_amount" NUMERIC,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("quotation_id") REFERENCES "quotations" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "sales_orders" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "business_location_id" TEXT NOT NULL,
  "order_number" TEXT,
  "order_date" TEXT NOT NULL,
  "expected_delivery_date" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "subtotal" NUMERIC,
  "discount_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "total_amount" NUMERIC,
  "notes" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sales_orders_tenant_id" ON "sales_orders" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sales_order_lines" (
  "id" TEXT PRIMARY KEY,
  "sales_order_id" TEXT NOT NULL,
  "variant_id" TEXT NOT NULL,
  "description_snapshot" TEXT,
  "sku_snapshot" TEXT,
  "unit_id" TEXT NOT NULL,
  "quantity" NUMERIC,
  "reserved_quantity" NUMERIC,
  "unit_price" NUMERIC,
  "discount_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("sales_order_id") REFERENCES "sales_orders" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "sales_invoices" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "business_location_id" TEXT NOT NULL,
  "invoice_number" TEXT,
  "invoice_date" TEXT NOT NULL,
  "due_date" TEXT,
  "financial_year" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "place_of_supply_state_code" TEXT,
  "billing_address_snapshot" TEXT,
  "shipping_address_snapshot" TEXT,
  "customer_name_snapshot" TEXT,
  "customer_gstin_snapshot" TEXT,
  "subtotal" NUMERIC,
  "discount_amount" NUMERIC,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "round_off" TEXT,
  "total_amount" NUMERIC,
  "amount_paid" TEXT,
  "notes" TEXT,
  "terms" TEXT,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  "updated_at" TEXT,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("business_location_id") REFERENCES "business_locations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sales_invoices_tenant_id" ON "sales_invoices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sales_invoice_lines" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL,
  "variant_id" TEXT,
  "description_snapshot" TEXT,
  "sku_snapshot" TEXT,
  "hsn_sac_snapshot" TEXT,
  "unit_name_snapshot" TEXT,
  "unit_id" TEXT,
  "quantity" NUMERIC,
  "base_quantity" NUMERIC,
  "unit_price" NUMERIC,
  "discount_amount" NUMERIC,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "invoice_tax_components" (
  "id" TEXT PRIMARY KEY,
  "invoice_line_id" TEXT NOT NULL,
  "tax_name_snapshot" TEXT,
  "tax_code_snapshot" TEXT,
  "rate" NUMERIC,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  FOREIGN KEY ("invoice_line_id") REFERENCES "sales_invoice_lines" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "invoice_charges" (
  "id" TEXT PRIMARY KEY,
  "invoice_id" TEXT NOT NULL,
  "description" TEXT,
  "charge_type" TEXT,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "amount" NUMERIC,
  FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "credit_notes" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "invoice_id" TEXT,
  "credit_note_number" TEXT,
  "credit_note_date" TEXT NOT NULL,
  "reason" TEXT,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "total_amount" NUMERIC,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("invoice_id") REFERENCES "sales_invoices" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_credit_notes_tenant_id" ON "credit_notes" ("tenant_id");
CREATE TABLE IF NOT EXISTS "credit_note_lines" (
  "id" TEXT PRIMARY KEY,
  "credit_note_id" TEXT NOT NULL,
  "invoice_line_id" TEXT,
  "variant_id" TEXT,
  "description_snapshot" TEXT,
  "quantity" NUMERIC,
  "unit_id" TEXT,
  "unit_price" NUMERIC,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("credit_note_id") REFERENCES "credit_notes" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("invoice_line_id") REFERENCES "sales_invoice_lines" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "debit_notes" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "purchase_bill_id" TEXT,
  "debit_note_number" TEXT,
  "debit_note_date" TEXT NOT NULL,
  "reason" TEXT,
  "total_amount" NUMERIC,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("purchase_bill_id") REFERENCES "purchase_bills" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_debit_notes_tenant_id" ON "debit_notes" ("tenant_id");
CREATE TABLE IF NOT EXISTS "debit_note_lines" (
  "id" TEXT PRIMARY KEY,
  "debit_note_id" TEXT NOT NULL,
  "purchase_bill_line_id" TEXT,
  "variant_id" TEXT,
  "description_snapshot" TEXT,
  "quantity" NUMERIC,
  "unit_id" TEXT,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "line_total" NUMERIC,
  FOREIGN KEY ("debit_note_id") REFERENCES "debit_notes" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("purchase_bill_line_id") REFERENCES "purchase_bill_lines" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("variant_id") REFERENCES "product_variants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("unit_id") REFERENCES "units" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "payment_methods" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_payment_methods_tenant_id" ON "payment_methods" ("tenant_id");
CREATE TABLE IF NOT EXISTS "financial_accounts" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "account_type" TEXT,
  "bank_name" TEXT,
  "account_number_masked" TEXT,
  "opening_balance" NUMERIC,
  "is_default" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_financial_accounts_tenant_id" ON "financial_accounts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "payments" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT,
  "financial_account_id" TEXT,
  "payment_method_id" TEXT NOT NULL,
  "payment_number" TEXT,
  "direction" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "payment_date" TEXT NOT NULL,
  "amount" NUMERIC,
  "reference_number" TEXT,
  "notes" TEXT,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("payment_method_id") REFERENCES "payment_methods" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_payments_tenant_id" ON "payments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "payment_allocations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "payment_id" TEXT NOT NULL,
  "document_type" TEXT,
  "document_id" TEXT NOT NULL,
  "allocated_amount" NUMERIC,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("payment_id") REFERENCES "payments" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_payment_allocations_tenant_id" ON "payment_allocations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "party_ledger_entries" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT NOT NULL,
  "entry_date" TEXT NOT NULL,
  "document_type" TEXT,
  "document_id" TEXT NOT NULL,
  "debit_amount" NUMERIC,
  "credit_amount" NUMERIC,
  "narration" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_party_ledger_entries_tenant_id" ON "party_ledger_entries" ("tenant_id");
CREATE TABLE IF NOT EXISTS "expense_categories" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "code" TEXT,
  "parent_id" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("parent_id") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_expense_categories_tenant_id" ON "expense_categories" ("tenant_id");
CREATE TABLE IF NOT EXISTS "expenses" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "party_id" TEXT,
  "expense_category_id" TEXT NOT NULL,
  "financial_account_id" TEXT,
  "expense_number" TEXT,
  "expense_date" TEXT NOT NULL,
  "description" TEXT,
  "taxable_amount" NUMERIC,
  "tax_amount" NUMERIC,
  "total_amount" NUMERIC,
  "payment_status" TEXT,
  "created_by" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("financial_account_id") REFERENCES "financial_accounts" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_expenses_tenant_id" ON "expenses" ("tenant_id");
CREATE TABLE IF NOT EXISTS "expense_attachments" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "expense_id" TEXT NOT NULL,
  "file_name" TEXT,
  "file_url" TEXT NOT NULL,
  "content_type" TEXT,
  "file_size" INTEGER,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("expense_id") REFERENCES "expenses" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_expense_attachments_tenant_id" ON "expense_attachments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "parent_id" TEXT,
  "account_code" TEXT,
  "name" TEXT,
  "account_type" TEXT,
  "normal_balance" NUMERIC,
  "is_system_account" INTEGER NOT NULL DEFAULT 0,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("parent_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_accounts_tenant_id" ON "accounts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "fiscal_years" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT,
  "starts_on" TEXT NOT NULL,
  "ends_on" TEXT NOT NULL,
  "is_closed" INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_fiscal_years_tenant_id" ON "fiscal_years" ("tenant_id");
CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "fiscal_year_id" TEXT,
  "journal_number" TEXT,
  "entry_date" TEXT NOT NULL,
  "narration" TEXT,
  "reference_type" TEXT,
  "reference_id" TEXT,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "total_debit" TEXT,
  "total_credit" TEXT,
  "created_by" TEXT,
  "posted_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("fiscal_year_id") REFERENCES "fiscal_years" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_journal_entries_tenant_id" ON "journal_entries" ("tenant_id");
CREATE TABLE IF NOT EXISTS "journal_lines" (
  "id" TEXT PRIMARY KEY,
  "journal_entry_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "party_id" TEXT,
  "description" TEXT,
  "debit_amount" NUMERIC,
  "credit_amount" NUMERIC,
  "line_number" INTEGER NOT NULL,
  FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("account_id") REFERENCES "accounts" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("party_id") REFERENCES "parties" ("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "file_attachments" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT NOT NULL,
  "file_name" TEXT,
  "storage_key" TEXT NOT NULL,
  "content_type" TEXT,
  "file_size" INTEGER,
  "uploaded_by" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_file_attachments_tenant_id" ON "file_attachments" ("tenant_id");
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT,
  "user_id" TEXT,
  "entity_type" TEXT,
  "entity_id" TEXT,
  "action" TEXT,
  "old_values" TEXT,
  "new_values" TEXT,
  "ip_address" TEXT,
  "device_id" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_id" ON "audit_logs" ("tenant_id");
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "user_id" TEXT,
  "activity_type" TEXT,
  "description" TEXT,
  "metadata" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_tenant_id" ON "activity_logs" ("tenant_id");
CREATE TABLE IF NOT EXISTS "installations" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_code" TEXT,
  "installation_name" TEXT,
  "platform" TEXT,
  "is_primary" INTEGER NOT NULL DEFAULT 1,
  "app_version" TEXT,
  "database_version" TEXT,
  "last_seen_at" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_installations_tenant_id" ON "installations" ("tenant_id");
CREATE TABLE IF NOT EXISTS "installation_devices" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_id" TEXT NOT NULL,
  "device_code" TEXT,
  "device_name" TEXT,
  "device_type" TEXT,
  "last_seen_at" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_installation_devices_tenant_id" ON "installation_devices" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_outbox" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL UNIQUE,
  "aggregate_type" TEXT,
  "aggregate_id" TEXT NOT NULL,
  "aggregate_version" INTEGER,
  "sequence_number" INTEGER NOT NULL,
  "event_type" TEXT,
  "payload" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "next_retry_at" TEXT,
  "last_error" TEXT,
  "created_at" TEXT NOT NULL,
  "acknowledged_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sync_outbox_tenant_id" ON "sync_outbox" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_inbox" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "source_installation_id" TEXT NOT NULL,
  "event_id" TEXT NOT NULL,
  "event_type" TEXT,
  "payload_hash" TEXT,
  "processed_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("source_installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sync_inbox_tenant_id" ON "sync_inbox" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_cursors" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_id" TEXT NOT NULL,
  "stream_name" TEXT,
  "last_acknowledged_sequence" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sync_cursors_tenant_id" ON "sync_cursors" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_failures" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "outbox_event_id" TEXT NOT NULL,
  "failure_type" TEXT,
  "error_message" TEXT,
  "attempt_number" INTEGER NOT NULL,
  "failed_at" TEXT NOT NULL,
  "resolved_at" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("outbox_event_id") REFERENCES "sync_outbox" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sync_failures_tenant_id" ON "sync_failures" ("tenant_id");
CREATE TABLE IF NOT EXISTS "sync_conflicts" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_id" TEXT NOT NULL,
  "entity_type" TEXT,
  "entity_id" TEXT NOT NULL,
  "local_version" INTEGER,
  "cloud_version" INTEGER,
  "local_payload" TEXT,
  "cloud_payload" TEXT,
  "resolution_strategy" TEXT,
  "resolved_by" TEXT,
  "resolved_at" TEXT,
  "created_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_sync_conflicts_tenant_id" ON "sync_conflicts" ("tenant_id");
CREATE TABLE IF NOT EXISTS "system_settings" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT,
  "setting_key" TEXT,
  "setting_value" TEXT NOT NULL,
  "updated_at" TEXT NOT NULL,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_system_settings_tenant_id" ON "system_settings" ("tenant_id");
CREATE TABLE IF NOT EXISTS "backup_records" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "installation_id" TEXT NOT NULL,
  "backup_type" TEXT,
  "storage_location" TEXT NOT NULL,
  "file_size" INTEGER,
  "checksum" TEXT,
  "status" TEXT,
  "started_at" TEXT NOT NULL,
  "completed_at" TEXT,
  "error_message" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE RESTRICT,
  FOREIGN KEY ("installation_id") REFERENCES "installations" ("id") ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS "idx_backup_records_tenant_id" ON "backup_records" ("tenant_id");
CREATE TABLE IF NOT EXISTS "hsn_sac_codes" (
  "id" TEXT PRIMARY KEY,
  "code" TEXT,
  "description" TEXT,
  "code_type" TEXT,
  "is_active" INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS "document_sequences" (
  "id" TEXT PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "business_location_id" TEXT,
  "document_type" TEXT,
  "financial_year" TEXT,
  "prefix" TEXT,
  "next_number" INTEGER NOT NULL DEFAULT 1,
  "padding_length" INTEGER NOT NULL DEFAULT 4
);

CREATE INDEX IF NOT EXISTS "idx_document_sequences_tenant_id" ON "document_sequences" ("tenant_id");