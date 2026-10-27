import { MatchState, TOTAL_SHIP_CELLS } from "@battle-arena/engine";
import { Badge, Match, Player } from "../db/mongo";
import { config } from "../config";

// Badge IDs mirror the contract constants
export const BADGE_IDS = {
  FIRST_WIN:    1,
  HOT_STREAK:   2,
  PERFECT_GAME: 3,
  MINE_DODGER:  4,
  ADMIRAL:      5,
} as const;

type BadgeName = keyof typeof BADGE_IDS;

interface BadgeCheck {
  id: number;
  name: BadgeName;
  check: (state: MatchState, address: string) => boolean;
}

const BADGE_CHECKS: BadgeCheck[] = [
  {
    id: BADGE_IDS.FIRST_WIN,
    name: "FIRST_WIN",
    check: (_state, _addr) => true, // awarded on any win — wins count checked below
  },
  {
    id: BADGE_IDS.HOT_STREAK,
    name: "HOT_STREAK",
    check: (state, addr) => {
      // Reached a streak of 5+ consecutive hits in this match
      let streak = 0;
      for (const shot of state.shots) {
        if (shot.shooter !== addr) continue;
        if (shot.outcome === "hit" || shot.outcome === "sunk") {
          streak++;
          if (streak >= 5) return true;
        } else {
          streak = 0;
        }
      }
      return false;
    },
  },
  {
    id: BADGE_IDS.PERFECT_GAME,
    name: "PERFECT_GAME",
    check: (state, addr) => {
      if (state.winner !== addr) return false;
      const shotsFired = state.shots.filter((s) => s.shooter === addr).length;
      return shotsFired === TOTAL_SHIP_CELLS; // 17 shots exactly
    },
  },
  {
    id: BADGE_IDS.MINE_DODGER,
    name: "MINE_DODGER",
    check: (state, addr) => {
      // Player fired shots but never hit a mine
      const theirShots = state.shots.filter((s) => s.shooter === addr);
      return (
        theirShots.length > 0 &&
        theirShots.every((s) => s.outcome !== "mine")
      );
    },
  },
  {
    id: BADGE_IDS.ADMIRAL,
    name: "ADMIRAL",
    check: (_state, _addr) => false, // checked from DB win count below
  },
];

/**
 * Run after every finished match.
 * Determines which badges each player has earned and queues minting.
 */
export async function checkAndAwardBadges(state: MatchState): Promise<void> {
  for (const playerId of state.playerIds) {
    const earned: number[] = [];

    for (const bc of BADGE_CHECKS) {
      // Skip if player already has this badge
      const existing = await Badge.findOne({ address: playerId, badgeType: bc.name });
      if (existing) continue;

      let qualifies = false;

      if (bc.name === "FIRST_WIN") {
        qualifies = state.winner === playerId;
        if (qualifies) {
          // Only award on first win
          const wins = await Match.countDocuments({
            winner: playerId,
            matchId: { $ne: state.matchId },
          });
          qualifies = wins === 0;
        }
      } else if (bc.name === "ADMIRAL") {
        const totalWins = await Match.countDocuments({ winner: playerId });
        qualifies = totalWins >= 10;
      } else {
        qualifies = bc.check(state, playerId);
      }

      if (qualifies) {
        earned.push(bc.id);
        await Badge.create({
          address: playerId,
          badgeType: bc.name,
          mintStatus: "pending",
        });
        console.log(`🏅 Badge earned: ${bc.name} → ${playerId}`);
      }
    }

    // Mint on-chain (testnet) or mark simulated
    if (earned.length > 0) {
      if (config.chainMode === "testnet") {
        try {
          const { mintBadgeOnChain } = await import("./relayer");
          for (const id of earned) {
            const tx = await mintBadgeOnChain(playerId, id);
            const name = Object.entries(BADGE_IDS).find(([, v]) => v === id)?.[0];
            await Badge.updateOne(
              { address: playerId, badgeType: name },
              { mintStatus: "minted", txHash: tx }
            );
          }
        } catch (err) {
          console.error("Badge mint error:", err);
        }
      } else {
        // Simulated — mark minted immediately
        const names = earned
          .map((id) => Object.entries(BADGE_IDS).find(([, v]) => v === id)?.[0])
          .filter(Boolean);
        await Badge.updateMany(
          { address: playerId, badgeType: { $in: names } },
          { mintStatus: "minted", txHash: "0xSIM_BADGE" }
        );
      }
    }
  }
}
