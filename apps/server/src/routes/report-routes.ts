import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext } from '@vyapaarkhata/domain';

export interface ReportRoutesOptions {
  uow: UnitOfWork;
}

export const reportRoutes: FastifyPluginAsync<ReportRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/reports/dashboard
  app.get('/dashboard', async (req, reply) => {
    const tenant = resolveTenant(req);
    const metrics = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.reports.getDashboardMetrics(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: metrics,
      requestId: req.id,
    });
  });

  // GET /api/v1/reports/stock-valuation
  app.get('/stock-valuation', async (req, reply) => {
    const tenant = resolveTenant(req);
    const valuation = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.reports.getStockValuation(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: valuation,
      requestId: req.id,
    });
  });
};
