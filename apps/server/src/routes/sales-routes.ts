import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  InvoicePostingService,
  PaymentService,
  TenantContext,
  UnitOfWork,
  SalesInvoice,
  Payment,
} from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface SalesRoutesOptions {
  uow: UnitOfWork;
}

export const salesRoutes: FastifyPluginAsync<SalesRoutesOptions> = async (app, opts) => {
  const service = new InvoicePostingService(opts.uow);
  const paymentService = new PaymentService(opts.uow);

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

  // POST /api/v1/sales/invoices/:id/payments (Receive payment against invoice with optional adjustment)
  app.post<{
    Params: { id: string };
    Body: {
      amount?: number;
      adjustmentAmount?: number;
      adjustmentType?: string;
      paymentMode?: string;
      referenceNumber?: string;
      notes?: string;
    };
  }>('/invoices/:id/payments', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoiceId = req.params.id;
    const body = req.body || {};

    const amount = Math.max(0, typeof body.amount === 'number' ? body.amount : parseFloat(body.amount as any) || 0);
    const adjustmentAmount = Math.max(
      0,
      typeof body.adjustmentAmount === 'number'
        ? body.adjustmentAmount
        : parseFloat(body.adjustmentAmount as any) || 0
    );

    if (amount <= 0 && adjustmentAmount <= 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Total settlement (payment amount + adjustment) must be greater than zero.',
        },
      });
    }

    const invoice = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.findById(tenantContext.tenantId, invoiceId);
    });

    if (!invoice) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Invoice ${invoiceId} not found` },
      });
    }

    if (invoice.status === 'cancelled') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Cannot record payment for a cancelled invoice' },
      });
    }

    const currentBalanceDue =
      invoice.balanceDue !== undefined
        ? invoice.balanceDue
        : Math.max(0, invoice.grandTotal - ((invoice.amountPaid || 0) + (invoice.adjustmentAmount || 0)));

    if (amount + adjustmentAmount > currentBalanceDue + 0.05) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'EXCEEDS_BALANCE',
          message: `Total settlement (₹${(amount + adjustmentAmount).toFixed(
            2
          )}) exceeds current balance due (₹${currentBalanceDue.toFixed(2)})`,
        },
      });
    }

    const paymentId = randomUUID();
    const payment: Payment = {
      id: paymentId,
      tenantId: tenantContext.tenantId,
      partyId: invoice.customerId,
      paymentNumber: `PAY-${Date.now().toString().slice(-6)}`,
      direction: 'inbound',
      status: 'draft',
      amount,
      adjustmentAmount,
      adjustmentType: body.adjustmentType || (adjustmentAmount > 0 ? 'round_off' : undefined),
      paymentMode: body.paymentMode || 'cash',
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      allocations: [
        {
          id: randomUUID(),
          tenantId: tenantContext.tenantId,
          paymentId,
          documentType: 'sales_invoice',
          documentId: invoice.id,
          allocatedAmount: amount,
          adjustmentAmount,
          adjustmentType: body.adjustmentType || (adjustmentAmount > 0 ? 'round_off' : undefined),
          notes: body.notes,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.payments.savePayment(payment);
    });

    const postedPayment = await paymentService.postPayment({
      tenantContext,
      paymentId,
      allocations: [
        {
          documentType: 'sales_invoice',
          documentId: invoice.id,
          amount,
          adjustmentAmount,
          adjustmentType: body.adjustmentType || (adjustmentAmount > 0 ? 'round_off' : undefined),
          notes: body.notes,
        },
      ],
    });

    const updatedInvoice = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.findById(tenantContext.tenantId, invoiceId);
    });

    return reply.status(200).send({
      success: true,
      data: {
        payment: postedPayment,
        invoice: updatedInvoice,
      },
      message: 'Payment and adjustment recorded successfully',
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
