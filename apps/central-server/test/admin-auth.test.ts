import { describe, it, expect, beforeEach } from 'vitest';
import { buildCentralApp } from '../src/app.js';
import { loadCentralConfig } from '../src/config.js';
import {
  signAdminJwt,
  verifyAdminJwt,
  parseCookies,
  createAdminCookie,
  clearAdminCookie,
} from '../src/utils/admin-auth.js';

describe('Admin Authentication & Protection Suite', () => {
  const config = loadCentralConfig({
    NODE_ENV: 'test',
    ADMIN_USERNAME: 'superadmin',
    ADMIN_PASSWORD: 'secure-test-password-2026',
    ADMIN_API_KEY: 'test-admin-secret-key-xyz',
    JWT_SECRET: 'test-jwt-secret-for-admin-auth',
  });

  const mockDb = {
    query: async () => ({ rows: [], rowCount: 0 }),
    getPool: () => ({
      connect: async () => ({
        query: async () => ({ rows: [], rowCount: 0 }),
        release: () => {},
      }),
    }),
  };

  let app: ReturnType<typeof buildCentralApp>;

  beforeEach(() => {
    app = buildCentralApp(config, mockDb as any);
  });

  describe('JWT and Cookie Utilities', () => {
    it('signs and verifies valid admin JWT token', () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET,
        3600
      );
      expect(typeof token).toBe('string');

      const verified = verifyAdminJwt(token, config.JWT_SECRET);
      expect(verified.username).toBe('superadmin');
      expect(verified.role).toBe('superadmin');
      expect(verified.type).toBe('admin');
    });

    it('rejects tampered JWT signature', () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET,
        3600
      );
      const tampered = token.slice(0, -4) + 'abcd';
      expect(() => verifyAdminJwt(tampered, config.JWT_SECRET)).toThrow();
    });

    it('rejects expired JWT token', () => {
      const expiredToken = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET,
        -10
      );
      expect(() => verifyAdminJwt(expiredToken, config.JWT_SECRET)).toThrow(/expired/i);
    });

    it('parses raw cookie strings accurately', () => {
      const header = 'sessionId=123; vk_admin_token=abc%20123; theme=dark';
      const cookies = parseCookies(header);
      expect(cookies.sessionId).toBe('123');
      expect(cookies.vk_admin_token).toBe('abc 123');
      expect(cookies.theme).toBe('dark');
    });

    it('formats creation and clearance cookie headers', () => {
      const createCookie = createAdminCookie('jwt-token-val');
      expect(createCookie).toContain('vk_admin_token=jwt-token-val');
      expect(createCookie).toContain('HttpOnly');
      expect(createCookie).toContain('SameSite=Lax');

      const clearCookie = clearAdminCookie();
      expect(clearCookie).toContain('vk_admin_token=;');
      expect(clearCookie).toContain('Expires=Thu, 01 Jan 1970');
    });
  });

  describe('Admin UI Page Guarding (/admin, /admin/login, /admin/tenants/:id)', () => {
    it('GET /admin redirects unauthenticated user to /admin/login', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin',
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/admin/login?returnUrl=%2Fadmin');
    });

    it('GET /admin/tenants/:id redirects unauthenticated user to /admin/login', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/tenants/00000000-0000-0000-0000-000000000001',
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toContain('/admin/login?returnUrl=');
    });

    it('GET /admin/login renders login page with authentication form', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/admin/login',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('vyapaarKhata');
      expect(res.body).toContain('Admin Sign In');
      expect(res.body).toContain('Admin Username');
      expect(res.body).toContain('Admin Password');
      expect(res.body).toContain('API Secret Key');
    });

    it('GET /admin/login redirects already authenticated admin to /admin', async () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET
      );

      const res = await app.inject({
        method: 'GET',
        url: '/admin/login',
        headers: {
          cookie: `vk_admin_token=${token}`,
        },
      });
      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe('/admin');
    });

    it('GET /admin renders dashboard when valid vk_admin_token cookie is provided', async () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET
      );

      const res = await app.inject({
        method: 'GET',
        url: '/admin',
        headers: {
          cookie: `vk_admin_token=${token}`,
        },
      });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('vyapaarKhata Central Cloud');
      expect(res.body).toContain('Sign Out');
    });
  });

  describe('Admin Auth API Endpoints (/api/v1/admin/auth/*)', () => {
    it('POST /api/v1/admin/auth/login rejects invalid credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: 'superadmin',
          password: 'wrong-password',
        },
      });
      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('INVALID_ADMIN_CREDENTIALS');
    });

    it('POST /api/v1/admin/auth/login succeeds with valid username and password', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          username: 'superadmin',
          password: 'secure-test-password-2026',
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.token).toBeDefined();
      expect(json.data.user.username).toBe('superadmin');
      expect(json.data.user.role).toBe('superadmin');
      expect(res.headers['set-cookie']).toContain('vk_admin_token=');
      expect(res.headers['set-cookie']).toContain('HttpOnly');
    });

    it('POST /api/v1/admin/auth/login succeeds with valid admin API key', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/login',
        payload: {
          apiKey: 'test-admin-secret-key-xyz',
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.token).toBeDefined();
      expect(res.headers['set-cookie']).toContain('vk_admin_token=');
    });

    it('POST /api/v1/admin/auth/logout clears session cookie', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/v1/admin/auth/logout',
      });
      expect(res.statusCode).toBe(200);
      expect(res.headers['set-cookie']).toContain('vk_admin_token=;');
      expect(res.headers['set-cookie']).toContain('Expires=Thu, 01 Jan 1970');
    });

    it('GET /api/v1/admin/auth/me returns admin profile when authenticated', async () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/auth/me',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
      expect(json.data.username).toBe('superadmin');
      expect(json.data.role).toBe('superadmin');
    });
  });

  describe('Admin Protected API Endpoints (/api/v1/admin/*)', () => {
    it('rejects unauthenticated requests with 401 UNAUTHORIZED', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/tenants',
      });
      expect(res.statusCode).toBe(401);
      const json = res.json();
      expect(json.success).toBe(false);
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('allows access with x-api-key header', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/tenants',
        headers: {
          'x-api-key': 'test-admin-secret-key-xyz',
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
    });

    it('allows access with Authorization Bearer JWT', async () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/tenants',
        headers: {
          authorization: `Bearer ${token}`,
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
    });

    it('allows access with vk_admin_token cookie', async () => {
      const token = signAdminJwt(
        { username: 'superadmin', role: 'superadmin', type: 'admin' },
        config.JWT_SECRET
      );

      const res = await app.inject({
        method: 'GET',
        url: '/api/v1/admin/tenants',
        headers: {
          cookie: `vk_admin_token=${token}`,
        },
      });
      expect(res.statusCode).toBe(200);
      const json = res.json();
      expect(json.success).toBe(true);
    });
  });
});
