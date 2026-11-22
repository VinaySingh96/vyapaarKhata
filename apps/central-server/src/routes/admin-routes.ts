import { FastifyPluginAsync } from 'fastify';
import { TenantService } from '../services/tenant-service.js';
import { SyncService } from '../services/sync-service.js';
import { TenantStatus, PlanTier, StoreType } from '../types/index.js';
import { CentralConfig } from '../config.js';
import {
  isAuthorizedAdmin,
  signAdminJwt,
  createAdminCookie,
  clearAdminCookie,
} from '../utils/admin-auth.js';

export interface AdminRoutesOptions {
  tenantService: TenantService;
  syncService: SyncService;
  config: CentralConfig;
}

export const adminRoutes: FastifyPluginAsync<AdminRoutesOptions> = async (app, opts) => {
  const { tenantService, syncService, config } = opts;

  // Global preHandler hook protecting all /api/v1/admin/* endpoints
  // except auth endpoints (login and logout)
  app.addHook('preHandler', async (req, reply) => {
    const path = req.url.split('?')[0];
    if (path.endsWith('/auth/login') || path.endsWith('/auth/logout')) {
      return;
    }

    const auth = isAuthorizedAdmin(req, config);
    if (!auth.authorized) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin authorization required. Please log in or provide a valid API key.',
        },
        requestId: req.id,
      });
    }

    (req as any).adminUser = auth.user;
  });

  // POST /api/v1/admin/auth/login
  app.post<{
    Body: {
      username?: string;
      password?: string;
      apiKey?: string;
    };
  }>('/auth/login', async (req, reply) => {
    const { username, password, apiKey } = req.body || {};

    let isValid = false;
    let authenticatedUser = config.ADMIN_USERNAME;

    if (apiKey) {
      if (apiKey.trim() === config.ADMIN_API_KEY.trim()) {
        isValid = true;
      }
    } else if (username && password) {
      if (username.trim() === config.ADMIN_USERNAME.trim() && password === config.ADMIN_PASSWORD) {
        isValid = true;
        authenticatedUser = username.trim();
      }
    }

    if (!isValid) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_ADMIN_CREDENTIALS',
          message: 'Invalid administrator credentials or secret key',
        },
        requestId: req.id,
      });
    }

    const token = signAdminJwt(
      {
        username: authenticatedUser,
        role: 'superadmin',
        type: 'admin',
      },
      config.JWT_SECRET
    );

    reply.header('Set-Cookie', createAdminCookie(token));

    return reply.status(200).send({
      success: true,
      token,
      data: {
        token,
        tokenType: 'Bearer',
        user: {
          username: authenticatedUser,
          role: 'superadmin',
        },
      },
      message: 'Admin authentication successful',
      requestId: req.id,
    });
  });

  // POST /api/v1/admin/auth/logout
  app.post('/auth/logout', async (req, reply) => {
    reply.header('Set-Cookie', clearAdminCookie());
    return reply.status(200).send({
      success: true,
      message: 'Admin logged out successfully',
      requestId: req.id,
    });
  });

  // GET /api/v1/admin/auth/me
  app.get('/auth/me', async (req, reply) => {
    const adminUser = (req as any).adminUser;
    return reply.status(200).send({
      success: true,
      data: adminUser || { username: config.ADMIN_USERNAME, role: 'superadmin' },
      requestId: req.id,
    });
  });

  // GET /api/v1/admin/metrics
  app.get<{ Querystring: { month?: string } }>('/metrics', async (req, reply) => {
    const metrics = await tenantService.getPlatformMetrics(req.query.month);
    return reply.status(200).send({
      success: true,
      data: metrics,
      requestId: req.id,
    });
  });

  // GET /api/v1/admin/tenants
  app.get<{ Querystring: { status?: TenantStatus; search?: string } }>('/tenants', async (req, reply) => {
    const tenants = await tenantService.listTenants(req.query);
    return reply.status(200).send({
      success: true,
      data: tenants,
      total: tenants.length,
      requestId: req.id,
    });
  });

  // POST /api/v1/admin/tenants
  app.post<{
    Body: {
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
    };
  }>('/tenants', async (req, reply) => {
    const body = req.body;
    if (!body || !body.name) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Tenant name is required' },
        requestId: req.id,
      });
    }

    const tenant = await tenantService.createTenant(body);
    return reply.status(201).send({
      success: true,
      data: tenant,
      message: 'Tenant created successfully',
      requestId: req.id,
    });
  });

  // GET /api/v1/admin/tenants/:id/dashboard
  app.get<{ Params: { id: string } }>('/tenants/:id/dashboard', async (req, reply) => {
    const metrics = await tenantService.getTenantDashboardMetrics(req.params.id);
    if (!metrics) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Tenant ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: metrics,
      requestId: req.id,
    });
  });

  // GET /api/v1/admin/tenants/:id
  app.get<{ Params: { id: string } }>('/tenants/:id', async (req, reply) => {
    const tenant = await tenantService.getTenantById(req.params.id);
    if (!tenant) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: tenant,
      requestId: req.id,
    });
  });

  // PUT /api/v1/admin/tenants/:id
  app.put<{
    Params: { id: string };
    Body: {
      name?: string;
      legalName?: string;
      gstin?: string;
      contactEmail?: string;
      contactPhone?: string;
      address?: string;
      plan?: PlanTier;
      storeType?: StoreType;
      maxInstallations?: number;
    };
  }>('/tenants/:id', async (req, reply) => {
    const updated = await tenantService.updateTenant(req.params.id, req.body);
    if (!updated) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: updated,
      message: 'Tenant updated successfully',
      requestId: req.id,
    });
  });

  // PATCH /api/v1/admin/tenants/:id/status
  app.patch<{
    Params: { id: string };
    Body: { status: TenantStatus };
  }>('/tenants/:id/status', async (req, reply) => {
    const { status } = req.body || {};
    if (!status) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Status field is required' },
        requestId: req.id,
      });
    }

    const ok = await tenantService.updateTenantStatus(req.params.id, status);
    if (!ok) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      message: `Tenant status updated to ${status}`,
      requestId: req.id,
    });
  });

  // DELETE /api/v1/admin/tenants/:id  — permanent; body.confirmName must equal the tenant's name
  app.delete<{
    Params: { id: string };
    Body: { confirmName?: string };
  }>('/tenants/:id', async (req, reply) => {
    const tenant = await tenantService.getTenantById(req.params.id);
    if (!tenant) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        requestId: req.id,
      });
    }

    const confirmName = req.body?.confirmName;
    if (confirmName !== tenant.name) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CONFIRMATION_MISMATCH',
          message: `Tenant name confirmation does not match. Expected "${tenant.name}"`,
        },
        requestId: req.id,
      });
    }

    const deleted = await tenantService.deleteTenant(req.params.id);
    if (!deleted) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tenant not found' },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: deleted,
      message: `Tenant "${deleted.name}" deleted permanently`,
      requestId: req.id,
    });
  });

  // POST /api/v1/admin/tenants/:id/installations
  app.post<{
    Params: { id: string };
    Body: {
      deviceName: string;
      installationType?: 'primary_laptop' | 'secondary_laptop' | 'android';
      hardwareFingerprint?: string;
      appVersion?: string;
    };
  }>('/tenants/:id/installations', async (req, reply) => {
    const body = req.body || {};
    if (!body.deviceName) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Device name is required' },
        requestId: req.id,
      });
    }

    const inst = await tenantService.registerInstallation(req.params.id, body);
    return reply.status(201).send({
      success: true,
      data: inst,
      message: 'Installation registered successfully',
      requestId: req.id,
    });
  });

  // DELETE /api/v1/admin/tenants/:id/installations/:installationId
  app.delete<{
    Params: { id: string; installationId: string };
  }>('/tenants/:id/installations/:installationId', async (req, reply) => {
    const ok = await tenantService.revokeInstallation(req.params.id, req.params.installationId);
    if (!ok) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Installation not found for tenant' },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      message: 'Installation revoked successfully',
      requestId: req.id,
    });
  });

  // GET /api/v1/admin/sync-logs
  app.get<{ Querystring: { tenantId?: string; limit?: number } }>('/sync-logs', async (req, reply) => {
    const logs = await syncService.listRecentEvents(req.query.tenantId, req.query.limit || 50);
    return reply.status(200).send({
      success: true,
      data: logs,
      count: logs.length,
      requestId: req.id,
    });
  });
};
