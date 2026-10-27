import { createClient } from "redis";
import { config } from "../config";

export const redis = createClient({ url: config.redisUrl });

export async function connectRedis(): Promise<void> {
  redis.on("error", (err) => console.error("Redis error:", err));
  await redis.connect();
  console.log("✅ Redis connected");
}

// ─── Nonce helpers ────────────────────────────────────────────────────────────

const NONCE_TTL = 300; // 5 minutes

export async function storeNonce(nonce: string): Promise<void> {
  await redis.set(`nonce:${nonce}`, "1", { EX: NONCE_TTL });
}

export async function consumeNonce(nonce: string): Promise<boolean> {
  const deleted = await redis.del(`nonce:${nonce}`);
  return deleted === 1;
}

// ─── Matchmaking queue ────────────────────────────────────────────────────────

export async function enqueue(address: string): Promise<void> {
  // Only add once
  await redis.lRem("queue:battleship", 0, address);
  await redis.rPush("queue:battleship", address);
}

export async function dequeue(): Promise<string | null> {
  return redis.lPop("queue:battleship");
}

export async function removeFromQueue(address: string): Promise<void> {
  await redis.lRem("queue:battleship", 0, address);
}

export async function queueLength(): Promise<number> {
  return redis.lLen("queue:battleship");
}

// ─── Leaderboard helpers ──────────────────────────────────────────────────────

export async function lbAdd(board: string, member: string, score: number): Promise<void> {
  await redis.zAdd(`lb:${board}`, { score, value: member });
}

export async function lbIncr(board: string, member: string, by: number): Promise<void> {
  await redis.zIncrBy(`lb:${board}`, by, member);
}

export async function lbTop(board: string, count = 10): Promise<{ member: string; score: number }[]> {
  const res = await redis.zRangeWithScores(`lb:${board}`, 0, count - 1, { REV: true });
  return res.map((r) => ({ member: r.value, score: r.score }));
}

export async function lbRank(board: string, member: string): Promise<number | null> {
  const rank = await redis.zRevRank(`lb:${board}`, member);
  return rank ?? null;
}
