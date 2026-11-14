import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, InventoryLocation, StockAdjustment, StockTransfer } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface InventoryRoutesOptions {
  uow: UnitOfWork;
}

export const inventoryRoutes: FastifyPluginAsync<InventoryRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/inventory/balances
  app.get<{ Querystring: { locationId?: string } }>('/balances', async (req, reply) => {
    const tenant = resolveTenant(req);
    const balances = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.inventory.listBalances(tenant.tenantId, req.query.locationId);
    });

    return reply.status(200).send({
      success: true,
      data: balances,
      requestId: req.id,
    });
  });

  // GET /api/v1/inventory/movements
  app.get<{ Querystring: { limit?: string } }>('/movements', async (req, reply) => {
    const tenant = resolveTenant(req);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;
    const movements = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.inventory.listMovements(tenant.tenantId, limit);
    });

    return reply.status(200).send({
      success: true,
      data: movements,
      requestId: req.id,
    });
  });

  // GET /api/v1/inventory/locations
  app.get('/locations', async (req, reply) => {
    const tenant = resolveTenant(req);
    const locations = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.inventory.listLocations(tenant.tenantId);
    });

    return reply.status(200).send({
      success: true,
      data: locations,
      requestId: req.id,
    });
  });

  // POST /api/v1/inventory/locations
  app.post<{ Body: Partial<InventoryLocation> }>('/locations', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const location: InventoryLocation = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      businessLocationId: body.businessLocationId || 'b0000000-0000-0000-0000-000000000000',
      name: body.name || 'Warehouse',
      code: body.code || `WH-${Date.now().toString().slice(-4)}`,
      locationType: body.locationType || 'warehouse',
      isDefault: body.isDefault || false,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.inventory.saveLocation(location);
    });

    return reply.status(201).send({
      success: true,
      data: location,
      requestId: req.id,
    });
  });

  // POST /api/v1/inventory/adjustments
  app.post<{ Body: Partial<StockAdjustment> }>('/adjustments', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const adjustment: StockAdjustment = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      inventoryLocationId: body.inventoryLocationId || 'b0000000-0000-0000-0000-000000000001',
      adjustmentNumber: body.adjustmentNumber || `ADJ-${Date.now().toString().slice(-6)}`,
      reason: body.reason || 'physical_count',
      status: 'posted',
      lines: body.lines || [],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.inventory.saveAdjustment(adjustment);
    });

    return reply.status(201).send({
      success: true,
      data: adjustment,
      requestId: req.id,
    });
  });

  // POST /api/v1/inventory/transfers
  app.post<{ Body: Partial<StockTransfer> }>('/transfers', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const transfer: StockTransfer = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      sourceLocationId: body.sourceLocationId || '',
      destinationLocationId: body.destinationLocationId || '',
      transferNumber: body.transferNumber || `TRF-${Date.now().toString().slice(-6)}`,
      status: 'completed',
      transferDate: body.transferDate || new Date().toISOString().slice(0, 10),
      lines: body.lines || [],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.inventory.saveTransfer(transfer);
    });

    return reply.status(201).send({
      success: true,
      data: transfer,
      requestId: req.id,
    });
  });
};
