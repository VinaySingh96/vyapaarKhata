import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

describe('ADR-007: Rental module migration 002 (SQLite Engine)', () => {
  const testDbPath = path.resolve(__dirname, '../test-rental-migration.sqlite');
  const baseline = path.resolve(__dirname, '../migrations/sqlite/001_initial_schema.sql');
  const rental = path.resolve(__dirname, '../migrations/sqlite/002_rental_module.sql');

  beforeAll(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    execSync(`sqlite3 ${testDbPath} < "${baseline}"`);
    execSync(`sqlite3 ${testDbPath} < "${rental}"`);
    // Re-running must be a no-op
    execSync(`sqlite3 ${testDbPath} < "${rental}"`);
  });

  afterAll(() => {
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
  });

  it('adds exactly the 4 rental tables on top of the baseline', () => {
    const output = execSync(
      `sqlite3 ${testDbPath} "SELECT count(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';"`
    )
      .toString()
      .trim();
    expect(parseInt(output, 10)).toBe(97 + 4);

    const rentalTables = execSync(
      `sqlite3 ${testDbPath} "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'rental_%' ORDER BY name;"`
    )
      .toString()
      .trim()
      .split(/\r?\n/);
    expect(rentalTables).toEqual(['rental_issue_lines', 'rental_issues', 'rental_return_lines', 'rental_returns']);
  });

  it('records the migration version and passes the foreign key check', () => {
    const version = execSync(
      `sqlite3 ${testDbPath} "SELECT count(*) FROM schema_migrations WHERE version = '002_rental_module';"`
    )
      .toString()
      .trim();
    expect(version).toBe('1');
    expect(execSync(`sqlite3 ${testDbPath} "PRAGMA foreign_key_check;"`).toString().trim()).toBe('');
  });
});
