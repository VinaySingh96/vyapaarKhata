import fastify, { FastifyInstance } from 'fastify';
import { randomUUID } from 'node:crypto';
import { AppError } from './errors/app-error.js';
import { Config } from './config.js';

export function buildApp(config: Config): FastifyInstance {
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

  return app;
}
