import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, PurchasingService, PurchaseOrder, PurchaseReceipt, PurchaseBill } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface PurchasingRoutesOptions {
  uow: UnitOfWork;
}

export const purchasingRoutes: FastifyPluginAsync<PurchasingRoutesOptions> = async (app, opts) => {
  const service = new PurchasingService(opts.uow);

  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/purchasing/orders
  app.get('/orders', async (req, reply) => {
    const tenant = resolveTenant(req);
    const orders = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.purchasing.listOrders(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: orders,
      requestId: req.id,
    });
  });

  // POST /api/v1/purchasing/orders
  app.post<{ Body: Partial<PurchaseOrder> }>('/orders', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const order: PurchaseOrder = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      supplierId: body.supplierId || '',
      businessLocationId: body.businessLocationId || '60000000-0000-0000-0000-000000000001',
      orderNumber: body.orderNumber || `PO-${Date.now().toString().slice(-6)}`,
      status: 'confirmed',
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      totalAmount: body.totalAmount || 0,
      lines: body.lines || [],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.purchasing.saveOrder(order);
    });

    return reply.status(201).send({
      success: true,
      data: order,
      requestId: req.id,
    });
  });

  // GET /api/v1/purchasing/receipts
  app.get('/receipts', async (req, reply) => {
    const tenant = resolveTenant(req);
    const receipts = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.purchasing.listReceipts(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: receipts,
      requestId: req.id,
    });
  });

  // POST /api/v1/purchasing/receipts
  app.post<{ Body: Partial<PurchaseReceipt> }>('/receipts', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const receipt: PurchaseReceipt = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      supplierId: body.supplierId || '',
      purchaseOrderId: body.purchaseOrderId,
      inventoryLocationId: body.inventoryLocationId || '',
      receiptNumber: body.receiptNumber || `GRN-${Date.now().toString().slice(-6)}`,
      status: 'draft',
      lines: body.lines || [],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.purchasing.saveReceipt(receipt);
    });

    return reply.status(201).send({
      success: true,
      data: receipt,
      requestId: req.id,
    });
  });

  // POST /api/v1/purchasing/receipts/:id/post
  app.post<{ Params: { id: string } }>('/receipts/:id/post', async (req, reply) => {
    const tenant = resolveTenant(req);
    const result = await service.postReceipt({
      tenantContext: tenant,
      receiptId: req.params.id,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      requestId: req.id,
    });
  });

  // GET /api/v1/purchasing/bills
  app.get('/bills', async (req, reply) => {
    const tenant = resolveTenant(req);
    const bills = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.purchasing.listBills(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: bills,
      requestId: req.id,
    });
  });

  // POST /api/v1/purchasing/bills
  app.post<{ Body: Partial<PurchaseBill> }>('/bills', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const bill: PurchaseBill = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      supplierId: body.supplierId || '',
      businessLocationId: body.businessLocationId || '',
      billNumber: body.billNumber || `BILL-${Date.now().toString().slice(-6)}`,
      supplierInvoiceNumber: body.supplierInvoiceNumber,
      status: 'draft',
      subtotal: body.subtotal || 0,
      taxAmount: body.taxAmount || 0,
      totalAmount: body.totalAmount || 0,
      amountPaid: 0,
      lines: body.lines || [],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.purchasing.saveBill(bill);
    });

    return reply.status(201).send({
      success: true,
      data: bill,
      requestId: req.id,
    });
  });

  // POST /api/v1/purchasing/bills/:id/post
  app.post<{ Params: { id: string } }>('/bills/:id/post', async (req, reply) => {
    const tenant = resolveTenant(req);
    const result = await service.postBill({
      tenantContext: tenant,
      billId: req.params.id,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      requestId: req.id,
    });
  });
};
