import { v4 as uuidv4 } from "uuid";
import { Server as IoServer } from "socket.io";
import { enqueue, dequeue, removeFromQueue } from "../db/redis";
import { createRoom, getRoomByPlayer } from "./roomManager";
import { DEFAULT_CONFIG } from "@battle-arena/engine";

/**
 * Add player to queue. If two players are ready, pair them immediately.
 * Returns the matchId if a match was made, otherwise null.
 */
export async function joinQueue(
  address: string,
  io: IoServer
): Promise<string | null> {
  // Don't queue if already in a live room
  if (getRoomByPlayer(address)) return null;

  await enqueue(address);

  // Try to pop two players
  const p1 = await dequeue();
  if (!p1) return null;

  const p2 = await dequeue();
  if (!p2) {
    // Only one player — put back and wait
    await enqueue(p1);
    return null;
  }

  if (p1 === p2) {
    // Same player somehow — put back
    await enqueue(p1);
    return null;
  }

  const matchId = uuidv4();
  createRoom(matchId, p1, p2, DEFAULT_CONFIG);

  // Notify both players
  io.to(`player:${p1}`).emit("match:found", { matchId, opponent: p2 });
  io.to(`player:${p2}`).emit("match:found", { matchId, opponent: p1 });

  console.log(`🎮 Match created: ${matchId} — ${p1} vs ${p2}`);
  return matchId;
}

export async function leaveQueue(address: string): Promise<void> {
  await removeFromQueue(address);
}
