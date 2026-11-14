-- vyapaarKhata Reference & Seed Data (Idempotent)
-- DB-05: Standard Units, GST Tax Components, System Roles and Permissions

-- Default Brand and Tenant for local single-store setup
INSERT INTO "brands" ("id", "name", "code", "default_currency", "is_active", "created_at")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'vyapaarKhata Retail',
  'VK-RETAIL',
  'INR',
  TRUE,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "tenants" ("id", "brand_id", "name", "slug", "status", "country_code", "currency", "locale", "created_at")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Default Store',
  'default-store',
  'active',
  'IN',
  'INR',
  'en-IN',
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Default Authoritative Local Server Installation
INSERT INTO "installations" ("id", "tenant_id", "installation_code", "is_primary", "is_active", "created_at")
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'PRIMARY-SERVER-01',
  TRUE,
  TRUE,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Standard Indian Units of Measurement
INSERT INTO "units" ("id", "tenant_id", "name", "symbol", "dimension", "decimal_places", "is_system", "is_active")
VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Pieces', 'pcs', 'count', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Numbers', 'nos', 'count', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Kilograms', 'kg', 'weight', 3, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Grams', 'g', 'weight', 2, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Meters', 'm', 'length', 2, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'Square Feet', 'sqft', 'area', 2, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'Cubic Feet', 'cft', 'volume', 3, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001', 'Boxes', 'box', 'packaging', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001', 'Bags', 'bag', 'packaging', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000001', 'Metric Tonnes', 't', 'weight', 3, TRUE, TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Standard Indian GST Tax Categories
INSERT INTO "tax_categories" ("id", "tenant_id", "name", "code", "tax_type", "is_exempt", "created_at")
VALUES
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'GST 0% (Exempt)', 'GST-0', 'gst', TRUE, NOW()),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'GST 5%', 'GST-5', 'gst', FALSE, NOW()),
  ('20000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'GST 12%', 'GST-12', 'gst', FALSE, NOW()),
  ('20000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'GST 18%', 'GST-18', 'gst', FALSE, NOW()),
  ('20000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'GST 28%', 'GST-28', 'gst', FALSE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Standard GST Tax Rates
INSERT INTO "tax_rates" ("id", "tenant_id", "tax_category_id", "name", "rate", "effective_from", "is_active")
VALUES
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Zero Rate', 0.0000, CURRENT_DATE, TRUE),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '5% Rate', 5.0000, CURRENT_DATE, TRUE),
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '12% Rate', 12.0000, CURRENT_DATE, TRUE),
  ('30000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '18% Rate', 18.0000, CURRENT_DATE, TRUE),
  ('30000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', '28% Rate', 28.0000, CURRENT_DATE, TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Standard System Roles
INSERT INTO "roles" ("id", "tenant_id", "name", "code", "description", "is_system_role", "created_at")
VALUES
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Business Owner / Admin', 'ADMIN', 'Full system access', TRUE, NOW()),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Store Manager', 'MANAGER', 'Store and stock management', TRUE, NOW()),
  ('40000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Cashier / Billing Agent', 'CASHIER', 'Point of sale and billing', TRUE, NOW()),
  ('40000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Accountant', 'ACCOUNTANT', 'Books, ledgers and reports', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Standard System Permissions
INSERT INTO "permissions" ("id", "code", "module", "description")
VALUES
  ('50000000-0000-0000-0000-000000000001', 'CATALOGUE_MANAGE', 'catalogue', 'Manage products and pricing'),
  ('50000000-0000-0000-0000-000000000002', 'INVENTORY_VIEW', 'inventory', 'View stock balances'),
  ('50000000-0000-0000-0000-000000000003', 'INVENTORY_MANAGE', 'inventory', 'Stock adjustments and counts'),
  ('50000000-0000-0000-0000-000000000004', 'SALES_CREATE', 'sales', 'Create quotations and draft invoices'),
  ('50000000-0000-0000-0000-000000000005', 'SALES_POST', 'sales', 'Post and finalize sales invoices'),
  ('50000000-0000-0000-0000-000000000006', 'PURCHASE_CREATE', 'purchasing', 'Create purchase orders'),
  ('50000000-0000-0000-0000-000000000007', 'PURCHASE_RECEIVE', 'purchasing', 'Receive purchase deliveries into inventory'),
  ('50000000-0000-0000-0000-000000000008', 'PAYMENT_RECORD', 'finance', 'Record payments and cash receipts'),
  ('50000000-0000-0000-0000-000000000009', 'REPORTS_VIEW', 'reports', 'View business and financial reports'),
  ('50000000-0000-0000-0000-000000000010', 'SYSTEM_ADMIN', 'admin', 'Administrative operations')
ON CONFLICT ("id") DO NOTHING;
