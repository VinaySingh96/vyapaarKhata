/**
 * Standalone PostgreSQL Migration & Seed Runner for Production / Cloud Deployments (Render / Neon / Supabase)
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/migrate-pg.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const req = createRequire(path.join(root, 'packages/db/package.json'));
const pg = req('pg');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ Error: DATABASE_URL environment variable is required to run migrations.');
  process.exit(1);
}

async function migrate() {
  console.log('🔄 Connecting to PostgreSQL database to apply migrations...');
  const client = new pg.Client({
    connectionString: databaseUrl,
    ssl: databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database.');

    // 1. Check existing table count
    const countRes = await client.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const tableCount = parseInt(countRes.rows[0].count, 10);
    console.log(`📊 Found ${tableCount} existing tables in public schema.`);

    if (tableCount === 0) {
      console.log('📦 Database is fresh. Applying base schema and seeds...');
      const migrationFiles = [
        { name: '001_initial_schema.sql', path: 'packages/db/migrations/pg/001_initial_schema.sql' },
        { name: '002_rental_module.sql', path: 'packages/db/migrations/pg/002_rental_module.sql' },
        { name: '001_reference_seeds.sql', path: 'packages/db/src/seeds/001_reference_seeds.sql' },
        { name: '002_patel_building_materials_seed.sql', path: 'packages/db/src/seeds/002_patel_building_materials_seed.sql' },
      ];

      for (const item of migrationFiles) {
        const fullPath = path.join(root, item.path);
        if (fs.existsSync(fullPath)) {
          console.log(`⏳ Applying ${item.name}...`);
          const sql = fs.readFileSync(fullPath, 'utf8');
          await client.query(sql);
          console.log(`✅ Applied ${item.name}`);
        } else {
          console.warn(`⚠️ Warning: Migration file not found: ${item.path}`);
        }
      }
    } else {
      console.log('ℹ️ Base schema already present. Checking for rental module schema...');
      // Ensure rental tables exist even if upgrading existing DB
      const rentalCheck = await client.query(
        "SELECT count(*) FROM information_schema.tables WHERE table_name = 'rental_issues'"
      );
      if (parseInt(rentalCheck.rows[0].count, 10) === 0) {
        console.log('⏳ Applying 002_rental_module.sql to existing database...');
        const rentalSql = fs.readFileSync(path.join(root, 'packages/db/migrations/pg/002_rental_module.sql'), 'utf8');
        await client.query(rentalSql);
        console.log('✅ Applied 002_rental_module.sql');
      } else {
        console.log('✅ Rental module tables already verified.');
      }
    }

    // 2. Also ensure Central Cloud tables exist if this database hosts Central Cloud
    if (process.env.APPLY_CENTRAL_MIGRATIONS === 'true' || process.env.SERVICE_TYPE === 'central') {
      console.log('⏳ Ensuring Central Cloud schema tables exist...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS central_tenants (
          id UUID PRIMARY KEY,
          slug VARCHAR(120) NOT NULL UNIQUE,
          name VARCHAR(255) NOT NULL,
          legal_name VARCHAR(255),
          store_type VARCHAR(50) NOT NULL DEFAULT 'building_materials',
          license_number VARCHAR(100) UNIQUE,
          secret_key VARCHAR(100),
          gstin VARCHAR(15),
          contact_email VARCHAR(255),
          contact_phone VARCHAR(50),
          address TEXT,
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          plan VARCHAR(50) NOT NULL DEFAULT 'standard',
          max_installations INT NOT NULL DEFAULT 3,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS central_license_sequences (
          year INT PRIMARY KEY,
          last_seq INT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS central_installations (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES central_tenants(id) ON DELETE CASCADE,
          device_name VARCHAR(255) NOT NULL,
          installation_type VARCHAR(50) NOT NULL DEFAULT 'primary_laptop',
          hardware_fingerprint VARCHAR(255),
          app_version VARCHAR(50),
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS central_subscriptions (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES central_tenants(id) ON DELETE CASCADE,
          plan VARCHAR(50) NOT NULL DEFAULT 'standard',
          status VARCHAR(20) NOT NULL DEFAULT 'active',
          billing_cycle VARCHAR(20) NOT NULL DEFAULT 'monthly',
          starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS central_sync_inbox (
          id UUID PRIMARY KEY,
          tenant_id UUID NOT NULL REFERENCES central_tenants(id) ON DELETE CASCADE,
          installation_id UUID NOT NULL,
          event_type VARCHAR(100) NOT NULL,
          aggregate_type VARCHAR(100) NOT NULL,
          aggregate_id VARCHAR(100) NOT NULL,
          payload JSONB NOT NULL,
          local_timestamp TIMESTAMPTZ NOT NULL,
          local_counter BIGINT NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
          processing_error TEXT
        );
        CREATE TABLE IF NOT EXISTS central_audit_logs (
          id UUID PRIMARY KEY,
          tenant_id UUID REFERENCES central_tenants(id) ON DELETE CASCADE,
          action VARCHAR(100) NOT NULL,
          actor_id VARCHAR(100),
          details JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log('✅ Central Cloud schema verified.');
    }

    // 4. Synchronize all Central Cloud tenants into Store master schema (brands, tenants, units, locations)
    const ctCheck = await client.query("SELECT to_regclass('public.central_tenants') as exists");
    const stCheck = await client.query("SELECT to_regclass('public.tenants') as exists");
    if (ctCheck.rows[0]?.exists && stCheck.rows[0]?.exists) {
      console.log('🔄 Synchronizing Central Cloud tenants into Store master schema...');
      const centralTenants = await client.query(
        "SELECT id, name, slug, legal_name, store_type FROM central_tenants"
      );
      for (const row of centralTenants.rows) {
        const tenantId = row.id;
        const name = row.name || 'Store';
        const slug = row.slug || `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${tenantId.slice(0, 8)}`;
        const legalName = row.legal_name || name;

        // 1. Brand
        await client.query(`
          INSERT INTO brands (id, name, code, default_currency, is_active, created_at)
          VALUES ($1, $2, $3, 'INR', TRUE, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [tenantId, name, `BR-${tenantId.slice(0, 8).toUpperCase()}`]);

        // 2. Tenant
        await client.query(`
          INSERT INTO tenants (id, brand_id, name, slug, status, country_code, currency, locale, created_at)
          VALUES ($1, $1, $2, $3, 'active', 'IN', 'INR', 'en-IN', NOW())
          ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'active'
        `, [tenantId, name, slug]);

        // 3. Business Location
        await client.query(`
          INSERT INTO business_locations (id, tenant_id, name, code, location_type, is_default, is_active, created_at)
          VALUES ($1, $1, $2, 'MAIN', 'store', TRUE, TRUE, NOW())
          ON CONFLICT (id) DO NOTHING
        `, [tenantId, name]);

        // 4. Inventory Location (Main Godown)
        const invCheck = await client.query(
          "SELECT id FROM inventory_locations WHERE tenant_id = $1 LIMIT 1",
          [tenantId]
        );
        if (!invCheck.rows.length) {
          await client.query(`
            INSERT INTO inventory_locations (id, tenant_id, business_location_id, name, code, location_type, is_default, is_active, created_at)
            VALUES (gen_random_uuid(), $1, $1, 'Main Godown / Store', 'WH-MAIN', 'warehouse', TRUE, TRUE, NOW())
          `, [tenantId]);
        }

        // 5. Default Units
        const units = [
          { name: 'Pieces', symbol: 'pcs', dim: 'count', dec: 0 },
          { name: 'Numbers', symbol: 'nos', dim: 'count', dec: 0 },
          { name: 'Kilograms', symbol: 'kg', dim: 'weight', dec: 3 },
          { name: 'Meters', symbol: 'm', dim: 'length', dec: 2 },
          { name: 'Boxes', symbol: 'box', dim: 'packaging', dec: 0 },
          { name: 'Bags', symbol: 'bag', dim: 'packaging', dec: 0 },
          { name: 'Days', symbol: 'day', dim: 'time', dec: 0 },
        ];
        for (const u of units) {
          const uCheck = await client.query(
            "SELECT id FROM units WHERE tenant_id = $1 AND symbol = $2 LIMIT 1",
            [tenantId, u.symbol]
          );
          if (!uCheck.rows.length) {
            await client.query(`
              INSERT INTO units (id, tenant_id, name, symbol, dimension, decimal_places, is_system, is_active)
              VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, TRUE, TRUE)
            `, [tenantId, u.name, u.symbol, u.dim, u.dec]);
          }
        }

        // 6. Payment Methods
        const pms = [
          { name: 'Cash', code: 'CASH' },
          { name: 'UPI / QR Code', code: 'UPI' },
          { name: 'Bank Transfer', code: 'BANK_TRANSFER' },
        ];
        for (const pm of pms) {
          const pmCheck = await client.query(
            "SELECT id FROM payment_methods WHERE tenant_id = $1 AND code = $2 LIMIT 1",
            [tenantId, pm.code]
          );
          if (!pmCheck.rows.length) {
            await client.query(`
              INSERT INTO payment_methods (id, tenant_id, name, code, is_active)
              VALUES (gen_random_uuid(), $1, $2, $3, TRUE)
            `, [tenantId, pm.name, pm.code]);
          }
        }

        // 7. Business Profile
        await client.query(`
          INSERT INTO business_profiles (id, tenant_id, trade_name, legal_name, created_at, updated_at)
          VALUES (gen_random_uuid(), $1, $2, $3, NOW(), NOW())
          ON CONFLICT (tenant_id) DO NOTHING
        `, [tenantId, name, legalName]);

        // 8. Rental Store Configuration
        if (row.store_type === 'rental') {
          const rentCheck = await client.query("SELECT to_regclass('public.rental_settings') as exists");
          if (rentCheck.rows[0]?.exists) {
            await client.query(`
              INSERT INTO rental_settings (tenant_id, enabled, auto_generate_agreement_number, agreement_number_prefix, updated_at)
              VALUES ($1, TRUE, TRUE, 'RNT-', NOW())
              ON CONFLICT (tenant_id) DO UPDATE SET enabled = TRUE
            `, [tenantId]);
            const onRentCheck = await client.query(
              "SELECT id FROM inventory_locations WHERE tenant_id = $1 AND code = 'ON-RENT' LIMIT 1",
              [tenantId]
            );
            if (!onRentCheck.rows.length) {
              await client.query(`
                INSERT INTO inventory_locations (id, tenant_id, name, code, location_type, is_default, is_active, created_at)
                VALUES (gen_random_uuid(), $1, 'On Rent / Customer Sites', 'ON-RENT', 'virtual', FALSE, TRUE, NOW())
              `, [tenantId]);
            }
          }
        }
      }
      console.log(`✅ Synced ${centralTenants.rows.length} Central Cloud tenants into Store master schema.`);
    }

    console.log('🎉 All migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

migrate();
