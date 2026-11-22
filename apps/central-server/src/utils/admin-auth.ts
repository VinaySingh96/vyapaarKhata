import { createHmac, timingSafeEqual } from 'node:crypto';
import { FastifyRequest } from 'fastify';
import { CentralConfig } from '../config.js';

export interface AdminTokenPayload {
  username: string;
  role: 'superadmin' | 'admin';
  type: 'admin';
  iat?: number;
  exp?: number;
}

export function parseCookies(cookieHeader?: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      try {
        cookies[key] = decodeURIComponent(val);
      } catch {
        cookies[key] = val;
      }
    }
  }
  return cookies;
}

export function signAdminJwt(
  payload: Omit<AdminTokenPayload, 'iat' | 'exp'>,
  secret: string,
  expiresInSeconds: number = 7 * 24 * 60 * 60
): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: AdminTokenPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const h = Buffer.from(JSON.stringify(header)).toString('base64url');
  const p = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  const sig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');
  return `${h}.${p}.${sig}`;
}

export function verifyAdminJwt(token: string, secret: string): AdminTokenPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Malformed admin token');
  }

  const [h, p, sig] = parts;
  const expectedSig = createHmac('sha256', secret).update(`${h}.${p}`).digest('base64url');

  const bufSig = Buffer.from(sig);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length || !timingSafeEqual(bufSig, bufExpected)) {
    throw new Error('Invalid signature on admin token');
  }

  const payload: AdminTokenPayload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    throw new Error('Admin session expired');
  }

  if (payload.type !== 'admin') {
    throw new Error('Invalid token type');
  }

  return payload;
}

export function extractAdminToken(req: FastifyRequest): string | null {
  // 1. Check Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }

  // 2. Check Cookie: vk_admin_token=<token>
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = parseCookies(cookieHeader);
    if (cookies.vk_admin_token) {
      return cookies.vk_admin_token;
    }
  }

  return null;
}

export function isAuthorizedAdmin(
  req: FastifyRequest,
  config: CentralConfig
): { authorized: boolean; user?: { username: string; role: string }; method?: 'apiKey' | 'jwt' } {
  // Method A: Admin API Key
  const apiKeyHeader = (req.headers['x-api-key'] || req.headers['x-admin-key']) as string | undefined;
  if (apiKeyHeader && apiKeyHeader.trim() === config.ADMIN_API_KEY.trim()) {
    return {
      authorized: true,
      user: { username: config.ADMIN_USERNAME, role: 'superadmin' },
      method: 'apiKey',
    };
  }

  // Method B: Admin JWT (from cookie or Bearer header)
  const token = extractAdminToken(req);
  if (token) {
    try {
      const decoded = verifyAdminJwt(token, config.JWT_SECRET);
      return {
        authorized: true,
        user: { username: decoded.username, role: decoded.role },
        method: 'jwt',
      };
    } catch {
      return { authorized: false };
    }
  }

  return { authorized: false };
}

export function createAdminCookie(token: string, maxAgeSeconds: number = 7 * 24 * 60 * 60): string {
  return `vk_admin_token=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}`;
}

export function clearAdminCookie(): string {
  return 'vk_admin_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax';
}
