import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  InvoicePostingService,
  PaymentService,
  TenantContext,
  UnitOfWork,
  SalesInvoice,
  Payment,
  Party,
  InvoiceShareDetailsDto,
  InvoiceCustomerContactDto,
  InvoiceShareActionPayload,
  InvoiceShareActionType,
  InvoicePaymentStatus,
  normalizePhoneNumber,
} from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';
import { AppError } from '../errors/app-error.js';

export interface SalesRoutesOptions {
  uow: UnitOfWork;
}

export const salesRoutes: FastifyPluginAsync<SalesRoutesOptions> = async (app, opts) => {
  const service = new InvoicePostingService(opts.uow);
  const paymentService = new PaymentService(opts.uow);

  function resolveTenantContext(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // Rent bills (RNT-) must be cancelled from Rentals so stock and on-rent quantities stay in sync
  async function assertNotRentalBill(tenantId: string, invoiceId: string): Promise<void> {
    const rentalReturn = await opts.uow.runInTransaction(async (ctx) =>
      ctx.rentals ? ctx.rentals.findReturnByInvoiceId(tenantId, invoiceId) : null
    );
    if (rentalReturn) {
      throw new AppError(
        `This is a rental bill for return ${rentalReturn.returnNumber}. Cancel it from Rentals instead.`,
        409,
        'CONFLICT'
      );
    }
  }

  // GET /api/v1/sales/invoices
  app.get<{ Querystring: { limit?: string } }>('/invoices', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 50;

    const invoices = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.list(tenantContext.tenantId, limit);
    });

    return reply.status(200).send({
      success: true,
      data: invoices,
      requestId: req.id,
    });
  });

  // GET /api/v1/sales/invoices/:id
  app.get<{ Params: { id: string } }>('/invoices/:id', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoice = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.findById(tenantContext.tenantId, req.params.id);
    });

    if (!invoice) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Invoice ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: invoice,
      requestId: req.id,
    });
  });

  // GET /api/v1/sales/invoices/:id/share-details (FR-COMMS-001 §9)
  app.get<{ Params: { id: string } }>('/invoices/:id/share-details', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoiceId = req.params.id;

    const data = await opts.uow.runInTransaction(async (ctx) => {
      const invoice = await ctx.invoices.findById(tenantContext.tenantId, invoiceId);
      if (!invoice) return null;

      // FR-COMMS-001 §5.3 & §13: Sharing is only allowed for finalized posted invoices
      if (invoice.status !== 'posted') {
        throw new AppError(
          `Cannot share invoice in '${invoice.status}' status. Only posted invoices can be shared.`,
          400,
          'VALIDATION_ERROR'
        );
      }

      const customer = await ctx.parties.findById(tenantContext.tenantId, invoice.customerId);
      const settings = await ctx.settings.getSettings(tenantContext.tenantId);

      const contacts: InvoiceCustomerContactDto[] = [];

      // 1. Dedicated WhatsApp number if present (FR-COMMS-001 §6.2 rule 1)
      if (customer?.whatsappPhone) {
        const norm = normalizePhoneNumber(customer.whatsappPhone, 'IN');
        contacts.push({
          id: `${customer.id}-wa`,
          displayName: customer.displayName,
          phone: customer.whatsappPhone,
          phoneE164: norm.phoneE164,
          isPrimary: true,
          isDedicatedWhatsApp: true,
          whatsappPreference: (customer.whatsappOptIn as any) || 'unknown',
        });
      }

      // 2. Primary customer phone (FR-COMMS-001 §6.2 rule 2)
      if (customer?.phone) {
        const norm = normalizePhoneNumber(customer.phone, 'IN');
        contacts.push({
          id: `${customer.id}-primary`,
          displayName: customer.displayName,
          phone: customer.phone,
          phoneE164: norm.phoneE164,
          isPrimary: !customer.whatsappPhone,
          isDedicatedWhatsApp: false,
          whatsappPreference: (customer.whatsappOptIn as any) || 'unknown',
        });
      }

      // 3. Alternate phone if present (FR-COMMS-001 §6.2 rule 3)
      if (customer?.alternatePhone) {
        const norm = normalizePhoneNumber(customer.alternatePhone, 'IN');
        contacts.push({
          id: `${customer.id}-alt`,
          displayName: `${customer.displayName} (Alternate)`,
          phone: customer.alternatePhone,
          phoneE164: norm.phoneE164,
          isPrimary: false,
          isDedicatedWhatsApp: false,
          whatsappPreference: 'unknown',
        });
      }

      const amountPaid = invoice.amountPaid || 0;
      const adjustmentAmount = invoice.adjustmentAmount || 0;
      const balanceDue =
        invoice.balanceDue !== undefined
          ? invoice.balanceDue
          : Math.max(0, invoice.grandTotal - (amountPaid + adjustmentAmount));

      const paymentStatus: InvoicePaymentStatus =
        invoice.paymentStatus || (balanceDue <= 0.005 ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid');

      const invoiceDate =
        invoice.invoiceDate ||
        (invoice.postedAt ? invoice.postedAt.split('T')[0] : new Date().toISOString().split('T')[0]);

      const shareDetails: InvoiceShareDetailsDto = {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        status: invoice.status,
        invoiceDate,
        businessName: settings?.storeName || settings?.legalName || 'vyapaarKhata Store',
        businessGstin: settings?.gstin || undefined,
        businessPhone: settings?.phone || undefined,
        businessAddress: settings?.address || undefined,
        customer: {
          id: customer?.id || invoice.customerId,
          displayName: customer?.displayName || invoice.customerName || 'Customer',
          contacts,
        },
        currency: settings?.currency || 'INR',
        currencySymbol: '₹',
        grandTotal: invoice.grandTotal,
        amountPaid,
        balanceDue,
        paymentStatus,
        pdfAvailable: true,
      };

      return shareDetails;
    });

    if (!data) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Invoice ${invoiceId} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data,
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices/:id/share-actions (FR-COMMS-001 §8.3 & §9)
  app.post<{
    Params: { id: string };
    Body: InvoiceShareActionPayload;
  }>('/invoices/:id/share-actions', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoiceId = req.params.id;
    const body = req.body || {};

    const validActions: InvoiceShareActionType[] = [
      'WHATSAPP_CHAT_OPEN_REQUESTED',
      'PDF_SHARE_REQUESTED',
      'PDF_DOWNLOADED',
      'SHARE_SHEET_OPENED',
      'CANCELLED',
    ];

    if (!body.action || !validActions.includes(body.action)) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid share action: "${body.action}". Must be one of ${validActions.join(', ')}`,
        },
        requestId: req.id,
      });
    }

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.audit.record({
        tenantId: tenantContext.tenantId,
        userId: tenantContext.userId,
        entityType: 'sales_invoice',
        entityId: invoiceId,
        action: `sales.invoice.share.${body.action.toLowerCase()}`,
        newValues: {
          action: body.action,
          maskedDestination: body.maskedDestination,
          platform: body.platform,
          timestamp: new Date().toISOString(),
        },
        deviceId: tenantContext.installationId,
      });
    });

    return reply.status(200).send({
      success: true,
      message: 'Share action recorded successfully',
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices
  app.post<{ Body: Partial<SalesInvoice> }>('/invoices', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const body = req.body || {};

    if (body.lines && body.lines.length > 0) {
      for (const line of body.lines) {
        if (typeof line.quantity === 'number' && line.quantity <= 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_QUANTITY',
              message: `Quantity for line item must be greater than zero (got ${line.quantity})`,
            },
            requestId: req.id,
          });
        }
        if (typeof line.unitPrice === 'number' && line.unitPrice < 0) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_PRICE',
              message: `Unit price for line item cannot be negative (got ${line.unitPrice})`,
            },
            requestId: req.id,
          });
        }
      }
    }

    const locations = await opts.uow.runInTransaction(async (ctx) => {
      return (await ctx.inventory.listLocations(tenantContext.tenantId)).filter((l) => l.locationType !== 'on_rent');
    });

    let sanitizedLines = body.lines || [];
    let finalBusinessLocationId = body.businessLocationId || '60000000-0000-0000-0000-000000000001';

    if (locations && locations.length > 0) {
      const defaultLocation = locations.find((l) => l.isDefault) || locations[0];
      const defaultLocationId = defaultLocation.id;
      const defaultBusinessLocationId = defaultLocation.businessLocationId || '60000000-0000-0000-0000-000000000001';
      const validLocationIds = new Set(locations.map((l) => l.id));

      if (!body.businessLocationId || body.businessLocationId === '60000000-0000-0000-0000-000000000001') {
        finalBusinessLocationId = defaultBusinessLocationId;
      }

      sanitizedLines = (body.lines || []).map((l: any) => ({
        ...l,
        locationId:
          !l.locationId || (!validLocationIds.has(l.locationId) && l.locationId === '70000000-0000-0000-0000-000000000001')
            ? defaultLocationId
            : l.locationId,
      }));
    }

    // Verify customer exists for this tenant, otherwise resolve or auto-create a Walk-in Customer
    let finalCustomerId: string = body.customerId || '';
    const existingCust = finalCustomerId
      ? await opts.uow.runInTransaction(async (ctx) => {
          return ctx.parties.findById(tenantContext.tenantId, finalCustomerId);
        })
      : null;

    if (!existingCust) {
      const custs = await opts.uow.runInTransaction(async (ctx) => {
        return ctx.parties.list(tenantContext.tenantId, 'customer');
      });
      if (custs.length > 0) {
        finalCustomerId = custs[0].id;
      } else {
        const walkInCustomer: Party = {
          id: randomUUID(),
          tenantId: tenantContext.tenantId,
          partyType: 'customer',
          displayName: 'Walk-in Customer (नकदी ग्राहक)',
          openingBalance: 0,
          openingBalanceType: 'debit',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        await opts.uow.runInTransaction(async (ctx) => {
          await ctx.parties.save(walkInCustomer);
        });
        finalCustomerId = walkInCustomer.id;
      }
    }

    const invoice: SalesInvoice = {
      id: body.id || randomUUID(),
      tenantId: tenantContext.tenantId,
      businessLocationId: finalBusinessLocationId,
      invoiceNumber: body.invoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
      customerId: finalCustomerId,
      status: 'draft',
      subtotal: body.subtotal || 0,
      taxTotal: body.taxTotal || 0,
      grandTotal: body.grandTotal || 0,
      lines: sanitizedLines,
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.invoices.save(invoice);
    });

    return reply.status(201).send({
      success: true,
      data: invoice,
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices/:id/post
  app.post<{ Params: { id: string } }>('/invoices/:id/post', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoiceId = req.params.id;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    // Check if the invoice draft lines have a locationId that doesn't belong to this tenant, and sanitize
    await opts.uow.runInTransaction(async (ctx) => {
      const inv = await ctx.invoices.findById(tenantContext.tenantId, invoiceId);
      if (inv && inv.status === 'draft') {
        const locations = (await ctx.inventory.listLocations(tenantContext.tenantId)).filter(
          (l) => l.locationType !== 'on_rent'
        );
        if (locations && locations.length > 0) {
          const validLocIds = new Set(locations.map((l) => l.id));
          const defLoc = locations.find((l) => l.isDefault) || locations[0];
          const defLocId = defLoc.id;

          let modified = false;
          for (const line of inv.lines) {
            if (
              !line.locationId ||
              (!validLocIds.has(line.locationId) && line.locationId === '70000000-0000-0000-0000-000000000001')
            ) {
              line.locationId = defLocId;
              modified = true;
            }
          }
          if (modified) {
            await ctx.invoices.save(inv);
          }
        }
      }
    });

    const result = await service.postInvoice({
      tenantContext,
      invoiceId,
      idempotencyKey,
    });

    return reply.status(200).send({
      success: true,
      data: result,
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices/:id/payments (Receive payment against invoice with optional adjustment)
  app.post<{
    Params: { id: string };
    Body: {
      amount?: number;
      adjustmentAmount?: number;
      adjustmentType?: string;
      paymentMode?: string;
      referenceNumber?: string;
      notes?: string;
    };
  }>('/invoices/:id/payments', async (req, reply) => {
    const tenantContext = resolveTenantContext(req);
    const invoiceId = req.params.id;
    const body = req.body || {};

    const amount = Math.max(0, typeof body.amount === 'number' ? body.amount : parseFloat(body.amount as any) || 0);
    const adjustmentAmount = Math.max(
      0,
      typeof body.adjustmentAmount === 'number'
        ? body.adjustmentAmount
        : parseFloat(body.adjustmentAmount as any) || 0
    );

    if (amount <= 0 && adjustmentAmount <= 0) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'INVALID_AMOUNT',
          message: 'Total settlement (payment amount + adjustment) must be greater than zero.',
        },
      });
    }

    const invoice = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.findById(tenantContext.tenantId, invoiceId);
    });

    if (!invoice) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Invoice ${invoiceId} not found` },
      });
    }

    if (invoice.status === 'cancelled') {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_STATUS', message: 'Cannot record payment for a cancelled invoice' },
      });
    }

    const currentBalanceDue =
      invoice.balanceDue !== undefined
        ? invoice.balanceDue
        : Math.max(0, invoice.grandTotal - ((invoice.amountPaid || 0) + (invoice.adjustmentAmount || 0)));

    if (amount + adjustmentAmount > currentBalanceDue + 0.05) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'EXCEEDS_BALANCE',
          message: `Total settlement (₹${(amount + adjustmentAmount).toFixed(
            2
          )}) exceeds current balance due (₹${currentBalanceDue.toFixed(2)})`,
        },
      });
    }

    const paymentId = randomUUID();
    const payment: Payment = {
      id: paymentId,
      tenantId: tenantContext.tenantId,
      partyId: invoice.customerId,
      paymentNumber: `PAY-${Date.now().toString().slice(-6)}`,
      direction: 'inbound',
      status: 'draft',
      amount,
      adjustmentAmount,
      adjustmentType: body.adjustmentType || (adjustmentAmount > 0 ? 'round_off' : undefined),
      paymentMode: body.paymentMode || 'cash',
      referenceNumber: body.referenceNumber,
      notes: body.notes,
      allocations: [
        {
          id: randomUUID(),
          tenantId: tenantContext.tenantId,
          paymentId,
          documentType: 'sales_invoice',
          documentId: invoice.id,
          allocatedAmount: amount,
          adjustmentAmount,
          adjustmentType: body.adjustmentType || (adjustmentAmount > 0 ? 'round_off' : undefined),
          notes: body.notes,
          createdAt: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.payments.savePayment(payment);
    });

    const postedPayment = await paymentService.postPayment({
      tenantContext,
      paymentId,
      allocations: [
        {
          documentType: 'sales_invoice',
          documentId: invoice.id,
          amount,
          adjustmentAmount,
          adjustmentType: body.adjustmentType || (adjustmentAmount > 0 ? 'round_off' : undefined),
          notes: body.notes,
        },
      ],
    });

    const updatedInvoice = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.invoices.findById(tenantContext.tenantId, invoiceId);
    });

    return reply.status(200).send({
      success: true,
      data: {
        payment: postedPayment,
        invoice: updatedInvoice,
      },
      message: 'Payment and adjustment recorded successfully',
      requestId: req.id,
    });
  });

  // POST /api/v1/sales/invoices/:id/cancel
  app.post<{ Params: { id: string }; Body: { reason?: string } }>(
    '/invoices/:id/cancel',
    async (req, reply) => {
      const tenantContext = resolveTenantContext(req);
      const invoiceId = req.params.id;
      const reason = req.body?.reason || 'Invoice cancelled by user';
      await assertNotRentalBill(tenantContext.tenantId, invoiceId);

      const invoice = await service.cancelInvoice({
        tenantContext,
        invoiceId,
        reason,
      });

      return reply.status(200).send({
        success: true,
        data: invoice,
        message: 'Invoice cancelled and inventory restored',
        requestId: req.id,
      });
    }
  );

  // DELETE /api/v1/sales/invoices/:id (Soft cancel + restore inventory)
  app.delete<{ Params: { id: string }; Body: { reason?: string } }>(
    '/invoices/:id',
    async (req, reply) => {
      const tenantContext = resolveTenantContext(req);
      const invoiceId = req.params.id;
      const reason = req.body?.reason || 'Invoice cancelled by user';
      await assertNotRentalBill(tenantContext.tenantId, invoiceId);

      const invoice = await service.cancelInvoice({
        tenantContext,
        invoiceId,
        reason,
      });

      return reply.status(200).send({
        success: true,
        data: invoice,
        message: 'Invoice cancelled and inventory restored',
        requestId: req.id,
      });
    }
  );
};
