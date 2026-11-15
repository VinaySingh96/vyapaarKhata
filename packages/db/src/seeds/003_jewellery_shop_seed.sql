-- ============================================================================
-- vyapaarKhata: Shree Narayan Jewellers Master Data Seeder (Idempotent)
-- Domain: Jewellery Retail, Gold, Silver, Bullion & Diamond Trading (India)
-- Location: Nizamuddinpur, Bhitari Bazar Road, Narayanpur, Mirzapur-231305, UP
-- Database: vyapaarkhata_jewellery
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Tenant & Brand & Business Profile
-- ----------------------------------------------------------------------------
UPDATE "brands"
SET "name" = 'Shree Narayan Jewellers',
    "code" = 'SNJ',
    "default_currency" = 'INR'
WHERE "id" = '00000000-0000-0000-0000-000000000001';

UPDATE "tenants"
SET "name" = 'Shree Narayan Jewellers',
    "slug" = 'shree-narayan-jewellers',
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
  'Shree Narayan Jewellers Pvt. Ltd.',
  'Shree Narayan Jewellers',
  'Jewellery Retail & Wholesale',
  '09AABCS1234F1Z9',
  'contact@shreenarayanjewellers.in',
  '+91 98391 23456',
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
-- 2. Locations: Main Showroom and Vault (Tijori)
-- ----------------------------------------------------------------------------
INSERT INTO "business_locations" (
  "id", "tenant_id", "name", "code", "location_type", "phone", "email",
  "address_line_1", "city", "state_code", "postal_code", "country_code", "gstin", "is_default", "is_active", "created_at"
) VALUES (
  '60000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Shree Narayan Jewellers',
  'SHOP-01',
  'retail_store',
  '+91 98391 23456',
  'shop@shreenarayanjewellers.in',
  'Nizamuddinpur, Bhitari Bazar Road, Narayanpur, Mirzapur-231305, Uttar Pradesh',
  'Mirzapur',
  '09',
  '231305',
  'IN',
  '09AABCS1234F1Z9',
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
  'Main Jewellery Vault (Tijori)',
  'VAULT-01',
  'warehouse',
  TRUE,
  TRUE,
  NOW()
)
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED.name;

-- ----------------------------------------------------------------------------
-- 3. Additional Units & Dimensional Conversions for Jewellery
-- ----------------------------------------------------------------------------
INSERT INTO "units" ("id", "tenant_id", "name", "symbol", "dimension", "decimal_places", "is_system", "is_active")
VALUES
  ('10000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'Pairs', 'pair', 'count', 0, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'Ratti', 'ratti', 'weight', 2, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'Carats', 'ct', 'weight', 2, TRUE, TRUE),
  ('10000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000001', 'Tola', 'tola', 'weight', 2, TRUE, TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Tola to Gram (1 Tola = 10 g)
INSERT INTO "unit_conversions" ("id", "tenant_id", "from_unit_id", "to_unit_id", "conversion_factor", "created_at")
VALUES (
  '11000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000020', -- tola
  '10000000-0000-0000-0000-000000000004', -- g
  10.0000,
  NOW()
)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 4. GST 3% Tax Category & Rates for Precious Metals & Jewellery
-- ----------------------------------------------------------------------------
INSERT INTO "tax_categories" ("id", "tenant_id", "name", "code", "tax_type", "is_exempt", "created_at")
VALUES
  ('20000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'GST 3% (Gold/Silver/Gems)', 'GST-3', 'gst', FALSE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "tax_rates" ("id", "tenant_id", "tax_category_id", "name", "rate", "effective_from", "is_active")
VALUES
  ('30000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '3% Jewellery Rate', 3.0000, CURRENT_DATE, TRUE)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 5. Product Categories
-- ----------------------------------------------------------------------------
INSERT INTO "product_categories" ("id", "tenant_id", "name", "code", "description", "is_active", "created_at")
VALUES
  ('c0010000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '22K Gold Jewellery (BIS 916)', 'CAT-GOLD-JEWELLERY', '22K 916 BIS Hallmarked Gold Necklaces, Mangalsutra, Bangles, Chains, Rings, Earrings and Bridal Sets', TRUE, NOW()),
  ('c0020000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '24K Gold Coins & Bars (999 Purity)', 'CAT-GOLD-BULLION', '24K 999 Fine Pure Gold Investment Bullion, Coins and Cast Bars', TRUE, NOW()),
  ('c0030000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Silver Jewellery & Ornaments', 'CAT-SILVER-JEWELLERY', 'Pure Chandi and 925 Sterling Silver Payal, Bichhiya, Kadas, Chains, Rings and Bracelets', TRUE, NOW()),
  ('c0040000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Silver Pooja Articles & Utensils', 'CAT-SILVER-POOJA', 'Pure Silver Pooja Thali, Idols (Lakshmi-Ganesh), Aarti Diyas, Kalash, Ghanti and Giftware', TRUE, NOW()),
  ('c0050000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Pure Silver Coins & Bars (999 Purity)', 'CAT-SILVER-BULLION', '999 Fine Silver Coins, Shagun Coins, Ram Mandir Bars, and 1 Kg Silver Bullion Bars', TRUE, NOW()),
  ('c0060000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Certified Diamond Jewellery', 'CAT-DIAMOND', '18K and 14K Certified Natural Diamond Rings, Nose Pins, Earrings, Tanmaniya and Tennis Bracelets', TRUE, NOW()),
  ('c0070000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Astrological Certified Gemstones', 'CAT-GEMSTONES', 'Natural Certified Pukhraj (Yellow Sapphire), Neelam, Panna, Moonga, Manik, Moti, Gomed and Lehsunia', TRUE, NOW()),
  ('c0080000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Bridal & Fashion Imitation Jewellery', 'CAT-IMITATION', 'Premium Bridal Kundan Choker Sets, Temple Haram Sets, Micro Gold Plated Chains, and Rajputi Naths', TRUE, NOW())
ON CONFLICT ("id") DO UPDATE SET
  "name" = EXCLUDED.name,
  "description" = EXCLUDED.description;

-- ----------------------------------------------------------------------------
-- 6. Products & Product Variants (126 Distinct Jewellery Master Items)
-- ----------------------------------------------------------------------------

-- Item 1: 22K Gold Bridal Rani Haar (35g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Bridal Rani Haar (35g)',
  'Grand 22K 916 Hallmarked royal bridal necklace with intricate meenakari and antique finish. Gross Wt: 35.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000001-0000-0000-0000-000000000001', 'GLD-RANI-HAAR-35G', '22K Gold Bridal Rani Haar - 35 Grams', 245000.00, 275000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 2: 22K Gold Royal Guluband Choker (18g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Royal Guluband Choker (18g)',
  'Traditional North Indian Purvanchal style choker necklace with floral clusters. Gross Wt: 18.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000002-0000-0000-0000-000000000001', 'GLD-GULUBAND-18G', '22K Gold Guluband Choker - 18 Grams', 126000.00, 142000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 3: 22K Gold Lightweight Designer Necklace (12g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Lightweight Designer Necklace (12g)',
  'Contemporary lightweight 22K 916 yellow gold fancy necklace set. Gross Wt: 12.0g', 'Shree Narayan Collection',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000003-0000-0000-0000-000000000001', 'GLD-FANCY-NCK-12G', '22K Gold Lightweight Designer Necklace - 12 Grams', 84000.00, 95500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 4: 22K Gold Sita Haar Long Temple Necklace (28g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Sita Haar Long Temple Necklace (28g)',
  'Traditional long sita haar with embossed Lakshmi and floral motifs. Gross Wt: 28.0g', 'Shree Narayan Temple',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000004-0000-0000-0000-000000000001', 'GLD-SITA-HAAR-28G', '22K Gold Sita Haar Long Temple Necklace - 28 Grams', 196000.00, 220000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 5: 22K Gold Traditional Hansli Necklace (22g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Traditional Hansli Necklace (22g)',
  'Solid traditional torque Hansli collar necklace with handcrafted latch. Gross Wt: 22.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000005-0000-0000-0000-000000000001', 'GLD-HANSLI-22G', '22K Gold Traditional Hansli Necklace - 22 Grams', 154000.00, 173000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 6: 22K Gold Men Rope Chain (16g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Men Rope Chain (16g)',
  'Heavy diamond-cut twisted rope chain for men, 22 inches, 22K 916 BIS hallmark. Gross Wt: 16.0g', 'Shree Narayan Chains',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000006-0000-0000-0000-000000000001', 'GLD-CHN-ROPE-16G', '22K Gold Men Rope Chain - 16 Grams', 112000.00, 125500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 7: 22K Gold Rudraksha Mala Chain (12g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Rudraksha Mala Chain (12g)',
  'Panchmukhi original Rudraksha beads encased in 22K hallmarked gold caps and links. Net Gold: 12.0g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000007-0000-0000-0000-000000000001', 'GLD-CHN-RUDR-12G', '22K Gold Rudraksha Mala Chain - 12 Grams Net Gold', 86000.00, 97000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 8: 22K Gold Men Figaro Chain (10g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000008-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Men Figaro Chain (10g)',
  'Classic 3+1 Figaro link men gold chain, high polish finish, 20 inches. Gross Wt: 10.0g', 'Shree Narayan Chains',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000008-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000008-0000-0000-0000-000000000001', 'GLD-CHN-FIG-10G', '22K Gold Men Figaro Chain - 10 Grams', 70000.00, 78500.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 9: 22K Gold Lotus Kamal Chain (8g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000009-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Lotus Kamal Chain (8g)',
  'Delicate interconnected lotus motif chain for daily and festive wear. Gross Wt: 8.0g', 'Shree Narayan Chains',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000009-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000009-0000-0000-0000-000000000001', 'GLD-CHN-LOTUS-08G', '22K Gold Lotus Kamal Chain - 8 Grams', 56000.00, 63000.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 10: 22K Gold Daily Wear Box Chain (5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Daily Wear Box Chain (5g)',
  'Sturdy four-sided box chain with lobster clasp, 18 inches. Gross Wt: 5.0g', 'Shree Narayan Chains',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000010-0000-0000-0000-000000000001', 'GLD-CHN-BOX-05G', '22K Gold Daily Wear Box Chain - 5 Grams', 35000.00, 39500.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 11: 22K Gold Hollow Curb Link Chain (6g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000011-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Hollow Curb Link Chain (6g)',
  'Lightweight high-volume curb link chain, 20 inches. Gross Wt: 6.0g', 'Shree Narayan Chains',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000011-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000011-0000-0000-0000-000000000001', 'GLD-CHN-CURB-06G', '22K Gold Hollow Curb Link Chain - 6 Grams', 42000.00, 47400.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 12: 22K Gold Sleek Singapore Chain (4g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000012-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Sleek Singapore Chain (4g)',
  'Sparkling diamond-cut Singapore twist chain for pendants, 18 inches. Gross Wt: 4.0g', 'Shree Narayan Chains',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000012-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000012-0000-0000-0000-000000000001', 'GLD-CHN-SNG-04G', '22K Gold Sleek Singapore Chain - 4 Grams', 28000.00, 31800.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 13: 22K Gold Traditional Long Vati Mangalsutra (18g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000013-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Traditional Long Vati Mangalsutra (18g)',
  'Double string black bead traditional mangalsutra with auspicious double vati pendant. Net Gold: 18.0g', 'Shree Narayan Suhaag',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000013-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000013-0000-0000-0000-000000000001', 'GLD-MS-VATI-18G', '22K Gold Traditional Long Vati Mangalsutra - 18 Grams', 126000.00, 141000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 14: 22K Gold Short Modern Office Mangalsutra (6g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000014-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Short Modern Office Mangalsutra (6g)',
  'Minimalist single-line black beads mangalsutra with geometric gold pendant. Net Gold: 6.0g', 'Shree Narayan Suhaag',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000014-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000014-0000-0000-0000-000000000001', 'GLD-MS-MOD-06G', '22K Gold Short Modern Office Mangalsutra - 6 Grams', 43000.00, 48500.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 15: 22K Gold Diamond-Cut Floral Mangalsutra (10g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Diamond-Cut Floral Mangalsutra (10g)',
  'Medium length mangalsutra with floral diamond-cut centrepiece. Net Gold: 10.0g', 'Shree Narayan Suhaag',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000015-0000-0000-0000-000000000001', 'GLD-MS-FLR-10G', '22K Gold Floral Mangalsutra - 10 Grams', 71000.00, 79900.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 16: 22K Gold Kolkata Filigree Kada Pair (32g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000016-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Kolkata Filigree Kada Pair (32g)',
  'Handcrafted exquisite Kolkata filigree work openable kadas with screw lock. Pair Wt: 32.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000016-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000016-0000-0000-0000-000000000001', 'GLD-KD-FIL-32G', '22K Gold Kolkata Filigree Kada Pair - 32 Grams', 224000.00, 252000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 17: 22K Gold Antique Lion Face Men Kada (35g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000017-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Antique Lion Face Men Kada (35g)',
  'Solid Rajputi/Vedic Babbar Sher lion face Kada with ruby gemstone eyes. Gross Wt: 35.0g', 'Shree Narayan Royal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000017-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000017-0000-0000-0000-000000000001', 'GLD-KD-LION-35G', '22K Gold Antique Lion Face Men Kada - 35 Grams', 245000.00, 276000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 18: 22K Gold Machine-Cut Daily Bangles (Set of 4, 30g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Machine-Cut Daily Bangles (Set of 4, 30g)',
  'Four piece sleek CNC diamond-cut gold bangles set, size 2.4/2.6. Total Wt: 30.0g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000018-0000-0000-0000-000000000001', 'GLD-BG-MC4-30G', '22K Gold Machine-Cut Daily Bangles Set of 4 - 30 Grams', 210000.00, 236000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 19: 22K Gold Broad Patla Bangles (Pair, 40g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Broad Patla Bangles (Pair, 40g)',
  'Broad embossed traditional bridal Patla bangles with floral relief work. Pair Wt: 40.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000019-0000-0000-0000-000000000001', 'GLD-BG-PTL-40G', '22K Gold Broad Patla Bangles Pair - 40 Grams', 280000.00, 315000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 20: 22K Gold Traditional Churiyan (Set of 2, 16g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000020-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Traditional Churiyan (Set of 2, 16g)',
  'Pair of classic round pipe gold churiyan with glossy polish, size 2.6. Pair Wt: 16.0g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000020-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000020-0000-0000-0000-000000000001', 'GLD-BG-CHU-16G', '22K Gold Traditional Churiyan Pair - 16 Grams', 112000.00, 126000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 21: 22K Gold Pipe Bangles Meenakari (Pair, 20g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000021-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Pipe Bangles Meenakari (Pair, 20g)',
  'Pair of light hollow pipe bangles with vibrant red and green meenakari enameling. Pair Wt: 20.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000021-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000021-0000-0000-0000-000000000001', 'GLD-BG-MNK-20G', '22K Gold Pipe Bangles Meenakari Pair - 20 Grams', 142000.00, 159000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 22: 22K Gold Rajasthani Double Jhumka (14g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Rajasthani Double Jhumka (14g)',
  'Three-tier bell shaped heavy traditional Jhumka earrings with pearl drops. Pair Wt: 14.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000022-0000-0000-0000-000000000001', 'GLD-ER-JHM-14G', '22K Gold Rajasthani Double Jhumka - 14 Grams', 98000.00, 110500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 23: 22K Gold Royal Chandbali Earrings (15g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000023-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Royal Chandbali Earrings (15g)',
  'Crescent moon shaped Chandbali earrings with floral studs and dangling ghungroos. Pair Wt: 15.0g', 'Shree Narayan Royal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000023-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000023-0000-0000-0000-000000000001', 'GLD-ER-CHB-15G', '22K Gold Royal Chandbali Earrings - 15 Grams', 105000.00, 118500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 24: 22K Gold Sui Dhaga Needle Earrings (4g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000024-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Sui Dhaga Needle Earrings (4g)',
  'Long sleek chain pull-through threader needle earrings with geometric ends. Pair Wt: 4.0g', 'Shree Narayan Modern',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000024-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000024-0000-0000-0000-000000000001', 'GLD-ER-SUI-04G', '22K Gold Sui Dhaga Needle Earrings - 4 Grams', 28000.00, 31900.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 25: 22K Gold Daily Floral Tops Studs (2.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000025-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Daily Floral Tops Studs (2.5g)',
  'Delicate floral daily wear studs with screw back post. Pair Wt: 2.5g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000025-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000025-0000-0000-0000-000000000001', 'GLD-ER-TOP-2.5G', '22K Gold Daily Floral Tops Studs - 2.5 Grams', 17500.00, 19900.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 26: 22K Gold Traditional Kanphool Ear Cuffs (16g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000026-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Traditional Kanphool Ear Cuffs (16g)',
  'Grand bridal ear cuffs covering full ear with hair support chain (sahara). Pair Wt: 16.0g', 'Shree Narayan Bridal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000026-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000026-0000-0000-0000-000000000001', 'GLD-ER-KAN-16G', '22K Gold Traditional Kanphool Ear Cuffs - 16 Grams', 112000.00, 126500.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 27: 22K Gold Hollow Ball Studs (1.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000027-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Hollow Ball Studs (1.5g)',
  'Simple shiny round gold ball studs for kids and daily wear. Pair Wt: 1.5g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000027-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000027-0000-0000-0000-000000000001', 'GLD-ER-BAL-1.5G', '22K Gold Hollow Ball Studs - 1.5 Grams', 10500.00, 12100.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 28: 22K Gold Traditional Hoop Bali (3.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000028-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Traditional Hoop Bali (3.5g)',
  'Round carved hoop bali with secure wire closure. Pair Wt: 3.5g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000028-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000028-0000-0000-0000-000000000001', 'GLD-ER-BAL-3.5G', '22K Gold Traditional Hoop Bali - 3.5 Grams', 24500.00, 27900.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 29: 22K Gold Men Royal Lion Signet Ring (8g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000029-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Men Royal Lion Signet Ring (8g)',
  'Heavy casted lion face gents signet ring with micro detailing. Gross Wt: 8.0g', 'Shree Narayan Royal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000029-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000029-0000-0000-0000-000000000001', 'GLD-RG-MLN-08G', '22K Gold Men Royal Lion Signet Ring - 8 Grams', 56000.00, 63200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 30: 22K Gold Men Square Maharaja Ring (6g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000030-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Men Square Maharaja Ring (6g)',
  'Gents broad square top ring with dual tone rhodium and yellow finish. Gross Wt: 6.0g', 'Shree Narayan Royal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000030-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000030-0000-0000-0000-000000000001', 'GLD-RG-MSQ-06G', '22K Gold Men Square Maharaja Ring - 6 Grams', 42000.00, 47500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 31: 22K Gold Ladies Solitaire CZ Floral Ring (3.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000031-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Ladies Solitaire CZ Floral Ring (3.5g)',
  'Feminine floral design ring with sparkling cubic zirconia solitaire center. Gross Wt: 3.5g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000031-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000031-0000-0000-0000-000000000001', 'GLD-RG-LCZ-3.5G', '22K Gold Ladies Solitaire CZ Floral Ring - 3.5 Grams', 24800.00, 28200.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 32: 22K Gold Ladies Peacock Meenakari Ring (5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000032-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Ladies Peacock Meenakari Ring (5g)',
  'Vibrant handcrafted peacock motif cocktail ring with blue and green meena work. Gross Wt: 5.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000032-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000032-0000-0000-0000-000000000001', 'GLD-RG-LPC-05G', '22K Gold Ladies Peacock Meenakari Ring - 5 Grams', 35500.00, 40200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 33: 22K Gold Tortoise Kurma Ring (4.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000033-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Tortoise Kurma Ring (4.5g)',
  'Auspicious Vastu tortoise ring with engraved shell for wealth and prosperity. Gross Wt: 4.5g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000033-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000033-0000-0000-0000-000000000001', 'GLD-RG-TOR-4.5G', '22K Gold Tortoise Kurma Ring - 4.5 Grams', 31800.00, 36000.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 34: 22K Gold Men Auspicious Om Ring (5.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000034-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Men Auspicious Om Ring (5.5g)',
  'Holy sacred Om symbol embossed in red enamel background on heavy gold shank. Gross Wt: 5.5g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000034-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000034-0000-0000-0000-000000000001', 'GLD-RG-MOM-5.5G', '22K Gold Men Auspicious Om Ring - 5.5 Grams', 38800.00, 43900.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 35: 22K Gold Couple Matching Wedding Bands (Pair, 9g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000035-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Couple Matching Wedding Bands (Pair, 9g)',
  'Pair of matching satin brushed and polished comfort-fit wedding rings. Total Wt: 9.0g', 'Shree Narayan Collection',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000035-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000035-0000-0000-0000-000000000001', 'GLD-RG-CPB-09G', '22K Gold Couple Matching Wedding Bands Pair - 9 Grams', 63500.00, 71800.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 36: 22K Gold Laxmi Ganesha Blessing Pendant (5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000036-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Laxmi Ganesha Blessing Pendant (5g)',
  'Intricately embossed divine Lakshmi Ganesh rectangular frame pendant. Gross Wt: 5.0g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000036-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000036-0000-0000-0000-000000000001', 'GLD-PD-LXG-05G', '22K Gold Laxmi Ganesha Blessing Pendant - 5 Grams', 35000.00, 39600.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 37: 22K Gold Mahadev Trishul & Damru Pendant (4g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000037-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Mahadev Trishul & Damru Pendant (4g)',
  'Lord Shiva Trishul with Damru and Mahakal third eye pendant. Gross Wt: 4.0g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000037-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000037-0000-0000-0000-000000000001', 'GLD-PD-TRS-04G', '22K Gold Mahadev Trishul Damru Pendant - 4 Grams', 28200.00, 31900.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 38: 22K Gold Sacred Omkar Pendant (2g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000038-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Sacred Omkar Pendant (2g)',
  'Solid polished divine Om pendant for chains. Gross Wt: 2.0g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000038-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000038-0000-0000-0000-000000000001', 'GLD-PD-OMK-02G', '22K Gold Sacred Omkar Pendant - 2 Grams', 14100.00, 16000.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 39: 22K Gold Heart Filigree Pendant (3g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000039-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Heart Filigree Pendant (3g)',
  'Lace filigree double heart romantic pendant. Gross Wt: 3.0g', 'Shree Narayan Modern',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000039-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000039-0000-0000-0000-000000000001', 'GLD-PD-HRT-03G', '22K Gold Heart Filigree Pendant - 3 Grams', 21200.00, 24000.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 40: 22K Gold Bridal Nath with Pearl Chain (6g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000040-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Bridal Nath with Pearl Chain (6g)',
  'Large traditional Purvanchal bridal Nath with ruby stone and pearl sahara chain. Gross Wt: 6.0g', 'Shree Narayan Bridal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000040-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000040-0000-0000-0000-000000000001', 'GLD-NP-NTH-06G', '22K Gold Bridal Nath with Pearl Chain - 6 Grams', 42500.00, 48000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 41: 22K Gold Screw Stud Nose Pin Laung (0.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000041-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Screw Stud Nose Pin Laung (0.5g)',
  'Traditional diamond-cut gold Laung nose stud with threaded screw. Gross Wt: 0.5g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000041-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000041-0000-0000-0000-000000000001', 'GLD-NP-LNG-0.5G', '22K Gold Screw Stud Nose Pin Laung - 0.5 Grams', 3600.00, 4200.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 42: 22K Gold Clip-on Maharashtrian Nath (2.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000042-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Clip-on Maharashtrian Nath (2.5g)',
  'Pearl and ruby studded non-piercing press-on traditional Nath. Gross Wt: 2.5g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000042-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000042-0000-0000-0000-000000000001', 'GLD-NP-MHN-2.5G', '22K Gold Clip-on Maharashtrian Nath - 2.5 Grams', 17800.00, 20200.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 43: 22K Gold Wire Nose Bali Ring (1g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000043-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Wire Nose Bali Ring (1g)',
  'Simple polished wire nose ring bali. Gross Wt: 1.0g', 'Shree Narayan Daily',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000043-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000043-0000-0000-0000-000000000001', 'GLD-NP-BAL-01G', '22K Gold Wire Nose Bali Ring - 1 Gram', 7100.00, 8200.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 44: 22K Gold Bridal Maang Tikka (7g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000044-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Bridal Maang Tikka (7g)',
  'Floral circular Tikka with hanging jhumki bead and pearl hair chain. Gross Wt: 7.0g', 'Shree Narayan Bridal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000044-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000044-0000-0000-0000-000000000001', 'GLD-TK-BDL-07G', '22K Gold Bridal Maang Tikka - 7 Grams', 49500.00, 56000.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 45: 22K Gold Royal Kamarbandh Waist Belt (65g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000045-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Royal Kamarbandh Waist Belt (65g)',
  'Grand traditional waist belt with layered hanging gold latkans and bells. Gross Wt: 65.0g', 'Shree Narayan Heritage',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000045-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000045-0000-0000-0000-000000000001', 'GLD-KB-RYL-65G', '22K Gold Royal Kamarbandh Waist Belt - 65 Grams', 460000.00, 518000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 46: 22K Gold Bridal Hathphool Pair (20g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000046-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Bridal Hathphool Pair (20g)',
  'Pair of floral hand harness with three-finger attached rings. Pair Wt: 20.0g', 'Shree Narayan Bridal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000046-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000046-0000-0000-0000-000000000001', 'GLD-HP-BDL-20G', '22K Gold Bridal Hathphool Pair - 20 Grams', 142000.00, 160000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 47: 22K Gold Baby Nazariya Bracelet Pair (4g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000047-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Baby Nazariya Bracelet Pair (4g)',
  'Protective black bead and 22K gold bead baby bracelets with soft clasp. Pair Wt: 4.0g', 'Shree Narayan Baby',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000047-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000047-0000-0000-0000-000000000001', 'GLD-BB-NZR-04G', '22K Gold Baby Nazariya Bracelet Pair - 4 Grams', 28400.00, 32200.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 48: 22K Gold Men Solid Cuban Link Bracelet (24g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000048-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0010000-0000-0000-0000-000000000001', 'goods', '22K Gold Men Solid Cuban Link Bracelet (24g)',
  'Bold men wrist bracelet with heavy box lock and safety latch. Gross Wt: 24.0g', 'Shree Narayan Royal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000048-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000048-0000-0000-0000-000000000001', 'GLD-BR-MCB-24G', '22K Gold Men Solid Cuban Link Bracelet - 24 Grams', 170000.00, 191000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 49: 24K 999 Pure Gold Coin 1 Gram (Laxmi Ganesh)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000049-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Coin 1 Gram (Laxmi Ganesh)',
  'Tamper-proof blister packed 1g 999 fineness 24 Karat gold coin with Laxmi Ganesh motif.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000049-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000049-0000-0000-0000-000000000001', 'GCOIN-999-01G', '24K Gold Coin 1 Gram - Laxmi Ganesh', 7750.00, 8150.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 50: 24K 999 Pure Gold Coin 2 Gram (Maa Laxmi)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000050-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Coin 2 Gram (Maa Laxmi)',
  'Tamper-proof blister packed 2g 999 fineness 24 Karat gold coin with seated Lakshmi.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000050-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000050-0000-0000-0000-000000000001', 'GCOIN-999-02G', '24K Gold Coin 2 Gram - Maa Laxmi', 15500.00, 16250.00, '8', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 51: 24K 999 Pure Gold Coin 5 Gram (Sacred Om)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000051-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Coin 5 Gram (Sacred Om)',
  'Certified 5g 999 pure gold minted coin with sacred Om symbol.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000051-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000051-0000-0000-0000-000000000001', 'GCOIN-999-05G', '24K Gold Coin 5 Gram - Sacred Om', 38750.00, 40500.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 52: 24K 999 Pure Gold Coin 8 Gram (1 Guinea)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000052-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Coin 8 Gram (1 Guinea)',
  'Classic 1 Tola / 1 Sovereign Guinea 8g 999 pure investment gold coin.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000052-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000052-0000-0000-0000-000000000001', 'GCOIN-999-08G', '24K Gold Coin 8 Gram (1 Guinea)', 62000.00, 64700.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 53: 24K 999 Pure Gold Bar 10 Gram (Hallmarked)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000053-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Bar 10 Gram (Hallmarked)',
  'BIS Hallmarked rectangular 10g 999.0 purity gold bullion minted bar.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000053-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000053-0000-0000-0000-000000000001', 'GBAR-999-10G', '24K Gold Bar 10 Gram - BIS Hallmarked', 77500.00, 80800.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 54: 24K 999 Pure Gold Minted Bar 20 Gram
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000054-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Minted Bar 20 Gram',
  'Investment grade 20g pure gold bar sealed in assay certification card.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000054-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000054-0000-0000-0000-000000000001', 'GBAR-999-20G', '24K Gold Minted Bar 20 Gram', 155000.00, 161200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 55: 24K 999 Pure Gold Ingot Bar 50 Gram
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000055-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Ingot Bar 50 Gram',
  'High denomination 50g 999 fineness gold ingot with individual serial number.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000055-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000055-0000-0000-0000-000000000001', 'GBAR-999-50G', '24K Gold Ingot Bar 50 Gram', 387500.00, 402500.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 56: 24K 999 Pure Gold Bullion Bar 100 Gram
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000056-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0020000-0000-0000-0000-000000000001', 'goods', '24K 999 Pure Gold Bullion Bar 100 Gram',
  'LBMA standard 100g 999.9 purity investment bullion gold bar.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7108', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000056-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000056-0000-0000-0000-000000000001', 'GBAR-999-100G', '24K Gold Bullion Bar 100 Gram', 775000.00, 804000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 57: Pure Silver Heavy Bridal Dulhan Payal Pair (200g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000057-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Heavy Bridal Dulhan Payal Pair (200g)',
  'Grand heavy Purvanchal bridal anklets with multiple bell rows and oxidized antique finish. Pair Wt: 200g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000057-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000057-0000-0000-0000-000000000001', 'SILV-PY-BDL-200G', 'Pure Silver Heavy Bridal Payal Pair - 200 Grams', 18500.00, 22800.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 58: Pure Silver Ghungroo Traditional Payal Pair (100g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000058-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Ghungroo Traditional Payal Pair (100g)',
  'Traditional musical sound ghungroo payal pair with solid clasp. Pair Wt: 100g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000058-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000058-0000-0000-0000-000000000001', 'SILV-PY-GHN-100G', 'Pure Silver Ghungroo Payal Pair - 100 Grams', 9300.00, 11500.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 59: Pure Silver Daily Wear Chham Chham Payal Pair (60g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000059-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Daily Wear Chham Chham Payal Pair (60g)',
  'Popular village and town daily wear durable silver payal. Pair Wt: 60g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000059-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000059-0000-0000-0000-000000000001', 'SILV-PY-DL60-60G', 'Pure Silver Daily Wear Payal Pair - 60 Grams', 5600.00, 7000.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 60: Pure Silver Sleek Fancy Chain Payal Pair (35g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000060-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Sleek Fancy Chain Payal Pair (35g)',
  'Lightweight Italian pattern chain anklets for college and modern wear. Pair Wt: 35g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000060-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000060-0000-0000-0000-000000000001', 'SILV-PY-CHN-35G', 'Pure Silver Sleek Chain Payal Pair - 35 Grams', 3300.00, 4200.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 61: Pure Silver Antique Tribal Oxidized Payal Pair (80g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000061-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Antique Tribal Oxidized Payal Pair (80g)',
  'Rustic ethnic oxidized finish tribal design anklets. Pair Wt: 80g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000061-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000061-0000-0000-0000-000000000001', 'SILV-PY-TRB-80G', 'Pure Silver Antique Tribal Payal Pair - 80 Grams', 7500.00, 9400.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 62: Pure Silver Meenakari Traditional Bichhiya (Pair, 15g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000062-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Meenakari Traditional Bichhiya (Pair, 15g)',
  'Auspicious bridal toe rings with hand painted red and green enamel. Pair Wt: 15g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000062-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000062-0000-0000-0000-000000000001', 'SILV-BC-MNK-15G', 'Pure Silver Meenakari Bichhiya Pair - 15 Grams', 1400.00, 1850.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 63: Pure Silver Stone-Studded Designer Bichhiya (Pair, 10g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000063-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Stone-Studded Designer Bichhiya (Pair, 10g)',
  'Sparkling CZ studded adjustable silver toe rings. Pair Wt: 10g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000063-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000063-0000-0000-0000-000000000001', 'SILV-BC-DSN-10G', 'Pure Silver Designer Bichhiya Pair - 10 Grams', 950.00, 1300.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 64: Pure Silver Plain Daily Chandi Bichhiya (Pair, 8g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000064-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Plain Daily Chandi Bichhiya (Pair, 8g)',
  'Simple solid curved toe rings for regular everyday wear. Pair Wt: 8g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000064-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000064-0000-0000-0000-000000000001', 'SILV-BC-PLN-08G', 'Pure Silver Plain Bichhiya Pair - 8 Grams', 750.00, 1050.00, '12', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 65: Pure Silver Royal Peacock Bridal Bichhiya (Set of 4, 30g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000065-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Royal Peacock Bridal Bichhiya (Set of 4, 30g)',
  'Four toe rings set for newlywed bride with peacock feather motifs. Set Wt: 30g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000065-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000065-0000-0000-0000-000000000001', 'SILV-BC-PCK-30G', 'Pure Silver Royal Peacock Bridal Bichhiya Set of 4 - 30 Grams', 2800.00, 3650.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 66: Pure Silver Bahubali Heavy Gents Kada (125g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000066-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Bahubali Heavy Gents Kada (125g)',
  'Solid heavy weight men Punjabi/Rajputi silver Kada with tiger claws or smooth rim. Gross Wt: 125g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000066-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000066-0000-0000-0000-000000000001', 'SILV-KD-BHB-125G', 'Pure Silver Bahubali Heavy Gents Kada - 125 Grams', 11500.00, 14200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 67: Pure Silver Gents Plain Round Kada (65g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000067-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Gents Plain Round Kada (65g)',
  'Solid round polished daily wear men silver Kada. Gross Wt: 65g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000067-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000067-0000-0000-0000-000000000001', 'SILV-KD-MPL-65G', 'Pure Silver Gents Plain Round Kada - 65 Grams', 6000.00, 7500.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 68: Pure Silver Ladies Fancy Chudi Set (Pair, 50g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000068-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Ladies Fancy Chudi Set (Pair, 50g)',
  'Embossed floral design openable silver bangles with safety screw. Pair Wt: 50g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000068-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000068-0000-0000-0000-000000000001', 'SILV-BG-LFC-50G', 'Pure Silver Ladies Fancy Chudi Set Pair - 50 Grams', 4700.00, 5900.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 69: Pure Silver Kids Nazariya Kada Pair (25g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000069-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Kids Nazariya Kada Pair (25g)',
  'Baby protection silver bangles with black beads and adjustable size. Pair Wt: 25g', 'Shree Narayan Baby',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000069-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000069-0000-0000-0000-000000000001', 'SILV-KD-KID-25G', 'Pure Silver Kids Nazariya Kada Pair - 25 Grams', 2350.00, 3000.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 70: 925 Sterling Silver CZ Tennis Bracelet (18g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000070-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', '925 Sterling Silver CZ Tennis Bracelet (18g)',
  'Sparkling diamond-like cubic zirconia link tennis bracelet with box clasp. Wt: 18g', 'Shree Narayan 925',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000070-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000070-0000-0000-0000-000000000001', 'SILV-BR-TNS-18G', '925 Sterling Silver CZ Tennis Bracelet - 18 Grams', 2400.00, 3200.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 71: Pure Silver Men Heavy Curb Chain (50g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000071-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Men Heavy Curb Chain (50g)',
  'Interlocking flat curb chain for gents, 22 inches, high lustre. Gross Wt: 50g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000071-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000071-0000-0000-0000-000000000001', 'SILV-CH-MCB-50G', 'Pure Silver Men Heavy Curb Chain - 50 Grams', 4650.00, 5850.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 72: Pure Silver Men Solid Rope Chain (30g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000072-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Men Solid Rope Chain (30g)',
  'Classic diamond-cut twisted rope pattern gents silver chain, 20 inches. Gross Wt: 30g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000072-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000072-0000-0000-0000-000000000001', 'SILV-CH-MRP-30G', 'Pure Silver Men Solid Rope Chain - 30 Grams', 2800.00, 3550.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 73: Pure Silver Italian Sleek Snake Chain (15g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000073-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Italian Sleek Snake Chain (15g)',
  'Silky smooth flexible snake chain for ladies lockets, 18 inches. Gross Wt: 15g', 'Shree Narayan 925',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000073-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000073-0000-0000-0000-000000000001', 'SILV-CH-SNK-15G', 'Pure Silver Italian Sleek Snake Chain - 15 Grams', 1450.00, 1900.00, '6', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 74: Pure Silver Sacred Naag Snake Astrology Ring (8g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000074-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Sacred Naag Snake Astrology Ring (8g)',
  'Lord Shiva coiled serpent Naag devta ring for Kaal Sarp and Rahu remedies. Wt: 8g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000074-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000074-0000-0000-0000-000000000001', 'SILV-RG-NAG-08G', 'Pure Silver Sacred Naag Snake Ring - 8 Grams', 750.00, 1050.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 75: 925 Sterling Silver Adjustable Solitaire Ring (4.5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000075-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', '925 Sterling Silver Adjustable Solitaire Ring (4.5g)',
  'Free size prong set round brilliant CZ ladies ring. Wt: 4.5g', 'Shree Narayan 925',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000075-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000075-0000-0000-0000-000000000001', 'SILV-RG-SOL-4.5G', '925 Sterling Silver Solitaire Ring - 4.5 Grams', 650.00, 950.00, '6', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 76: Pure Silver Plain Smooth Chandi Chhalla (5g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000076-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Plain Smooth Chandi Chhalla (5g)',
  'Solid smooth seamless silver band ring for astrologic and daily wear. Wt: 5g', 'Shree Narayan Silver',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000076-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000076-0000-0000-0000-000000000001', 'SILV-RG-CHL-05G', 'Pure Silver Plain Smooth Challa - 5 Grams', 470.00, 680.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 77: 925 Silver Mahakal Damru Pendant with Chain (12g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000077-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0030000-0000-0000-0000-000000000001', 'goods', '925 Silver Mahakal Damru Pendant with Chain (12g)',
  'Lord Shiva trishul with damru and snake in 925 sterling silver with chain. Total Wt: 12g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000077-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000077-0000-0000-0000-000000000001', 'SILV-PD-MHK-12G', '925 Silver Mahakal Damru Pendant with Chain - 12 Grams', 1250.00, 1690.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 78: Pure Silver Pooja Thali Floral Border (150g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000078-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Pooja Thali Floral Border (150g)',
  'Decorative embossed floral rim silver pooja plate with central Om/Swastik. Wt: 150g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000078-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000078-0000-0000-0000-000000000001', 'SILV-TH-FLR-150G', 'Pure Silver Pooja Thali Floral Border - 150 Grams', 14000.00, 17200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 79: Pure Silver Royal Heavy Pooja Thali Set (300g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000079-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Royal Heavy Pooja Thali Set (300g)',
  'Complete ceremonial royal thali set with attached diya, katori, and chandan vati. Wt: 300g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000079-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000079-0000-0000-0000-000000000001', 'SILV-TH-RYL-300G', 'Pure Silver Royal Heavy Pooja Thali Set - 300 Grams', 28000.00, 34500.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 80: Pure Silver Laxmi-Ganesh Murti Idol Pair (75g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000080-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Laxmi-Ganesh Murti Idol Pair (75g)',
  'Divine Lakshmi and Ganesha silver idols on lotus base with detailed mukut. Pair Wt: 75g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000080-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000080-0000-0000-0000-000000000001', 'SILV-ID-LXG-75G', 'Pure Silver Laxmi-Ganesh Murti Pair - 75 Grams', 7200.00, 9100.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 81: Pure Silver Heavy Laxmi-Ganesh Idol Pair (150g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000081-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Heavy Laxmi-Ganesh Idol Pair (150g)',
  'Large size heavy solid casted Lakshmi Ganesh idols for temple and Diwali pujan. Pair Wt: 150g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000081-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000081-0000-0000-0000-000000000001', 'SILV-ID-LXG-150G', 'Pure Silver Heavy Laxmi-Ganesh Idol Pair - 150 Grams', 14200.00, 17800.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 82: Pure Silver Traditional Aarti Single Diya (30g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000082-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Traditional Aarti Single Diya (30g)',
  'Deepak lamp with handle and flower petal base for daily evening aarti. Wt: 30g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000082-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000082-0000-0000-0000-000000000001', 'SILV-DY-SNG-30G', 'Pure Silver Aarti Single Diya - 30 Grams', 2800.00, 3550.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 83: Pure Silver Panchmukhi 5-Wick Diya (85g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000083-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Panchmukhi 5-Wick Diya (85g)',
  'Five wick heavy ceremonial Aarti lamp with ornate handle. Wt: 85g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000083-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000083-0000-0000-0000-000000000001', 'SILV-DY-PNC-85G', 'Pure Silver Panchmukhi 5-Wick Diya - 85 Grams', 8000.00, 10100.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 84: Pure Silver Pooja Ghanti Bell with Nandi (50g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000084-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Pooja Ghanti Bell with Nandi (50g)',
  'Resonant temple pooja bell topped with carved Nandi bull figurine. Wt: 50g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000084-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000084-0000-0000-0000-000000000001', 'SILV-GH-NND-50G', 'Pure Silver Pooja Ghanti Bell with Nandi - 50 Grams', 4700.00, 5950.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 85: Pure Silver Sacred Kalash Lota (120g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000085-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Sacred Kalash Lota (120g)',
  'Holy water pot for puja rituals, gangajal storage and abhishek. Wt: 120g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000085-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000085-0000-0000-0000-000000000001', 'SILV-KL-LTA-120G', 'Pure Silver Sacred Kalash Lota - 120 Grams', 11200.00, 13900.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 86: Pure Silver Pooja Achamani Spoon (25g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000086-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Pooja Achamani Spoon (25g)',
  'Traditional ritual spoon for offering charanamrit and gangajal. Wt: 25g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000086-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000086-0000-0000-0000-000000000001', 'SILV-SP-ACH-25G', 'Pure Silver Achamani Spoon - 25 Grams', 2350.00, 2990.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 87: Pure Silver Agarbatti Incense Stand (40g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000087-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Agarbatti Incense Stand (40g)',
  'Ornate lotus shaped incense stick stand catching ash cleanly. Wt: 40g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000087-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000087-0000-0000-0000-000000000001', 'SILV-AG-STD-40G', 'Pure Silver Agarbatti Stand - 40 Grams', 3800.00, 4800.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 88: Pure Silver Embossed Water Glass Tumbler (80g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000088-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Embossed Water Glass Tumbler (80g)',
  'Pure silver drinking glass with floral engraving, ideal for ayurvedic health benefits. Wt: 80g', 'Shree Narayan Utensils',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000088-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000088-0000-0000-0000-000000000001', 'SILV-GL-EMB-80G', 'Pure Silver Embossed Water Tumbler Glass - 80 Grams', 7500.00, 9400.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 89: Pure Silver Baby Paladai Bowl & Spoon Set (65g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000089-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Baby Paladai Bowl & Spoon Set (65g)',
  'Smooth polished silver bowl and feeding spoon set for newborn baby naming ceremony. Set Wt: 65g', 'Shree Narayan Baby',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000089-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000089-0000-0000-0000-000000000001', 'SILV-UT-PLD-65G', 'Pure Silver Baby Bowl & Spoon Set - 65 Grams', 6200.00, 7800.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 90: Pure Silver Sindoor Dani with Peacock (35g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000090-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Sindoor Dani with Peacock (35g)',
  'Auspicious vermilion container box featuring engraved peacock on top cover. Wt: 35g', 'Shree Narayan Suhaag',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000090-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000090-0000-0000-0000-000000000001', 'SILV-SD-PCK-35G', 'Pure Silver Sindoor Dani with Peacock - 35 Grams', 3400.00, 4350.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 91: Pure Silver Hanuman Ji Gada Idol (45g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000091-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Hanuman Ji Gada Idol (45g)',
  'Solid miniature silver mace of Lord Hanuman symbolizing strength and safety. Wt: 45g', 'Shree Narayan Spiritual',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000091-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000091-0000-0000-0000-000000000001', 'SILV-ID-HNM-45G', 'Pure Silver Hanuman Ji Gada Idol - 45 Grams', 4300.00, 5450.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 92: Pure Silver Kamakshi Deepam Lamp (70g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000092-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Kamakshi Deepam Lamp (70g)',
  'Sacred South/North fusion Kamakshi devi oil lamp for altar. Wt: 70g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000092-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000092-0000-0000-0000-000000000001', 'SILV-DY-KMK-70G', 'Pure Silver Kamakshi Deepam Lamp - 70 Grams', 6600.00, 8350.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 93: Pure Silver Chandan Vati Small Katori (30g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000093-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Chandan Vati Small Katori (30g)',
  'Small polished silver cup for sandalwood paste and roli chawal. Wt: 30g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000093-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000093-0000-0000-0000-000000000001', 'SILV-UT-KTR-30G', 'Pure Silver Chandan Vati Katori - 30 Grams', 2800.00, 3550.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 94: Pure Silver Kamadhenu Cow & Calf Idol (110g)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000094-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0040000-0000-0000-0000-000000000001', 'goods', 'Pure Silver Kamadhenu Cow & Calf Idol (110g)',
  'Holy Kamadhenu cow suckling calf idol bringing prosperity and good fortune. Wt: 110g', 'Shree Narayan Pooja',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7114', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000094-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000094-0000-0000-0000-000000000001', 'SILV-ID-KMD-110G', 'Pure Silver Kamadhenu Cow & Calf Idol - 110 Grams', 10500.00, 13200.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 95: Pure Silver 999 Coin 10 Gram (Laxmi Ganesh)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000095-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Coin 10 Gram (Laxmi Ganesh)',
  'Minted 10g 999 pure silver coin with Goddess Lakshmi and Lord Ganesha in capsule.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000095-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000095-0000-0000-0000-000000000001', 'SCOIN-999-10G', 'Pure Silver 999 Coin 10 Gram - Laxmi Ganesh', 930.00, 1080.00, '20', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 96: Pure Silver 999 Coin 20 Gram (Laxmi Ganesh)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000096-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Coin 20 Gram (Laxmi Ganesh)',
  'Minted 20g 999 pure silver coin with mirrored relief for gifting and shagun.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000096-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000096-0000-0000-0000-000000000001', 'SCOIN-999-20G', 'Pure Silver 999 Coin 20 Gram - Laxmi Ganesh', 1860.00, 2150.00, '15', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 97: Pure Silver 999 Coin 50 Gram (Queen Victoria)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000097-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Coin 50 Gram (Queen Victoria)',
  'High relief 50g 999 pure silver antique replica round coin.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000097-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000097-0000-0000-0000-000000000001', 'SCOIN-999-50G', 'Pure Silver 999 Coin 50 Gram - Queen Victoria', 4650.00, 5350.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 98: Pure Silver 999 Coin 100 Gram (Ayodhya Ram Mandir Bar)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000098-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Coin 100 Gram (Ayodhya Ram Mandir Bar)',
  'Special minted 100g 999 fine silver commemorative bullion bar of Shri Ram Mandir.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000098-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000098-0000-0000-0000-000000000001', 'SCOIN-999-100G', 'Pure Silver 999 Coin 100 Gram - Ram Mandir Bar', 9300.00, 10600.00, '8', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 99: Pure Silver 999 Cast Bar 250 Gram
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000099-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Cast Bar 250 Gram',
  'Refinery certified 250g 999 fine investment silver cast bar with purity seal.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000099-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000099-0000-0000-0000-000000000001', 'SBAR-999-250G', 'Pure Silver 999 Cast Bar 250 Gram', 23250.00, 25800.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 100: Pure Silver 999 Cast Bar 500 Gram
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000100-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Cast Bar 500 Gram',
  'Refinery certified half kilogram 500g 999 fine investment silver brick bar.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000100-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000100-0000-0000-0000-000000000001', 'SBAR-999-500G', 'Pure Silver 999 Cast Bar 500 Gram', 46500.00, 51200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 101: Pure Silver 999 Bullion Bar 1000 Gram (1 Kg Silver Bar)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000101-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0050000-0000-0000-0000-000000000001', 'goods', 'Pure Silver 999 Bullion Bar 1000 Gram (1 Kg Silver Bar)',
  'Standard 1 Kilogram (1000g) 999 fineness serialized silver bullion ingot.', 'Shree Narayan Bullion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000006', '7106', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000101-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000101-0000-0000-0000-000000000001', 'SBAR-999-1000G', 'Pure Silver 999 Bullion Bar 1 Kg', 93000.00, 101500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 102: 18K Diamond Solitaire Engagement Ring (0.25 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000102-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K Diamond Solitaire Engagement Ring (0.25 Ct)',
  '18K White Gold 4-prong solitaire engagement ring with 0.25 carat VVS-GH certified diamond.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000102-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000102-0000-0000-0000-000000000001', 'DIAM-RG-SOL-025', '18K Diamond Solitaire Ring 0.25 Ct', 32000.00, 42500.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 103: 18K Diamond Halo Floral Ring (0.40 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000103-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K Diamond Halo Floral Ring (0.40 Ct)',
  '18K Yellow Gold halo cocktail ring featuring cluster of brilliant cut diamonds (0.40 Ct total).', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000103-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000103-0000-0000-0000-000000000001', 'DIAM-RG-HLO-040', '18K Diamond Halo Floral Ring 0.40 Ct', 48000.00, 62000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 104: 18K Diamond Stud Earrings Tops (0.30 Ct Pair)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000104-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K Diamond Stud Earrings Tops (0.30 Ct Pair)',
  'Classic 18K Rose Gold round diamond stud tops (0.15 Ct each, 0.30 Ct total) with screw post.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000104-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000104-0000-0000-0000-000000000001', 'DIAM-ER-STD-030', '18K Diamond Stud Tops 0.30 Ct Pair', 38000.00, 49500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 105: 18K Diamond Tanmaniya Mangalsutra Pendant (0.50 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000105-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K Diamond Tanmaniya Mangalsutra Pendant (0.50 Ct)',
  'Curved graceful Tanmaniya pendant studded with 0.50 carats of natural diamonds.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000105-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000105-0000-0000-0000-000000000001', 'DIAM-PD-TMN-050', '18K Diamond Tanmaniya Pendant 0.50 Ct', 58000.00, 75000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 106: 18K Diamond Heart Pendant with Chain (0.15 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000106-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K Diamond Heart Pendant with Chain (0.15 Ct)',
  '18K White Gold romantic heart pave diamond pendant including delicate gold chain.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000106-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000106-0000-0000-0000-000000000001', 'DIAM-PD-HRT-015', '18K Diamond Heart Pendant 0.15 Ct', 22000.00, 29500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 107: 14K Diamond Screw Nose Pin (0.05 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000107-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '14K Diamond Screw Nose Pin (0.05 Ct)',
  'Sparkling solitary certified diamond nose pin in 14K gold with secure screw.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000107-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000107-0000-0000-0000-000000000001', 'DIAM-NP-SCW-005', '14K Diamond Screw Nose Pin 0.05 Ct', 6500.00, 8900.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 108: 18K Two-Tone Diamond Men Band Ring (0.20 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000108-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K Two-Tone Diamond Men Band Ring (0.20 Ct)',
  'Gents comfort-fit band in 18K yellow & white gold with flush-set trio diamonds.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000108-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000108-0000-0000-0000-000000000001', 'DIAM-RG-MBD-020', '18K Diamond Men Band Ring 0.20 Ct', 42000.00, 54000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 109: 18K White Gold Diamond Tennis Bracelet (1.50 Ct)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000109-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0060000-0000-0000-0000-000000000001', 'goods', '18K White Gold Diamond Tennis Bracelet (1.50 Ct)',
  'Breathtaking flexible tennis line bracelet featuring 1.50 carats of continuous prong set diamonds.', 'Shree Narayan Solitaire',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7113', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000109-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000109-0000-0000-0000-000000000001', 'DIAM-BR-TNS-150', '18K Diamond Tennis Bracelet 1.50 Ct', 135000.00, 178000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 110: Natural Ceylon Yellow Sapphire Pukhraj (4.25 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000110-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Ceylon Yellow Sapphire Pukhraj (4.25 Ratti)',
  'Original Sri Lankan unheated bright yellow sapphire with Govt gemological lab certificate.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000110-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000110-0000-0000-0000-000000000001', 'GEM-PUK-425R', 'Natural Ceylon Yellow Sapphire - 4.25 Ratti', 28000.00, 38000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 111: Natural Ceylon Yellow Sapphire Pukhraj (6.50 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Ceylon Yellow Sapphire Pukhraj (6.50 Ratti)',
  'Premium large size Sri Lankan yellow sapphire with golden brilliance and certificate.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000111-0000-0000-0000-000000000001', 'GEM-PUK-650R', 'Natural Ceylon Yellow Sapphire - 6.50 Ratti', 52000.00, 69000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 112: Natural Burma Blue Sapphire Neelam (5.25 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000112-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Burma Blue Sapphire Neelam (5.25 Ratti)',
  'Auspicious deep royal cornflower blue certified natural sapphire for Shani devta.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000112-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000112-0000-0000-0000-000000000001', 'GEM-NEL-525R', 'Natural Blue Sapphire Neelam - 5.25 Ratti', 42000.00, 56000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 113: Natural Zambian Emerald Panna (5.50 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000113-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Zambian Emerald Panna (5.50 Ratti)',
  'Lush vivid green certified transparent natural emerald for Budh mercury planet.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000113-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000113-0000-0000-0000-000000000001', 'GEM-PAN-550R', 'Natural Zambian Emerald Panna - 5.50 Ratti', 33000.00, 44000.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 114: Natural Italian Red Coral Moonga (7.25 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000114-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Italian Red Coral Moonga (7.25 Ratti)',
  'Triangular high dome capsule certified Mediterranean red coral for Mangal mars.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000114-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000114-0000-0000-0000-000000000001', 'GEM-MNG-725R', 'Natural Italian Red Coral Moonga - 7.25 Ratti', 14500.00, 19800.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 115: Natural Old Mine Ruby Manik (4.50 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000115-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Old Mine Ruby Manik (4.50 Ratti)',
  'Pigeon blood untreated natural ruby gemstone for Sun Surya devta.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000115-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000115-0000-0000-0000-000000000001', 'GEM-MNK-450R', 'Natural Old Mine Ruby Manik - 4.50 Ratti', 31000.00, 41500.00, '1', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 116: Natural South Sea Pearl Moti (6.00 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000116-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural South Sea Pearl Moti (6.00 Ratti)',
  'Flawless round radiant lustrous white Basra-grade pearl for Moon Chandra.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000116-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000116-0000-0000-0000-000000000001', 'GEM-MOT-600R', 'Natural South Sea Pearl Moti - 6.00 Ratti', 12000.00, 16500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 117: Natural Ceylon Hessonite Gomed (6.75 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000117-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Ceylon Hessonite Gomed (6.75 Ratti)',
  'Transparent honey colored certified Hessonite garnet gemstone for Rahu planet.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000117-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000117-0000-0000-0000-000000000001', 'GEM-GMD-675R', 'Natural Ceylon Hessonite Gomed - 6.75 Ratti', 9500.00, 13500.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 118: Natural Chrysoberyl Cat Eye Lehsunia (5.25 Ratti)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000118-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0070000-0000-0000-0000-000000000001', 'goods', 'Natural Chrysoberyl Cat Eye Lehsunia (5.25 Ratti)',
  'Sharp chatoyancy ray certified natural Chrysoberyl cat eye for Ketu planet.', 'Shree Narayan Ratna',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000018', '20000000-0000-0000-0000-000000000006', '7103', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000118-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000118-0000-0000-0000-000000000001', 'GEM-LHS-525R', 'Natural Cat Eye Lehsunia - 5.25 Ratti', 11000.00, 15200.00, '2', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 119: Royal Rajasthani Kundan Bridal Choker Set
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000119-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Royal Rajasthani Kundan Bridal Choker Set',
  'Complete bridal set: heavy kundan choker necklace, hanging earrings, and matching maang tikka.', 'Shree Narayan Utsav',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000119-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000119-0000-0000-0000-000000000001', 'IMIT-ST-KND-01', 'Royal Kundan Bridal Set (Necklace + Earrings + Tikka)', 2800.00, 4200.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 120: Matte Antique Temple Jewellery Long Haram Set
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000120-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Matte Antique Temple Jewellery Long Haram Set',
  'South temple motif antique gold finish long necklace set with Lakshmi coins and jhumkis.', 'Shree Narayan Utsav',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000120-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000120-0000-0000-0000-000000000001', 'IMIT-ST-TMP-01', 'Matte Antique Temple Long Haram Set', 2200.00, 3400.00, '3', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 121: Micro Gold Plated Brass Rope Chain (24 inch)
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000121-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Micro Gold Plated Brass Rope Chain (24 inch)',
  '1-gram micro gold plated anti-tarnish daily wear men brass rope chain.', 'Shree Narayan Fashion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000121-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000121-0000-0000-0000-000000000001', 'IMIT-CH-MGP-24', 'Micro Gold Plated Rope Chain 24 Inch', 350.00, 650.00, '10', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 122: Micro Gold Plated Openable Floral Kada Pair
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000122-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Micro Gold Plated Openable Floral Kada Pair',
  'Pair of brass micro gold coated openable floral bangles with latch lock.', 'Shree Narayan Fashion',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000122-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000122-0000-0000-0000-000000000001', 'IMIT-KD-FLR-02', 'Micro Gold Plated Floral Kada Pair', 550.00, 950.00, '8', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 123: Traditional Rajputi Meenakari Bridal Nath with Kundan
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000123-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Traditional Rajputi Meenakari Bridal Nath with Kundan',
  'Grand imitation bridal nath with red meenakari, kundan beads and pearl chain.', 'Shree Narayan Utsav',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000123-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000123-0000-0000-0000-000000000001', 'IMIT-NP-NTH-01', 'Traditional Rajputi Meenakari Bridal Nath', 320.00, 590.00, '6', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 124: Antique Gold Finish Royal Kamarbandh Tagdi
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000124-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Antique Gold Finish Royal Kamarbandh Tagdi',
  'Adjustable bridal waist chain with cascading ghungroo bells and ruby stone work.', 'Shree Narayan Utsav',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000124-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000124-0000-0000-0000-000000000001', 'IMIT-KB-RYL-01', 'Antique Gold Finish Royal Kamarbandh Tagdi', 750.00, 1250.00, '4', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 125: Traditional Velvet Bridal Chooda Bangles Set
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000125-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Traditional Velvet Bridal Chooda Bangles Set',
  'Complete red & maroon wedding chooda set with kundan latkan and studded kadas.', 'Shree Narayan Bridal',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000125-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000125-0000-0000-0000-000000000001', 'IMIT-BG-CHD-01', 'Traditional Velvet Bridal Chooda Bangles Set', 1100.00, 1750.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 126: Gold Plated Kundan Hathphool Pair with Rings
INSERT INTO "products" (
  "id", "tenant_id", "category_id", "product_type", "name", "description", "brand_name",
  "is_stock_tracked", "tracking_method", "valuation_method", "base_unit_id", "default_tax_category_id", "hsn_sac_code", "is_active", "created_at"
) VALUES (
  'a0000126-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  'c0080000-0000-0000-0000-000000000001', 'goods', 'Gold Plated Kundan Hathphool Pair with Rings',
  'Pair of bridal hand harness chains with floral kundan centerpiece and attached finger rings.', 'Shree Narayan Utsav',
  TRUE, 'quantity', 'weighted_average', '10000000-0000-0000-0000-000000000017', '20000000-0000-0000-0000-000000000006', '7117', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "product_variants" (
  "id", "tenant_id", "product_id", "sku", "variant_name", "purchase_price", "selling_price", "reorder_level", "is_active", "created_at"
) VALUES (
  'b0000126-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'a0000126-0000-0000-0000-000000000001', 'IMIT-HP-KND-02', 'Gold Plated Kundan Hathphool Pair', 480.00, 850.00, '5', TRUE, NOW()
) ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 7. Customers & Bullion / Artisan Suppliers
-- ----------------------------------------------------------------------------
-- Suppliers
INSERT INTO "parties" (
  "id", "tenant_id", "party_type", "display_name", "legal_name", "gstin", "phone", "email", "is_active", "created_at"
) VALUES
  ('90000003-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'supplier', 'Kashi Bullion & Refining Pvt Ltd', 'Kashi Bullion and Refining Private Limited', '09AAACK9876K1Z3', '+91 542 2450123', 'orders@kashibullion.in', TRUE, NOW()),
  ('90000003-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000001', 'supplier', 'Rajkot Silver Art Works', 'Rajkot Silver Art Works LLP', '24AAJFR5432B1Z8', '+91 281 2233445', 'sales@rajkotsilver.in', TRUE, NOW()),
  ('90000003-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000001', 'supplier', 'Surat Diamond Craft Syndicate', 'Surat Diamond Craft Syndicate LLP', '24AABCS4455C1Z1', '+91 261 2455667', 'diamonds@suratcraft.com', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "party_addresses" ("id", "party_id", "address_type", "address_line_1", "city", "state_code", "is_default")
VALUES
  ('91000003-0000-0000-0000-000000000005', '90000003-0000-0000-0000-000000000005', 'billing', 'Chowk Sarafa Bazar', 'Varanasi', '09', TRUE),
  ('91000003-0000-0000-0000-000000000006', '90000003-0000-0000-0000-000000000006', 'billing', 'Soni Bazar, Rajkot', 'Rajkot', '24', TRUE),
  ('91000003-0000-0000-0000-000000000007', '90000003-0000-0000-0000-000000000007', 'billing', 'Varachha Diamond District', 'Surat', '24', TRUE)
ON CONFLICT ("id") DO NOTHING;

-- Customers
INSERT INTO "parties" (
  "id", "tenant_id", "party_type", "display_name", "legal_name", "gstin", "phone", "email", "is_active", "created_at"
) VALUES
  ('90000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'customer', 'Smt. Radha Devi Verma', 'Radha Devi Verma', NULL, '+91 98392 11223', 'radha.verma@gmail.com', TRUE, NOW()),
  ('90000003-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'customer', 'Shri Ramesh Chandra Tiwari', 'Ramesh Chandra Tiwari', NULL, '+91 94501 33445', 'tiwari.ramesh@yahoo.co.in', TRUE, NOW()),
  ('90000003-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'customer', 'Shri Dinesh Kumar Gupta', 'Dinesh Kumar Gupta', NULL, '+91 98380 55667', 'dinesh.gupta.narayanpur@gmail.com', TRUE, NOW()),
  ('90000003-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'customer', 'Walk-in Retail Cash Customer', 'Walk-in Retail Cash Customer', NULL, '+91 98391 23456', 'cash@shreenarayanjewellers.in', TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "party_addresses" (
  "id", "party_id", "address_type", "address_line_1", "city", "state_code", "is_default"
) VALUES
  ('91000003-0000-0000-0000-000000000001', '90000003-0000-0000-0000-000000000001', 'billing', 'Nizamuddinpur, Bhitari Bazar Road', 'Narayanpur', '09', TRUE),
  ('91000003-0000-0000-0000-000000000002', '90000003-0000-0000-0000-000000000002', 'billing', 'Bhitari Bazar Main Chowk', 'Narayanpur', '09', TRUE),
  ('91000003-0000-0000-0000-000000000003', '90000003-0000-0000-0000-000000000003', 'billing', 'Station Road, Near Railway Crossing', 'Narayanpur', '09', TRUE),
  ('91000003-0000-0000-0000-000000000004', '90000003-0000-0000-0000-000000000004', 'billing', 'Counter Cash Sale - Main Showroom', 'Narayanpur', '09', TRUE)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 8. Payment Methods & Financial Accounts
-- ----------------------------------------------------------------------------
INSERT INTO "payment_methods" ("id", "tenant_id", "name", "code", "is_active")
VALUES
  ('80000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cash', 'CASH', TRUE),
  ('80000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'UPI', 'UPI', TRUE),
  ('80000002-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Bank Transfer (NEFT/RTGS)', 'BANK_TRANSFER', TRUE),
  ('80000002-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Debit/Credit Card', 'CARD', TRUE),
  ('80000002-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Old Gold/Silver Exchange', 'EXCHANGE', TRUE)
ON CONFLICT ("id") DO NOTHING;

INSERT INTO "financial_accounts" (
  "id", "tenant_id", "name", "account_type", "bank_name", "account_number_masked", "opening_balance", "is_default", "is_active", "created_at"
) VALUES
  ('81000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Cash in Tijori / Counter', 'cash', NULL, NULL, 50000.00, TRUE, TRUE, NOW()),
  ('81000002-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'State Bank of India Current A/c', 'bank', 'State Bank of India', 'XXXXXX4488', 500000.00, FALSE, TRUE, NOW())
ON CONFLICT ("id") DO NOTHING;

-- Document Sequence: SNJ/2026-27/0001
INSERT INTO "document_sequences" (
  "id", "tenant_id", "business_location_id", "document_type", "financial_year", "prefix", "next_number", "padding_length"
) VALUES (
  '82000002-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '60000000-0000-0000-0000-000000000001',
  'sales_invoice',
  '2026-27',
  'SNJ/2026-27/',
  1,
  4
)
ON CONFLICT ("id") DO NOTHING;

-- ----------------------------------------------------------------------------
-- 9. Opening Stock Ledger & Balances in Main Jewellery Vault
-- ----------------------------------------------------------------------------

-- Item 1 Stock: GLD-RANI-HAAR-35G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001',
  '2', '0', '2', '245000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000001-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000001-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 2 Stock: GLD-GULUBAND-18G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001',
  '3', '0', '3', '126000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000002-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000002-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 3 Stock: GLD-FANCY-NCK-12G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000001',
  '4', '0', '4', '84000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000003-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000003-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 4 Stock: GLD-SITA-HAAR-28G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000001',
  '2', '0', '2', '196000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000004-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000004-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 5 Stock: GLD-HANSLI-22G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000001',
  '2', '0', '2', '154000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000005-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000005-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 6 Stock: GLD-CHN-ROPE-16G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000001',
  '5', '0', '5', '112000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000006-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000006-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 7 Stock: GLD-CHN-RUDR-12G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000007-0000-0000-0000-000000000001',
  '4', '0', '4', '86000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000007-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000007-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 8 Stock: GLD-CHN-FIG-10G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000008-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000008-0000-0000-0000-000000000001',
  '6', '0', '6', '70000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000008-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000008-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 9 Stock: GLD-CHN-LOTUS-08G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000009-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000009-0000-0000-0000-000000000001',
  '6', '0', '6', '56000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000009-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000009-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 10 Stock: GLD-CHN-BOX-05G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000010-0000-0000-0000-000000000001',
  '8', '0', '8', '35000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000010-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000010-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 11 Stock: GLD-CHN-CURB-06G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000011-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000011-0000-0000-0000-000000000001',
  '7', '0', '7', '42000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000011-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000011-0000-0000-0000-000000000001',
  'adjustment_in', 7, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 12 Stock: GLD-CHN-SNG-04G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000012-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000012-0000-0000-0000-000000000001',
  '10', '0', '10', '28000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000012-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000012-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 13 Stock: GLD-MS-VATI-18G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000013-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000013-0000-0000-0000-000000000001',
  '4', '0', '4', '126000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000013-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000013-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 14 Stock: GLD-MS-MOD-06G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000014-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000014-0000-0000-0000-000000000001',
  '6', '0', '6', '43000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000014-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000014-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 15 Stock: GLD-MS-FLR-10G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000015-0000-0000-0000-000000000001',
  '5', '0', '5', '71000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000015-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000015-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 16 Stock: GLD-KD-FIL-32G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000016-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000016-0000-0000-0000-000000000001',
  '3', '0', '3', '224000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000016-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000016-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 17 Stock: GLD-KD-LION-35G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000017-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000017-0000-0000-0000-000000000001',
  '2', '0', '2', '245000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000017-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000017-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 18 Stock: GLD-BG-MC4-30G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000018-0000-0000-0000-000000000001',
  '4', '0', '4', '210000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000018-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000018-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 19 Stock: GLD-BG-PTL-40G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000019-0000-0000-0000-000000000001',
  '2', '0', '2', '280000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000019-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000019-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 20 Stock: GLD-BG-CHU-16G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000020-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000020-0000-0000-0000-000000000001',
  '5', '0', '5', '112000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000020-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000020-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 21 Stock: GLD-BG-MNK-20G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000021-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000021-0000-0000-0000-000000000001',
  '3', '0', '3', '142000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000021-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000021-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 22 Stock: GLD-ER-JHM-14G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000022-0000-0000-0000-000000000001',
  '4', '0', '4', '98000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000022-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000022-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 23 Stock: GLD-ER-CHB-15G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000023-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000023-0000-0000-0000-000000000001',
  '3', '0', '3', '105000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000023-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000023-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 24 Stock: GLD-ER-SUI-04G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000024-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000024-0000-0000-0000-000000000001',
  '8', '0', '8', '28000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000024-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000024-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 25 Stock: GLD-ER-TOP-2.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000025-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000025-0000-0000-0000-000000000001',
  '12', '0', '12', '17500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000025-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000025-0000-0000-0000-000000000001',
  'adjustment_in', 12, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 26 Stock: GLD-ER-KAN-16G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000026-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000026-0000-0000-0000-000000000001',
  '2', '0', '2', '112000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000026-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000026-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 27 Stock: GLD-ER-BAL-1.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000027-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000027-0000-0000-0000-000000000001',
  '15', '0', '15', '10500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000027-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000027-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 28 Stock: GLD-ER-BAL-3.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000028-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000028-0000-0000-0000-000000000001',
  '9', '0', '9', '24500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000028-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000028-0000-0000-0000-000000000001',
  'adjustment_in', 9, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 29 Stock: GLD-RG-MLN-08G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000029-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000029-0000-0000-0000-000000000001',
  '5', '0', '5', '56000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000029-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000029-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 30 Stock: GLD-RG-MSQ-06G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000030-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000030-0000-0000-0000-000000000001',
  '6', '0', '6', '42000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000030-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000030-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 31 Stock: GLD-RG-LCZ-3.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000031-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000031-0000-0000-0000-000000000001',
  '8', '0', '8', '24800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000031-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000031-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 32 Stock: GLD-RG-LPC-05G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000032-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000032-0000-0000-0000-000000000001',
  '5', '0', '5', '35500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000032-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000032-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 33 Stock: GLD-RG-TOR-4.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000033-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000033-0000-0000-0000-000000000001',
  '7', '0', '7', '31800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000033-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000033-0000-0000-0000-000000000001',
  'adjustment_in', 7, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 34 Stock: GLD-RG-MOM-5.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000034-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000034-0000-0000-0000-000000000001',
  '6', '0', '6', '38800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000034-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000034-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 35 Stock: GLD-RG-CPB-09G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000035-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000035-0000-0000-0000-000000000001',
  '4', '0', '4', '63500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000035-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000035-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 36 Stock: GLD-PD-LXG-05G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000036-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000036-0000-0000-0000-000000000001',
  '8', '0', '8', '35000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000036-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000036-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 37 Stock: GLD-PD-TRS-04G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000037-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000037-0000-0000-0000-000000000001',
  '8', '0', '8', '28200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000037-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000037-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 38 Stock: GLD-PD-OMK-02G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000038-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000038-0000-0000-0000-000000000001',
  '14', '0', '14', '14100.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000038-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000038-0000-0000-0000-000000000001',
  'adjustment_in', 14, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 39 Stock: GLD-PD-HRT-03G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000039-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000039-0000-0000-0000-000000000001',
  '7', '0', '7', '21200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000039-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000039-0000-0000-0000-000000000001',
  'adjustment_in', 7, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 40 Stock: GLD-NP-NTH-06G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000040-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000040-0000-0000-0000-000000000001',
  '4', '0', '4', '42500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000040-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000040-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 41 Stock: GLD-NP-LNG-0.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000041-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000041-0000-0000-0000-000000000001',
  '25', '0', '25', '3600.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000041-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000041-0000-0000-0000-000000000001',
  'adjustment_in', 25, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 42 Stock: GLD-NP-MHN-2.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000042-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000042-0000-0000-0000-000000000001',
  '6', '0', '6', '17800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000042-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000042-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 43 Stock: GLD-NP-BAL-01G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000043-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000043-0000-0000-0000-000000000001',
  '18', '0', '18', '7100.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000043-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000043-0000-0000-0000-000000000001',
  'adjustment_in', 18, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 44 Stock: GLD-TK-BDL-07G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000044-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000044-0000-0000-0000-000000000001',
  '4', '0', '4', '49500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000044-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000044-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 45 Stock: GLD-KB-RYL-65G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000045-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000045-0000-0000-0000-000000000001',
  '1', '0', '1', '460000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000045-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000045-0000-0000-0000-000000000001',
  'adjustment_in', 1, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 46 Stock: GLD-HP-BDL-20G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000046-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000046-0000-0000-0000-000000000001',
  '2', '0', '2', '142000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000046-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000046-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 47 Stock: GLD-BB-NZR-04G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000047-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000047-0000-0000-0000-000000000001',
  '8', '0', '8', '28400.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000047-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000047-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 48 Stock: GLD-BR-MCB-24G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000048-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000048-0000-0000-0000-000000000001',
  '3', '0', '3', '170000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000048-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000048-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 49 Stock: GCOIN-999-01G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000049-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000049-0000-0000-0000-000000000001',
  '30', '0', '30', '7750.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000049-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000049-0000-0000-0000-000000000001',
  'adjustment_in', 30, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 50 Stock: GCOIN-999-02G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000050-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000050-0000-0000-0000-000000000001',
  '25', '0', '25', '15500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000050-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000050-0000-0000-0000-000000000001',
  'adjustment_in', 25, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 51 Stock: GCOIN-999-05G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000051-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000051-0000-0000-0000-000000000001',
  '20', '0', '20', '38750.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000051-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000051-0000-0000-0000-000000000001',
  'adjustment_in', 20, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 52 Stock: GCOIN-999-08G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000052-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000052-0000-0000-0000-000000000001',
  '15', '0', '15', '62000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000052-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000052-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 53 Stock: GBAR-999-10G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000053-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000053-0000-0000-0000-000000000001',
  '20', '0', '20', '77500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000053-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000053-0000-0000-0000-000000000001',
  'adjustment_in', 20, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 54 Stock: GBAR-999-20G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000054-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000054-0000-0000-0000-000000000001',
  '10', '0', '10', '155000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000054-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000054-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 55 Stock: GBAR-999-50G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000055-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000055-0000-0000-0000-000000000001',
  '5', '0', '5', '387500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000055-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000055-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 56 Stock: GBAR-999-100G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000056-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000056-0000-0000-0000-000000000001',
  '3', '0', '3', '775000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000056-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000056-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 57 Stock: SILV-PY-BDL-200G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000057-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000057-0000-0000-0000-000000000001',
  '6', '0', '6', '18500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000057-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000057-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 58 Stock: SILV-PY-GHN-100G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000058-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000058-0000-0000-0000-000000000001',
  '10', '0', '10', '9300.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000058-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000058-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 59 Stock: SILV-PY-DL60-60G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000059-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000059-0000-0000-0000-000000000001',
  '15', '0', '15', '5600.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000059-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000059-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 60 Stock: SILV-PY-CHN-35G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000060-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000060-0000-0000-0000-000000000001',
  '16', '0', '16', '3300.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000060-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000060-0000-0000-0000-000000000001',
  'adjustment_in', 16, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 61 Stock: SILV-PY-TRB-80G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000061-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000061-0000-0000-0000-000000000001',
  '8', '0', '8', '7500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000061-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000061-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 62 Stock: SILV-BC-MNK-15G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000062-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000062-0000-0000-0000-000000000001',
  '25', '0', '25', '1400.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000062-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000062-0000-0000-0000-000000000001',
  'adjustment_in', 25, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 63 Stock: SILV-BC-DSN-10G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000063-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000063-0000-0000-0000-000000000001',
  '30', '0', '30', '950.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000063-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000063-0000-0000-0000-000000000001',
  'adjustment_in', 30, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 64 Stock: SILV-BC-PLN-08G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000064-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000064-0000-0000-0000-000000000001',
  '35', '0', '35', '750.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000064-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000064-0000-0000-0000-000000000001',
  'adjustment_in', 35, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 65 Stock: SILV-BC-PCK-30G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000065-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000065-0000-0000-0000-000000000001',
  '12', '0', '12', '2800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000065-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000065-0000-0000-0000-000000000001',
  'adjustment_in', 12, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 66 Stock: SILV-KD-BHB-125G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000066-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000066-0000-0000-0000-000000000001',
  '5', '0', '5', '11500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000066-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000066-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 67 Stock: SILV-KD-MPL-65G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000067-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000067-0000-0000-0000-000000000001',
  '8', '0', '8', '6000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000067-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000067-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 68 Stock: SILV-BG-LFC-50G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000068-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000068-0000-0000-0000-000000000001',
  '8', '0', '8', '4700.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000068-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000068-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 69 Stock: SILV-KD-KID-25G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000069-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000069-0000-0000-0000-000000000001',
  '15', '0', '15', '2350.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000069-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000069-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 70 Stock: SILV-BR-TNS-18G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000070-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000070-0000-0000-0000-000000000001',
  '10', '0', '10', '2400.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000070-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000070-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 71 Stock: SILV-CH-MCB-50G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000071-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000071-0000-0000-0000-000000000001',
  '10', '0', '10', '4650.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000071-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000071-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 72 Stock: SILV-CH-MRP-30G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000072-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000072-0000-0000-0000-000000000001',
  '12', '0', '12', '2800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000072-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000072-0000-0000-0000-000000000001',
  'adjustment_in', 12, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 73 Stock: SILV-CH-SNK-15G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000073-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000073-0000-0000-0000-000000000001',
  '18', '0', '18', '1450.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000073-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000073-0000-0000-0000-000000000001',
  'adjustment_in', 18, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 74 Stock: SILV-RG-NAG-08G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000074-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000074-0000-0000-0000-000000000001',
  '20', '0', '20', '750.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000074-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000074-0000-0000-0000-000000000001',
  'adjustment_in', 20, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 75 Stock: SILV-RG-SOL-4.5G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000075-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000075-0000-0000-0000-000000000001',
  '18', '0', '18', '650.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000075-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000075-0000-0000-0000-000000000001',
  'adjustment_in', 18, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 76 Stock: SILV-RG-CHL-05G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000076-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000076-0000-0000-0000-000000000001',
  '30', '0', '30', '470.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000076-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000076-0000-0000-0000-000000000001',
  'adjustment_in', 30, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 77 Stock: SILV-PD-MHK-12G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000077-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000077-0000-0000-0000-000000000001',
  '15', '0', '15', '1250.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000077-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000077-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 78 Stock: SILV-TH-FLR-150G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000078-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000078-0000-0000-0000-000000000001',
  '4', '0', '4', '14000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000078-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000078-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 79 Stock: SILV-TH-RYL-300G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000079-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000079-0000-0000-0000-000000000001',
  '2', '0', '2', '28000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000079-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000079-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 80 Stock: SILV-ID-LXG-75G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000080-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000080-0000-0000-0000-000000000001',
  '8', '0', '8', '7200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000080-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000080-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 81 Stock: SILV-ID-LXG-150G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000081-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000081-0000-0000-0000-000000000001',
  '3', '0', '3', '14200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000081-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000081-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 82 Stock: SILV-DY-SNG-30G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000082-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000082-0000-0000-0000-000000000001',
  '12', '0', '12', '2800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000082-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000082-0000-0000-0000-000000000001',
  'adjustment_in', 12, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 83 Stock: SILV-DY-PNC-85G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000083-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000083-0000-0000-0000-000000000001',
  '5', '0', '5', '8000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000083-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000083-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 84 Stock: SILV-GH-NND-50G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000084-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000084-0000-0000-0000-000000000001',
  '7', '0', '7', '4700.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000084-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000084-0000-0000-0000-000000000001',
  'adjustment_in', 7, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 85 Stock: SILV-KL-LTA-120G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000085-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000085-0000-0000-0000-000000000001',
  '4', '0', '4', '11200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000085-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000085-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 86 Stock: SILV-SP-ACH-25G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000086-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000086-0000-0000-0000-000000000001',
  '10', '0', '10', '2350.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000086-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000086-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 87 Stock: SILV-AG-STD-40G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000087-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000087-0000-0000-0000-000000000001',
  '8', '0', '8', '3800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000087-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000087-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 88 Stock: SILV-GL-EMB-80G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000088-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000088-0000-0000-0000-000000000001',
  '6', '0', '6', '7500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000088-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000088-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 89 Stock: SILV-UT-PLD-65G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000089-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000089-0000-0000-0000-000000000001',
  '6', '0', '6', '6200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000089-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000089-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 90 Stock: SILV-SD-PCK-35G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000090-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000090-0000-0000-0000-000000000001',
  '10', '0', '10', '3400.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000090-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000090-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 91 Stock: SILV-ID-HNM-45G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000091-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000091-0000-0000-0000-000000000001',
  '8', '0', '8', '4300.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000091-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000091-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 92 Stock: SILV-DY-KMK-70G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000092-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000092-0000-0000-0000-000000000001',
  '5', '0', '5', '6600.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000092-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000092-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 93 Stock: SILV-UT-KTR-30G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000093-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000093-0000-0000-0000-000000000001',
  '12', '0', '12', '2800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000093-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000093-0000-0000-0000-000000000001',
  'adjustment_in', 12, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 94 Stock: SILV-ID-KMD-110G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000094-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000094-0000-0000-0000-000000000001',
  '3', '0', '3', '10500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000094-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000094-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 95 Stock: SCOIN-999-10G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000095-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000095-0000-0000-0000-000000000001',
  '50', '0', '50', '930.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000095-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000095-0000-0000-0000-000000000001',
  'adjustment_in', 50, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 96 Stock: SCOIN-999-20G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000096-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000096-0000-0000-0000-000000000001',
  '40', '0', '40', '1860.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000096-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000096-0000-0000-0000-000000000001',
  'adjustment_in', 40, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 97 Stock: SCOIN-999-50G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000097-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000097-0000-0000-0000-000000000001',
  '25', '0', '25', '4650.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000097-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000097-0000-0000-0000-000000000001',
  'adjustment_in', 25, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 98 Stock: SCOIN-999-100G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000098-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000098-0000-0000-0000-000000000001',
  '20', '0', '20', '9300.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000098-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000098-0000-0000-0000-000000000001',
  'adjustment_in', 20, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 99 Stock: SBAR-999-250G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000099-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000099-0000-0000-0000-000000000001',
  '8', '0', '8', '23250.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000099-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000099-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 100 Stock: SBAR-999-500G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000100-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000100-0000-0000-0000-000000000001',
  '5', '0', '5', '46500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000100-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000100-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 101 Stock: SBAR-999-1000G
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000101-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000101-0000-0000-0000-000000000001',
  '4', '0', '4', '93000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000101-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000101-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000003', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 102 Stock: DIAM-RG-SOL-025
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000102-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000102-0000-0000-0000-000000000001',
  '3', '0', '3', '32000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000102-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000102-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 103 Stock: DIAM-RG-HLO-040
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000103-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000103-0000-0000-0000-000000000001',
  '3', '0', '3', '48000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000103-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000103-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 104 Stock: DIAM-ER-STD-030
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000104-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000104-0000-0000-0000-000000000001',
  '4', '0', '4', '38000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000104-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000104-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 105 Stock: DIAM-PD-TMN-050
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000105-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000105-0000-0000-0000-000000000001',
  '2', '0', '2', '58000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000105-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000105-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 106 Stock: DIAM-PD-HRT-015
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000106-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000106-0000-0000-0000-000000000001',
  '4', '0', '4', '22000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000106-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000106-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 107 Stock: DIAM-NP-SCW-005
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000107-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000107-0000-0000-0000-000000000001',
  '10', '0', '10', '6500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000107-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000107-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 108 Stock: DIAM-RG-MBD-020
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000108-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000108-0000-0000-0000-000000000001',
  '3', '0', '3', '42000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000108-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000108-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 109 Stock: DIAM-BR-TNS-150
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000109-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000109-0000-0000-0000-000000000001',
  '1', '0', '1', '135000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000109-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000109-0000-0000-0000-000000000001',
  'adjustment_in', 1, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 110 Stock: GEM-PUK-425R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000110-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000110-0000-0000-0000-000000000001',
  '3', '0', '3', '28000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000110-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000110-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 111 Stock: GEM-PUK-650R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000111-0000-0000-0000-000000000001',
  '2', '0', '2', '52000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000111-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000111-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 112 Stock: GEM-NEL-525R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000112-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000112-0000-0000-0000-000000000001',
  '2', '0', '2', '42000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000112-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000112-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 113 Stock: GEM-PAN-550R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000113-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000113-0000-0000-0000-000000000001',
  '3', '0', '3', '33000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000113-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000113-0000-0000-0000-000000000001',
  'adjustment_in', 3, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 114 Stock: GEM-MNG-725R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000114-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000114-0000-0000-0000-000000000001',
  '5', '0', '5', '14500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000114-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000114-0000-0000-0000-000000000001',
  'adjustment_in', 5, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 115 Stock: GEM-MNK-450R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000115-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000115-0000-0000-0000-000000000001',
  '2', '0', '2', '31000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000115-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000115-0000-0000-0000-000000000001',
  'adjustment_in', 2, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 116 Stock: GEM-MOT-600R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000116-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000116-0000-0000-0000-000000000001',
  '6', '0', '6', '12000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000116-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000116-0000-0000-0000-000000000001',
  'adjustment_in', 6, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 117 Stock: GEM-GMD-675R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000117-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000117-0000-0000-0000-000000000001',
  '4', '0', '4', '9500.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000117-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000117-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 118 Stock: GEM-LHS-525R
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000118-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000118-0000-0000-0000-000000000001',
  '4', '0', '4', '11000.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000118-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000118-0000-0000-0000-000000000001',
  'adjustment_in', 4, '10000000-0000-0000-0000-000000000018', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 119 Stock: IMIT-ST-KND-01
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000119-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000119-0000-0000-0000-000000000001',
  '8', '0', '8', '2800.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000119-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000119-0000-0000-0000-000000000001',
  'adjustment_in', 8, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 120 Stock: IMIT-ST-TMP-01
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000120-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000120-0000-0000-0000-000000000001',
  '10', '0', '10', '2200.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000120-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000120-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 121 Stock: IMIT-CH-MGP-24
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000121-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000121-0000-0000-0000-000000000001',
  '25', '0', '25', '350.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000121-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000121-0000-0000-0000-000000000001',
  'adjustment_in', 25, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 122 Stock: IMIT-KD-FLR-02
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000122-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000122-0000-0000-0000-000000000001',
  '15', '0', '15', '550.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000122-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000122-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 123 Stock: IMIT-NP-NTH-01
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000123-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000123-0000-0000-0000-000000000001',
  '15', '0', '15', '320.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000123-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000123-0000-0000-0000-000000000001',
  'adjustment_in', 15, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 124 Stock: IMIT-KB-RYL-01
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000124-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000124-0000-0000-0000-000000000001',
  '12', '0', '12', '750.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000124-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000124-0000-0000-0000-000000000001',
  'adjustment_in', 12, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 125 Stock: IMIT-BG-CHD-01
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000125-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000125-0000-0000-0000-000000000001',
  '10', '0', '10', '1100.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000125-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000125-0000-0000-0000-000000000001',
  'adjustment_in', 10, '10000000-0000-0000-0000-000000000001', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

-- Item 126 Stock: IMIT-HP-KND-02
INSERT INTO "stock_balances" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "quantity_on_hand", "quantity_reserved", "quantity_available", "average_unit_cost", "updated_at"
) VALUES (
  '71000126-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000126-0000-0000-0000-000000000001',
  '14', '0', '14', '480.00', NOW()
) ON CONFLICT ("id") DO NOTHING;

INSERT INTO "stock_movements" (
  "id", "tenant_id", "inventory_location_id", "variant_id", "movement_type", "quantity", "unit_id", "reference_type", "reference_id", "occurred_at", "created_at"
) VALUES (
  '72000126-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000001', 'b0000126-0000-0000-0000-000000000001',
  'adjustment_in', 14, '10000000-0000-0000-0000-000000000017', 'opening_stock', '00000000-0000-0000-0000-000000000001', NOW(), NOW()
) ON CONFLICT ("id") DO NOTHING;

COMMIT;
