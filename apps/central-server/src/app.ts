import fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { CentralConfig } from './config.js';
import { CentralDatabase } from './db/central-db.js';
import { TenantService } from './services/tenant-service.js';
import { SyncService } from './services/sync-service.js';
import { adminRoutes } from './routes/admin-routes.js';
import { syncRoutes } from './routes/sync-routes.js';
import { installationRoutes } from './routes/installation-routes.js';
import { authRoutes } from './routes/auth-routes.js';
import { uiRoutes } from './routes/ui-routes.js';

export function buildCentralApp(config: CentralConfig, db: CentralDatabase): FastifyInstance {
  const app = fastify({
    logger: config.NODE_ENV !== 'test',
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  });

  const tenantService = new TenantService(db);
  const syncService = new SyncService(db);

  // CORS hook
  app.addHook('onRequest', async (req, reply) => {
    reply.header('Access-Control-Allow-Origin', '*');
    reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-tenant-id, x-installation-id, x-api-key');

    if (req.method === 'OPTIONS') {
      return reply.status(204).send();
    }
  });

  // Global Error Handler
  app.setErrorHandler((error, req, reply) => {
    const requestId = req.id;
    app.log.error(error);

    if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
      return reply.status(409).send({
        success: false,
        error: {
          code: 'CONFLICT',
          message: 'Record with this identifier already exists (duplicate key)',
        },
        requestId,
      });
    }

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: (error as any).issues,
        },
        requestId,
      });
    }

    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: (error as any)?.message || 'An unexpected internal error occurred on central cloud',
      },
      requestId,
    });
  });

  // Health check
  app.get('/health', async () => {
    return {
      status: 'healthy',
      server: 'vyapaarKhata Central Cloud',
      role: 'sync-and-control-plane',
      timestamp: new Date().toISOString(),
    };
  });

  // Register UI Routes
  app.register(uiRoutes, { config });

  // Register API Routes
  app.register(authRoutes, { prefix: '/api/v1/auth', tenantService, jwtSecret: config.JWT_SECRET });
  app.register(adminRoutes, { prefix: '/api/v1/admin', tenantService, syncService, config });
  app.register(syncRoutes, { prefix: '/api/v1/sync', syncService });
  app.register(installationRoutes, { prefix: '/api/v1/installations', db });

  return app;
}
