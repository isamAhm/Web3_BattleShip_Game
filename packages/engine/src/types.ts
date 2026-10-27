// ─── Board & Fleet ───────────────────────────────────────────────────────────

export type PlayerId = string; // wallet address

export interface Cell {
  row: number; // 0–9
  col: number; // 0–9
}

export type ShipType = "carrier" | "battleship" | "cruiser" | "submarine" | "destroyer";

export interface ShipDef {
  type: ShipType;
  size: number;
}

export const SHIP_DEFS: ShipDef[] = [
  { type: "carrier",    size: 5 },
  { type: "battleship", size: 4 },
  { type: "cruiser",    size: 3 },
  { type: "submarine",  size: 3 },
  { type: "destroyer",  size: 2 },
];

export const TOTAL_SHIP_CELLS = SHIP_DEFS.reduce((s, d) => s + d.size, 0); // 17

export interface ShipPlacement {
  type: ShipType;
  size: number;
  row: number;   // top-left cell
  col: number;
  vertical: boolean;
}

export interface Board {
  ships: ShipPlacement[];
  mines: Cell[];          // exactly 3
}

// ─── Match state ─────────────────────────────────────────────────────────────

export type ShotOutcome = "miss" | "hit" | "sunk" | "mine";

export interface Shot {
  shooter: PlayerId;
  row: number;
  col: number;
  outcome: ShotOutcome;
  sunkShipType?: ShipType;
  sunkShipSize?: number;
  /** Points earned (or lost) for this shot */
  points: number;
  /** Streak multiplier *before* this shot */
  multiplier: number;
  turnIndex: number;
}

export interface PlayerState {
  id: PlayerId;
  /** commitment hash submitted before battle */
  commitment: string;
  /** board revealed at end (null during play) */
  board: Board | null;
  /** which opponent cells this player has already shot */
  shotsFired: Set<string>; // "row,col"
  /** how many of their own ship cells have been hit */
  shipCellsHit: number;
  /** current hit streak */
  streak: number;
  /** accumulated points */
  score: number;
  /** consecutive missed turns */
  missedTurns: number;
}

export type MatchPhase =
  | "placement"  // waiting for boards
  | "battle"     // shooting turns
  | "reveal"     // end, waiting for reveals
  | "finished";  // done

export interface MatchState {
  matchId: string;
  phase: MatchPhase;
  playerIds: [PlayerId, PlayerId];
  players: Record<PlayerId, PlayerState>;
  /** index into playerIds — whose turn it is */
  currentTurn: number;
  shots: Shot[];
  winner: PlayerId | null;
  forfeitedBy: PlayerId | null;
  startedAt: number | null; // unix ms
  endedAt: number | null;
}

// ─── Config ──────────────────────────────────────────────────────────────────

export interface GameConfig {
  boardSize: number;         // 10
  minesPerPlayer: number;    // 3
  turnSeconds: number;       // 20
  placementSeconds: number;  // 60
  maxMissedTurns: number;    // 3 → forfeit
  points: {
    hit: number;             // 10
    sinkBase: number;        // 25
    sinkPerCell: number;     // 5
    win: number;             // 50
    minePenalty: number;     // 20
    speedBase: number;       // 100
    speedPerExtraShot: number; // 5
  };
  streakStep: number;        // 0.25 per hit
  streakMax: number;         // 2.0
}

export const DEFAULT_CONFIG: GameConfig = {
  boardSize: 10,
  minesPerPlayer: 3,
  turnSeconds: 20,
  placementSeconds: 60,
  maxMissedTurns: 3,
  points: {
    hit: 10,
    sinkBase: 25,
    sinkPerCell: 5,
    win: 50,
    minePenalty: 20,
    speedBase: 100,
    speedPerExtraShot: 5,
  },
  streakStep: 0.25,
  streakMax: 2.0,
};

// ─── Engine errors ───────────────────────────────────────────────────────────

export class EngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EngineError";
  }
}
