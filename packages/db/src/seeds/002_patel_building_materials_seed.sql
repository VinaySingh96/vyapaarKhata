-- ============================================================================
-- vyapaarKhata: Patel Building Materials Master Data Seeder (Idempotent)
-- Domain: Construction Materials & Building Materials Trading (India)
-- Database: vyapaarkhata_patel
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Tenant & Brand & Business Profile
-- ----------------------------------------------------------------------------
UPDATE "brands"
SET "name" = 'Patel Building Materials',
    "code" = 'PBM',
    "default_currency" = 'INR'
WHERE "id" = '00000000-0000-0000-0000-000000000001';

UPDATE "tenants"
SET "name" = 'Patel Building Materials',
    "slug" = 'patel-building-materials',
    "status" = 'active',
    "country_code" = 'IN',
    "currency" = 'INR',
    "locale" = 'en-IN'
WHERE "id" = '00000000-0000-0000-0000-000000000001';

INSERT INTO "business_profiles" (
  "id", "tenant_id", "legal_name", "trade_name", "business_type",
  "gstin", "email", "phone", "financial_year_start_month", "default_tax_inclusive", "created_at"
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Patel Building Materials LLP',
  'Patel Building Materials',
  'Retail + Wholesale',
  '24AABCP1234F1Z8',
  'contact@patelmaterials.in',
  '+91 98250 12345',
  4,
  FALSE,
  NOW()
)
ON CONFLICT ("tenant_id") DO UPDATE SET
  "legal_name" = EXCLUDED.legal_name,
  "trade_name" = EXCLUDED.trade_name,
  "business_type" = EXCLUDED.business_type,
  "gstin" = EXCLUDED.gstin,
  "email" = EXCLUDED.email,
  "phone" = EXCLUDED.phone;

-- ----------------------------------------------------------------------------
-- 2. Locations: Main Shop and Main Godown
-- ----------------------------------------------------------------------------
INSERT INTO "business_locations" (
  "id", "tenant_id", "name", "code", "location_type", "phone", "email",
  "address_line_1", "city", "state_code", "postal_code", "country_code", "gstin", "is_default", "is_active", "created_at"
) VALUES (
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Main Shop',
  'SHOP-01',
  'retail_store',
  '+91 98250 12345',
  'shop@patelmaterials.in',
  'Plot No. 12, GIDC Highway Road, Waghodia',
  'Vadodara',
  '24',
  '390019',
  'IN',
  '24AABCP1234F1Z8',
  TRUE,
  TRUE,
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED.name,
  "address_line_1" = EXCLUDED.address_line_1,
  "city" = EXCLUDED.city,
  "state_code" = EXCLUDED.state_code;

INSERT INTO "inventory_locations" (
  "id", "tenant_id", "business_location_id", "name", "code", "location_type", "is_default", "is_active", "created_at"
) VALUES (
  '70000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'Main Godown',
  'WH-GODOWN-01',
  'warehouse',
  TRUE,
  TRUE,
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED.name;

-- ----------------------------------------------------------------------------
-- 3. Additional Units & Dimensional Conversions
-- ----------------------------------------------------------------------------
INSERT INTO "units" ("id", "tenant_id", "name", "symbol", "dimension", "decimal_places", "is_system", "is_active")
VALUES
  ('10000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Cubic Metres', 'm3', 'volume', 3, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'Bundles', 'bundle', 'packaging', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'Coils', 'coil', 'packaging', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'Rolls', 'roll', 'packaging', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'Truck Loads', 'load', 'volume', 2, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'Litres', 'L', 'volume', 2, TRUE, TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Metric Tonne to Kg (1 MT = 1000 kg)
INSERT INTO "unit_conversions" ("id", "tenant_id", "from_unit_id", "to_unit_id", "conversion_factor", "created_at")
VALUES (
  '11000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000010', -- MT
  '10000000-0000-0000-0000-000000000003', -- kg
  1000.0000,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- Cubic Metre to Cubic Feet (1 m³ = 35.3147 CFT)
INSERT INTO "unit_conversions" ("id", "tenant_id", "from_unit_id", "to_unit_id", "conversion_factor", "created_at")
VALUES (
  '11000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000011', -- m³
  '10000000-0000-0000-0000-000000000007', -- cft
  35.3147,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. Product Categories
-- ----------------------------------------------------------------------------
INSERT INTO "product_categories" ("id", "tenant_id", "name", "code", "description", "is_active", "created_at")
VALUES
  ('c0010000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cement', 'CAT-CEMENT', 'OPC 43, OPC 53, PPC, PSC and White Cement', TRUE, NOW()),
  ('c0020000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Steel & TMT', 'CAT-STEEL', 'TMT Rebars Fe500D, Fe550D and structural steel', TRUE, NOW()),
  ('c0030000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Sand', 'CAT-SAND', 'River Sand, M-Sand, P-Sand and filling sand', TRUE, NOW()),
  ('c0040000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Aggregates & Gitti', 'CAT-AGGREGATES', 'Crushed stone 10mm, 20mm, 40mm and stone dust', TRUE, NOW()),
  ('c0050000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Binding Wire', 'CAT-BINDING-WIRE', 'Annealed and GI binding wire 16G, 18G, 20G', TRUE, NOW()),
  ('c0060000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Bricks & Blocks', 'CAT-BRICKS', 'Red clay bricks, fly ash and AAC blocks', TRUE, NOW()),
  ('c0070000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Construction Chemicals', 'CAT-CHEMICALS', 'Waterproofing, admixtures and curing agents', TRUE, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED.name,
  "description" = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 5. Products & Product Variants
-- ----------------------------------------------------------------------------

-- ==================== CATEGORY A: CEMENT (HSN: 2523, GST: 28%) ====================
-- Product 1: OPC 53 Grade Cement
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0010001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', 'OPC 53 Grade Cement',
  'Ordinary Portland Cement 53 Grade for high-strength RCC structural work', 'UltraTech / ACC / Ambuja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005', '2523', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0010001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0010001-0000-0000-0000-000000000001', 'CEM-ULT-OPC53-50KG', 'UltraTech OPC 53 Grade - 50 kg Bag', 340.00, 390.00, '20', TRUE, NOW()),
  ('b0010001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0010001-0000-0000-0000-000000000001', 'CEM-ACC-OPC53-50KG', 'ACC OPC 53 Grade - 50 kg Bag', 335.00, 385.00, '20', TRUE, NOW()),
  ('b0010001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0010001-0000-0000-0000-000000000001', 'CEM-AMB-OPC53-50KG', 'Ambuja OPC 53 Grade - 50 kg Bag', 335.00, 385.00, '20', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Product 2: PPC Cement
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0010002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', 'Portland Pozzolana Cement (PPC)',
  'Premium PPC cement ideal for plastering, masonry, and foundations', 'UltraTech / ACC / Ambuja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005', '2523', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0010002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0010002-0000-0000-0000-000000000001', 'CEM-ULT-PPC-50KG', 'UltraTech PPC - 50 kg Bag', 320.00, 365.00, '25', TRUE, NOW()),
  ('b0010002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0010002-0000-0000-0000-000000000001', 'CEM-ACC-PPC-50KG', 'ACC PPC - 50 kg Bag', 315.00, 360.00, '25', TRUE, NOW()),
  ('b0010002-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0010002-0000-0000-0000-000000000001', 'CEM-AMB-PPC-50KG', 'Ambuja PPC - 50 kg Bag', 315.00, 360.00, '25', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Product 3: White Cement
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0010003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', 'Birla White Cement',
  'Premium white Portland cement for flooring, decorative works and tile fixing', 'Birla White',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000009', '20000000-0000-0000-0000-000000000005', '2523', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0010003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0010003-0000-0000-0000-000000000001', 'CEM-BW-WHITE-25KG', 'Birla White Cement - 25 kg Bag', 480.00, 550.00, '5', TRUE, NOW()),
  ('b0010003-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0010003-0000-0000-0000-000000000001', 'CEM-BW-WHITE-50KG', 'Birla White Cement - 50 kg Bag', 920.00, 1050.00, '5', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ==================== CATEGORY B: STEEL & TMT (HSN: 7214, GST: 18%) ====================
-- Product 4: Tata Tiscon TMT Fe500D
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0020001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', 'Tata Tiscon Fe500D TMT Bars',
  'High ductility primary steel TMT reinforcement bars conforming to IS 1786', 'Tata Tiscon',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '7214', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0020001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0020001-0000-0000-0000-000000000001', 'TMT-TATA-FE500D-08MM', 'Tata Tiscon Fe500D 8mm TMT Bar', 56.00, 68.00, '500', TRUE, NOW()),
  ('b0020001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0020001-0000-0000-0000-000000000001', 'TMT-TATA-FE500D-10MM', 'Tata Tiscon Fe500D 10mm TMT Bar', 55.00, 67.00, '500', TRUE, NOW()),
  ('b0020001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0020001-0000-0000-0000-000000000001', 'TMT-TATA-FE500D-12MM', 'Tata Tiscon Fe500D 12mm TMT Bar', 54.00, 65.00, '500', TRUE, NOW()),
  ('b0020001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a0020001-0000-0000-0000-000000000001', 'TMT-TATA-FE500D-16MM', 'Tata Tiscon Fe500D 16mm TMT Bar', 54.00, 65.00, '500', TRUE, NOW()),
  ('b0020001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'a0020001-0000-0000-0000-000000000001', 'TMT-TATA-FE500D-20MM', 'Tata Tiscon Fe500D 20mm TMT Bar', 54.00, 65.00, '300', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Product 5: JSW Neosteel TMT Fe550D
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0020002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', 'JSW Neosteel Fe550D TMT Bars',
  'Super-strength TMT rebar engineered for bridges, high-rises and residential load-bearing', 'JSW Neosteel',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '7214', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0020002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0020002-0000-0000-0000-000000000001', 'TMT-JSW-FE550D-10MM', 'JSW Neosteel Fe550D 10mm TMT Bar', 53.00, 64.00, '300', TRUE, NOW()),
  ('b0020002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0020002-0000-0000-0000-000000000001', 'TMT-JSW-FE550D-12MM', 'JSW Neosteel Fe550D 12mm TMT Bar', 52.00, 63.00, '400', TRUE, NOW()),
  ('b0020002-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0020002-0000-0000-0000-000000000001', 'TMT-JSW-FE550D-16MM', 'JSW Neosteel Fe550D 16mm TMT Bar', 52.00, 63.00, '300', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ==================== CATEGORY C: SAND (HSN: 2505, GST: 5%) ====================
-- Product 6: Natural River Sand
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0030001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Natural River Sand',
  'Washed and screened coarse river sand for concrete slab casting and foundations', 'Narmada River Sand',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '2505', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0030001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'a0030001-0000-0000-0000-000000000001', 'SAND-RIVER-CFT', 'Natural River Sand - Screened', 42.00, 55.00, '200', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Product 7: M-Sand & P-Sand
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES
  ('a0030002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0030000-0000-0000-0000-000000000001', 'goods', 'Manufactured Sand (M-Sand)', 'Crushed granite stone sand (Zone II) designed as an eco-friendly replacement for river sand', 'Quarry Manufactured', TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '2505', TRUE, NOW()),
  ('a0030003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0030000-0000-0000-0000-000000000001', 'goods', 'Plastering Sand (P-Sand)', 'Super-fine manufactured sand specially sieved (0-2.36mm) for smooth wall plastering', 'Quarry Manufactured', TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '2505', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0030002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0030002-0000-0000-0000-000000000001', 'SAND-MSAND-CFT', 'M-Sand for Concrete 0-4.75mm', 32.00, 42.00, '200', TRUE, NOW()),
  ('b0030003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0030003-0000-0000-0000-000000000001', 'SAND-PSAND-CFT', 'P-Sand Fine Plaster 0-2.36mm', 36.00, 46.00, '200', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ==================== CATEGORY D: AGGREGATES & GITTI (HSN: 2517, GST: 5%) ====================
-- Product 8: Crushed Stone Aggregates / Gitti
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0040001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Crushed Stone Aggregate (Black Stone / Gitti)',
  'Hard blue/black basalt crushed stone aggregate for RCC slab, column and road construction', 'Blue Metal Basalt',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000007', '20000000-0000-0000-0000-000000000002', '2517', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0040001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0040001-0000-0000-0000-000000000001', 'GITTI-10MM-CFT', 'Crushed Stone Aggregate 10mm Gitti', 28.00, 36.00, '250', TRUE, NOW()),
  ('b0040001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0040001-0000-0000-0000-000000000001', 'GITTI-20MM-CFT', 'Crushed Stone Aggregate 20mm Gitti', 26.00, 34.00, '300', TRUE, NOW()),
  ('b0040001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0040001-0000-0000-0000-000000000001', 'GITTI-40MM-CFT', 'Crushed Stone Aggregate 40mm Gitti', 24.00, 31.00, '200', TRUE, NOW()),
  ('b0040001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'a0040001-0000-0000-0000-000000000001', 'STONE-DUST-CFT', 'Stone Dust / Quarry Dust', 18.00, 24.00, '150', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ==================== CATEGORY E: BINDING WIRE (HSN: 7217, GST: 18%) ====================
-- Product 9: Annealed & GI Binding Wire
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0050001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Construction Binding Wire',
  'Soft annealed black & galvanized wire for tying TMT rebar reinforcement meshes', 'Kamdhenu / Tata Wiron',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', '7217', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0050001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0050001-0000-0000-0000-000000000001', 'BW-ANNEALED-18G', 'Black Annealed Binding Wire 18 Gauge', 68.00, 82.00, '50', TRUE, NOW()),
  ('b0050001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'a0050001-0000-0000-0000-000000000001', 'BW-ANNEALED-16G', 'Black Annealed Binding Wire 16 Gauge', 66.00, 80.00, '50', TRUE, NOW()),
  ('b0050001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'a0050001-0000-0000-0000-000000000001', 'BW-GI-20G', 'Galvanized GI Binding Wire 20 Gauge', 78.00, 95.00, '30', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ==================== CATEGORY F & G: BRICKS & CHEMICALS ====================
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES
  ('a0060001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0060000-0000-0000-0000-000000000001', 'goods', 'Red Clay Kiln Bricks', 'Standard kiln-burnt red clay construction bricks (9x4x3 inches)', 'Local Kiln Grade 1', TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '6901', TRUE, NOW()),
  ('a0060002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0060000-0000-0000-0000-000000000001', 'goods', 'AAC Lightweight Blocks', 'Autoclaved aerated concrete blocks 600x200x150mm for thermal insulation and high structural speed', 'Siporex / Magicrete', TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', '6815', TRUE, NOW()),
  ('a0070001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'c0070000-0000-0000-0000-000000000001', 'goods', 'Dr. Fixit Waterproofing Chemical 5L', 'Integral liquid waterproofing compound for concrete and mortar plaster', 'Dr. Fixit', TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000004', '3824', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES
  ('b0060001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0060001-0000-0000-0000-000000000001', 'BRICK-RED-STD', 'Standard Red Clay Kiln Brick 9x4x3', 7.50, 9.50, '1000', TRUE, NOW()),
  ('b0060002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0060002-0000-0000-0000-000000000001', 'BLOCK-AAC-600', 'AAC Block 600x200x150mm Grade 1', 55.00, 70.00, '200', TRUE, NOW()),
  ('b0070001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0070001-0000-0000-0000-000000000001', 'CHEM-DF-5L', 'Dr. Fixit Waterproofing Chemical 5L', 980.00, 1250.00, '10', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 6. Parties (Suppliers & Customers)
-- ----------------------------------------------------------------------------

-- Suppliers
INSERT INTO "parties" (
  "id", "tenant_id", "party_type", "display_name", "legal_name", "gstin", "phone", "email", "is_active", "created_at"
) VALUES
  ('90000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'supplier', 'Ambuja & UltraTech Cement Distributors LLP', 'Ambuja UltraTech Cement Distribution LLP', '24AACCA1122D1Z4', '+91 98251 11222', 'cementdist@gujarat.in', TRUE, NOW()),
  ('90000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'supplier', 'Gujarat Steel & TMT Stockists', 'Gujarat Steel & Rebar Stockists Pvt Ltd', '24AABCS2233E1Z6', '+91 98252 22333', 'sales@gujaratsteel.in', TRUE, NOW()),
  ('90000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'supplier', 'Narmada River Sand & Quarry Mining Co', 'Narmada River Sand & Mining Enterprises', '24AACCN3344F1Z8', '+91 98253 33444', 'quarry@narmadasand.in', TRUE, NOW()),
  ('90000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'supplier', 'Kamdhenu Wire Industries', 'Kamdhenu Fasteners & Wire Products LLP', '24AACCK4455F1Z8', '+91 98254 44555', 'order@kamdhenuwire.com', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "party_addresses" ("id", "party_id", "address_type", "address_line_1", "city", "state_code", "is_default")
VALUES
  ('91000001-0000-0000-0000-000000000001', '90000001-0000-0000-0000-000000000001', 'billing', 'Plot 101, Makarpura GIDC Industrial Area', 'Vadodara', '24', TRUE),
  ('91000001-0000-0000-0000-000000000002', '90000001-0000-0000-0000-000000000002', 'billing', 'National Highway 8, Golden Chowkdi', 'Vadodara', '24', TRUE),
  ('91000001-0000-0000-0000-000000000003', '90000001-0000-0000-0000-000000000003', 'billing', 'Narmada River Bed Depot, Zadeshwar', 'Bharuch', '24', TRUE),
  ('91000001-0000-0000-0000-000000000004', '90000001-0000-0000-0000-000000000004', 'billing', 'GIDC Industrial Estate Phase 2', 'Ankleshwar', '24', TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Customers
INSERT INTO "parties" (
  "id", "tenant_id", "party_type", "display_name", "legal_name", "gstin", "phone", "email", "is_active", "created_at"
) VALUES
  ('90000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'customer', 'Patel Construction & Infrastructure', 'Patel Construction and Infra Project Pvt Ltd', '24AABCP5566G1Z1', '+91 98255 55666', 'accounts@patelinfra.com', TRUE, NOW()),
  ('90000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'customer', 'Shreeji Developers & Builders', 'Shreeji Developers & Housing LLP', '24AABCS6677H1Z3', '+91 98256 66777', 'projects@shreejibuilders.in', TRUE, NOW()),
  ('90000002-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'customer', 'Ramesh Bhai Contractor', 'Ramesh Bhai Civil Contractor', NULL, '+91 98257 77888', NULL, TRUE, NOW()),
  ('90000002-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'customer', 'Walk-in Retail Customer', 'Walk-in Retail Customer', NULL, '+91 98000 00000', NULL, TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "party_addresses" ("id", "party_id", "address_type", "address_line_1", "city", "state_code", "is_default")
VALUES
  ('91000002-0000-0000-0000-000000000001', '90000002-0000-0000-0000-000000000001', 'billing', 'Waghodia Road, Near L&T Knowledge City', 'Vadodara', '24', TRUE),
  ('91000002-0000-0000-0000-000000000002', '90000002-0000-0000-0000-000000000002', 'billing', 'Shreeji Heights, Alkapuri', 'Vadodara', '24', TRUE),
  ('91000002-0000-0000-0000-000000000003', '90000002-0000-0000-0000-000000000003', 'billing', 'GIDC Colony, Manjalpur', 'Vadodara', '24', TRUE),
  ('91000002-0000-0000-0000-000000000004', '90000002-0000-0000-0000-000000000004', 'billing', 'Counter Cash Sale - Main Shop', 'Vadodara', '24', TRUE)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Payment Methods & Financial Accounts
-- ----------------------------------------------------------------------------
INSERT INTO "payment_methods" ("id", "tenant_id", "name", "code", "is_active")
VALUES
  ('80000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cash', 'CASH', TRUE),
  ('80000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'UPI', 'UPI', TRUE),
  ('80000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Bank Transfer (NEFT/RTGS)', 'BANK_TRANSFER', TRUE),
  ('80000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Cheque', 'CHEQUE', TRUE)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "financial_accounts" (
  "id", "tenant_id", "name", "account_type", "bank_name", "account_number_masked", "opening_balance", "is_default", "is_active", "created_at"
) VALUES
  ('81000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cash in Hand', 'cash', NULL, NULL, 25000.00, TRUE, TRUE, NOW()),
  ('81000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'State Bank of India Current A/c', 'bank', 'State Bank of India', 'XXXXXX8912', 150000.00, FALSE, TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Document Sequence: PBM/2026-27/0001
INSERT INTO "document_sequences" (
  "id", "tenant_id", "business_location_id", "document_type", "financial_year", "prefix", "next_number", "padding_length"
) VALUES (
  '82000001-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'sales_invoice',
  '2026-27',
  'PBM/2026-27/',
  1,
  4
)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. Opening Stock Ledger & Balances in Main Godown
-- ----------------------------------------------------------------------------

-- A. UltraTech OPC 53: 150 Bags
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0010001-0000-0000-0000-000000000001',
  '150', '0', '150', '340', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0010001-0000-0000-0000-000000000001',
  'adjustment_in', 150, '10000000-0000-0000-0000-000000000009', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- B. UltraTech PPC: 120 Bags
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0010002-0000-0000-0000-000000000001',
  '120', '0', '120', '320', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0010002-0000-0000-0000-000000000001',
  'adjustment_in', 120, '10000000-0000-0000-0000-000000000009', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- C. Tata Tiscon 12mm Fe500D: 2,500 kg
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0020001-0000-0000-0000-000000000003',
  '2500', '0', '2500', '54', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0020001-0000-0000-0000-000000000003',
  'adjustment_in', 2500, '10000000-0000-0000-0000-000000000003', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- D. Tata Tiscon 16mm Fe500D: 1,800 kg
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0020001-0000-0000-0000-000000000004',
  '1800', '0', '1800', '54', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0020001-0000-0000-0000-000000000004',
  'adjustment_in', 1800, '10000000-0000-0000-0000-000000000003', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- E. Natural River Sand: 600 CFT
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0030001-0000-0000-0000-000000000001',
  '600', '0', '600', '42', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0030001-0000-0000-0000-000000000001',
  'adjustment_in', 600, '10000000-0000-0000-0000-000000000007', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- F. M-Sand: 800 CFT
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0030002-0000-0000-0000-000000000001',
  '800', '0', '800', '32', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0030002-0000-0000-0000-000000000001',
  'adjustment_in', 800, '10000000-0000-0000-0000-000000000007', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- G. 20mm Gitti: 700 CFT
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0040001-0000-0000-0000-000000000002',
  '700', '0', '700', '26', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0040001-0000-0000-0000-000000000002',
  'adjustment_in', 700, '10000000-0000-0000-0000-000000000007', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- H. 18G Binding Wire: 150 kg
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0050001-0000-0000-0000-000000000001',
  '150', '0', '150', '68', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0050001-0000-0000-0000-000000000001',
  'adjustment_in', 150, '10000000-0000-0000-0000-000000000003', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- I. Red Clay Bricks: 5,000 pcs
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0060001-0000-0000-0000-000000000001',
  '5000', '0', '5000', '7.5', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0060001-0000-0000-0000-000000000001',
  'adjustment_in', 5000, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

COMMIT;
