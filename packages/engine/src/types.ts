import type { GameConfig } from './config.js';

export type Hex = `0x${string}`;
/** Lower-case 0x-prefixed 20-byte address. */
export type Address = `0x${string}`;
export type PlayerIndex = 0 | 1;
export type Orientation = 'H' | 'V';

export interface Coord {
  x: number;
  y: number;
}
export interface Ship {
  x: number;
  y: number;
  length: number;
  orientation: Orientation;
}
export interface Board {
  ships: Ship[];
  mines: Coord[];
}
export interface Reveal {
  board: Board;
  salt: Hex;
}

export type ShotOutcome = 'miss' | 'hit' | 'sunk' | 'mine';
/** One log entry. A timed-out turn is recorded with outcome 'timeout' and x = y = -1. */
export interface ShotEntry {
  player: PlayerIndex;
  x: number;
  y: number;
  outcome: ShotOutcome | 'timeout';
}

export type ForfeitReason = 'timeouts' | 'disconnect' | 'placement_timeout' | 'resigned';
export interface Forfeit {
  by: PlayerIndex;
  reason: ForfeitReason;
}

export type Phase = 'placement' | 'battle' | 'finished';

export interface PlayerState {
  address: Address;
  commitment: Hex | null;
  board: Board | null;
  reveal: Reveal | null;
  score: number;
  streak: number;
  bestStreak: number;
  consecutiveTimeouts: number;
  /** Real shots fired (timeouts excluded). Mine triggers count. */
  shotsFired: number;
  hits: number;
  minesTriggered: number;
}

export interface MatchState {
  matchId: string;
  config: GameConfig;
  phase: Phase;
  players: [PlayerState, PlayerState];
  turn: PlayerIndex;
  shots: ShotEntry[];
  winner: PlayerIndex | null;
  forfeit: Forfeit | null;
}

export type ErrorCode =
  | 'WRONG_PHASE'
  | 'MATCH_FINISHED'
  | 'UNKNOWN_PLAYER'
  | 'NOT_YOUR_TURN'
  | 'INVALID_COORD'
  | 'OUT_OF_BOUNDS'
  | 'ALREADY_SHOT'
  | 'ALREADY_SUBMITTED'
  | 'INVALID_PLACEMENT'
  | 'INVALID_COMMITMENT'
  | 'INVALID_REVEAL'
  | 'COMMITMENT_MISMATCH'
  | 'NO_COMMITMENT'
  | 'STALE_TIMER';

export interface EngineError {
  ok: false;
  error: ErrorCode;
  message: string;
}
