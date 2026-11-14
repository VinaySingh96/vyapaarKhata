import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, PaymentService, Payment } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface PaymentRoutesOptions {
  uow: UnitOfWork;
}

export const paymentRoutes: FastifyPluginAsync<PaymentRoutesOptions> = async (app, opts) => {
  const service = new PaymentService(opts.uow);

  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/payments
  app.get('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const payments = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.payments.list(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: payments,
      requestId: req.id,
    });
  });

  // POST /api/v1/payments
  app.post<{ Body: Partial<Payment> }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const payment: Payment = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      partyId: body.partyId || '',
      paymentNumber: body.paymentNumber || `PAY-${Date.now().toString().slice(-6)}`,
      direction: body.direction || 'inbound',
      status: 'draft',
      amount: body.amount || 0,
      referenceNumber: body.referenceNumber,
      allocations: body.allocations || [],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.payments.savePayment(payment);
    });

    return reply.status(201).send({
      success: true,
      data: payment,
      requestId: req.id,
    });
  });

  // POST /api/v1/payments/:id/post
  app.post<{ Params: { id: string }; Body: { allocations?: any[] } }>(
    '/:id/post',
    async (req, reply) => {
      const tenant = resolveTenant(req);
      const result = await service.postPayment({
        tenantContext: tenant,
        paymentId: req.params.id,
        allocations: req.body?.allocations,
      });

      return reply.status(200).send({
        success: true,
        data: result,
        requestId: req.id,
      });
    }
  );
};
