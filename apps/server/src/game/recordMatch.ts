import { MatchState, buildRecord } from "@battle-arena/engine";
import { sha3_256 } from "js-sha3";
import { Match, ChainLog } from "../db/mongo";
import { lbIncr, lbAdd } from "../db/redis";
import { config } from "../config";

/** Compute the canonical result hash */
export function resultHash(state: MatchState): string {
  const record = buildRecord(state);
  return "0x" + sha3_256(JSON.stringify(record));
}

/**
 * Persist the finished match to MongoDB and update leaderboards.
 * In simulated mode also writes to chain_log.
 * In testnet mode pushes a job to the chain-write queue (stub for Day 3).
 */
export async function recordMatch(state: MatchState): Promise<void> {
  const hash = resultHash(state);

  // Save to MongoDB
  await Match.findOneAndUpdate(
    { matchId: state.matchId },
    {
      matchId: state.matchId,
      players: state.playerIds,
      commitments: Object.fromEntries(
        state.playerIds.map((id) => [id, state.players[id].commitment])
      ),
      shots: state.shots,
      scores: Object.fromEntries(
        state.playerIds.map((id) => [id, state.players[id].score])
      ),
      winner: state.winner,
      forfeitedBy: state.forfeitedBy,
      resultHash: hash,
      chainStatus: config.chainMode === "simulated" ? "simulated" : "pending",
      startedAt: state.startedAt ? new Date(state.startedAt) : null,
      endedAt: state.endedAt ? new Date(state.endedAt) : null,
    },
    { upsert: true, new: true }
  );

  // Simulated mode — write a fake tx record
  if (config.chainMode === "simulated") {
    const fakeTx = "0xSIM_" + sha3_256(state.matchId).slice(0, 40);
    await ChainLog.create({
      matchId: state.matchId,
      txHash: fakeTx,
      record: buildRecord(state),
    });
    await Match.updateOne(
      { matchId: state.matchId },
      { txHash: fakeTx, chainStatus: "simulated" }
    );
    console.log(`⛓  Simulated tx: ${fakeTx}`);
  }
  // testnet mode → enqueue relayer job (wired in Day 3)

  // Update Redis leaderboards
  for (const id of state.playerIds) {
    const score = state.players[id].score;
    await lbIncr("points", id, score);

    const streak = Math.max(...state.shots
      .filter((s) => s.shooter === id)
      .reduce<number[]>((acc, s) => {
        const prev = acc[acc.length - 1] ?? 0;
        if (s.outcome === "hit" || s.outcome === "sunk") acc.push(prev + 1);
        else acc.push(0);
        return acc;
      }, []));
    // best streak lb — only update if bigger
    const cur = await import("../db/redis").then((r) =>
      r.redis.zScore("lb:streak", id)
    );
    if (!cur || streak > cur) {
      await lbAdd("streak", id, streak);
    }
  }

  // Fastest win (fewest shots by winner)
  if (state.winner && !state.forfeitedBy) {
    const winnerShots = state.shots.filter(
      (s) => s.shooter === state.winner
    ).length;
    // lower is better — store negative so ZREVRANGEBYSCORE gives fastest
    await lbAdd("fastest", state.winner, -winnerShots);
  }

  console.log(`📝 Match recorded: ${state.matchId} | hash: ${hash}`);

  // Award badges asynchronously — don't block match flow
  import("../chain/badgeWorker")
    .then(({ checkAndAwardBadges }) => checkAndAwardBadges(state))
    .catch((err) => console.error("Badge worker error:", err));
}
