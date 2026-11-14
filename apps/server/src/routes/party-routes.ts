import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, Party, PartyType } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface PartyRoutesOptions {
  uow: UnitOfWork;
}

export const partyRoutes: FastifyPluginAsync<PartyRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/parties
  app.get<{ Querystring: { type?: string } }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const parties = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.list(tenant.tenantId, req.query.type as PartyType | undefined);
    });

    return reply.status(200).send({
      success: true,
      data: parties,
      requestId: req.id,
    });
  });

  // GET /api/v1/parties/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const party = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.findById(tenant.tenantId, req.params.id);
    });

    if (!party) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Party ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: party,
      requestId: req.id,
    });
  });

  // POST /api/v1/parties
  app.post<{ Body: Partial<Party> }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const party: Party = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      partyType: body.partyType || 'customer',
      displayName: body.displayName || 'Unnamed Party',
      legalName: body.legalName,
      phone: body.phone,
      email: body.email,
      pan: body.pan,
      gstin: body.gstin,
      openingBalance: body.openingBalance || 0,
      openingBalanceType: body.openingBalanceType || 'debit',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.parties.save(party);
    });

    return reply.status(201).send({
      success: true,
      data: party,
      requestId: req.id,
    });
  });

  // GET /api/v1/parties/:id/ledger
  app.get<{ Params: { id: string } }>('/:id/ledger', async (req, reply) => {
    const tenant = resolveTenant(req);
    const entries = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.listLedgerEntries(tenant.tenantId, req.params.id);
    });

    return reply.status(200).send({
      success: true,
      data: entries,
      requestId: req.id,
    });
  });
};
