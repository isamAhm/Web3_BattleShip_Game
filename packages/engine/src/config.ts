/** Every tunable game constant lives here. The engine never reads constants from anywhere else. */
export interface GameConfig {
  readonly boardSize: number;
  /** Ship lengths. Total ship cells = sum (17 by default). */
  readonly fleet: readonly number[];
  readonly mineCount: number;
  /** Used by the realtime server, not by the (time-free) engine. */
  readonly placementSeconds: number;
  readonly turnSeconds: number;
  readonly reconnectGraceSeconds: number;
  /** Consecutive timeouts by the same player that cause a forfeit. */
  readonly maxConsecutiveTimeouts: number;
  readonly scoring: {
    readonly hit: number;
    readonly sunkBase: number;
    readonly sunkPerCell: number;
    readonly minePenalty: number;
    readonly win: number;
    readonly speedBase: number;
    readonly speedPerExtraShot: number;
    readonly streakStep: number;
    readonly streakCap: number;
  };
}

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 10,
  fleet: [5, 4, 3, 3, 2],
  mineCount: 3,
  placementSeconds: 60,
  turnSeconds: 20,
  reconnectGraceSeconds: 30,
  maxConsecutiveTimeouts: 3,
  scoring: {
    hit: 10,
    sunkBase: 25,
    sunkPerCell: 5,
    minePenalty: 20,
    win: 50,
    speedBase: 100,
    speedPerExtraShot: 5,
    streakStep: 0.25,
    streakCap: 2.0,
  },
};

export const totalShipCells = (config: GameConfig): number =>
  config.fleet.reduce((sum, length) => sum + length, 0);
