import { loadCentralConfig } from './config.js';
import { CentralDatabase } from './db/central-db.js';
import { buildCentralApp } from './app.js';

async function main() {
  const config = loadCentralConfig();
  console.log(`[Central Cloud] Initializing database at ${config.DATABASE_URL}...`);
  const db = new CentralDatabase(config);

  try {
    await db.initializeSchema();
    const app = buildCentralApp(config, db);

    const address = await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`🌐 vyapaarKhata Central Cloud Server running at ${address}`);
    console.log(`📊 Tenant Management Dashboard available at ${address}/admin`);
    console.log(`⚡ Sync Ingestion Endpoint active at ${address}/api/v1/sync/push`);
  } catch (err) {
    console.error('Fatal error starting vyapaarKhata Central Server:', err);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('dist/index.js') || process.argv[1]?.endsWith('src/index.ts')) {
  main();
}

export * from './app.js';
export * from './config.js';
export * from './db/central-db.js';
