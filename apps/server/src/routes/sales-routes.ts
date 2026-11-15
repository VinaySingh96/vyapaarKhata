import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { InvoicePostingService, TenantContext, UnitOfWork, SalesInvoice } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

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

  // GET /api/v1/sales/invoices
  app.get<{ Querystring: { limit?: string } }>('/invoices', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    const invoices = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.list(tenantContext.tenantId, limit);
    });

    return reply.status(200).send({
      success: true,
      data: invoices,
      requestId: req.id,
    });
  });

  // GET /api/v1/sales/invoices/:id
  app.get<{ Params: { id: string } }>('/invoices/:id', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoice = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.findById(tenantContext.tenantId, req.params.id);
    });

    if (!invoice) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Invoice ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: invoice,
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices
  app.post<{ Body: Partial<SalesInvoice> }>('/invoices', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const body = req.body || {};

    const invoice: SalesInvoice = {
      id: body.id || randomUUID(),
      tenantId: tenantContext.tenantId,
      businessLocationId: body.businessLocationId || '60000000-0000-0000-0000-000000000001',
      invoiceNumber: body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      customerId: body.customerId || 'c0000000-0000-0000-0000-000000000001',
      status: 'draft',
      subtotal: body.subtotal || 0,
      taxTotal: body.taxTotal || 0,
      grandTotal: body.grandTotal || 0,
      lines: body.lines || [],
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.invoices.save(invoice);
    });

    return reply.status(201).send({
      success: true,
      data: invoice,
      requestId: req.id,
    });
  });

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
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
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
        message: 'Invoice cancelled and inventory restored',
        requestId: req.id,
      });
    }
  );

  // DELETE /api/v1/sales/invoices/:id (Soft cancel + restore inventory)
  app.delete<{ Params: { id: string }; Body: { reason?: string } }>(
    '/invoices/:id',
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
        message: 'Invoice cancelled and inventory restored',
        requestId: req.id,
      });
    }
  );
};
