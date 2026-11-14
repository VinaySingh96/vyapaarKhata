import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { AppError } from '../src/errors/app-error.js';

describe('BE-01: Backend Foundation & Health Suite', () => {
  const config = loadConfig({ NODE_ENV: 'test', PORT: '4001', DB_DRIVER: 'sqlite' });
  const app = buildApp(config);

  it('GET /health returns healthy status and correlation id', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { 'x-request-id': 'custom-req-123' },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('healthy');
    expect(body.version).toBe('0.1.0');
    expect(body.requestId).toBe('custom-req-123');
  });

  it('GET /ready returns readiness status with driver and installation state', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/ready',
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ready');
    expect(body.driver).toBe('sqlite');
    expect(body.isPrimary).toBe(true);
    expect(body.requestId).toBeDefined();
  });

  it('formats custom AppError with consistent error structure and status code', async () => {
    const errorApp = buildApp(config);
    errorApp.get('/test-error', async () => {
      throw AppError.insufficientStock('Cannot complete movement: balance would become negative', {
        productId: 'item-01',
        available: 0,
      });
    });

    const res = await errorApp.inject({
      method: 'GET',
      url: '/test-error',
    });

    expect(res.statusCode).toBe(422);
    const body = res.json();
    expect(body.success).toBe(false);
    expect(body.error.code).toBe('INSUFFICIENT_STOCK');
    expect(body.error.message).toContain('balance would become negative');
    expect(body.error.details.productId).toBe('item-01');
    expect(body.requestId).toBeDefined();
  });
});
