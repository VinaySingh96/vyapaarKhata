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

    console.log('🎉 All migrations applied successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

migrate();
