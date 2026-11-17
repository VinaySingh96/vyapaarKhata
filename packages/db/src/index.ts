import { Pool } from 'pg';
import { PgUnitOfWork } from './uow/pg-uow.js';

export * from './uow/pg-uow.js';

export function createPgUnitOfWork(connectionString: string): PgUnitOfWork {
  // Run sessions in the business timezone so CURRENT_DATE / invoice dates / months match the shop's day (not UTC)
  const timeZone = process.env.APP_TIMEZONE || 'Asia/Kolkata';
  const pool = new Pool({ connectionString, options: `-c TimeZone=${timeZone}` });
  return new PgUnitOfWork(pool);
}

export interface PersistenceConfig {
  driver: 'postgres' | 'sqlite';
  connectionString?: string;
  sqlitePath?: string;
}

export interface MigrationResult {
  appliedCount: number;
  latestVersion: string;
}
