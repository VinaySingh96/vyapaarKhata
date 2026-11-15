import fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AppError } from './errors/app-error.js';
import { Config } from './config.js';
import { UnitOfWork } from '@vyapaarkhata/domain';
import { salesRoutes } from './routes/sales-routes.js';
import { productRoutes } from './routes/product-routes.js';
import { inventoryRoutes } from './routes/inventory-routes.js';
import { partyRoutes } from './routes/party-routes.js';
import { purchasingRoutes } from './routes/purchasing-routes.js';
import { paymentRoutes } from './routes/payment-routes.js';
import { expenseRoutes } from './routes/expense-routes.js';
import { reportRoutes } from './routes/report-routes.js';
import { settingsRoutes } from './routes/settings-routes.js';
import { localSyncRoutes } from './routes/sync-routes.js';
import { localAuthRoutes } from './routes/auth-routes.js';
import { registerAuditHook } from './plugins/audit-hook.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadOpenApiSpec(): string {
  const candidatePaths = [
    path.resolve(process.cwd(), 'docs/spec/openapi.yaml'),
    path.resolve(process.cwd(), '../../docs/spec/openapi.yaml'),
    path.resolve(__dirname, '../../../docs/spec/openapi.yaml'),
  ];
  for (const p of candidatePaths) {
    if (fs.existsSync(p)) {
      return fs.readFileSync(p, 'utf8');
    }
  }
  return 'openapi: 3.1.0\ninfo:\n  title: vyapaarKhata API\n  version: 0.1.0\npaths: {}';
}

export function buildApp(config: Config, uow?: UnitOfWork): FastifyInstance {
  const app = fastify({
    logger: config.NODE_ENV !== 'test',
    genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),
  });

  // Global Error Handler
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
        requestId,
      });
    }

    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request schema validation failed',
          details: 'issues' in error ? error.issues : undefined,
        },
        requestId,
      });
    }

    if (
      error &&
      typeof error === 'object' &&
      'statusCode' in error &&
      typeof (error as any).statusCode === 'number' &&
      (error as any).statusCode >= 400 &&
      (error as any).statusCode < 500
    ) {
      return reply.status((error as any).statusCode).send({
        success: false,
        error: {
          code: (error as any).code || 'BAD_REQUEST',
          message: (error as any).message || 'Invalid client request',
        },
        requestId,
      });
    }

    // Domain business rule violations
    if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
      const msg = error.message;
      if (msg.includes('Insufficient stock')) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: msg,
          },
          requestId,
        });
      }
      if (msg.includes('not found')) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: msg,
          },
          requestId,
        });
      }
      if (msg.includes('already posted') || msg.includes('conflict')) {
        return reply.status(409).send({
          success: false,
          error: {
            code: 'CONFLICT',
            message: msg,
          },
          requestId,
        });
      }
    }

    // Default 500 error
    request.log.error(error);
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred',
      },
      requestId,
    });
  });

  // Health and Readiness probes
  app.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0',
      requestId: request.id,
    };
  });

  app.get('/ready', async (request, reply) => {
    return {
      status: 'ready',
      driver: config.DB_DRIVER,
      isPrimary: config.IS_PRIMARY_INSTALLATION,
      timestamp: new Date().toISOString(),
      requestId: request.id,
    };
  });

  // OpenAPI Specification raw YAML
  const openApiSpec = loadOpenApiSpec();
  app.get('/openapi.yaml', async (request, reply) => {
    return reply.type('text/yaml; charset=utf-8').send(openApiSpec);
  });

  // Swagger UI Interactive Documentation
  app.get('/docs', async (request, reply) => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>vyapaarKhata API Docs | Swagger UI</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; background-color: #fafafa; font-family: sans-serif; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/openapi.yaml',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`;
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // Alias /swagger to /docs
  app.get('/swagger', async (request, reply) => {
    return reply.redirect('/docs');
  });

  // Scalar UI (Modern interactive API client)
  app.get('/scalar', async (request, reply) => {
    const html = `<!DOCTYPE html>
<html>
  <head>
    <title>vyapaarKhata API Reference | Scalar</title>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body>
    <script
      id="api-reference"
      data-url="/openapi.yaml"
      src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
    ></script>
  </body>
</html>`;
    return reply.type('text/html; charset=utf-8').send(html);
  });

  // Register Core Domain API Routes
  if (uow) {
    app.register(salesRoutes, { prefix: '/api/v1/sales', uow });
    app.register(productRoutes, { prefix: '/api/v1/products', uow });
    app.register(inventoryRoutes, { prefix: '/api/v1/inventory', uow });
    app.register(partyRoutes, { prefix: '/api/v1/parties', uow });
    app.register(purchasingRoutes, { prefix: '/api/v1/purchasing', uow });
    app.register(paymentRoutes, { prefix: '/api/v1/payments', uow });
    app.register(expenseRoutes, { prefix: '/api/v1/expenses', uow });
    app.register(reportRoutes, { prefix: '/api/v1/reports', uow });
    const centralTenantId =
      config.CENTRAL_TENANT_ID ||
      (config.DATABASE_URL.includes('jewellery')
        ? '00000000-0000-0000-0000-000000000002'
        : config.TENANT_ID);

    app.register(settingsRoutes, { prefix: '/api/v1/settings', uow });
    app.register(localSyncRoutes, {
      prefix: '/api/v1/sync',
      uow,
      centralServerUrl: config.CENTRAL_SERVER_URL,
      centralTenantId,
    });
    app.register(localAuthRoutes, {
      prefix: '/api/v1/auth',
      centralServerUrl: config.CENTRAL_SERVER_URL,
      uow,
    });

    // Register Automated Global Audit Logging Hook
    registerAuditHook(app, uow);
  }

  return app;
}
