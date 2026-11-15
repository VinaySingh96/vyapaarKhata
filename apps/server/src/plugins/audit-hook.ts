import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { UnitOfWork } from '@vyapaarkhata/domain';

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAuditAction(
  method: string,
  url: string
): { action: string; entityType: string; entityId?: string } {
  const cleanUrl = url.split('?')[0];
  const parts = cleanUrl.split('/').filter(Boolean);

  let entityType = 'general';
  let action = `${method.toUpperCase()}`;
  let entityId: string | undefined = undefined;

  for (let i = 0; i < parts.length; i++) {
    if (uuidRegex.test(parts[i])) {
      entityId = parts[i];
    }
  }

  if (cleanUrl.includes('/sales/invoices')) {
    entityType = 'sales_invoice';
    if (cleanUrl.endsWith('/post')) action = 'INVOICE_POSTED';
    else if (cleanUrl.endsWith('/cancel')) action = 'INVOICE_CANCELLED';
    else if (cleanUrl.includes('/payments')) action = 'PAYMENT_RECEIVED';
    else if (method === 'POST') action = 'INVOICE_CREATED';
    else if (method === 'DELETE') action = 'INVOICE_VOIDED';
  } else if (cleanUrl.includes('/purchasing/receipts')) {
    entityType = 'purchase_receipt';
    if (cleanUrl.endsWith('/post')) action = 'RECEIPT_POSTED';
    else if (method === 'POST') action = 'RECEIPT_CREATED';
  } else if (cleanUrl.includes('/purchasing/bills')) {
    entityType = 'purchase_bill';
    if (cleanUrl.endsWith('/post')) action = 'BILL_POSTED';
    else if (method === 'POST') action = 'BILL_CREATED';
  } else if (cleanUrl.includes('/inventory/adjustments')) {
    entityType = 'inventory_adjustment';
    action = 'STOCK_ADJUSTMENT';
  } else if (cleanUrl.includes('/inventory/transfers')) {
    entityType = 'stock_transfer';
    action = 'STOCK_TRANSFER';
  } else if (cleanUrl.includes('/inventory/locations')) {
    entityType = 'inventory_location';
    action = method === 'POST' ? 'LOCATION_CREATED' : 'LOCATION_UPDATED';
  } else if (cleanUrl.includes('/products/categories')) {
    entityType = 'product_category';
    action =
      method === 'POST'
        ? 'CATEGORY_CREATED'
        : method === 'PUT'
        ? 'CATEGORY_UPDATED'
        : 'CATEGORY_DELETED';
  } else if (cleanUrl.includes('/products')) {
    entityType = 'product';
    action = method === 'POST' ? 'PRODUCT_CREATED' : 'PRODUCT_UPDATED';
  } else if (cleanUrl.includes('/parties')) {
    entityType = 'party';
    action = method === 'POST' ? 'PARTY_CREATED' : 'PARTY_UPDATED';
  } else if (cleanUrl.includes('/payments')) {
    entityType = 'payment';
    if (cleanUrl.endsWith('/post')) action = 'PAYMENT_POSTED';
    else action = 'PAYMENT_RECORDED';
  } else if (cleanUrl.includes('/expenses')) {
    entityType = 'expense';
    action = 'EXPENSE_RECORDED';
  } else if (cleanUrl.includes('/settings')) {
    entityType = 'store_settings';
    action = 'SETTINGS_UPDATED';
  }

  return { action, entityType, entityId };
}

export function registerAuditHook(app: FastifyInstance, uow?: UnitOfWork) {
  if (!uow) return;

  app.addHook('onSend', async (request: FastifyRequest, _reply: FastifyReply, payload: any) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method) && payload) {
      try {
        if (typeof payload === 'string') {
          (request as any).__auditPayload = JSON.parse(payload);
        } else if (typeof payload === 'object') {
          (request as any).__auditPayload = payload;
        }
      } catch {
        // ignore parse error
      }
    }
    return payload;
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Only audit mutating methods that succeeded
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return;
    if (reply.statusCode < 200 || reply.statusCode >= 300) return;

    const url = request.url;
    // Skip internal/health/probe/sync endpoints
    if (
      url.startsWith('/health') ||
      url.startsWith('/ready') ||
      url.startsWith('/docs') ||
      url.startsWith('/openapi') ||
      url.startsWith('/api/v1/sync')
    ) {
      return;
    }

    const { action, entityType, entityId } = parseAuditAction(request.method, url);
    const tenantId =
      (request.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001';
    const rawUserId = request.headers['x-user-id'] as string | undefined;
    const userId = rawUserId && uuidRegex.test(rawUserId) ? rawUserId : undefined;
    const rawDeviceId = (request.headers['x-device-id'] ||
      request.headers['x-installation-id']) as string | undefined;
    const deviceId = rawDeviceId && uuidRegex.test(rawDeviceId) ? rawDeviceId : undefined;
    const ipAddress = request.ip || (request.socket as any)?.remoteAddress || '127.0.0.1';

    let newValues: any = undefined;
    if (request.body && typeof request.body === 'object') {
      newValues = { ...(request.body as any) };
      delete newValues.password;
      delete newValues.token;
    }

    const responseData = (request as any).__auditPayload?.data;
    const responseId =
      responseData && typeof responseData.id === 'string' && uuidRegex.test(responseData.id)
        ? responseData.id
        : responseData && typeof responseData.invoiceId === 'string' && uuidRegex.test(responseData.invoiceId)
        ? responseData.invoiceId
        : undefined;

    if (responseData && typeof responseData === 'object' && !Array.isArray(responseData)) {
      if (!newValues) newValues = {};
      if (responseData.invoiceNumber && !newValues.invoiceNumber) {
        newValues.invoiceNumber = responseData.invoiceNumber;
      }
      if (responseData.displayName && !newValues.name) {
        newValues.name = responseData.displayName;
      }
    }

    const resolvedEntityId =
      (entityId && uuidRegex.test(entityId) ? entityId : undefined) ||
      (request.body &&
      typeof (request.body as any).id === 'string' &&
      uuidRegex.test((request.body as any).id)
        ? (request.body as any).id
        : undefined) ||
      responseId;

    try {
      if (typeof (uow as any).recordAuditLog === 'function') {
        await (uow as any).recordAuditLog({
          tenantId,
          userId,
          entityType,
          entityId: resolvedEntityId,
          action,
          newValues,
          ipAddress,
          deviceId,
        });
      } else {
        await uow.runInTransaction(async (ctx) => {
          await ctx.audit.record({
            tenantId,
            userId,
            entityType,
            entityId: resolvedEntityId,
            action,
            newValues,
            ipAddress,
            deviceId,
          });
        });
      }
    } catch (err) {
      request.log.warn({ err }, 'Failed to automatically record audit log');
    }
  });
}
