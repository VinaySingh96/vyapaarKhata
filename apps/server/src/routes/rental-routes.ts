import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  RentalService,
  RentalIssueStatus,
  TenantContext,
  UnitOfWork,
  UnitOfWorkContext,
  RentalRepository,
  outstandingQty,
} from '@vyapaarkhata/domain';
import { AppError } from '../errors/app-error.js';

export interface RentalRoutesOptions {
  uow: UnitOfWork;
}

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');

const settingsSchema = z.object({
  enabled: z.boolean().optional(),
  inclusiveDays: z.boolean().optional(),
  minDays: z.number().int().min(0).max(365).optional(),
  defaultGstRate: z.number().min(0).max(100).optional(),
});

const issueSchema = z.object({
  partyId: z.string().min(1),
  issueDate: isoDate.optional(),
  sourceLocationId: z.string().optional(),
  siteAddress: z.string().max(500).optional(),
  depositAmount: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        variantId: z.string().min(1),
        unitId: z.string().min(1),
        quantity: z.number().positive(),
        dailyRate: z.number().min(0),
        replacementRate: z.number().min(0).optional(),
        description: z.string().max(200).optional(),
      })
    )
    .min(1),
});

const returnSchema = z.object({
  returnDate: isoDate.optional(),
  gstRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(1000).optional(),
  lines: z
    .array(
      z.object({
        issueLineId: z.string().min(1),
        qtyReturned: z.number().min(0).optional(),
        qtyLost: z.number().min(0).optional(),
        days: z.number().int().min(0).optional(),
        lossRate: z.number().min(0).optional(),
      })
    )
    .min(1),
});

const VALID_STATUSES: RentalIssueStatus[] = ['open', 'partially_returned', 'completed', 'cancelled'];

/**
 * Rental module API (ADR-007), mounted at /api/v1/rentals.
 * Every endpoint except /settings returns 403 unless the tenant has enabled rentals.
 */
export const rentalRoutes: FastifyPluginAsync<RentalRoutesOptions> = async (app, opts) => {
  const service = new RentalService(opts.uow);

  function resolveTenantContext(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  function rentalsOf(ctx: UnitOfWorkContext): RentalRepository {
    if (!ctx.rentals) throw new AppError('Rental module is not available for this database', 501, 'INTERNAL_SERVER_ERROR');
    return ctx.rentals;
  }

  /** Domain rule violations are plain Errors; surface them as 4xx instead of 500. */
  async function run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (err instanceof AppError || err?.name === 'ZodError') throw err;
      const msg: string = err?.message || 'Rental operation failed';
      if (msg.includes('Insufficient stock')) throw new AppError(msg, 409, 'INSUFFICIENT_STOCK');
      if (msg.includes('not found')) throw AppError.notFound(msg);
      if (/already|Cannot|cannot|only .* still on rent|payments/.test(msg)) throw new AppError(msg, 409, 'CONFLICT');
      if (err?.code && typeof err.code === 'string' && /^[0-9A-Z]{5}$/.test(err.code)) throw err; // DB error → 500
      throw AppError.badRequest(msg);
    }
  }

  // Feature gate
  app.addHook('preHandler', async (req) => {
    if (req.url.split('?')[0].endsWith('/settings')) return;
    const tenantId = resolveTenantContext(req).tenantId;
    const settings = await opts.uow.runInTransaction((ctx) => rentalsOf(ctx).getSettings(tenantId));
    if (!settings.enabled) {
      throw new AppError('Rental module is not enabled for this store. Enable it in Settings.', 403, 'FORBIDDEN');
    }
  });

  // GET /api/v1/rentals/settings
  app.get('/settings', async (req, reply) => {
    const { tenantId } = resolveTenantContext(req);
    const settings = await opts.uow.runInTransaction((ctx) => rentalsOf(ctx).getSettings(tenantId));
    return reply.send({ success: true, data: settings, requestId: req.id });
  });

  // PUT /api/v1/rentals/settings
  app.put('/settings', async (req, reply) => {
    const { tenantId } = resolveTenantContext(req);
    const patch = settingsSchema.parse(req.body || {});
    const settings = await opts.uow.runInTransaction(async (ctx) => {
      const rentals = rentalsOf(ctx);
      const next = { ...(await rentals.getSettings(tenantId)), ...patch };
      await rentals.saveSettings(tenantId, next);
      if (next.enabled) await rentals.ensureOnRentLocation(tenantId);
      return next;
    });
    return reply.send({ success: true, data: settings, requestId: req.id });
  });

  // GET /api/v1/rentals/issues?status=open,partially_returned&partyId=
  app.get<{ Querystring: { status?: string; partyId?: string; limit?: string } }>('/issues', async (req, reply) => {
    const { tenantId } = resolveTenantContext(req);
    const statuses = req.query.status
      ? (req.query.status.split(',').filter((s) => VALID_STATUSES.includes(s as RentalIssueStatus)) as RentalIssueStatus[])
      : undefined;
    const issues = await opts.uow.runInTransaction((ctx) =>
      rentalsOf(ctx).listIssues(tenantId, {
        statuses,
        partyId: req.query.partyId || undefined,
        limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
      })
    );
    return reply.send({ success: true, data: issues, requestId: req.id });
  });

  // GET /api/v1/rentals/issues/:id  (issue + its returns)
  app.get<{ Params: { id: string } }>('/issues/:id', async (req, reply) => {
    const { tenantId } = resolveTenantContext(req);
    const data = await opts.uow.runInTransaction(async (ctx) => {
      const rentals = rentalsOf(ctx);
      const issue = await rentals.findIssueById(tenantId, req.params.id);
      if (!issue) throw AppError.notFound(`Rental issue ${req.params.id} not found`);
      const returns = await rentals.listReturns(tenantId, issue.id);
      return { ...issue, returns };
    });
    return reply.send({ success: true, data, requestId: req.id });
  });

  // POST /api/v1/rentals/issues
  app.post('/issues', async (req, reply) => {
    const body = issueSchema.parse(req.body || {});
    const issue = await run(() => service.issue({ tenantContext: resolveTenantContext(req), ...body }));
    return reply.status(201).send({ success: true, data: issue, requestId: req.id });
  });

  // POST /api/v1/rentals/issues/:id/cancel
  app.post<{ Params: { id: string }; Body: { reason?: string } }>('/issues/:id/cancel', async (req, reply) => {
    const issue = await run(() =>
      service.cancelIssue({ tenantContext: resolveTenantContext(req), id: req.params.id, reason: req.body?.reason })
    );
    return reply.send({ success: true, data: issue, requestId: req.id });
  });

  // POST /api/v1/rentals/issues/:id/returns/preview  (no writes)
  app.post<{ Params: { id: string } }>('/issues/:id/returns/preview', async (req, reply) => {
    const body = returnSchema.parse(req.body || {});
    const preview = await run(() =>
      service.previewReturn({ tenantContext: resolveTenantContext(req), issueId: req.params.id, ...body })
    );
    return reply.send({ success: true, data: preview, requestId: req.id });
  });

  // POST /api/v1/rentals/issues/:id/returns  (partial return or complete)
  app.post<{ Params: { id: string } }>('/issues/:id/returns', async (req, reply) => {
    const body = returnSchema.parse(req.body || {});
    const ret = await run(() =>
      service.completeReturn({ tenantContext: resolveTenantContext(req), issueId: req.params.id, ...body })
    );
    return reply.status(201).send({ success: true, data: ret, requestId: req.id });
  });

  // POST /api/v1/rentals/returns/:id/cancel
  app.post<{ Params: { id: string }; Body: { reason?: string } }>('/returns/:id/cancel', async (req, reply) => {
    const ret = await run(() =>
      service.cancelReturn({ tenantContext: resolveTenantContext(req), id: req.params.id, reason: req.body?.reason })
    );
    return reply.send({ success: true, data: ret, requestId: req.id });
  });

  // GET /api/v1/rentals/summary  (what is out on rent, per item and per customer)
  app.get('/summary', async (req, reply) => {
    const { tenantId } = resolveTenantContext(req);
    const issues = await opts.uow.runInTransaction((ctx) =>
      rentalsOf(ctx).listIssues(tenantId, { statuses: ['open', 'partially_returned'], limit: 1000 })
    );

    const byItem = new Map<string, { variantId: string; description?: string; unitSymbol?: string; qtyOnRent: number; dailyValue: number }>();
    const byCustomer = new Map<string, { partyId: string; partyName?: string; openIssues: number; qtyOnRent: number; dailyValue: number }>();

    for (const issue of issues) {
      const cust = byCustomer.get(issue.partyId) || {
        partyId: issue.partyId,
        partyName: issue.partyName,
        openIssues: 0,
        qtyOnRent: 0,
        dailyValue: 0,
      };
      cust.openIssues += 1;
      for (const line of issue.lines) {
        const qty = outstandingQty(line);
        if (qty <= 0) continue;
        const item = byItem.get(line.variantId) || {
          variantId: line.variantId,
          description: line.description,
          unitSymbol: line.unitSymbol,
          qtyOnRent: 0,
          dailyValue: 0,
        };
        item.qtyOnRent += qty;
        item.dailyValue += qty * line.dailyRate;
        byItem.set(line.variantId, item);
        cust.qtyOnRent += qty;
        cust.dailyValue += qty * line.dailyRate;
      }
      byCustomer.set(issue.partyId, cust);
    }

    return reply.send({
      success: true,
      data: {
        openIssues: issues.length,
        totalQtyOnRent: Array.from(byItem.values()).reduce((s, i) => s + i.qtyOnRent, 0),
        dailyRentValue: Array.from(byItem.values()).reduce((s, i) => s + i.dailyValue, 0),
        byItem: Array.from(byItem.values()).sort((a, b) => b.qtyOnRent - a.qtyOnRent),
        byCustomer: Array.from(byCustomer.values()).sort((a, b) => b.dailyValue - a.dailyValue),
      },
      requestId: req.id,
    });
  });
};
