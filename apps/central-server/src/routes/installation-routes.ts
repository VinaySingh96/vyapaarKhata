import { FastifyPluginAsync } from 'fastify';
import { CentralDatabase } from '../db/central-db.js';
import { randomUUID } from 'node:crypto';

export interface InstallationRoutesOptions {
  db: CentralDatabase;
}

export const installationRoutes: FastifyPluginAsync<InstallationRoutesOptions> = async (app, opts) => {
  const { db } = opts;

  // POST /api/v1/installations/register
  app.post<{
    Body: {
      tenantId: string;
      deviceName: string;
      installationType?: 'primary_laptop' | 'secondary_laptop' | 'android';
      hardwareFingerprint?: string;
      appVersion?: string;
    };
  }>('/register', async (req, reply) => {
    const { tenantId, deviceName, installationType = 'primary_laptop', hardwareFingerprint, appVersion } = req.body || {};

    if (!tenantId || !deviceName) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId and deviceName are required' },
        requestId: req.id,
      });
    }

    // Check tenant existence and status
    const tRes = await db.query('SELECT id, status, plan, max_installations FROM central_tenants WHERE id = $1', [tenantId]);
    if (tRes.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'TENANT_NOT_FOUND', message: 'Tenant does not exist on central server' },
        requestId: req.id,
      });
    }

    const tenant = tRes.rows[0];
    if (tenant.status !== 'active' && tenant.status !== 'trial') {
      return reply.status(403).send({
        success: false,
        error: { code: 'TENANT_INACTIVE', message: `Tenant account is ${tenant.status}` },
        requestId: req.id,
      });
    }

    // Check installation quota
    const countRes = await db.query(
      `SELECT COUNT(*) as count FROM central_installations WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId]
    );
    const activeCount = parseInt(countRes.rows[0]?.count || '0', 10);
    if (activeCount >= tenant.max_installations) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: `Tenant has reached the maximum permitted installations (${tenant.max_installations}). Upgrade plan to add more devices.`,
        },
        requestId: req.id,
      });
    }

    const installationId = randomUUID();
    const apiKey = `inst_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;

    const res = await db.query(
      `INSERT INTO central_installations (
         id, tenant_id, device_name, installation_type, hardware_fingerprint, app_version, status, api_key, last_heartbeat_at
       ) VALUES ($1, $2, $3, $4, $5, $6, 'active', $7, NOW())
       RETURNING *`,
      [installationId, tenantId, deviceName, installationType, hardwareFingerprint || null, appVersion || '0.1.0', apiKey]
    );

    const r = res.rows[0];
    return reply.status(201).send({
      success: true,
      data: {
        installationId: r.id,
        tenantId: r.tenant_id,
        deviceName: r.device_name,
        installationType: r.installation_type,
        status: r.status,
        apiKey: r.api_key,
        registeredAt: new Date(r.created_at).toISOString(),
      },
      message: 'Device successfully registered with Central Cloud',
      requestId: req.id,
    });
  });

  // POST /api/v1/installations/heartbeat
  app.post<{
    Body: {
      installationId: string;
      tenantId: string;
      appVersion?: string;
      currentSequence?: number;
    };
  }>('/heartbeat', async (req, reply) => {
    const { installationId, tenantId, appVersion, currentSequence } = req.body || {};
    if (!installationId || !tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'installationId and tenantId are required' },
        requestId: req.id,
      });
    }

    const res = await db.query(
      `UPDATE central_installations
       SET last_heartbeat_at = NOW(),
           app_version = COALESCE($1, app_version),
           last_sequence_synced = GREATEST(last_sequence_synced, COALESCE($2, 0)),
           updated_at = NOW()
       WHERE id = $3 AND tenant_id = $4
       RETURNING id, status`,
      [appVersion || null, currentSequence || null, installationId, tenantId]
    );

    if (res.rows.length === 0) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Installation not found' },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      status: res.rows[0].status,
      serverTime: new Date().toISOString(),
      requestId: req.id,
    });
  });
};
