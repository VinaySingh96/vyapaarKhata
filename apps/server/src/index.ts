import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { createPgUnitOfWork } from '@vyapaarkhata/db';
import { AutoSyncWorker } from './services/sync-worker.js';

async function main() {
  const config = loadConfig();
  const uow = config.DB_DRIVER === 'postgres' ? createPgUnitOfWork(config.DATABASE_URL) : undefined;
  const app = buildApp(config, uow);

  // Auto-detect Central Tenant ID if not explicitly specified
  const centralTenantId =
    config.CENTRAL_TENANT_ID ||
    (config.DATABASE_URL.includes('jewellery')
      ? '00000000-0000-0000-0000-000000000002'
      : config.TENANT_ID);

  if (config.ENABLE_AUTO_SYNC && uow) {
    const syncWorker = new AutoSyncWorker({
      uow,
      localTenantId: config.TENANT_ID,
      centralTenantId,
      installationId: config.INSTALLATION_ID,
      centralServerUrl: config.CENTRAL_SERVER_URL,
      intervalMs: config.SYNC_INTERVAL_MS,
      log: app.log,
    });
    syncWorker.start();

    // Clean shutdown hook
    app.addHook('onClose', async () => {
      syncWorker.stop();
    });
  }

  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`🚀 vyapaarKhata Server running at ${address} (Central Sync Tenant: ${centralTenantId})`);
  } catch (err) {
    console.error('Fatal error starting vyapaarKhata server:', err);
    process.exit(1);
  }
}

// Execute if run directly
if (process.argv[1]?.endsWith('dist/index.js') || process.argv[1]?.endsWith('src/index.ts')) {
  main();
}

export * from './app.js';
export * from './config.js';
export * from './errors/app-error.js';
