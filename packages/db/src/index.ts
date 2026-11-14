import { Pool } from 'pg';
import { PgUnitOfWork } from './uow/pg-uow.js';

export * from './uow/pg-uow.js';

export function createPgUnitOfWork(connectionString: string): PgUnitOfWork {
  const pool = new Pool({ connectionString });
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
