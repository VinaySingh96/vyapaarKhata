import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('DB-06: Persistence Contract Suite (SQLite Engine)', () => {
  const testDbPath = path.resolve(process.cwd(), 'test-persistence.sqlite');

  beforeEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    // Apply migration and seeds
    execSync(`sqlite3 ${testDbPath} < packages/db/migrations/sqlite/001_initial_schema.sql`);
    execSync(`sqlite3 ${testDbPath} < packages/db/src/seeds/001_reference_seeds_sqlite.sql`);
  });

  afterEach(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  it('proves exactly 97 tables exist in migrated SQLite database', () => {
    const output = execSync(
      `sqlite3 ${testDbPath} "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`
    )
      .toString()
      .trim();

    expect(parseInt(output, 10)).toBe(97);
  });

  it('guarantees foreign key check passes with zero errors', () => {
    const output = execSync(`sqlite3 ${testDbPath} "PRAGMA foreign_key_check;"`).toString().trim();
    expect(output).toBe('');
  });

  it('enforces foreign key rejection on invalid tenant reference', () => {
    // Attempt inserting a tax_category with a non-existent tenant ID (-bail ensures non-zero exit code)
    const insertSql = `PRAGMA foreign_keys = ON; INSERT INTO tax_categories (id, tenant_id, name, code, tax_type, is_exempt, created_at) VALUES ('99999999-9999-9999-9999-999999999999', '00000000-dead-beef-0000-000000000000', 'Fake Tax', 'FAKE', 'gst', 0, datetime('now'));`;

    expect(() => {
      execSync(`sqlite3 -bail ${testDbPath} "${insertSql}"`, { stdio: 'pipe' });
    }).toThrow();
  });

  it('verifies seed operations are completely idempotent on repeated runs', () => {
    // Re-run the seed script
    execSync(`sqlite3 ${testDbPath} < packages/db/src/seeds/001_reference_seeds_sqlite.sql`);

    const count = execSync(`sqlite3 ${testDbPath} "SELECT count(*) FROM units;"`).toString().trim();
    expect(parseInt(count, 10)).toBe(10);
  });

  it('verifies transaction rollback rolls back uncommitted writes', () => {
    const rollbackSql = `
      BEGIN TRANSACTION;
      INSERT INTO brands (id, name, code, default_currency, is_active, created_at)
      VALUES ('88888888-8888-8888-8888-888888888888', 'Rollback Brand', 'RB-01', 'INR', 1, datetime('now'));
      ROLLBACK;
      SELECT count(*) FROM brands WHERE id = '88888888-8888-8888-8888-888888888888';
    `;

    const output = execSync(`sqlite3 ${testDbPath} "${rollbackSql}"`).toString().trim();
    expect(parseInt(output, 10)).toBe(0);
  });
});
