import dotenv from "dotenv";
dotenv.config();

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing env var: ${key}`);
  return val;
}

export const config = {
  port: parseInt(process.env.PORT ?? "4000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",

  /** MongoDB connection string */
  mongoUri: process.env.MONGO_URI ?? "mongodb://localhost:27017/battle-arena",

  /** Redis URL */
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",

  /** Session secret */
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-in-prod",

  /** SIWE domain (no protocol) */
  siweDomain: process.env.SIWE_DOMAIN ?? "localhost:3000",

  /** Frontend origin for CORS */
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000",

  /** Chain mode: "simulated" | "testnet" */
  chainMode: (process.env.CHAIN_MODE ?? "simulated") as "simulated" | "testnet",

  /** Relayer private key (only needed in testnet mode) */
  relayerKey: process.env.RELAYER_PRIVATE_KEY ?? "",

  /** MatchRegistry contract address */
  registryAddress: process.env.REGISTRY_ADDRESS ?? "",

  /** RPC URL */
  rpcUrl: process.env.RPC_URL ?? "",
} as const;
