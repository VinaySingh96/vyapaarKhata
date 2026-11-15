import { FastifyPluginAsync } from 'fastify';

export interface LocalAuthRoutesOptions {
  centralServerUrl?: string;
}

export const localAuthRoutes: FastifyPluginAsync<LocalAuthRoutesOptions> = async (app, opts) => {
  const centralUrl = (opts.centralServerUrl || process.env.CENTRAL_SERVER_URL || 'http://127.0.0.1:5000').replace(/\/+$/, '');

  // POST /api/v1/auth/license-login
  app.post<{
    Body: {
      licenseNumber: string;
      secretKey: string;
      deviceName?: string;
    };
  }>('/license-login', async (req, reply) => {
    try {
      const centralRes = await fetch(`${centralUrl}/api/v1/auth/license-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });

      const json = await centralRes.json();
      return reply.status(centralRes.status).send(json);
    } catch (err: any) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'CENTRAL_UNAVAILABLE',
          message: `Unable to verify license against Central Cloud at ${centralUrl}: ${err.message}`,
        },
      });
    }
  });

  // POST /api/v1/auth/refresh
  app.post<{
    Body: {
      refreshToken: string;
    };
  }>('/refresh', async (req, reply) => {
    try {
      const centralRes = await fetch(`${centralUrl}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body || {}),
      });

      const json = await centralRes.json();
      return reply.status(centralRes.status).send(json);
    } catch (err: any) {
      return reply.status(503).send({
        success: false,
        error: {
          code: 'CENTRAL_UNAVAILABLE',
          message: `Unable to refresh token against Central Cloud: ${err.message}`,
        },
      });
    }
  });
};
