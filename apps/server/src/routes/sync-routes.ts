import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext } from '@vyapaarkhata/domain';

export interface LocalSyncRoutesOptions {
  uow: UnitOfWork;
  centralServerUrl?: string;
}

export const localSyncRoutes: FastifyPluginAsync<LocalSyncRoutesOptions> = async (app, opts) => {
  const centralUrl = opts.centralServerUrl || process.env.CENTRAL_SERVER_URL || 'http://127.0.0.1:5000';

  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/sync/status
  app.get('/status', async (req, reply) => {
    const tenant = resolveTenant(req);
    const pendingEvents = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.outbox.listPending(tenant.tenantId, 100);
    });

    return reply.status(200).send({
      success: true,
      data: {
        tenantId: tenant.tenantId,
        installationId: tenant.installationId,
        centralServerUrl: centralUrl,
        pendingCount: pendingEvents.length,
        oldestPendingEvent: pendingEvents[0] || null,
      },
      requestId: req.id,
    });
  });

  // POST /api/v1/sync/push-to-cloud
  app.post('/push-to-cloud', async (req, reply) => {
    const tenant = resolveTenant(req);

    // 1. Fetch pending outbox events
    const pendingEvents = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.outbox.listPending(tenant.tenantId, 50);
    });

    if (pendingEvents.length === 0) {
      return reply.status(200).send({
        success: true,
        message: 'No pending events to sync. Local store is up to date with Central Cloud.',
        syncedCount: 0,
        requestId: req.id,
      });
    }

    const batchId = `BATCH-${Date.now()}`;
    const payload = {
      tenantId: tenant.tenantId,
      installationId: tenant.installationId,
      batchId,
      events: pendingEvents.map((e) => ({
        eventId: e.eventId,
        eventType: e.eventType,
        aggregateType: e.aggregateType,
        aggregateId: e.aggregateId,
        sequenceNumber: e.sequenceNumber,
        payload: e.payload,
        createdAt: e.createdAt,
      })),
    };

    // 2. Push to Central Server
    let centralRes: Response;
    try {
      centralRes = await fetch(`${centralUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (err: any) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'CENTRAL_SERVER_UNREACHABLE',
          message: `Could not connect to Central Cloud server at ${centralUrl}: ${err.message}`,
        },
        requestId: req.id,
      });
    }

    const centralJson = (await centralRes.json()) as any;
    if (!centralJson.success) {
      return reply.status(centralRes.status).send({
        success: false,
        error: centralJson.error || { code: 'SYNC_REJECTED', message: 'Central server rejected sync batch' },
        requestId: req.id,
      });
    }

    // 3. Mark acknowledged events as 'synced' locally
    const ackIds: string[] = centralJson.data?.acknowledgedEventIds || [];
    if (ackIds.length > 0) {
      await opts.uow.runInTransaction(async (ctx) => {
        await ctx.outbox.markSynced(tenant.tenantId, ackIds);
      });
    }

    return reply.status(200).send({
      success: true,
      message: `Successfully synchronized ${ackIds.length} event(s) to Central Cloud.`,
      batchId,
      acceptedCount: centralJson.data?.acceptedCount || 0,
      duplicateCount: centralJson.data?.duplicateCount || 0,
      syncedEventIds: ackIds,
      requestId: req.id,
    });
  });
};
