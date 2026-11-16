import { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import {
  RentalRepository,
  RentalIssue,
  RentalIssueLine,
  RentalReturn,
  RentalSettings,
  DEFAULT_RENTAL_SETTINGS,
  InventoryLocation,
  EntityId,
} from '@vyapaarkhata/domain';

const SETTINGS_KEY = 'rental';
const num = (v: any) => (v === null || v === undefined ? 0 : parseFloat(v));
const isoDate = (v: any) => (v instanceof Date ? toLocalIsoDate(v) : String(v).slice(0, 10));
const isoTs = (v: any) => (v ? new Date(v).toISOString() : undefined);

// node-postgres parses DATE columns as local midnight; format back without UTC shifting
function toLocalIsoDate(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/**
 * PostgreSQL implementation of the rental module repository (ADR-007).
 * Runs on the caller's transaction client so rental writes commit atomically
 * with stock movements and the rent invoice.
 */
export function createPgRentalRepository(client: PoolClient): RentalRepository {
  const repo: RentalRepository = {
    getSettings: async (tenantId: EntityId): Promise<RentalSettings> => {
      const res = await client.query(
        `SELECT setting_value FROM tenant_settings WHERE tenant_id = $1 AND setting_key = $2 LIMIT 1`,
        [tenantId, SETTINGS_KEY]
      );
      return { ...DEFAULT_RENTAL_SETTINGS, ...(res.rows[0]?.setting_value || {}) };
    },

    saveSettings: async (tenantId: EntityId, settings: RentalSettings): Promise<void> => {
      const updated = await client.query(
        `UPDATE tenant_settings SET setting_value = $1, updated_at = NOW()
         WHERE tenant_id = $2 AND setting_key = $3`,
        [JSON.stringify(settings), tenantId, SETTINGS_KEY]
      );
      if (updated.rowCount === 0) {
        await client.query(
          `INSERT INTO tenant_settings (id, tenant_id, setting_key, setting_value, updated_at)
           VALUES ($1, $2, $3, $4, NOW())`,
          [randomUUID(), tenantId, SETTINGS_KEY, JSON.stringify(settings)]
        );
      }
    },

    ensureOnRentLocation: async (tenantId: EntityId): Promise<InventoryLocation> => {
      const existing = await client.query(
        `SELECT id, tenant_id, business_location_id, name, code, location_type, is_default, is_active, created_at
         FROM inventory_locations
         WHERE tenant_id = $1 AND location_type = 'on_rent'
         ORDER BY created_at ASC LIMIT 1`,
        [tenantId]
      );
      if (existing.rows.length > 0) return mapLocation(existing.rows[0]);

      const parent = await client.query(
        `SELECT business_location_id FROM inventory_locations
         WHERE tenant_id = $1 AND is_active = true
         ORDER BY is_default DESC, created_at ASC LIMIT 1`,
        [tenantId]
      );
      const businessLocationId = parent.rows[0]?.business_location_id;
      if (!businessLocationId) throw new Error('No stock location configured for this store');

      const created = await client.query(
        `INSERT INTO inventory_locations (id, tenant_id, business_location_id, name, code, location_type, is_default, is_active, created_at)
         VALUES ($1, $2, $3, 'On Rent (किराये पर)', 'ON-RENT', 'on_rent', FALSE, TRUE, NOW())
         RETURNING id, tenant_id, business_location_id, name, code, location_type, is_default, is_active, created_at`,
        [randomUUID(), tenantId, businessLocationId]
      );
      return mapLocation(created.rows[0]);
    },

    nextNumber: async (tenantId: EntityId, kind: 'issue' | 'return'): Promise<string> => {
      const [table, column, prefix] =
        kind === 'issue' ? ['rental_issues', 'issue_number', 'RI'] : ['rental_returns', 'return_number', 'RR'];
      // Serialise numbering per tenant for the rest of this transaction
      await client.query(`SELECT pg_advisory_xact_lock(hashtext($1))`, [`${table}:${tenantId}`]);
      const res = await client.query(
        `SELECT COALESCE(MAX(NULLIF(regexp_replace(${column}, '\\D', '', 'g'), '')::int), 0) AS max_no
         FROM ${table} WHERE tenant_id = $1`,
        [tenantId]
      );
      return `${prefix}-${String(Number(res.rows[0].max_no) + 1).padStart(4, '0')}`;
    },

    saveIssue: async (issue: RentalIssue): Promise<void> => {
      await client.query(
        `INSERT INTO rental_issues (
           id, tenant_id, party_id, business_location_id, source_location_id, on_rent_location_id,
           issue_number, issue_date, site_address, status, deposit_amount, notes, created_by, cancelled_at, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           site_address = EXCLUDED.site_address,
           notes = EXCLUDED.notes,
           cancelled_at = EXCLUDED.cancelled_at,
           updated_at = EXCLUDED.updated_at`,
        [
          issue.id,
          issue.tenantId,
          issue.partyId,
          issue.businessLocationId || null,
          issue.sourceLocationId,
          issue.onRentLocationId,
          issue.issueNumber,
          issue.issueDate,
          issue.siteAddress || null,
          issue.status,
          issue.depositAmount || 0,
          issue.notes || null,
          issue.createdBy || null,
          issue.cancelledAt || null,
          issue.createdAt,
          issue.updatedAt || null,
        ]
      );

      for (const line of issue.lines) {
        await client.query(
          `INSERT INTO rental_issue_lines (
             id, issue_id, variant_id, unit_id, description_snapshot, qty_issued, qty_returned, qty_lost, daily_rate, replacement_rate
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             qty_returned = EXCLUDED.qty_returned,
             qty_lost = EXCLUDED.qty_lost`,
          [
            line.id,
            issue.id,
            line.variantId,
            line.unitId,
            line.description || null,
            line.qtyIssued,
            line.qtyReturned,
            line.qtyLost,
            line.dailyRate,
            line.replacementRate || 0,
          ]
        );
      }
    },

    findIssueById: async (tenantId: EntityId, id: EntityId): Promise<RentalIssue | null> => {
      const res = await client.query(`${ISSUE_SELECT} WHERE ri.tenant_id = $1 AND ri.id = $2`, [tenantId, id]);
      if (res.rows.length === 0) return null;
      const linesByIssue = await loadIssueLines(client, [id]);
      return mapIssue(res.rows[0], linesByIssue.get(id) || []);
    },

    listIssues: async (tenantId, filter): Promise<RentalIssue[]> => {
      const res = await client.query(
        `${ISSUE_SELECT}
         WHERE ri.tenant_id = $1
           AND ($2::uuid IS NULL OR ri.party_id = $2)
           AND ($3::text[] IS NULL OR ri.status = ANY($3))
         ORDER BY ri.issue_date DESC, ri.created_at DESC
         LIMIT $4`,
        [tenantId, filter?.partyId || null, filter?.statuses?.length ? filter.statuses : null, filter?.limit || 200]
      );
      const linesByIssue = await loadIssueLines(
        client,
        res.rows.map((r) => r.id)
      );
      return res.rows.map((r) => mapIssue(r, linesByIssue.get(r.id) || []));
    },

    saveReturn: async (ret: RentalReturn): Promise<void> => {
      await client.query(
        `INSERT INTO rental_returns (
           id, tenant_id, issue_id, return_number, return_date, is_final, status, sales_invoice_id,
           gst_rate, rent_amount, loss_amount, tax_amount, total_amount, notes, created_by, cancelled_at, created_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           cancelled_at = EXCLUDED.cancelled_at`,
        [
          ret.id,
          ret.tenantId,
          ret.issueId,
          ret.returnNumber,
          ret.returnDate,
          ret.isFinal,
          ret.status,
          ret.salesInvoiceId || null,
          ret.gstRate,
          ret.rentAmount,
          ret.lossAmount,
          ret.taxAmount,
          ret.totalAmount,
          ret.notes || null,
          ret.createdBy || null,
          ret.cancelledAt || null,
          ret.createdAt,
        ]
      );

      for (const line of ret.lines) {
        await client.query(
          `INSERT INTO rental_return_lines (
             id, return_id, issue_line_id, qty_returned, qty_lost, days, daily_rate, rent_amount, loss_rate, loss_amount
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO NOTHING`,
          [
            line.id,
            ret.id,
            line.issueLineId,
            line.qtyReturned,
            line.qtyLost,
            line.days,
            line.dailyRate,
            line.rentAmount,
            line.lossRate,
            line.lossAmount,
          ]
        );
      }
    },

    findReturnById: async (tenantId: EntityId, id: EntityId): Promise<RentalReturn | null> => {
      const res = await client.query(`${RETURN_SELECT} WHERE rr.tenant_id = $1 AND rr.id = $2`, [tenantId, id]);
      if (res.rows.length === 0) return null;
      const lines = await loadReturnLines(client, [id]);
      return mapReturn(res.rows[0], lines.get(id) || []);
    },

    listReturns: async (tenantId: EntityId, issueId: EntityId): Promise<RentalReturn[]> => {
      const res = await client.query(
        `${RETURN_SELECT} WHERE rr.tenant_id = $1 AND rr.issue_id = $2 ORDER BY rr.return_date ASC, rr.created_at ASC`,
        [tenantId, issueId]
      );
      const lines = await loadReturnLines(
        client,
        res.rows.map((r) => r.id)
      );
      return res.rows.map((r) => mapReturn(r, lines.get(r.id) || []));
    },

    findReturnByInvoiceId: async (tenantId: EntityId, invoiceId: EntityId): Promise<RentalReturn | null> => {
      const res = await client.query(
        `${RETURN_SELECT} WHERE rr.tenant_id = $1 AND rr.sales_invoice_id = $2 LIMIT 1`,
        [tenantId, invoiceId]
      );
      if (res.rows.length === 0) return null;
      const lines = await loadReturnLines(client, [res.rows[0].id]);
      return mapReturn(res.rows[0], lines.get(res.rows[0].id) || []);
    },
  };

  return repo;
}

const ISSUE_SELECT = `
  SELECT ri.*, p.display_name AS party_name, p.phone AS party_phone
  FROM rental_issues ri
  LEFT JOIN parties p ON p.id = ri.party_id`;

const RETURN_SELECT = `
  SELECT rr.*, si.invoice_number
  FROM rental_returns rr
  LEFT JOIN sales_invoices si ON si.id = rr.sales_invoice_id`;

async function loadIssueLines(client: PoolClient, issueIds: string[]): Promise<Map<string, RentalIssueLine[]>> {
  const map = new Map<string, RentalIssueLine[]>();
  if (issueIds.length === 0) return map;
  const res = await client.query(
    `SELECT ril.*, COALESCE(ril.description_snapshot, pv.variant_name, p.name) AS description, u.symbol AS unit_symbol
     FROM rental_issue_lines ril
     LEFT JOIN product_variants pv ON pv.id = ril.variant_id
     LEFT JOIN products p ON p.id = pv.product_id
     LEFT JOIN units u ON u.id = ril.unit_id
     WHERE ril.issue_id = ANY($1::uuid[])
     ORDER BY ril.description_snapshot ASC NULLS LAST, ril.id ASC`,
    [issueIds]
  );
  for (const r of res.rows) {
    const list = map.get(r.issue_id) || [];
    list.push({
      id: r.id,
      issueId: r.issue_id,
      variantId: r.variant_id,
      unitId: r.unit_id,
      description: r.description || undefined,
      unitSymbol: r.unit_symbol || undefined,
      qtyIssued: num(r.qty_issued),
      qtyReturned: num(r.qty_returned),
      qtyLost: num(r.qty_lost),
      dailyRate: num(r.daily_rate),
      replacementRate: num(r.replacement_rate),
    });
    map.set(r.issue_id, list);
  }
  return map;
}

async function loadReturnLines(client: PoolClient, returnIds: string[]) {
  const map = new Map<string, RentalReturn['lines']>();
  if (returnIds.length === 0) return map;
  const res = await client.query(
    `SELECT rrl.*, COALESCE(ril.description_snapshot, pv.variant_name, p.name) AS description
     FROM rental_return_lines rrl
     JOIN rental_issue_lines ril ON ril.id = rrl.issue_line_id
     LEFT JOIN product_variants pv ON pv.id = ril.variant_id
     LEFT JOIN products p ON p.id = pv.product_id
     WHERE rrl.return_id = ANY($1::uuid[])`,
    [returnIds]
  );
  for (const r of res.rows) {
    const list = map.get(r.return_id) || [];
    list.push({
      id: r.id,
      returnId: r.return_id,
      issueLineId: r.issue_line_id,
      qtyReturned: num(r.qty_returned),
      qtyLost: num(r.qty_lost),
      days: Number(r.days),
      dailyRate: num(r.daily_rate),
      rentAmount: num(r.rent_amount),
      lossRate: num(r.loss_rate),
      lossAmount: num(r.loss_amount),
      description: r.description || undefined,
    });
    map.set(r.return_id, list);
  }
  return map;
}

function mapLocation(r: any): InventoryLocation {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    businessLocationId: r.business_location_id,
    name: r.name,
    code: r.code,
    locationType: r.location_type,
    isDefault: r.is_default,
    isActive: r.is_active,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

function mapIssue(r: any, lines: RentalIssueLine[]): RentalIssue {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    partyId: r.party_id,
    partyName: r.party_name || undefined,
    partyPhone: r.party_phone || undefined,
    businessLocationId: r.business_location_id || undefined,
    sourceLocationId: r.source_location_id,
    onRentLocationId: r.on_rent_location_id,
    issueNumber: r.issue_number,
    issueDate: isoDate(r.issue_date),
    siteAddress: r.site_address || undefined,
    status: r.status,
    depositAmount: num(r.deposit_amount),
    notes: r.notes || undefined,
    createdBy: r.created_by || undefined,
    cancelledAt: isoTs(r.cancelled_at),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: isoTs(r.updated_at),
    lines,
  };
}

function mapReturn(r: any, lines: RentalReturn['lines']): RentalReturn {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    issueId: r.issue_id,
    returnNumber: r.return_number,
    returnDate: isoDate(r.return_date),
    isFinal: r.is_final,
    status: r.status,
    salesInvoiceId: r.sales_invoice_id || undefined,
    invoiceNumber: r.invoice_number || undefined,
    gstRate: num(r.gst_rate),
    rentAmount: num(r.rent_amount),
    lossAmount: num(r.loss_amount),
    taxAmount: num(r.tax_amount),
    totalAmount: num(r.total_amount),
    notes: r.notes || undefined,
    createdBy: r.created_by || undefined,
    cancelledAt: isoTs(r.cancelled_at),
    createdAt: new Date(r.created_at).toISOString(),
    lines,
  };
}
