import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext } from '@vyapaarkhata/domain';

export interface SettingsRoutesOptions {
  uow: UnitOfWork;
}

export const settingsRoutes: FastifyPluginAsync<SettingsRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/settings
  app.get('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const settings = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.settings.getSettings(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: settings,
      requestId: req.id,
    });
  });

  // PUT /api/v1/settings
  app.put('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = (req.body as any) || {};

    const updated = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.settings.updateSettings(tenant.tenantId, {
        storeName: body.storeName,
        tradeName: body.tradeName || body.storeName,
        legalName: body.legalName,
        gstin: body.gstin,
        phone: body.phone,
        address: body.address,
        currency: body.currency,
        locale: body.locale,
      });
    });

    return reply.status(200).send({
      success: true,
      data: updated,
      requestId: req.id,
    });
  });

  // POST /api/v1/settings (alias for compatibility)
  app.post('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = (req.body as any) || {};

    const updated = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.settings.updateSettings(tenant.tenantId, {
        storeName: body.storeName,
        tradeName: body.tradeName || body.storeName,
        legalName: body.legalName,
        gstin: body.gstin,
        phone: body.phone,
        address: body.address,
        currency: body.currency,
        locale: body.locale,
      });
    });

    return reply.status(200).send({
      success: true,
      data: updated,
      requestId: req.id,
    });
  });
};
