import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { InvoicePostingService, TenantContext } from '@vyapaarkhata/domain';
import { UnitOfWork } from '@vyapaarkhata/domain';

export interface SalesRoutesOptions {
  uow: UnitOfWork;
}

export const salesRoutes: FastifyPluginAsync<SalesRoutesOptions> = async (app, opts) => {
  const service = new InvoicePostingService(opts.uow);

  function resolveTenantContext(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // POST /api/v1/sales/invoices/:id/post
  app.post<{ Params: { id: string } }>('/invoices/:id/post', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoiceId = req.params.id;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    const result = await service.postInvoice({
      tenantContext,
      invoiceId,
      idempotencyKey,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices/:id/cancel
  app.post<{ Params: { id: string }; Body: { reason: string } }>(
    '/invoices/:id/cancel',
    async (req, reply) => {
      const tenantContext = resolveTenantContext(req);
      const invoiceId = req.params.id;
      const reason = req.body?.reason || 'Invoice cancelled by user';

      const invoice = await service.cancelInvoice({
        tenantContext,
        invoiceId,
        reason,
      });

      return reply.status(200).send({
        success: true,
        data: invoice,
        requestId: req.id,
      });
    }
  );
};
