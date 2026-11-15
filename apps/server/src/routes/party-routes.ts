import { FastifyPluginAsync } from 'fastify';
import { UnitOfWork, TenantContext, Party, PartyType } from '@vyapaarkhata/domain';
import { randomUUID } from 'node:crypto';

export interface PartyRoutesOptions {
  uow: UnitOfWork;
}

export const partyRoutes: FastifyPluginAsync<PartyRoutesOptions> = async (app, opts) => {
  function resolveTenant(req: any): TenantContext {
    return {
      tenantId: (req.headers['x-tenant-id'] as string) || '00000000-0000-0000-0000-000000000001',
      installationId:
        (req.headers['x-installation-id'] as string) || '00000000-0000-0000-0000-000000000001',
      userId: req.headers['x-user-id'] as string | undefined,
    };
  }

  // GET /api/v1/parties
  app.get<{ Querystring: { type?: string } }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const parties = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.list(tenant.tenantId, req.query.type as PartyType | undefined);
    });

    return reply.status(200).send({
      success: true,
      data: parties,
      requestId: req.id,
    });
  });

  // GET /api/v1/parties/:id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const party = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.findById(tenant.tenantId, req.params.id);
    });

    if (!party) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Party ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    return reply.status(200).send({
      success: true,
      data: party,
      requestId: req.id,
    });
  });

  // POST /api/v1/parties
  app.post<{ Body: Partial<Party> }>('/', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const party: Party = {
      id: body.id || randomUUID(),
      tenantId: tenant.tenantId,
      partyType: body.partyType || 'customer',
      displayName: body.displayName || 'Unnamed Party',
      legalName: body.legalName,
      phone: body.phone,
      email: body.email,
      pan: body.pan,
      gstin: body.gstin,
      billingAddress: body.billingAddress,
      openingBalance: body.openingBalance || 0,
      openingBalanceType: body.openingBalanceType || 'debit',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.parties.save(party);
    });

    return reply.status(201).send({
      success: true,
      data: party,
      requestId: req.id,
    });
  });

  // PUT /api/v1/parties/:id
  app.put<{ Params: { id: string }; Body: Partial<Party> }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const existing = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.findById(tenant.tenantId, req.params.id);
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: `Party ${req.params.id} not found` },
        requestId: req.id,
      });
    }

    const body = req.body || {};
    const updated: Party = {
      ...existing,
      partyType: body.partyType || existing.partyType,
      displayName: body.displayName || existing.displayName,
      legalName: body.legalName !== undefined ? body.legalName : existing.legalName,
      phone: body.phone !== undefined ? body.phone : existing.phone,
      email: body.email !== undefined ? body.email : existing.email,
      pan: body.pan !== undefined ? body.pan : existing.pan,
      gstin: body.gstin !== undefined ? body.gstin : existing.gstin,
      billingAddress: body.billingAddress !== undefined ? body.billingAddress : existing.billingAddress,
      isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
    };

    await opts.uow.runInTransaction(async (ctx) => {
      await ctx.parties.save(updated);
    });

    return reply.status(200).send({
      success: true,
      data: updated,
      requestId: req.id,
    });
  });

  // DELETE /api/v1/parties/:id
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const tenant = resolveTenant(req);
    const partyId = req.params.id;

    await opts.uow.runInTransaction(async (ctx) => {
      const existing = await ctx.parties.findById(tenant.tenantId, partyId);
      if (existing) {
        existing.isActive = false;
        await ctx.parties.save(existing);
      }
    });

    return reply.status(200).send({
      success: true,
      message: 'Party removed successfully',
      requestId: req.id,
    });
  });

  // POST /api/v1/parties/bulk-import
  app.post<{
    Body: {
      parties?: Array<any>;
      customers?: Array<any>;
      items?: Array<any>;
    };
  }>('/bulk-import', async (req, reply) => {
    const tenant = resolveTenant(req);
    const body = req.body || {};
    const rawList = body.customers || body.parties || body.items || [];

    if (!Array.isArray(rawList) || rawList.length === 0) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'No customer/party records provided for bulk import' },
        requestId: req.id,
      });
    }

    try {
      const result = await opts.uow.runInTransaction(async (ctx) => {
        // Cache existing parties for this tenant
        const existingList = await ctx.parties.list(tenant.tenantId);
        const partyByPhone = new Map<string, Party>();
        const partyByName = new Map<string, Party>();

        for (const p of existingList) {
          if (p.phone && p.phone.trim()) {
            const digits = p.phone.replace(/\D/g, '');
            if (digits) partyByPhone.set(digits, p);
          }
          if (p.displayName && p.displayName.trim()) {
            partyByName.set(p.displayName.trim().toLowerCase(), p);
          }
        }

        let createdCount = 0;
        let updatedCount = 0;

        for (const row of rawList) {
          const rawName = row.name || row.displayName || row['Party Name'] || row['Customer Name'] || row['Name'] || '';
          if (!rawName || !String(rawName).trim()) continue;
          const displayName = String(rawName).trim();

          const rawPhone = row.phone || row['Phone'] || row['Mobile'] || row['Phone / Mobile'] || row['Contact'] || '';
          const phone = rawPhone ? String(rawPhone).trim() : undefined;
          const phoneDigits = phone ? phone.replace(/\D/g, '') : '';

          const rawType = String(row.partyType || row.type || row['Party Type'] || row['Type'] || 'customer').trim().toLowerCase();
          let partyType: PartyType = 'customer';
          if (rawType.includes('supp') || rawType.includes('विक्रेता') || rawType.includes('सप्लायर')) {
            partyType = 'supplier';
          } else if (rawType.includes('both') || rawType.includes('दोनों')) {
            partyType = 'both';
          }

          const rawBal = row.openingBalance !== undefined ? row.openingBalance : row['Opening Balance'] || row['balance'] || 0;
          const openingBalance = Math.abs(parseFloat(rawBal) || 0);

          const rawBalType = String(
            row.openingBalanceType ||
            row['Balance Type'] ||
            row['Balance Type (To Receive / To Pay)'] ||
            row['Debit/Credit'] ||
            ''
          ).trim().toLowerCase();

          let openingBalanceType: 'debit' | 'credit' = partyType === 'supplier' ? 'credit' : 'debit';
          if (rawBalType.includes('pay') || rawBalType.includes('देना') || rawBalType.includes('cr')) {
            openingBalanceType = 'credit';
          } else if (rawBalType.includes('rec') || rawBalType.includes('लेना') || rawBalType.includes('dr')) {
            openingBalanceType = 'debit';
          }

          const billingAddress = String(row.billingAddress || row.address || row['Billing Address'] || row['Address'] || row['पता'] || '').trim() || undefined;
          const gstin = String(row.gstin || row.gst || row['GSTIN'] || row['GST'] || '').trim().toUpperCase() || undefined;
          const pan = String(row.pan || row['PAN'] || '').trim().toUpperCase() || undefined;
          const email = String(row.email || row['Email'] || '').trim().toLowerCase() || undefined;

          // Check if party exists by phone or name
          let matched: Party | undefined = undefined;
          if (phoneDigits && partyByPhone.has(phoneDigits)) {
            matched = partyByPhone.get(phoneDigits);
          } else if (partyByName.has(displayName.toLowerCase())) {
            matched = partyByName.get(displayName.toLowerCase());
          }

          if (matched) {
            // Update existing party
            const updated: Party = {
              ...matched,
              displayName,
              partyType: partyType || matched.partyType,
              phone: phone || matched.phone,
              email: email || matched.email,
              gstin: gstin || matched.gstin,
              pan: pan || matched.pan,
              billingAddress: billingAddress || matched.billingAddress,
              openingBalance: openingBalance > 0 ? openingBalance : matched.openingBalance,
              openingBalanceType: openingBalance > 0 ? openingBalanceType : matched.openingBalanceType,
            };

            await ctx.parties.save(updated);

            // Update opening balance entry if exists and openingBalance was passed
            if (ctx.rawQuery && openingBalance > 0) {
              const existingOpening = await ctx.rawQuery(
                `SELECT id FROM party_ledger_entries WHERE party_id = $1 AND document_type = 'opening_balance' LIMIT 1`,
                [matched.id]
              );
              if (existingOpening.length > 0) {
                const isDebit = openingBalanceType === 'debit';
                const debitAmount = isDebit ? openingBalance : 0;
                const creditAmount = !isDebit ? openingBalance : 0;
                await ctx.rawQuery(
                  `UPDATE party_ledger_entries SET debit_amount = $1, credit_amount = $2 WHERE id = $3`,
                  [debitAmount, creditAmount, existingOpening[0].id]
                );
              }
            }

            updatedCount++;
            if (phoneDigits) partyByPhone.set(phoneDigits, updated);
            partyByName.set(displayName.toLowerCase(), updated);
          } else {
            // Create new party
            const partyId = randomUUID();
            const newParty: Party = {
              id: partyId,
              tenantId: tenant.tenantId,
              partyType,
              displayName,
              legalName: displayName,
              phone,
              email,
              gstin,
              pan,
              billingAddress,
              openingBalance,
              openingBalanceType,
              isActive: true,
              createdAt: new Date().toISOString(),
            };

            await ctx.parties.save(newParty);
            createdCount++;

            if (phoneDigits) partyByPhone.set(phoneDigits, newParty);
            partyByName.set(displayName.toLowerCase(), newParty);
          }
        }

        return { createdCount, updatedCount, total: createdCount + updatedCount };
      });

      return reply.status(200).send({
        success: true,
        data: result,
        message: `Successfully processed ${result.total} parties (${result.createdCount} new, ${result.updatedCount} updated).`,
        requestId: req.id,
      });
    } catch (err: any) {
      req.log.error(err, 'Bulk import of parties failed');
      return reply.status(500).send({
        success: false,
        error: { code: 'IMPORT_ERROR', message: err.message || 'Failed to bulk import parties' },
        requestId: req.id,
      });
    }
  });

  // GET /api/v1/parties/:id/ledger
  app.get<{ Params: { id: string } }>('/:id/ledger', async (req, reply) => {
    const tenant = resolveTenant(req);
    const entries = await opts.uow.runInTransaction(async (ctx) => {
      return ctx.parties.listLedgerEntries(tenant.tenantId, req.params.id);
    });

    return reply.status(200).send({
      success: true,
      data: entries,
      requestId: req.id,
    });
  });
};
