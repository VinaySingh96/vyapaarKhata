import pg from 'pg';
import { randomUUID } from 'node:crypto';
import { CentralConfig } from '../config.js';

const { Pool } = pg;

export class CentralDatabase {
  private pool: pg.Pool;

  constructor(private config: CentralConfig) {
    this.pool = new Pool({
      connectionString: config.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    this.pool.on('error', (err) => {
      console.error('[Central DB] Unexpected idle client error:', err);
    });
  }

  public getPool(): pg.Pool {
    return this.pool;
  }

  public async query<T extends pg.QueryResultRow = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  public async initializeSchema(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Tenants Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS central_tenants (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          slug VARCHAR(100) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          legal_name VARCHAR(255),
          gstin VARCHAR(15),
          contact_email VARCHAR(255),
          contact_phone VARCHAR(50),
          address TEXT,
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          plan VARCHAR(50) NOT NULL DEFAULT 'standard',
          max_installations INT NOT NULL DEFAULT 3,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 1b. Store profile & license columns (read/written by TenantService)
      await client.query(`
        ALTER TABLE central_tenants ADD COLUMN IF NOT EXISTS store_type VARCHAR(50) NOT NULL DEFAULT 'building_materials';
        ALTER TABLE central_tenants ADD COLUMN IF NOT EXISTS license_number VARCHAR(100) UNIQUE;
        ALTER TABLE central_tenants ADD COLUMN IF NOT EXISTS secret_key VARCHAR(255);
      `);

      // 2. Installations Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS central_installations (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES central_tenants(id) ON DELETE CASCADE,
          installation_type VARCHAR(50) NOT NULL DEFAULT 'primary_laptop',
          device_name VARCHAR(255) NOT NULL,
          hardware_fingerprint VARCHAR(255),
          app_version VARCHAR(50) DEFAULT '0.1.0',
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          api_key VARCHAR(255),
          last_heartbeat_at TIMESTAMPTZ,
          last_synced_at TIMESTAMPTZ,
          last_sequence_synced INT NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 3. Subscriptions / Entitlements Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS central_subscriptions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES central_tenants(id) ON DELETE CASCADE,
          plan_tier VARCHAR(50) NOT NULL DEFAULT 'standard',
          billing_cycle VARCHAR(50) NOT NULL DEFAULT 'monthly',
          valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          valid_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 year'),
          status VARCHAR(50) NOT NULL DEFAULT 'active',
          features JSONB NOT NULL DEFAULT '["cloud_sync", "multi_counter", "financial_reports", "tax_e_invoicing"]'::jsonb,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // 4. Sync Inbox Table (with strict unique constraint on tenant_id, event_id for idempotency)
      await client.query(`
        CREATE TABLE IF NOT EXISTS central_sync_inbox (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID NOT NULL REFERENCES central_tenants(id) ON DELETE CASCADE,
          installation_id UUID REFERENCES central_installations(id) ON DELETE SET NULL,
          event_id UUID NOT NULL,
          sequence_number INT,
          aggregate_type VARCHAR(100) NOT NULL,
          aggregate_id UUID,
          event_type VARCHAR(150) NOT NULL,
          payload JSONB NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'received',
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          processed_at TIMESTAMPTZ,
          CONSTRAINT uq_central_sync_tenant_event UNIQUE (tenant_id, event_id)
        );
      `);

      // 5. Audit Logs Table
      await client.query(`
        CREATE TABLE IF NOT EXISTS central_audit_logs (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          tenant_id UUID REFERENCES central_tenants(id) ON DELETE CASCADE,
          action VARCHAR(100) NOT NULL,
          actor VARCHAR(100) NOT NULL DEFAULT 'system',
          details JSONB,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Indexes for high performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_sync_inbox_tenant_seq ON central_sync_inbox(tenant_id, sequence_number);
        CREATE INDEX IF NOT EXISTS idx_sync_inbox_tenant_rec ON central_sync_inbox(tenant_id, received_at DESC);
        CREATE INDEX IF NOT EXISTS idx_installations_tenant ON central_installations(tenant_id);
      `);

      await client.query('COMMIT');
      console.log('[Central DB] Schema verified and initialized successfully.');

      if (this.config.ALLOW_AUTO_SEED) {
        await this.seedInitialTenants();
      }
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[Central DB] Failed to initialize schema:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  private async seedInitialTenants(): Promise<void> {
    const primaryTenantId = '00000000-0000-0000-0000-000000000001';
    const primaryInstallationId = '00000000-0000-0000-0000-000000000001';

    // Check if primary tenant exists
    const check = await this.pool.query('SELECT id FROM central_tenants WHERE id = $1', [primaryTenantId]);
    if (check.rows.length === 0) {
      console.log('[Central DB] Seeding primary tenant and installation...');
      
      // 1. Primary Tenant: Shree Ganesh Building Materials & Hardware
      await this.pool.query(
        `INSERT INTO central_tenants (
          id, slug, name, legal_name, gstin, contact_email, contact_phone, address, status, plan, max_installations
        ) VALUES (
          $1, 'shree-ganesh-hardware', 'Shree Ganesh Building Materials & Hardware',
          'Shree Ganesh Trading Enterprises Pvt Ltd', '27AABCS1429B1Z2',
          'support@ganeshhardware.local', '+91 98220 12345',
          'Shop No 12-14, Market Yard, Khadki, Pune, Maharashtra 411003',
          'active', 'enterprise', 5
        )`,
        [primaryTenantId]
      );

      // 2. Primary Installation
      await this.pool.query(
        `INSERT INTO central_installations (
          id, tenant_id, installation_type, device_name, hardware_fingerprint, app_version, status, api_key
        ) VALUES (
          $1, $2, 'primary_laptop', 'Main Counter POS (Laptop-01)',
          'HW-WIN11-MAC-PUNE-001', '0.1.0', 'active', 'inst_key_sg_0001'
        )`,
        [primaryInstallationId, primaryTenantId]
      );

      // 3. Subscription
      await this.pool.query(
        `INSERT INTO central_subscriptions (
          tenant_id, plan_tier, billing_cycle, valid_from, valid_until, status, features
        ) VALUES (
          $1, 'enterprise', 'yearly', NOW(), NOW() + INTERVAL '1 year', 'active',
          '["cloud_sync", "multi_counter", "advanced_gst", "stock_alerts", "daily_backup"]'::jsonb
        )`,
        [primaryTenantId]
      );

      // 4. Sample Secondary Tenant for Multi-Tenant Management Demonstration
      const demoTenantId = '00000000-0000-0000-0000-000000000002';
      await this.pool.query(
        `INSERT INTO central_tenants (
          id, slug, name, legal_name, gstin, contact_email, contact_phone, address, status, plan, max_installations
        ) VALUES (
          $1, 'maharashtra-agro-inputs', 'Maharashtra Agro Inputs & Seeds',
          'Maharashtra Agro Chemical Enterprises LLP', '27BBACS9921D1Z5',
          'contact@maharashtraagro.in', '+91 94220 54321',
          'Plot 45, MIDC Baramati, Dist. Pune 413133',
          'active', 'standard', 3
        ) ON CONFLICT (id) DO NOTHING`,
        [demoTenantId]
      );

      await this.pool.query(
        `INSERT INTO central_installations (
          tenant_id, installation_type, device_name, app_version, status, api_key
        ) VALUES (
          $1, 'primary_laptop', 'Baramati Godown Billing Terminal', '0.1.0', 'active', 'inst_key_agro_0002'
        ) ON CONFLICT DO NOTHING`,
        [demoTenantId]
      );

      await this.pool.query(
        `INSERT INTO central_subscriptions (
          tenant_id, plan_tier, billing_cycle, valid_from, valid_until, status, features
        ) VALUES (
          $1, 'standard', 'monthly', NOW(), NOW() + INTERVAL '6 months', 'active',
          '["cloud_sync", "inventory_tracking", "gst_filing"]'::jsonb
        ) ON CONFLICT DO NOTHING`,
        [demoTenantId]
      );

      console.log('[Central DB] Seeding completed.');
    }
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
