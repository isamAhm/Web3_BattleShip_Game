import { totalShipCells, type GameConfig } from './config.js';
import type { ShotOutcome } from './types.js';

/** Multiplier from the streak BEFORE the current shot: 1.0, 1.25, ... capped at 2.0. */
export function streakMultiplier(streakBefore: number, config: GameConfig): number {
  const { streakStep, streakCap } = config.scoring;
  return Math.min(streakCap, 1 + streakStep * streakBefore);
}

/**
 * Points for one shot.
 * A sinking shot earns BOTH the hit points and the sunk bonus, each scaled by the same
 * (pre-shot) multiplier. Awards are exact multiples of 0.25 and are not rounded.
 */
export function awardFor(
  outcome: ShotOutcome,
  streakBefore: number,
  sunkLength: number | null,
  config: GameConfig,
): number {
  const s = config.scoring;
  const mult = streakMultiplier(streakBefore, config);
  switch (outcome) {
    case 'miss':
      return 0;
    case 'mine':
      return -s.minePenalty;
    case 'hit':
      return s.hit * mult;
    case 'sunk':
      return (s.hit + s.sunkBase + s.sunkPerCell * (sunkLength ?? 0)) * mult;
  }
}

/** Winner-only bonus for a win by destroying the fleet. `shotsUsed` = winner's real shots. */
export function speedBonus(shotsUsed: number, config: GameConfig): number {
  const s = config.scoring;
  return Math.max(0, s.speedBase - s.speedPerExtraShot * (shotsUsed - totalShipCells(config)));
}
