/**
 * Permanently delete one tenant (store) and all of its data from a Store Server database.
 *
 *   pnpm tenant:delete <tenantId>             # dry run: prints what would be deleted
 *   pnpm tenant:delete <tenantId> --yes       # actually delete (single transaction)
 *
 * Connection: DATABASE_URL (default postgresql://postgres:password@localhost:5432/vyapaarkhata_patel)
 *
 * The table list is derived from the live schema, so new tables are covered automatically:
 *   - every table with a tenant_id column  -> rows WHERE tenant_id = <tenant>
 *   - child tables without tenant_id (invoice lines, journal lines, ...) -> rows referencing a deleted row
 *   - tenants / brands rows of that tenant (brand only if no other tenant uses it)
 * Deletes run in FK-safe order; anything left blocking rolls the whole transaction back.
 *
 * Remove the tenant from Central Cloud separately (Admin console -> Tenants -> Delete).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const { Client } = createRequire(path.join(root, 'packages/db/package.json'))('pg');

const args = process.argv.slice(2);
const tenantId = args.find((a) => !a.startsWith('--'));
const execute = args.includes('--yes');
const connectionString =
  process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/vyapaarkhata_patel';

if (!tenantId || !/^[0-9a-f-]{36}$/i.test(tenantId)) {
  console.error('Usage: pnpm tenant:delete <tenantId> [--yes]');
  process.exit(1);
}

const q = (ident) => `"${ident.replace(/"/g, '""')}"`;

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const tenant = await client.query('SELECT id, name, brand_id FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) {
      console.error(`Tenant ${tenantId} not found in this database.`);
      process.exitCode = 1;
      return;
    }
    const { name } = tenant.rows[0];

    const tablesRes = await client.query(`
      SELECT t.table_name,
             EXISTS (SELECT 1 FROM information_schema.columns c
                     WHERE c.table_schema = 'public' AND c.table_name = t.table_name AND c.column_name = 'tenant_id') AS has_tenant
      FROM information_schema.tables t
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'`);
    const fkRes = await client.query(`
      SELECT con.conrelid::regclass::text AS child, ca.attname AS child_col, ca.attnotnull AS not_null,
             con.confrelid::regclass::text AS parent, pa.attname AS parent_col
      FROM pg_constraint con
      JOIN pg_attribute ca ON ca.attrelid = con.conrelid AND ca.attnum = con.conkey[1]
      JOIN pg_attribute pa ON pa.attrelid = con.confrelid AND pa.attnum = con.confkey[1]
      WHERE con.contype = 'f' AND con.connamespace = 'public'::regnamespace`);
    const fks = fkRes.rows.map((r) => ({ ...r, child: r.child.replace(/"/g, ''), parent: r.parent.replace(/"/g, '') }));

    // 1. Which rows of each table belong to the tenant (SQL predicate; $1 = tenant id)
    const pred = new Map();
    for (const t of tablesRes.rows) {
      if (t.has_tenant) pred.set(t.table_name, 'tenant_id = $1');
    }
    pred.set('tenants', 'id = $1');
    pred.set('brands', 'id = $1 AND NOT EXISTS (SELECT 1 FROM tenants o WHERE o.brand_id = brands.id AND o.id <> $1)');

    // Child tables without tenant_id: rows that point at a row being deleted (repeat until stable)
    for (let changed = true; changed; ) {
      changed = false;
      const derived = new Map();
      for (const fk of fks) {
        if (fk.child === fk.parent || !pred.has(fk.parent)) continue;
        const own = pred.get(fk.child);
        if (own && own.startsWith('tenant_id') || ['tenants', 'brands'].includes(fk.child)) continue;
        const cond = `${q(fk.child_col)} IN (SELECT ${q(fk.parent_col)} FROM ${q(fk.parent)} WHERE ${pred.get(fk.parent)})`;
        derived.set(fk.child, [...(derived.get(fk.child) || []), cond]);
      }
      for (const [table, conds] of derived) {
        const next = conds.join(' OR ');
        if (pred.get(table) !== next) {
          pred.set(table, next);
          changed = true;
        }
      }
    }

    // 2. Preview counts
    const plan = [];
    for (const [table, where] of pred) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${q(table)} WHERE ${where}`, [tenantId]);
      if (rows[0].n > 0) plan.push({ table, rows: rows[0].n });
    }
    plan.sort((a, b) => b.rows - a.rows);
    console.log(`Tenant: ${name} (${tenantId})`);
    console.table(plan);
    const total = plan.reduce((s, p) => s + p.rows, 0);

    if (!execute) {
      console.log(`Dry run: ${total} rows in ${plan.length} tables would be deleted. Re-run with --yes to delete.`);
      return;
    }

    // 3. Delete in one transaction
    await client.query('BEGIN');
    try {
      // Break self-references / cycles: clear nullable FKs between rows that are all going away
      for (const fk of fks) {
        if (fk.not_null || !pred.has(fk.child) || !pred.has(fk.parent)) continue;
        if (!pred.get(fk.child).startsWith('tenant_id') && fk.child !== 'tenants') continue;
        await client.query(
          `UPDATE ${q(fk.child)} SET ${q(fk.child_col)} = NULL WHERE ${pred.get(fk.child)} AND ${q(fk.child_col)} IS NOT NULL`,
          [tenantId]
        );
      }

      // Children first: retry tables blocked by a foreign key until everything is gone
      let pending = plan.map((p) => p.table);
      while (pending.length > 0) {
        const blocked = [];
        for (const table of pending) {
          await client.query('SAVEPOINT purge_step');
          try {
            await client.query(`DELETE FROM ${q(table)} WHERE ${pred.get(table)}`, [tenantId]);
            await client.query('RELEASE SAVEPOINT purge_step');
          } catch (err) {
            if (err.code !== '23503') throw err;
            await client.query('ROLLBACK TO SAVEPOINT purge_step');
            blocked.push({ table, reason: err.detail || err.message });
          }
        }
        if (blocked.length === pending.length) {
          throw new Error(`Could not delete (still referenced): ${blocked.map((b) => `${b.table}: ${b.reason}`).join('; ')}`);
        }
        pending = blocked.map((b) => b.table);
      }
      await client.query('COMMIT');
      console.log(`Deleted tenant "${name}": ${total} rows across ${plan.length} tables.`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    }
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Delete failed, nothing was changed:', err.message);
  process.exit(1);
});
