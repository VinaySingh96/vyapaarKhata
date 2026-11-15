/**
 * API Client Utility for Multi-Tenant POS
 * Automatically injects the active tenant ID and Bearer authentication token
 * into every request header.
 */

export function getActiveTenantId(): string {
  if (typeof window === 'undefined') {
    return '00000000-0000-0000-0000-000000000001';
  }
  return localStorage.getItem('vk_tenant_id') || '00000000-0000-0000-0000-000000000001';
}

export function getAuthHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const tenantId = getActiveTenantId();
  const token = typeof window !== 'undefined' ? localStorage.getItem('vk_jwt_token') : null;

  const headers: Record<string, string> = {
    'x-tenant-id': tenantId,
    ...customHeaders,
  };

  if (token && !headers['Authorization'] && !headers['authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return headers;
}

/**
 * Enhanced fetch wrapper that ensures every request is scoped to the active tenant.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const customHeaders: Record<string, string> = {};

  if (init?.headers) {
    if (init.headers instanceof Headers) {
      init.headers.forEach((val, key) => {
        customHeaders[key] = val;
      });
    } else if (Array.isArray(init.headers)) {
      init.headers.forEach(([k, v]) => {
        customHeaders[k] = v;
      });
    } else {
      Object.assign(customHeaders, init.headers);
    }
  }

  // Automatically default Content-Type to application/json when sending string body
  if (init?.body && typeof init.body === 'string' && !customHeaders['Content-Type'] && !customHeaders['content-type']) {
    customHeaders['Content-Type'] = 'application/json';
  }

  const mergedHeaders = getAuthHeaders(customHeaders);

  const res = await fetch(input, {
    ...init,
    headers: mergedHeaders,
  });

  if (res.status === 403 && typeof window !== 'undefined') {
    try {
      const cloned = res.clone();
      cloned
        .json()
        .then((json) => {
          const code = json?.error?.code;
          if (code === 'TENANT_SUSPENDED') {
            window.dispatchEvent(
              new CustomEvent('vk:license-status-change', { detail: { status: 'suspended' } })
            );
          } else if (code === 'LICENSE_EXPIRED') {
            window.dispatchEvent(
              new CustomEvent('vk:license-status-change', { detail: { status: 'expired' } })
            );
          } else if (code === 'TENANT_NOT_ACTIVE') {
            window.dispatchEvent(
              new CustomEvent('vk:license-status-change', { detail: { status: 'suspended' } })
            );
          }
        })
        .catch(() => {});
    } catch {}
  }

  return res;
}
