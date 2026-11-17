import { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'node:crypto';
import { UnitOfWork, validateLicensePair } from '@vyapaarkhata/domain';
import { ensureLocalTenantProvisioned } from '../services/tenant-provisioner.js';

export interface LocalAuthRoutesOptions {
  centralServerUrl?: string;
  uow?: UnitOfWork;
}

export const localAuthRoutes: FastifyPluginAsync<LocalAuthRoutesOptions> = async (app, opts) => {
  const centralUrl = (opts.centralServerUrl || process.env.CENTRAL_SERVER_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

  // POST /api/v1/auth/license-login
  app.post<{
    Body: {
      licenseNumber: string;
      secretKey: string;
      deviceName?: string;
    };
  }>('/license-login', async (req, reply) => {
    try {
      const centralRes = await fetch(`${centralUrl}/api/v1/auth/license-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });

      const raw = await centralRes.text();
      let data: any;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {
          success: false,
          error: {
            code: 'CENTRAL_INVALID_RESPONSE',
            message: `Central Cloud returned non-JSON response (HTTP ${centralRes.status}): ${raw.slice(0, 200)}`,
          },
        };
      }

      // Auto-provision tenant master data locally if authentication was successful
      if (data.success && data.data?.tenant && opts.uow) {
        try {
          await ensureLocalTenantProvisioned(opts.uow, data.data.tenant);
        } catch (provErr: any) {
          app.log.warn({ provErr }, `[Tenant Provisioning] Warning while auto-provisioning tenant ${data.data.tenant.id}: ${provErr.message}`);
        }
      }

      return reply.status(centralRes.status).send(data);
    } catch (err: any) {
      app.log.warn({ err }, `[License Login] Central Cloud unreachable (${centralUrl}), verifying locally against database...`);

      const { licenseNumber, secretKey } = req.body || {};
      if (!licenseNumber || !secretKey) {
        return reply.status(400).send({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Both licenseNumber and secretKey are required' },
          requestId: req.id,
        });
      }

      // Format, Sequence, Year Check, and Checksum validation
      const validation = validateLicensePair(licenseNumber.trim(), secretKey.trim(), { allowLegacy: true });
      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: {
            code: validation.error || 'INVALID_LICENSE_FORMAT',
            message: validation.message || 'Invalid license format or expired year check',
          },
          requestId: req.id,
        });
      }

      if (opts.uow) {
        try {
          const tenantData = await opts.uow.runInTransaction(async (ctx: any) => {
            if (ctx.rawQuery) {
              // 1. Try central_tenants if present in this DB
              try {
                const centralRows = await ctx.rawQuery(
                  `SELECT id, name, legal_name, store_type, license_number, secret_key, status, plan FROM central_tenants WHERE license_number = $1`,
                  [licenseNumber.trim()]
                );
                if (centralRows && centralRows.length > 0) return centralRows[0];
              } catch {}

              // 2. Try local tenants table
              const localRows = await ctx.rawQuery(
                `SELECT id, name, status, 'building_materials' as store_type, 'standard' as plan FROM tenants LIMIT 1`
              );
              if (localRows && localRows.length > 0) return localRows[0];
            }
            return null;
          });

          if (!tenantData) {
            return reply.status(401).send({
              success: false,
              error: { code: 'INVALID_LICENSE', message: `No active tenant found for license ${licenseNumber}` },
              requestId: req.id,
            });
          }

          if (tenantData.status && tenantData.status !== 'active') {
            return reply.status(403).send({
              success: false,
              error: { code: 'TENANT_NOT_ACTIVE', message: `Tenant subscription is currently ${tenantData.status}` },
              requestId: req.id,
            });
          }

          const jwtSecret = process.env.JWT_SECRET || 'vyapaarkhata-central-cloud-jwt-secure-key-2026';
          const ACCESS_TOKEN_VALIDITY_SECONDS = 7 * 24 * 60 * 60; // 7 days
          const header = { alg: 'HS256', typ: 'JWT' };
          const now = Math.floor(Date.now() / 1000);
          const payload = {
            tenantId: tenantData.id,
            tenantName: tenantData.name,
            storeType: tenantData.store_type || 'building_materials',
            licenseNumber: licenseNumber.trim(),
            plan: tenantData.plan || 'standard',
            type: 'access',
            iat: now,
            exp: now + ACCESS_TOKEN_VALIDITY_SECONDS,
          };
          const h = Buffer.from(JSON.stringify(header)).toString('base64url');
          const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
          const sig = createHmac('sha256', jwtSecret).update(`${h}.${p}`).digest('base64url');
          const accessToken = `${h}.${p}.${sig}`;

          return reply.status(200).send({
            success: true,
            data: {
              accessToken,
              tokenType: 'Bearer',
              expiresIn: ACCESS_TOKEN_VALIDITY_SECONDS,
              tenant: {
                id: tenantData.id,
                name: tenantData.name,
                legalName: tenantData.legal_name || tenantData.name,
                storeType: tenantData.store_type || 'building_materials',
                licenseNumber: licenseNumber.trim(),
                status: tenantData.status || 'active',
              },
            },
            message: `Authenticated as ${tenantData.name} in standalone cloud mode. Access token valid for 7 days.`,
            requestId: req.id,
          });
        } catch (dbErr: any) {
          app.log.error({ dbErr }, '[License Login] Local DB authentication failed');
        }
      }

      return reply.status(503).send({
        success: false,
        error: {
          code: 'CENTRAL_UNAVAILABLE',
          message: `Unable to verify license against Central Cloud at ${centralUrl}: ${err.message}`,
        },
        requestId: req.id,
      });
    }
  });

  // POST /api/v1/auth/refresh
  app.post<{
    Body: {
      refreshToken: string;
    };
  }>('/refresh', async (req, reply) => {
    try {
      const centralRes = await fetch(`${centralUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });

      const raw = await centralRes.text();
      let data: any;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = {
          success: false,
          error: {
            code: 'CENTRAL_INVALID_RESPONSE',
            message: `Central Cloud returned non-JSON response (HTTP ${centralRes.status}): ${raw.slice(0, 200)}`,
          },
        };
      }

      // Auto-provision tenant master data locally if authentication was successful
      if (data.success && data.data?.tenant && opts.uow) {
        try {
          await ensureLocalTenantProvisioned(opts.uow, data.data.tenant);
        } catch (provErr: any) {
          app.log.warn({ provErr }, `[Tenant Provisioning] Warning while auto-provisioning tenant ${data.data.tenant.id}: ${provErr.message}`);
        }
      }

      return reply.status(centralRes.status).send(data);
    } catch (err: any) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'CENTRAL_UNAVAILABLE',
          message: `Unable to refresh token against Central Cloud: ${err.message}`,
        },
      });
    }
  });

  // GET /api/v1/auth/license-status
  app.get<{
    Querystring: { tenantId?: string; licenseNumber?: string };
  }>('/license-status', async (req, reply) => {
    const tenantId =
      req.query.tenantId ||
      (req.headers['x-tenant-id'] as string) ||
      '00000000-0000-0000-0000-000000000001';
    const licenseNumber =
      req.query.licenseNumber || (req.headers['x-license-number'] as string);

    // 1. Try live check against Central Cloud
    try {
      const q = new URLSearchParams();
      if (tenantId) q.set('tenantId', tenantId);
      if (licenseNumber) q.set('licenseNumber', licenseNumber);

      const centralRes = await fetch(`${centralUrl}/api/v1/auth/license-status?${q.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
          'x-tenant-id': tenantId,
        },
      });

      if (centralRes.ok) {
        const json = (await centralRes.json()) as any;
        if (json.success && json.data) {
          // Sync status to local DB so queries / preHandlers reflect updated status
          if (opts.uow) {
            try {
              await opts.uow.runInTransaction(async (ctx: any) => {
                if (ctx.rawQuery) {
                  await ctx.rawQuery(`UPDATE tenants SET status = $1 WHERE id = $2`, [
                    json.data.status,
                    tenantId,
                  ]);
                }
              });
            } catch (syncErr: any) {
              app.log.warn({ syncErr }, `[License Status] Local status sync failed: ${syncErr.message}`);
            }
          }
          return reply.status(200).send(json);
        }
      }
    } catch (centralErr: any) {
      app.log.warn(
        { centralErr },
        `[License Status] Central server unreachable, falling back to local DB: ${centralErr.message}`
      );
    }

    // 2. Fallback to local DB if Central Cloud is offline
    if (opts.uow) {
      try {
        const localTenant = await opts.uow.runInTransaction(async (ctx: any) => {
          if (ctx.rawQuery) {
            const rows = await ctx.rawQuery(
              `SELECT id, name, status, trial_ends_at FROM tenants WHERE id = $1`,
              [tenantId]
            );
            return rows[0];
          }
          return null;
        });

        if (localTenant) {
          const isExpired = localTenant.trial_ends_at
            ? new Date(localTenant.trial_ends_at) < new Date()
            : false;
          let computedStatus = localTenant.status || 'active';
          if (computedStatus === 'active' && isExpired) {
            computedStatus = 'expired';
          }

          return reply.status(200).send({
            success: true,
            data: {
              tenantId: localTenant.id,
              name: localTenant.name,
              status: computedStatus,
              isOfflineCheck: true,
            },
            requestId: req.id,
          });
        }
      } catch (dbErr: any) {
        app.log.warn({ dbErr }, `[License Status] Local DB fallback failed: ${dbErr.message}`);
      }
    }

    return reply.status(200).send({
      success: true,
      data: {
        tenantId,
        status: 'active',
        isDefaultFallback: true,
      },
      requestId: req.id,
    });
  });
};
