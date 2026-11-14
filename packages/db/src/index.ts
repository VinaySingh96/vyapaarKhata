export interface PersistenceConfig {
  driver: 'postgres' | 'sqlite';
  connectionString?: string;
  sqlitePath?: string;
}

export interface MigrationResult {
  appliedCount: number;
  latestVersion: string;
}
