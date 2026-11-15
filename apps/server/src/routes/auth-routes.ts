import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork } from '@vyapaarkhata/domain';
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
      return reply.status(503).send({
        success: false,
        error: {
          code: 'CENTRAL_UNAVAILABLE',
          message: `Unable to verify license against Central Cloud at ${centralUrl}: ${err.message}`,
        },
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
};
