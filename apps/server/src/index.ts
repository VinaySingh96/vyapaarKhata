/**
 * vyapaarKhata Server Bootstrap
 * Modular Monolith HTTP API Server
 */

export function createServerConfig() {
  return {
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 4000,
    host: process.env.HOST || '127.0.0.1',
    env: process.env.NODE_ENV || 'development',
  };
}

console.log('vyapaarKhata server module loaded.');
