import { z } from 'zod';

export const centralConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  HOST: z.string().default(process.env.HOST || (process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1')),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/vyapaarkhata_central'),
  ADMIN_API_KEY: z.string().default('central-admin-secret-key-2026'),
  JWT_SECRET: z.string().default('vyapaarkhata-central-cloud-jwt-secure-key-2026'),
  ALLOW_AUTO_SEED: z.coerce.boolean().default(true),
});

export type CentralConfig = z.infer<typeof centralConfigSchema>;

export function loadCentralConfig(env: NodeJS.ProcessEnv = process.env): CentralConfig {
  return centralConfigSchema.parse(env);
}
