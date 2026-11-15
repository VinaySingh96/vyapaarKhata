import { FastifyPluginAsync } from 'fastify';
import { createHmac } from 'node:crypto';
import { TenantService } from '../services/tenant-service.js';

export interface AuthRoutesOptions {
  tenantService: TenantService;
  jwtSecret?: string;
}

function signJwt(payload: Record<string, unknown>, secret: string, expiresInSeconds: number): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = { ...payload, iat: now, exp: now + expiresInSeconds };
  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

function verifyJwt(token: string, secret: string): Record<string, any> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');
  const [h, p, sig] = parts;
  const expectedSig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  if (sig !== expectedSig) throw new Error('Invalid signature');
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('Token expired');
  return payload;
}

export const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (app, opts) => {
  const { tenantService } = opts;
  const jwtSecret = opts.jwtSecret || process.env.JWT_SECRET || 'vyapaarkhata-central-cloud-jwt-secure-key-2026';
  const ACCESS_TOKEN_VALIDITY_SECONDS = 7 * 24 * 60 * 60; // 7 Days as requested
  const REFRESH_TOKEN_VALIDITY_SECONDS = 30 * 24 * 60 * 60; // 30 Days

  // POST /api/v1/auth/license-login
  app.post<{
    Body: {
      licenseNumber: string;
      secretKey: string;
      deviceName?: string;
    };
  }>('/license-login', async (req, reply) => {
    const { licenseNumber, secretKey } = req.body || {};

    if (!licenseNumber || !secretKey) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Both licenseNumber and secretKey are required',
        },
        requestId: req.id,
      });
    }

    const tenant = await tenantService.getTenantByLicense(licenseNumber.trim());

    if (!tenant) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_LICENSE',
          message: `No active tenant found for license number "${licenseNumber}"`,
        },
        requestId: req.id,
      });
    }

    if (tenant.status !== 'active') {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'TENANT_NOT_ACTIVE',
          message: `Tenant subscription is currently ${tenant.status}`,
        },
        requestId: req.id,
      });
    }

    if (tenant.secretKey !== secretKey.trim()) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_SECRET_KEY',
          message: 'Invalid secret key provided for this license',
        },
        requestId: req.id,
      });
    }

    const tokenPayload = {
      tenantId: tenant.id,
      tenantName: tenant.name,
      storeType: tenant.storeType,
      licenseNumber: tenant.licenseNumber,
      plan: tenant.plan,
      type: 'access',
    };

    const refreshPayload = {
      tenantId: tenant.id,
      licenseNumber: tenant.licenseNumber,
      type: 'refresh',
    };

    const accessToken = signJwt(tokenPayload, jwtSecret, ACCESS_TOKEN_VALIDITY_SECONDS);
    const refreshToken = signJwt(refreshPayload, jwtSecret, REFRESH_TOKEN_VALIDITY_SECONDS);

    return reply.status(200).send({
      success: true,
      data: {
        accessToken,
        refreshToken,
        tokenType: 'Bearer',
        expiresIn: ACCESS_TOKEN_VALIDITY_SECONDS,
        tenant: {
          id: tenant.id,
          name: tenant.name,
          legalName: tenant.legalName,
          storeType: tenant.storeType,
          licenseNumber: tenant.licenseNumber,
          plan: tenant.plan,
          status: tenant.status,
        },
      },
      message: `Authenticated as ${tenant.name} (${tenant.storeType} mode). Access token valid for 7 days.`,
      requestId: req.id,
    });
  });

  // POST /api/v1/auth/refresh
  app.post<{
    Body: {
      refreshToken: string;
    };
  }>('/refresh', async (req, reply) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return reply.status(400).send({
        success: false,
        error: { code: 'MISSING_TOKEN', message: 'refreshToken is required' },
        requestId: req.id,
      });
    }

    try {
      const decoded = verifyJwt(refreshToken, jwtSecret);
      if (decoded.type !== 'refresh') {
        throw new Error('Not a refresh token');
      }

      const tenant = await tenantService.getTenantById(decoded.tenantId);
      if (!tenant || tenant.status !== 'active') {
        return reply.status(403).send({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Tenant inactive or not found' },
          requestId: req.id,
        });
      }

      const tokenPayload = {
        tenantId: tenant.id,
        tenantName: tenant.name,
        storeType: tenant.storeType,
        licenseNumber: tenant.licenseNumber,
        plan: tenant.plan,
        type: 'access',
      };

      const newAccessToken = signJwt(tokenPayload, jwtSecret, ACCESS_TOKEN_VALIDITY_SECONDS);

      return reply.status(200).send({
        success: true,
        data: {
          accessToken: newAccessToken,
          tokenType: 'Bearer',
          expiresIn: ACCESS_TOKEN_VALIDITY_SECONDS,
        },
        requestId: req.id,
      });
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        error: { code: 'INVALID_REFRESH_TOKEN', message: err.message || 'Token verification failed' },
        requestId: req.id,
      });
    }
  });

  // GET /api/v1/auth/me
  app.get('/me', async (req, reply) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' },
        requestId: req.id,
      });
    }

    const token = authHeader.slice(7);
    try {
      const decoded = verifyJwt(token, jwtSecret);
      return reply.status(200).send({
        success: true,
        data: decoded,
        requestId: req.id,
      });
    } catch (err: any) {
      return reply.status(401).send({
        success: false,
        error: { code: 'TOKEN_INVALID', message: err.message },
        requestId: req.id,
      });
    }
  });
};
