/**
 * Local dev launcher: starts Central Cloud (:5000), Store Server (:4002) and Web (:3002) together.
 *
 *   pnpm dev:local            # start all three
 *   pnpm dev:local --build    # build packages + servers first
 *
 * Override defaults with env vars, e.g.
 *   PG_URL=postgresql://postgres:password@localhost:5432  STORE_DB=vyapaarkhata_patel  CENTRAL_DB=vyapaarkhata_central
 *
 * Ctrl+C stops all three.
 */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = process.env;

const PG_URL = (env.PG_URL || 'postgresql://postgres:password@localhost:5432').replace(/\/+$/, '');
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
    ['-r', "--filter=./packages/*", '--filter=./apps/server', '--filter=./apps/central-server', 'run', 'build'],
    { cwd: root, stdio: 'inherit', shell: true }
  );
  if (res.status !== 0) process.exit(res.status ?? 1);
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

const services = [
  {
    name: 'central',
    color: 35,
    cwd: root,
    args: nodeEntry('apps/central-server/dist/index.js'),
    env: { DATABASE_URL: `${PG_URL}/${CENTRAL_DB}`, PORT: CENTRAL_PORT },
  },
  {
    name: 'store',
    color: 36,
    cwd: root,
    args: nodeEntry('apps/server/dist/index.js'),
    env: {
      DATABASE_URL: `${PG_URL}/${STORE_DB}`,
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
