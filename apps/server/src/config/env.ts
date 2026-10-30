import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  API_ORIGIN: z.string().default('http://localhost:4000'),
  WEB_ORIGIN: z.string().default('http://localhost:3000'),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/wba_game'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default('dev-insecure-secret-replace-with-at-least-32-chars-long-string'),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(604800), // 7 days
  COOKIE_SECURE: z
    .string()
    .transform((val) => val === 'true')
    .default('false'),
  SIWE_DOMAIN: z.string().default('localhost:3000'),
  SIWE_URI: z.string().default('http://localhost:3000'),
  SUPPORTED_CHAIN_ID: z.coerce.number().int().positive().default(11155111),
  CHAIN_MODE: z.enum(['simulated', 'testnet']).default('simulated'),
  RPC_URL: z.string().default('https://rpc.sepolia.org'),
  RELAYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid 32-byte private key')
    .default('0x0000000000000000000000000000000000000000000000000000000000000001'),
  MATCH_REGISTRY_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address')
    .default('0x0000000000000000000000000000000000000000'),
  ACHIEVEMENT_BADGES_ADDRESS: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address')
    .default('0x0000000000000000000000000000000000000000'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
});

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const DEV_RELAYER_KEY = '0x0000000000000000000000000000000000000000000000000000000000000001';

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Environment validation failed:', result.error.format());
    throw new Error('Invalid environment configuration');
  }
  const cfg = result.data;
  if (cfg.CHAIN_MODE === 'testnet') {
    const missing: string[] = [];
    if (cfg.MATCH_REGISTRY_ADDRESS === ZERO_ADDRESS) missing.push('MATCH_REGISTRY_ADDRESS');
    if (cfg.RELAYER_PRIVATE_KEY === DEV_RELAYER_KEY) missing.push('RELAYER_PRIVATE_KEY');
    if (missing.length > 0) {
      throw new Error(`CHAIN_MODE=testnet requires real values for: ${missing.join(', ')}`);
    }
  }
  return cfg;
}

export const env = loadEnv();
