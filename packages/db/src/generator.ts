import fs from 'node:fs';
import path from 'node:path';
import { parseSchema, TableDef, RefDef } from './parser.js';

const schemaContent = fs.readFileSync('docs/spec/schema.sql', 'utf-8');
const { tables, refs } = parseSchema(schemaContent);

function isNumericAmountColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    lower.endsWith('_amount') ||
    lower.endsWith('amount') ||
    lower.endsWith('subtotal') ||
    lower.endsWith('total') ||
    lower.endsWith('price') ||
    lower.endsWith('unit_price') ||
    lower.endsWith('balance')
  );
}

function isQuantityColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('_quantity') || lower === 'quantity' || lower === 'conversion_factor';
}

function isRateColumn(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith('rate') || lower.endsWith('percentage') || lower === 'rate';
}

function mapPgType(type: string, colName: string): string {
  switch (type.toLowerCase()) {
    case 'uuid':
      return 'UUID';
    case 'timestamptz':
      return 'TIMESTAMPTZ';
    case 'date':
      return 'DATE';
    case 'int':
      return 'INTEGER';
    case 'bigint':
      return 'BIGINT';
    case 'boolean':
      return 'BOOLEAN';
    case 'jsonb':
      return 'JSONB';
    case 'text':
      return 'TEXT';
    case 'char':
      return 'VARCHAR(10)';
    case 'varchar':
      if (isQuantityColumn(colName)) return 'NUMERIC(18, 4)';
      if (isRateColumn(colName)) return 'NUMERIC(6, 4)';
      if (isNumericAmountColumn(colName)) return 'NUMERIC(15, 2)';
      return 'VARCHAR(255)';
    default:
      return 'TEXT';
  }
}

function mapPgDefault(defaultValue?: string, type?: string): string {
  if (!defaultValue) return '';
  const trimmed = defaultValue.trim();
  if (/^now\(\)$/i.test(trimmed)) return ' DEFAULT NOW()';
  if (/^true$/i.test(trimmed)) return ' DEFAULT TRUE';
  if (/^false$/i.test(trimmed)) return ' DEFAULT FALSE';
  if (/^'.*'$/.test(trimmed)) return ` DEFAULT ${trimmed}`;
  if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) return ` DEFAULT ${trimmed}`;
  return ` DEFAULT '${trimmed}'`;
}

function mapSqliteType(type: string, colName: string): string {
  switch (type.toLowerCase()) {
    case 'uuid':
    case 'timestamptz':
    case 'date':
    case 'text':
    case 'char':
      return 'TEXT';
    case 'int':
    case 'bigint':
    case 'boolean':
      return 'INTEGER';
    case 'jsonb':
      return 'TEXT';
    case 'varchar':
      if (isQuantityColumn(colName) || isRateColumn(colName) || isNumericAmountColumn(colName)) {
        return 'NUMERIC';
      }
      return 'TEXT';
    default:
      return 'TEXT';
  }
}

function mapSqliteDefault(defaultValue?: string, type?: string): string {
  if (!defaultValue) return '';
  const trimmed = defaultValue.trim();
  if (/^now\(\)$/i.test(trimmed)) return " DEFAULT (datetime('now'))";
  if (/^true$/i.test(trimmed)) return ' DEFAULT 1';
  if (/^false$/i.test(trimmed)) return ' DEFAULT 0';
  if (/^'.*'$/.test(trimmed)) return ` DEFAULT ${trimmed}`;
  if (/^[0-9]+(\.[0-9]+)?$/.test(trimmed)) return ` DEFAULT ${trimmed}`;
  return ` DEFAULT '${trimmed}'`;
}

// Generate PostgreSQL DDL
export function generatePostgresDdl(tables: TableDef[], refs: RefDef[]): string {
  const lines: string[] = [];
  lines.push('-- vyapaarKhata PostgreSQL Migration 001');
  lines.push('-- Canonical 96-Table Baseline');
  lines.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS schema_migrations (');
  lines.push('  version VARCHAR(255) PRIMARY KEY,');
  lines.push('  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()');
  lines.push(');');
  lines.push('');

  for (const table of tables) {
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);
    const colDefs: string[] = [];
    for (const col of table.columns) {
      let def = `  "${col.name}" ${mapPgType(col.type, col.name)}`;
      if (col.isPk) def += ' PRIMARY KEY';
      if (col.isNotNull && !col.isPk) def += ' NOT NULL';
      if (col.isUnique && !col.isPk) def += ' UNIQUE';
      if (col.defaultValue) def += mapPgDefault(col.defaultValue, col.type);
      colDefs.push(def);
    }
    lines.push(colDefs.join(',\n'));
    lines.push(');');
    lines.push('');

    // Index on tenant_id if present
    const hasTenantId = table.columns.some((c) => c.name === 'tenant_id');
    if (hasTenantId && table.name !== 'tenants') {
      lines.push(`CREATE INDEX IF NOT EXISTS "idx_${table.name}_tenant_id" ON "${table.name}" ("tenant_id");`);
    }
  }

  lines.push('');
  lines.push('-- Foreign Key Constraints');
  const seenFks = new Set<string>();
  for (const ref of refs) {
    const fkName = `fk_${ref.fromTable}_${ref.fromColumn}_${ref.toTable}`;
    if (seenFks.has(fkName)) continue;
    seenFks.add(fkName);
    lines.push(
      `ALTER TABLE "${ref.fromTable}" ADD CONSTRAINT "${fkName}" FOREIGN KEY ("${ref.fromColumn}") REFERENCES "${ref.toTable}" ("${ref.toColumn}") ON DELETE RESTRICT;`
    );
  }

  lines.push('');
  return lines.join('\n');
}

// Generate SQLite DDL
export function generateSqliteDdl(tables: TableDef[], refs: RefDef[]): string {
  const lines: string[] = [];
  lines.push('-- vyapaarKhata SQLite Migration 001');
  lines.push('-- Canonical 96-Table Baseline');
  lines.push('PRAGMA foreign_keys = ON;');
  lines.push('');
  lines.push('CREATE TABLE IF NOT EXISTS schema_migrations (');
  lines.push('  version TEXT PRIMARY KEY,');
  lines.push("  applied_at TEXT NOT NULL DEFAULT (datetime('now'))");
  lines.push(');');
  lines.push('');

  // Map refs by child table for inline declaration
  const tableRefsMap = new Map<string, RefDef[]>();
  for (const ref of refs) {
    if (!tableRefsMap.has(ref.fromTable)) {
      tableRefsMap.set(ref.fromTable, []);
    }
    tableRefsMap.get(ref.fromTable)!.push(ref);
  }

  for (const table of tables) {
    lines.push(`CREATE TABLE IF NOT EXISTS "${table.name}" (`);
    const elements: string[] = [];

    for (const col of table.columns) {
      let def = `  "${col.name}" ${mapSqliteType(col.type, col.name)}`;
      if (col.isPk) def += ' PRIMARY KEY';
      if (col.isNotNull && !col.isPk) def += ' NOT NULL';
      if (col.isUnique && !col.isPk) def += ' UNIQUE';
      if (col.defaultValue) def += mapSqliteDefault(col.defaultValue, col.type);
      elements.push(def);
    }

    const tRefs = tableRefsMap.get(table.name) || [];
    for (const ref of tRefs) {
      elements.push(
        `  FOREIGN KEY ("${ref.fromColumn}") REFERENCES "${ref.toTable}" ("${ref.toColumn}") ON DELETE RESTRICT`
      );
    }

    lines.push(elements.join(',\n'));
    lines.push(');');
    lines.push('');

    const hasTenantId = table.columns.some((c) => c.name === 'tenant_id');
    if (hasTenantId && table.name !== 'tenants') {
      lines.push(`CREATE INDEX IF NOT EXISTS "idx_${table.name}_tenant_id" ON "${table.name}" ("tenant_id");`);
    }
  }

  return lines.join('\n');
}

// Write the migration files
const pgDdl = generatePostgresDdl(tables, refs);
const sqliteDdl = generateSqliteDdl(tables, refs);

fs.writeFileSync('packages/db/migrations/pg/001_initial_schema.sql', pgDdl, 'utf-8');
fs.writeFileSync('packages/db/migrations/sqlite/001_initial_schema.sql', sqliteDdl, 'utf-8');

console.log('PostgreSQL migration generated: packages/db/migrations/pg/001_initial_schema.sql');
console.log('SQLite migration generated: packages/db/migrations/sqlite/001_initial_schema.sql');
