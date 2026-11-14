import { loadConfig } from './config.js';
import { buildApp } from './app.js';
import { createPgUnitOfWork } from '@vyapaarkhata/db';

async function main() {
  const config = loadConfig();
  const uow = config.DB_DRIVER === 'postgres' ? createPgUnitOfWork(config.DATABASE_URL) : undefined;
  const app = buildApp(config, uow);

  try {
    const address = await app.listen({ port: config.PORT, host: config.HOST });
    console.log(`🚀 vyapaarKhata Server running at ${address}`);
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
