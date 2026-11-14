import { z } from 'zod';

export const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('127.0.0.1'),
  DB_DRIVER: z.enum(['postgres', 'sqlite']).default('postgres'),
  DATABASE_URL: z.string().default('postgresql://localhost:5432/vyapaarkhata_dev'),
  SQLITE_DB_PATH: z.string().default('./data/vyapaarkhata.sqlite'),
  JWT_SECRET: z.string().default('dev-jwt-secret-placeholder-minimum-32-characters-needed'),
  IS_PRIMARY_INSTALLATION: z.coerce.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return configSchema.parse(env);
}
