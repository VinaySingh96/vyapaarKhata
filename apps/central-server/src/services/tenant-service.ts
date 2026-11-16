import { randomUUID } from 'node:crypto';
import { CentralDatabase } from '../db/central-db.js';
import {
  generateLicensePair,
  validateLicenseNumber,
  validateLicenseKey,
  validateLicensePair,
} from '@vyapaarkhata/domain';
import {
  CentralTenant,
  CentralInstallation,
  CentralSubscription,
  PlatformMetrics,
  TenantStatus,
  PlanTier,
  StoreType,
  TenantDashboardMetrics,
} from '../types/index.js';

export class TenantService {
  constructor(private db: CentralDatabase) {}

  public async listTenants(filter?: { status?: TenantStatus; search?: string }): Promise<
    (CentralTenant & {
      installationCount: number;
      activeInstallationCount: number;
      syncEventsCount: number;
      lastSyncedAt?: string;
    })[]
  > {
    let sql = `
      SELECT t.*,
             COUNT(DISTINCT i.id) as installation_count,
             COUNT(DISTINCT CASE WHEN i.status = 'active' THEN i.id END) as active_installation_count,
             COUNT(DISTINCT s.id) as sync_events_count,
             MAX(s.received_at) as last_synced_at
      FROM central_tenants t
      LEFT JOIN central_installations i ON i.tenant_id = t.id
      LEFT JOIN central_sync_inbox s ON s.tenant_id = t.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filter?.status) {
      params.push(filter.status);
      sql += ` AND t.status = $${params.length}`;
    }

    if (filter?.search) {
      params.push(`%${filter.search}%`);
      sql += ` AND (t.name ILIKE $${params.length} OR t.slug ILIKE $${params.length} OR t.gstin ILIKE $${params.length} OR t.contact_phone ILIKE $${params.length} OR t.license_number ILIKE $${params.length})`;
    }

    sql += ` GROUP BY t.id ORDER BY t.created_at DESC`;

    const res = await this.db.query(sql, params);
    return res.rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      name: r.name,
      legalName: r.legal_name || undefined,
      storeType: (r.store_type || 'building_materials') as StoreType,
      licenseNumber: r.license_number || undefined,
      secretKey: r.secret_key || undefined,
      gstin: r.gstin || undefined,
      contactEmail: r.contact_email || undefined,
      contactPhone: r.contact_phone || undefined,
      address: r.address || undefined,
      status: r.status,
      plan: r.plan,
      maxInstallations: r.max_installations,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
      installationCount: parseInt(r.installation_count || '0', 10),
      activeInstallationCount: parseInt(r.active_installation_count || '0', 10),
      syncEventsCount: parseInt(r.sync_events_count || '0', 10),
      lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
    }));
  }

  public async getTenantById(id: string): Promise<
    | (CentralTenant & {
        installations: CentralInstallation[];
        subscription?: CentralSubscription;
        syncStats: { totalEvents: number; lastSyncedAt?: string };
      })
    | null
  > {
    const tRes = await this.db.query('SELECT * FROM central_tenants WHERE id = $1', [id]);
    if (tRes.rows.length === 0) return null;
    const t = tRes.rows[0];

    const iRes = await this.db.query('SELECT * FROM central_installations WHERE tenant_id = $1 ORDER BY created_at ASC', [id]);
    const installations: CentralInstallation[] = iRes.rows.map((r) => ({
      id: r.id,
      tenantId: r.tenant_id,
      installationType: r.installation_type,
      deviceName: r.device_name,
      hardwareFingerprint: r.hardware_fingerprint || undefined,
      appVersion: r.app_version || undefined,
      status: r.status,
      apiKey: r.api_key || undefined,
      lastHeartbeatAt: r.last_heartbeat_at ? new Date(r.last_heartbeat_at).toISOString() : undefined,
      lastSyncedAt: r.last_synced_at ? new Date(r.last_synced_at).toISOString() : undefined,
      lastSequenceSynced: r.last_sequence_synced || 0,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));

    const sRes = await this.db.query('SELECT * FROM central_subscriptions WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1', [id]);
    let subscription: CentralSubscription | undefined = undefined;
    if (sRes.rows.length > 0) {
      const sr = sRes.rows[0];
      subscription = {
        id: sr.id,
        tenantId: sr.tenant_id,
        planTier: sr.plan_tier,
        billingCycle: sr.billing_cycle,
        validFrom: new Date(sr.valid_from).toISOString(),
        validUntil: new Date(sr.valid_until).toISOString(),
        status: sr.status,
        features: Array.isArray(sr.features) ? sr.features : [],
        createdAt: new Date(sr.created_at).toISOString(),
        updatedAt: new Date(sr.updated_at).toISOString(),
      };
    }

    const syncRes = await this.db.query(
      'SELECT COUNT(*) as total_events, MAX(received_at) as last_synced_at FROM central_sync_inbox WHERE tenant_id = $1',
      [id]
    );

    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      legalName: t.legal_name || undefined,
      storeType: (t.store_type || 'building_materials') as StoreType,
      licenseNumber: t.license_number || undefined,
      secretKey: t.secret_key || undefined,
      gstin: t.gstin || undefined,
      contactEmail: t.contact_email || undefined,
      contactPhone: t.contact_phone || undefined,
      address: t.address || undefined,
      status: t.status,
      plan: t.plan,
      maxInstallations: t.max_installations,
      createdAt: new Date(t.created_at).toISOString(),
      updatedAt: new Date(t.updated_at).toISOString(),
      installations,
      subscription,
      syncStats: {
        totalEvents: parseInt(syncRes.rows[0]?.total_events || '0', 10),
        lastSyncedAt: syncRes.rows[0]?.last_synced_at ? new Date(syncRes.rows[0].last_synced_at).toISOString() : undefined,
      },
    };
  }

  public async getTenantDashboardMetrics(tenantId: string): Promise<TenantDashboardMetrics | null> {
    const tRes = await this.db.query('SELECT id, name, store_type, license_number FROM central_tenants WHERE id = $1', [tenantId]);
    if (tRes.rows.length === 0) return null;
    const t = tRes.rows[0];

    const eventsRes = await this.db.query(
      `SELECT event_type, payload, received_at, sequence_number
       FROM central_sync_inbox
       WHERE tenant_id = $1
       ORDER BY sequence_number ASC, received_at ASC`,
      [tenantId]
    );

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const thisMonthStr = now.toISOString().slice(0, 7);

    let todaySales = 0;
    let todayEarnings = 0;
    let todayInvoicesCount = 0;
    let thisMonthSales = 0;
    let thisMonthEarnings = 0;
    let thisMonthInvoicesCount = 0;
    let totalSales = 0;
    let totalEarnings = 0;
    let totalInvoicesCount = 0;
    let totalPaymentsCount = 0;
    const eventsByType: Record<string, number> = {};
    let lastSyncedAt: string | undefined = undefined;

    const dailyMap: Record<string, { date: string; sales: number; earnings: number; invoicesCount: number; paymentsCount: number }> = {};
    const monthlyMap: Record<string, { month: string; sales: number; earnings: number; invoicesCount: number; paymentsCount: number }> = {};

    function getOrCreateDaily(date: string) {
      if (!dailyMap[date]) {
        dailyMap[date] = { date, sales: 0, earnings: 0, invoicesCount: 0, paymentsCount: 0 };
      }
      return dailyMap[date];
    }

    function getOrCreateMonthly(month: string) {
      if (!monthlyMap[month]) {
        monthlyMap[month] = { month, sales: 0, earnings: 0, invoicesCount: 0, paymentsCount: 0 };
      }
      return monthlyMap[month];
    }

    // 1. Scan and index invoice state (deduplicating and handling cancellations)
    const invoiceMap = new Map<string, {
      invoiceId: string;
      invoiceNumber: string;
      status: 'posted' | 'cancelled';
      grandTotal: number;
      date: string;
      month: string;
    }>();

    const cancelledInvoices = new Set<string>();

    // 2. Scan and index payment state (deduplicating)
    const paymentMap = new Map<string, {
      paymentId: string;
      paymentNumber: string;
      direction: string;
      amount: number;
      date: string;
      month: string;
    }>();

    for (const r of eventsRes.rows) {
      const recTime = new Date(r.received_at).toISOString();
      if (!lastSyncedAt || recTime > lastSyncedAt) {
        lastSyncedAt = recTime;
      }
      const type = r.event_type;
      eventsByType[type] = (eventsByType[type] || 0) + 1;

      const payload = typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload || {};
      const rawDate = payload.postedAt || payload.invoiceDate || payload.paymentDate || payload.createdAt || r.received_at;
      let evDate = todayStr;
      try {
        const parsed = new Date(rawDate);
        if (!isNaN(parsed.getTime())) {
          evDate = parsed.toISOString().slice(0, 10);
        }
      } catch {
        evDate = todayStr;
      }
      const evMonth = evDate.slice(0, 7);

      if (type === 'sales.invoice.posted') {
        const invId = payload.invoiceId || payload.id || payload.invoiceNumber || r.id;
        const grandTotal = Number(payload.grandTotal || payload.totalAmount || 0);
        invoiceMap.set(invId, {
          invoiceId: invId,
          invoiceNumber: payload.invoiceNumber || '',
          status: 'posted',
          grandTotal,
          date: evDate,
          month: evMonth,
        });
      } else if (type === 'sales.invoice.cancelled') {
        const invId = payload.invoiceId || payload.id;
        if (invId) cancelledInvoices.add(invId);
        if (payload.invoiceNumber) cancelledInvoices.add(payload.invoiceNumber);

        let found = invId ? invoiceMap.get(invId) : undefined;
        if (!found && payload.invoiceNumber) {
          for (const item of invoiceMap.values()) {
            if (item.invoiceNumber === payload.invoiceNumber) {
              found = item;
              break;
            }
          }
        }
        if (found) {
          found.status = 'cancelled';
        }
      } else if (type === 'payment.posted') {
        const payId = payload.paymentId || payload.id || payload.paymentNumber || r.id;
        const amount = Number(payload.amount || 0);
        const direction = (payload.direction || 'inbound').toLowerCase();
        paymentMap.set(payId, {
          paymentId: payId,
          paymentNumber: payload.paymentNumber || '',
          direction,
          amount,
          date: evDate,
          month: evMonth,
        });
      }
    }

    // Aggregate only active, non-cancelled invoices
    for (const [invId, inv] of invoiceMap.entries()) {
      if (inv.status === 'cancelled' || cancelledInvoices.has(invId) || cancelledInvoices.has(inv.invoiceNumber)) {
        continue; // Definitely cancelled!
      }

      totalInvoicesCount++;
      totalSales += inv.grandTotal;

      if (inv.date === todayStr) {
        todaySales += inv.grandTotal;
        todayInvoicesCount++;
      }
      if (inv.month === thisMonthStr) {
        thisMonthSales += inv.grandTotal;
        thisMonthInvoicesCount++;
      }

      const dRec = getOrCreateDaily(inv.date);
      dRec.sales += inv.grandTotal;
      dRec.invoicesCount++;

      const mRec = getOrCreateMonthly(inv.month);
      mRec.sales += inv.grandTotal;
      mRec.invoicesCount++;
    }

    // Aggregate inbound customer collections (earnings)
    for (const pay of paymentMap.values()) {
      if (pay.direction !== 'inbound') continue; // only incoming customer receipts count as collections

      totalPaymentsCount++;
      totalEarnings += pay.amount;

      if (pay.date === todayStr) {
        todayEarnings += pay.amount;
      }
      if (pay.month === thisMonthStr) {
        thisMonthEarnings += pay.amount;
      }

      const dRec = getOrCreateDaily(pay.date);
      dRec.earnings += pay.amount;
      dRec.paymentsCount++;

      const mRec = getOrCreateMonthly(pay.month);
      mRec.earnings += pay.amount;
      mRec.paymentsCount++;
    }

    const dailyBreakdown = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    const monthlyBreakdown = Object.values(monthlyMap).sort((a, b) => b.month.localeCompare(a.month));

    return {
      tenantId: t.id,
      tenantName: t.name,
      storeType: (t.store_type || 'building_materials') as StoreType,
      licenseNumber: t.license_number || undefined,
      totalSyncEvents: eventsRes.rows.length,
      lastSyncedAt,
      todaySales,
      todayEarnings,
      todayInvoicesCount,
      thisMonthSales,
      thisMonthEarnings,
      thisMonthInvoicesCount,
      totalSales,
      totalEarnings,
      totalInvoicesCount,
      totalPaymentsCount,
      eventsByType,
      dailyBreakdown,
      monthlyBreakdown,
    };
  }

  public async getTenantByLicense(licenseNumber: string): Promise<CentralTenant | null> {
    const res = await this.db.query('SELECT * FROM central_tenants WHERE license_number = $1', [licenseNumber]);
    if (res.rows.length === 0) return null;
    const t = res.rows[0];
    return {
      id: t.id,
      slug: t.slug,
      name: t.name,
      legalName: t.legal_name || undefined,
      storeType: (t.store_type || 'building_materials') as StoreType,
      licenseNumber: t.license_number || undefined,
      secretKey: t.secret_key || undefined,
      gstin: t.gstin || undefined,
      contactEmail: t.contact_email || undefined,
      contactPhone: t.contact_phone || undefined,
      address: t.address || undefined,
      status: t.status,
      plan: t.plan,
      maxInstallations: t.max_installations,
      createdAt: new Date(t.created_at).toISOString(),
      updatedAt: new Date(t.updated_at).toISOString(),
    };
  }

  public async createTenant(data: {
    name: string;
    legalName?: string;
    slug?: string;
    storeType?: StoreType;
    licenseNumber?: string;
    secretKey?: string;
    gstin?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: string;
    plan?: PlanTier;
    maxInstallations?: number;
  }): Promise<CentralTenant> {
    const id = randomUUID();
    const storeType: StoreType = data.storeType || 'building_materials';
    const slug =
      data.slug ||
      data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      `tenant-${Date.now()}`;
    const plan = data.plan || 'standard';
    const maxInstallations = data.maxInstallations || (plan === 'enterprise' ? 10 : plan === 'standard' ? 3 : 1);

    const client = await this.db.getPool().connect();
    try {
      await client.query('BEGIN');

      let licenseNumber = data.licenseNumber;
      let secretKey = data.secretKey;

      if (!licenseNumber || !secretKey) {
        const currentYear = new Date().getFullYear();
        // Atomically obtain the next sequence number for this calendar year
        const seqRes = await client.query(
          `INSERT INTO central_license_sequences (year, last_seq, updated_at)
           VALUES ($1, 1, NOW())
           ON CONFLICT (year) DO UPDATE
           SET last_seq = central_license_sequences.last_seq + 1, updated_at = NOW()
           RETURNING last_seq`,
          [currentYear]
        );
        const sequence = seqRes.rows[0].last_seq;
        const generatedPair = generateLicensePair({
          sequence,
          year: currentYear,
          storeType,
          planTier: plan,
        });

        if (!licenseNumber) {
          licenseNumber = generatedPair.licenseNumber;
        }
        if (!secretKey) {
          secretKey = generatedPair.licenseKey;
        }
      }

      const res = await client.query(
        `INSERT INTO central_tenants (
           id, slug, name, legal_name, store_type, license_number, secret_key, gstin, contact_email, contact_phone, address, status, plan, max_installations
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, $13)
         RETURNING *`,
        [
          id,
          slug,
          data.name,
          data.legalName || null,
          storeType,
          licenseNumber,
          secretKey,
          data.gstin || null,
          data.contactEmail || null,
          data.contactPhone || null,
          data.address || null,
          plan,
          maxInstallations,
        ]
      );

      // Create default subscription
      await client.query(
        `INSERT INTO central_subscriptions (
           tenant_id, plan_tier, billing_cycle, valid_from, valid_until, status, features
         ) VALUES ($1, $2, 'yearly', NOW(), NOW() + INTERVAL '1 year', 'active', $3)`,
        [
          id,
          plan,
          JSON.stringify([
            'cloud_sync',
            'multi_device',
            'stock_movements',
            'accounting_ledger',
            plan === 'enterprise' ? 'priority_support' : 'standard_support',
          ]),
        ]
      );

      // Audit log
      await client.query(
        `INSERT INTO central_audit_logs (tenant_id, action, actor, details) VALUES ($1, 'tenant.created', 'admin', $2)`,
        [id, JSON.stringify({ name: data.name, plan, slug })]
      );

      await client.query('COMMIT');
      const r = res.rows[0];
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        legalName: r.legal_name || undefined,
        storeType: (r.store_type || 'building_materials') as StoreType,
        licenseNumber: r.license_number || undefined,
        secretKey: r.secret_key || undefined,
        gstin: r.gstin || undefined,
        contactEmail: r.contact_email || undefined,
        contactPhone: r.contact_phone || undefined,
        address: r.address || undefined,
        status: r.status,
        plan: r.plan,
        maxInstallations: r.max_installations,
        createdAt: new Date(r.created_at).toISOString(),
        updatedAt: new Date(r.updated_at).toISOString(),
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  public async updateTenant(
    id: string,
    data: Partial<{
      name: string;
      legalName: string;
      gstin: string;
      contactEmail: string;
      contactPhone: string;
      address: string;
      plan: PlanTier;
      maxInstallations: number;
      status: TenantStatus;
    }>
  ): Promise<CentralTenant | null> {
    const fields: string[] = [];
    const params: any[] = [id];

    if (data.name !== undefined) {
      params.push(data.name);
      fields.push(`name = $${params.length}`);
    }
    if (data.legalName !== undefined) {
      params.push(data.legalName);
      fields.push(`legal_name = $${params.length}`);
    }
    if (data.gstin !== undefined) {
      params.push(data.gstin);
      fields.push(`gstin = $${params.length}`);
    }
    if (data.contactEmail !== undefined) {
      params.push(data.contactEmail);
      fields.push(`contact_email = $${params.length}`);
    }
    if (data.contactPhone !== undefined) {
      params.push(data.contactPhone);
      fields.push(`contact_phone = $${params.length}`);
    }
    if (data.address !== undefined) {
      params.push(data.address);
      fields.push(`address = $${params.length}`);
    }
    if (data.plan !== undefined) {
      params.push(data.plan);
      fields.push(`plan = $${params.length}`);
    }
    if (data.maxInstallations !== undefined) {
      params.push(data.maxInstallations);
      fields.push(`max_installations = $${params.length}`);
    }
    if (data.status !== undefined) {
      params.push(data.status);
      fields.push(`status = $${params.length}`);
    }

    if (fields.length === 0) return (await this.getTenantById(id)) as CentralTenant;

    fields.push('updated_at = NOW()');
    const sql = `UPDATE central_tenants SET ${fields.join(', ')} WHERE id = $1 RETURNING *`;
    const res = await this.db.query(sql, params);
    if (res.rows.length === 0) return null;

    const r = res.rows[0];
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      legalName: r.legal_name || undefined,
      storeType: (r.store_type || 'building_materials') as StoreType,
      licenseNumber: r.license_number || undefined,
      secretKey: r.secret_key || undefined,
      gstin: r.gstin || undefined,
      contactEmail: r.contact_email || undefined,
      contactPhone: r.contact_phone || undefined,
      address: r.address || undefined,
      status: r.status,
      plan: r.plan,
      maxInstallations: r.max_installations,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  public async updateTenantStatus(id: string, status: TenantStatus): Promise<boolean> {
    const res = await this.db.query(
      'UPDATE central_tenants SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING id',
      [status, id]
    );
    if (res.rows.length === 0) return false;

    await this.db.query(
      `INSERT INTO central_audit_logs (tenant_id, action, actor, details) VALUES ($1, 'tenant.status_change', 'admin', $2)`,
      [id, JSON.stringify({ newStatus: status })]
    );
    return true;
  }

  public async registerInstallation(
    tenantId: string,
    data: {
      deviceName: string;
      installationType?: 'primary_laptop' | 'secondary_laptop' | 'android';
      hardwareFingerprint?: string;
      appVersion?: string;
    }
  ): Promise<CentralInstallation> {
    const id = randomUUID();
    const apiKey = `inst_key_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
    const res = await this.db.query(
      `INSERT INTO central_installations (
         id, tenant_id, device_name, installation_type, hardware_fingerprint, app_version, status, api_key
       ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7)
       RETURNING *`,
      [
        id,
        tenantId,
        data.deviceName,
        data.installationType || 'primary_laptop',
        data.hardwareFingerprint || null,
        data.appVersion || '0.1.0',
        apiKey,
      ]
    );
    const r = res.rows[0];
    return {
      id: r.id,
      tenantId: r.tenant_id,
      installationType: r.installation_type,
      deviceName: r.device_name,
      hardwareFingerprint: r.hardware_fingerprint || undefined,
      appVersion: r.app_version || undefined,
      status: r.status,
      apiKey: r.api_key || undefined,
      lastHeartbeatAt: undefined,
      lastSyncedAt: undefined,
      lastSequenceSynced: 0,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    };
  }

  public async revokeInstallation(tenantId: string, installationId: string): Promise<boolean> {
    const res = await this.db.query(
      `UPDATE central_installations SET status = 'revoked', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING id`,
      [installationId, tenantId]
    );
    return res.rows.length > 0;
  }

  public async getPlatformMetrics(): Promise<PlatformMetrics> {
    const tRes = await this.db.query(`
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants
      FROM central_tenants
    `);

    const iRes = await this.db.query(`
      SELECT 
        COUNT(*) as total_installations,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_installations
      FROM central_installations
    `);

    const sRes = await this.db.query(`
      SELECT 
        COUNT(*) as total_sync_events,
        COUNT(CASE WHEN received_at >= CURRENT_DATE THEN 1 END) as sync_events_today,
        MAX(received_at) as last_sync_timestamp
      FROM central_sync_inbox
    `);

    return {
      totalTenants: parseInt(tRes.rows[0]?.total_tenants || '0', 10),
      activeTenants: parseInt(tRes.rows[0]?.active_tenants || '0', 10),
      totalInstallations: parseInt(iRes.rows[0]?.total_installations || '0', 10),
      activeInstallations: parseInt(iRes.rows[0]?.active_installations || '0', 10),
      totalSyncEvents: parseInt(sRes.rows[0]?.total_sync_events || '0', 10),
      syncEventsToday: parseInt(sRes.rows[0]?.sync_events_today || '0', 10),
      lastSyncTimestamp: sRes.rows[0]?.last_sync_timestamp
        ? new Date(sRes.rows[0].last_sync_timestamp).toISOString()
        : undefined,
    };
  }
}
