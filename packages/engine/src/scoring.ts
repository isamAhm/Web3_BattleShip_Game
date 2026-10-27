import { GameConfig, ShotOutcome } from "./types";

/**
 * Compute streak multiplier from the current streak count.
 * Uses the streak value *before* this shot is applied.
 */
export function streakMultiplier(streak: number, config: GameConfig): number {
  return Math.min(
    1.0 + streak * config.streakStep,
    config.streakMax
  );
}

/**
 * Compute the points for a single shot.
 */
export function shotPoints(
  outcome: ShotOutcome,
  shipSize: number | undefined,
  currentStreak: number,
  config: GameConfig
): number {
  const mult = streakMultiplier(currentStreak, config);
  switch (outcome) {
    case "hit":
      return Math.round(config.points.hit * mult);
    case "sunk":
      return Math.round(
        (config.points.sinkBase + config.points.sinkPerCell * (shipSize ?? 2)) * mult
      );
    case "mine":
      return -config.points.minePenalty;
    case "miss":
      return 0;
  }
}

/**
 * New streak value after the outcome is applied.
 */
export function nextStreak(outcome: ShotOutcome, current: number): number {
  if (outcome === "hit" || outcome === "sunk") return current + 1;
  return 0; // miss or mine resets streak
}

/**
 * Speed bonus for the winner.
 * Perfect game = 17 shots (one per ship cell). Each extra shot costs points.
 */
export function speedBonus(totalShots: number, config: GameConfig): number {
  return Math.max(
    0,
    config.points.speedBase -
      config.points.speedPerExtraShot * Math.max(0, totalShots - 17)
  );
}
