import { FastifyPluginAsync } from 'fastify';
import { SyncService } from '../services/sync-service.js';
import { SyncPushBatch } from '../types/index.js';

export interface SyncRoutesOptions {
  syncService: SyncService;
}

export const syncRoutes: FastifyPluginAsync<SyncRoutesOptions> = async (app, opts) => {
  const { syncService } = opts;

  // POST /api/v1/sync/push
  app.post<{ Body: SyncPushBatch }>('/push', async (req, reply) => {
    const batch = req.body;
    if (!batch || !batch.tenantId || !Array.isArray(batch.events)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid sync push payload. tenantId and events array are required.',
        },
        requestId: req.id,
      });
    }

    try {
      const result = await syncService.ingestSyncBatch(batch);
      return reply.status(200).send({
        success: true,
        data: result,
        message: `Synced ${result.acceptedCount} new event(s), skipped ${result.duplicateCount} duplicate(s).`,
        requestId: req.id,
      });
    } catch (err: any) {
      if (err.message?.includes('Tenant is') || err.message?.includes('Tenant not found')) {
        return reply.status(403).send({
          success: false,
          error: { code: 'SYNC_FORBIDDEN', message: err.message },
          requestId: req.id,
        });
      }
      throw err;
    }
  });

  // GET /api/v1/sync/pull
  app.get<{
    Querystring: { tenantId: string; sinceSequence?: number; limit?: number };
  }>('/pull', async (req, reply) => {
    const { tenantId, sinceSequence = 0, limit = 100 } = req.query;
    if (!tenantId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'tenantId query parameter is required' },
        requestId: req.id,
      });
    }

    const events = await syncService.pullSyncEvents(tenantId, Number(sinceSequence), Number(limit));
    return reply.status(200).send({
      success: true,
      data: events,
      count: events.length,
      sinceSequence: Number(sinceSequence),
      requestId: req.id,
    });
  });

  // GET /api/v1/sync/status/:tenantId
  app.get<{ Params: { tenantId: string } }>('/status/:tenantId', async (req, reply) => {
    const status = await syncService.getSyncStatus(req.params.tenantId);
    return reply.status(200).send({
      success: true,
      data: status,
      requestId: req.id,
    });
  });
};
