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

  // GET /api/v1/reports/sales-summary?month=YYYY-MM
  // Posted (non-cancelled) sales by invoice month, plus all-time totals, for the dashboard month picker.
  app.get<{ Querystring: { month?: string } }>('/sales-summary', async (req, reply) => {
    const tenant = resolveTenant(req);
    const month = /^\d{4}-\d{2}$/.test(req.query.month || '')
      ? (req.query.month as string)
      : new Date().toISOString().slice(0, 7);

    const months = await opts.uow.runInTransaction(async (ctx) => {
      if (!ctx.rawQuery) return [];
      return ctx.rawQuery(
        `SELECT to_char(invoice_date, 'YYYY-MM') AS month,
                COALESCE(SUM(total_amount), 0) AS sales,
                COUNT(*) AS invoices_count
         FROM sales_invoices
         WHERE tenant_id = $1 AND status = 'posted'
         GROUP BY 1
         ORDER BY 1 DESC`,
        [tenant.tenantId]
      );
    });

    const byMonth = (months as any[]).map((r) => ({
      month: r.month as string,
      sales: parseFloat(r.sales || '0'),
      invoicesCount: parseInt(r.invoices_count || '0', 10),
    }));
    const selected = byMonth.find((m) => m.month === month) || { month, sales: 0, invoicesCount: 0 };

    return reply.status(200).send({
      success: true,
      data: {
        month,
        monthSales: selected.sales,
        monthInvoicesCount: selected.invoicesCount,
        totalSales: byMonth.reduce((s, m) => s + m.sales, 0),
        totalInvoicesCount: byMonth.reduce((s, m) => s + m.invoicesCount, 0),
        months: byMonth,
      },
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

  // GET /api/v1/reports/audit-logs
  app.get<{ Querystring: { limit?: string } }>('/audit-logs', async (req, reply) => {
    const tenant = resolveTenant(req);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const logs = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.audit.list(tenant.tenantId, limit);
    });

    return reply.status(200).send({
      success: true,
      data: logs,
      requestId: req.id,
    });
  });
};
