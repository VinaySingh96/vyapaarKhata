import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
import { SalesInvoice, Party } from '@vyapaarkhata/domain';
import { InMemoryUnitOfWork } from '../../../packages/domain/test/in-memory-uow.js';

describe('Sales Invoice Share API Integration Suite (FR-COMMS-001)', () => {
  const config = loadConfig({ NODE_ENV: 'test', PORT: '4002', DB_DRIVER: 'sqlite' });
  let uow: InMemoryUnitOfWork;
  let app: any;

  const tenantId = '00000000-0000-0000-0000-000000000001';
  const customerId = 'cust-sharma-01';

  const testCustomer: Party = {
    id: customerId,
    tenantId,
    partyType: 'customer',
    displayName: 'Sharma Construction',
    legalName: 'Sharma Construction Pvt Ltd',
    phone: '9876543210',
    alternatePhone: '9876543211',
    whatsappPhone: '9876543210',
    whatsappOptIn: 'opted_in',
    whatsappOptInAt: '2026-11-20T10:00:00Z',
    whatsappOptInSource: 'manual_operator',
    billingAddress: 'Site 4, Ring Road, Vadodara',
    openingBalance: 0,
    openingBalanceType: 'debit',
    isActive: true,
    createdAt: '2026-11-01T00:00:00Z',
  };

  const postedInvoice: SalesInvoice = {
    id: 'inv-posted-01',
    tenantId,
    invoiceNumber: 'INV/2026-27/0012',
    invoiceDate: '2026-11-22',
    customerId,
    customerName: 'Sharma Construction',
    status: 'posted',
    subtotal: 20000,
    taxTotal: 3600,
    grandTotal: 23600,
    amountPaid: 5000,
    balanceDue: 18600,
    paymentStatus: 'partial',
    postedAt: '2026-11-22T14:30:00Z',
    lines: [
      {
        id: 'line-1',
        productId: 'prod-cement',
        quantity: 50,
        unitId: 'unit-bag',
        unitPrice: 400,
        taxAmount: 3600,
        lineTotal: 23600,
      },
    ],
  };

  const draftInvoice: SalesInvoice = {
    id: 'inv-draft-01',
    tenantId,
    invoiceNumber: 'INV-DRAFT-001',
    customerId,
    status: 'draft',
    subtotal: 1000,
    taxTotal: 180,
    grandTotal: 1180,
    lines: [],
  };

  beforeEach(() => {
    uow = new InMemoryUnitOfWork();
    app = buildApp(config, uow);

    uow.parties.set(testCustomer.id, testCustomer);
    uow.invoices.set(postedInvoice.id, postedInvoice);
    uow.invoices.set(draftInvoice.id, draftInvoice);
  });

  describe('GET /api/v1/sales/invoices/:id/share-details', () => {
    it('returns authoritative sharing details for a posted sales invoice', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/sales/invoices/${postedInvoice.id}/share-details`,
        headers: {
          'x-tenant-id': tenantId,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.data.invoiceId).toBe(postedInvoice.id);
      expect(body.data.invoiceNumber).toBe('INV/2026-27/0012');
      expect(body.data.status).toBe('posted');
      expect(body.data.grandTotal).toBe(23600);
      expect(body.data.amountPaid).toBe(5000);
      expect(body.data.balanceDue).toBe(18600);
      expect(body.data.businessName).toBe('Patel Building Materials');
      expect(body.data.currencySymbol).toBe('₹');

      // Contact candidates
      expect(body.data.customer.displayName).toBe('Sharma Construction');
      expect(body.data.customer.contacts.length).toBeGreaterThanOrEqual(2);

      const waContact = body.data.customer.contacts.find((c: any) => c.isDedicatedWhatsApp);
      expect(waContact).toBeDefined();
      expect(waContact.phoneE164).toBe('+919876543210');
      expect(waContact.whatsappPreference).toBe('opted_in');
    });

    it('rejects sharing on a draft invoice with 400 error (FR-COMMS-001 §5.3)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/sales/invoices/${draftInvoice.id}/share-details`,
        headers: {
          'x-tenant-id': tenantId,
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toContain("Cannot share invoice in 'draft' status");
    });

    it('returns 404 when invoice belongs to another tenant (Tenant Isolation §17)', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/v1/sales/invoices/${postedInvoice.id}/share-details`,
        headers: {
          'x-tenant-id': '99999999-9999-9999-9999-999999999999', // Different tenant
        },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('POST /api/v1/sales/invoices/:id/share-actions', () => {
    it('records observable share request actions without claiming false delivery status (FR-COMMS-001 §8.3)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/sales/invoices/${postedInvoice.id}/share-actions`,
        headers: {
          'x-tenant-id': tenantId,
        },
        payload: {
          action: 'WHATSAPP_CHAT_OPEN_REQUESTED',
          maskedDestination: '+91 ******3210',
          platform: 'laptop-chrome',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.success).toBe(true);
      expect(body.message).toContain('Share action recorded');
    });

    it('rejects invalid or unauthorized action types (such as false "DELIVERED" or "SENT")', async () => {
      const res = await app.inject({
        method: 'POST',
        url: `/api/v1/sales/invoices/${postedInvoice.id}/share-actions`,
        headers: {
          'x-tenant-id': tenantId,
        },
        payload: {
          action: 'MESSAGE_DELIVERED', // Not allowed by spec
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});
