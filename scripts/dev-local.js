/**
 * Local dev launcher: starts Central Cloud (:5000), Store Server (:4002) and Web (:3002) together.
 *
 *   pnpm dev:local                 # start all three (auto-detects Docker or local PostgreSQL)
 *   pnpm dev:local --build         # build packages + servers first
 *   pnpm dev:local --kill-stale    # auto-terminate previous processes on ports 5000 / 4002
 *
 * Override defaults with env vars, e.g.
 *   PG_URL=postgresql://localhost:5432  STORE_DB=vyapaarkhata_patel  CENTRAL_DB=vyapaarkhata_central
 *
 * Ctrl+C stops all three.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

const CENTRAL_DB = env.CENTRAL_DB || 'vyapaarkhata_central';
const STORE_DB = env.STORE_DB || 'vyapaarkhata_patel';
const CENTRAL_PORT = env.CENTRAL_PORT || '5000';
const STORE_PORT = env.STORE_PORT || '4002';
const WEB_CONFIG = env.WEB_CONFIG || 'vite.patel.config.js';
const CENTRAL_TENANT_ID = env.CENTRAL_TENANT_ID || '00000000-0000-0000-0000-000000000001';

if (process.argv.includes('--build')) {
  console.log('[dev-local] Building packages and servers...');
  const res = spawnSync(
    'pnpm',
    ['-r', '--filter=./packages/*', '--filter=./apps/server', '--filter=./apps/central-server', 'run', 'build'],
    { cwd: root, stdio: 'inherit', shell: true }
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
}

function loadPgDriver() {
  try {
    const req = createRequire(path.join(root, 'packages/db/package.json'));
    return req('pg');
  } catch {
    console.error('[dev-local] Failed to resolve pg driver from packages/db. Run "pnpm install" first.');
    process.exit(1);
  }
}

function isPortOpen(port, host = '127.0.0.1', timeoutMs = 800) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.setTimeout(timeoutMs);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function findBinary(name) {
  try {
    const checkCmd = process.platform === 'win32' ? 'where' : 'which';
    const res = spawnSync(checkCmd, [name], { stdio: 'pipe' });
    return res.status === 0;
  } catch {
    return false;
  }
}

async function ensurePostgresServiceRunning(targetPort = 5432) {
  if (await isPortOpen(targetPort)) return;

  console.log(`[dev-local] PostgreSQL is not responding on port ${targetPort}. Checking Docker & local services...`);

  // 1. Check Docker / Podman / Nerdctl for stopped PostgreSQL containers
  for (const tool of ['docker', 'podman', 'nerdctl']) {
    if (findBinary(tool)) {
      try {
        const psRes = spawnSync(tool, ['ps', '-a', '--filter', 'name=postgres', '--format', '{{.Names}}\t{{.Status}}'], {
          encoding: 'utf8',
          stdio: 'pipe',
        });
        const lines = (psRes.stdout || '').trim().split('\n').filter(Boolean);
        for (const line of lines) {
          const [name, status] = line.split('\t');
          if (name && status && !status.startsWith('Up')) {
            console.log(`[dev-local] Starting stopped ${tool} container "${name}"...`);
            spawnSync(tool, ['start', name], { stdio: 'inherit' });
            break;
          }
        }
      } catch {}
    }
  }

  // 2. Check macOS Homebrew services
  if (process.platform === 'darwin' && findBinary('brew')) {
    try {
      const brewRes = spawnSync('brew', ['services', 'list'], { encoding: 'utf8', stdio: 'pipe' });
      if (brewRes.status === 0) {
        for (const line of brewRes.stdout.split('\n')) {
          if (/^postgresql(@\d+)?\s+(none|stopped)/.test(line)) {
            const formula = line.split(/\s+/)[0];
            console.log(`[dev-local] Starting Homebrew service "${formula}"...`);
            spawnSync('brew', ['services', 'start', formula], { stdio: 'inherit' });
            break;
          }
        }
      }
    } catch {}
  }

  // Wait up to 10 seconds for PostgreSQL port to accept connections
  for (let i = 0; i < 20; i++) {
    if (await isPortOpen(targetPort)) {
      console.log(`[dev-local] PostgreSQL is now active on port ${targetPort}.`);
      return;
    }
    await new Promise((r) => setTimeout(r, 500));
  }

  console.error(`\n[dev-local] ❌ Could not reach PostgreSQL on localhost:${targetPort}.`);
  console.error('\n👉 If using Normal PostgreSQL (local/Homebrew install):');
  console.error('   brew services start postgresql@16   (or: brew services start postgresql)');
  console.error('\n👉 If using Docker PostgreSQL:');
  console.error('   docker run -d --name vyapaarkhata-postgres -p 5432:5432 -e POSTGRES_PASSWORD=password postgres:16-alpine');
  console.error('   (or: docker compose -f deployment/laptop/docker-compose.nerdctl.yaml up -d postgres)\n');
  process.exit(1);
}

async function testPgCandidate(pg, baseUrl) {
  for (const db of ['postgres', 'template1']) {
    const client = new pg.Client({
      connectionString: `${baseUrl}/${db}`,
      connectionTimeoutMillis: 1500,
    });
    try {
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return true;
    } catch {
      try {
        await client.end();
      } catch {}
    }
  }
  return false;
}

async function resolvePgUrl(pg) {
  if (env.PG_URL) {
    const raw = env.PG_URL.replace(/\/+$/, '');
    if (await testPgCandidate(pg, raw)) {
      return raw;
    }
    console.warn(`[dev-local] Warning: Specified PG_URL (${raw}) could not connect. Probing alternatives...`);
  }

  const username = os.userInfo().username || env.USER || env.LOGNAME;
  const candidates = [
    // 1. Normal / Homebrew PostgreSQL (default system user / socket auth / no password)
    'postgresql://localhost:5432',
    username ? `postgresql://${username}@localhost:5432` : null,
    'postgresql://postgres@localhost:5432',

    // 2. Docker PostgreSQL setups (common dev credentials)
    'postgresql://postgres:password@localhost:5432',
    'postgresql://postgres:postgres@localhost:5432',
    'postgresql://vyapaarkhata:vyapaarkhata_secure_password@localhost:5432',
    'postgresql://postgres:root@localhost:5432',
  ].filter(Boolean);

  for (const cand of candidates) {
    if (await testPgCandidate(pg, cand)) {
      return cand;
    }
  }

  console.error('\n[dev-local] ❌ PostgreSQL is listening on port 5432, but none of the standard credentials succeeded.');
  console.error('Please specify your credentials using the PG_URL environment variable:');
  console.error('  PG_URL=postgresql://username:password@localhost:5432 pnpm dev:local\n');
  process.exit(1);
}

async function ensureDatabases(pg, pgUrl, centralDb, storeDb) {
  let maintenanceClient = null;
  for (const db of ['postgres', 'template1']) {
    const client = new pg.Client({ connectionString: `${pgUrl}/${db}` });
    try {
      await client.connect();
      maintenanceClient = client;
      break;
    } catch {
      try {
        await client.end();
      } catch {}
    }
  }

  if (!maintenanceClient) {
    console.warn('[dev-local] Could not connect to maintenance database to verify databases; proceeding anyway...');
    return;
  }

  try {
    const res = await maintenanceClient.query(
      'SELECT datname FROM pg_database WHERE datname IN ($1, $2)',
      [centralDb, storeDb]
    );
    const existing = new Set(res.rows.map((r) => r.datname));

    for (const name of [centralDb, storeDb]) {
      if (!existing.has(name)) {
        if (!/^[a-zA-Z0-9_]+$/.test(name)) {
          throw new Error(`Invalid database name: ${name}`);
        }
        console.log(`[dev-local] Creating missing database "${name}"...`);
        await maintenanceClient.query(`CREATE DATABASE "${name}"`);
        console.log(`[dev-local] Database "${name}" created.`);
      }
    }
  } finally {
    await maintenanceClient.end().catch(() => {});
  }

  // Check if store database is fresh and needs initial schema and reference seeds
  try {
    const storeClient = new pg.Client({ connectionString: `${pgUrl}/${storeDb}` });
    await storeClient.connect();
    const countRes = await storeClient.query(
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'"
    );
    const count = parseInt(countRes.rows[0].count, 10);
    if (count === 0) {
      console.log(`[dev-local] Fresh database detected for "${storeDb}". Running migrations and seeds...`);
      const files = [
        'packages/db/migrations/pg/001_initial_schema.sql',
        'packages/db/migrations/pg/002_rental_module.sql',
        'packages/db/src/seeds/001_reference_seeds.sql',
        'packages/db/src/seeds/002_patel_building_materials_seed.sql',
      ];
      for (const rel of files) {
        const full = path.join(root, rel);
        if (fs.existsSync(full)) {
          const sql = fs.readFileSync(full, 'utf8');
          await storeClient.query(sql);
          console.log(`[dev-local] Applied ${rel}`);
        }
      }
    }
    await storeClient.end();
  } catch (err) {
    console.warn(`[dev-local] Notice: schema check for ${storeDb}:`, err.message);
  }
}

function findListeningPid(port) {
  if (process.platform === 'win32') {
    try {
      const res = spawnSync('netstat', ['-ano', '-p', 'tcp'], { encoding: 'utf8', stdio: 'pipe' });
      for (const line of res.stdout.split('\n')) {
        if (line.includes(`:${port}`) && line.includes('LISTENING')) {
          const parts = line.trim().split(/\s+/);
          return parts[parts.length - 1];
        }
      }
    } catch {}
    return null;
  }
  try {
    const res = spawnSync('lsof', ['-ti', `tcp:${port}`, '-sTCP:LISTEN'], { encoding: 'utf8', stdio: 'pipe' });
    if (res.status === 0 && res.stdout) {
      return res.stdout.trim().split(/\s+/)[0];
    }
  } catch {}
  return null;
}

function checkPortConflict(port, serviceName) {
  const pid = findListeningPid(port);
  if (pid) {
    if (process.argv.includes('--kill-stale') || process.argv.includes('--force')) {
      console.log(`[dev-local] Terminating stale ${serviceName} process on port ${port} (PID ${pid})...`);
      try {
        process.kill(Number(pid), 'SIGKILL');
      } catch {}
    } else {
      console.error(`[dev-local] ❌ Port ${port} (${serviceName}) is already in use by PID ${pid}.`);
      console.error(`[dev-local] Add --kill-stale to auto-terminate it, or run: kill -9 ${pid}`);
      process.exit(1);
    }
  }
}

/**
 * The server entry points only call main() when argv[1] ends with "dist/index.js",
 * which never matches Windows backslash paths, so launch them through an import shim.
 */
function nodeEntry(relPath) {
  const abs = path.join(root, relPath);
  if (!fs.existsSync(abs)) {
    console.error(`[dev-local] Missing ${relPath}. Run "pnpm dev:local --build" first.`);
    process.exit(1);
  }
  const shim = `process.argv[1]=${JSON.stringify(relPath)}; await import(${JSON.stringify(pathToFileURL(abs).href)});`;
  return ['--input-type=module', '-e', shim];
}

function findVite() {
  const local = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
  if (fs.existsSync(local)) return local;
  const pnpmDir = path.join(root, 'node_modules', '.pnpm');
  const dir = fs.existsSync(pnpmDir) ? fs.readdirSync(pnpmDir).find((d) => d.startsWith('vite@')) : undefined;
  if (dir) return path.join(pnpmDir, dir, 'node_modules', 'vite', 'bin', 'vite.js');
  console.error('[dev-local] Vite not found. Run "pnpm install" first.');
  process.exit(1);
}

// Main bootstrap
const pg = loadPgDriver();
await ensurePostgresServiceRunning(5432);
const resolvedPgUrl = await resolvePgUrl(pg);
console.log(`[dev-local] Using PostgreSQL at: ${resolvedPgUrl}`);

await ensureDatabases(pg, resolvedPgUrl, CENTRAL_DB, STORE_DB);

checkPortConflict(CENTRAL_PORT, 'Central Cloud');
checkPortConflict(STORE_PORT, 'Store Server');

const services = [
  {
    name: 'central',
    color: 35,
    cwd: root,
    args: nodeEntry('apps/central-server/dist/index.js'),
    env: { DATABASE_URL: `${resolvedPgUrl}/${CENTRAL_DB}`, PORT: CENTRAL_PORT },
  },
  {
    name: 'store',
    color: 36,
    cwd: root,
    args: nodeEntry('apps/server/dist/index.js'),
    env: {
      DATABASE_URL: `${resolvedPgUrl}/${STORE_DB}`,
      PORT: STORE_PORT,
      CENTRAL_TENANT_ID,
      CENTRAL_SERVER_URL: `http://127.0.0.1:${CENTRAL_PORT}`,
    },
  },
  {
    name: 'web',
    color: 32,
    cwd: path.join(root, 'apps', 'web'),
    args: [findVite(), '--config', WEB_CONFIG],
    env: {},
  },
];

const children = [];
let shuttingDown = false;

function prefixStream(stream, label, out) {
  let buf = '';
  stream.on('data', (chunk) => {
    buf += chunk.toString();
    const lines = buf.split(/\r?\n/);
    buf = lines.pop() ?? '';
    for (const line of lines) out.write(`${label} ${line}\n`);
  });
}

for (const svc of services) {
  const label = `\x1b[${svc.color}m[${svc.name.padEnd(7)}]\x1b[0m`;
  const child = spawn(process.execPath, svc.args, {
    cwd: svc.cwd,
    env: { ...env, ...svc.env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  prefixStream(child.stdout, label, process.stdout);
  prefixStream(child.stderr, label, process.stderr);
  child.on('exit', (code, signal) => {
    console.log(`${label} exited (${signal || code})`);
    if (!shuttingDown) shutdown(code ?? 1);
  });
  children.push(child);
}

console.log(
  `[dev-local] central  http://127.0.0.1:${CENTRAL_PORT}  (${CENTRAL_DB})\n` +
    `[dev-local] store    http://127.0.0.1:${STORE_PORT}  (${STORE_DB})\n` +
    `[dev-local] web      see [web] line below (config ${WEB_CONFIG})\n` +
    '[dev-local] Ctrl+C to stop all'
);

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) {
    if (child.exitCode === null) child.kill();
  }
  setTimeout(() => process.exit(code), 500);
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
