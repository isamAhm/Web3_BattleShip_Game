import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { HASH_PATTERN, verifyReveal } from './commitment.js';
import { cellKey, shipCells, validatePlacement } from './placement.js';
import { awardFor, speedBonus } from './scoring.js';
import type {
  Address,
  Board,
  EngineError,
  ErrorCode,
  ForfeitReason,
  Hex,
  MatchState,
  PlayerIndex,
  PlayerState,
  ShotEntry,
  ShotOutcome,
} from './types.js';

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

const fail = (error: ErrorCode, message: string): EngineError => ({ ok: false, error, message });
const isPlayer = (p: unknown): p is PlayerIndex => p === 0 || p === 1;
export const otherPlayer = (p: PlayerIndex): PlayerIndex => (p === 0 ? 1 : 0);

export function normalizeAddress(address: string): Address {
  if (!ADDRESS_PATTERN.test(address)) throw new Error(`invalid address: ${address}`);
  return address.toLowerCase() as Address;
}

const newPlayer = (address: Address): PlayerState => ({
  address,
  commitment: null,
  board: null,
  reveal: null,
  score: 0,
  streak: 0,
  bestStreak: 0,
  consecutiveTimeouts: 0,
  shotsFired: 0,
  hits: 0,
  minesTriggered: 0,
});

/** Player index = position in `players`. The caller may shuffle to randomise who shoots first. */
export function createMatch(input: {
  matchId: string;
  players: [string, string];
  config?: GameConfig;
}): MatchState {
  if (!input.matchId) throw new Error('matchId is required');
  const a = normalizeAddress(input.players[0]);
  const b = normalizeAddress(input.players[1]);
  if (a === b) throw new Error('a match needs two distinct players');
  return {
    matchId: input.matchId,
    config: input.config ?? DEFAULT_CONFIG,
    phase: 'placement',
    players: [newPlayer(a), newPlayer(b)],
    turn: 0,
    shots: [],
    winner: null,
    forfeit: null,
  };
}

export type SubmitPlacementResult =
  { ok: true; state: MatchState; battleStarted: boolean } | EngineError;

/** Accepts one player's board + commitment. Battle starts once both have submitted. */
export function submitPlacement(
  state: MatchState,
  player: PlayerIndex,
  payload: unknown,
): SubmitPlacementResult {
  if (state.phase === 'finished') return fail('MATCH_FINISHED', 'match is finished');
  if (state.phase !== 'placement') return fail('WRONG_PHASE', 'placement phase is over');
  if (!isPlayer(player)) return fail('UNKNOWN_PLAYER', 'unknown player');
  if (state.players[player].board) return fail('ALREADY_SUBMITTED', 'placement already submitted');
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return fail('INVALID_PLACEMENT', 'payload must be an object');
  }
  const { board, commitment, ...rest } = payload as Record<string, unknown>;
  if (Object.keys(rest).length > 0) return fail('INVALID_PLACEMENT', 'unexpected fields');
  if (typeof commitment !== 'string' || !HASH_PATTERN.test(commitment)) {
    return fail('INVALID_COMMITMENT', 'commitment must be a 32-byte hex hash');
  }
  const placement = validatePlacement(board, state.config);
  if (!placement.ok) return fail('INVALID_PLACEMENT', placement.errors.join('; '));

  const next = structuredClone(state);
  next.players[player].board = placement.board;
  next.players[player].commitment = commitment.toLowerCase() as Hex;
  const battleStarted = next.players[0].board !== null && next.players[1].board !== null;
  if (battleStarted) {
    next.phase = 'battle';
    next.turn = 0;
  }
  return { ok: true, state: next, battleStarted };
}

/**
 * Starts the battle from two already-known boards, skipping commitments.
 * Used by replay verification; the realtime server uses submitPlacement.
 */
export function startBattleWithBoards(
  state: MatchState,
  boards: [Board, Board],
): { ok: true; state: MatchState } | EngineError {
  if (state.phase !== 'placement') return fail('WRONG_PHASE', 'battle already started');
  const next = structuredClone(state);
  for (const i of [0, 1] as const) {
    const placement = validatePlacement(boards[i], state.config);
    if (!placement.ok)
      return fail('INVALID_PLACEMENT', `player ${i}: ${placement.errors.join('; ')}`);
    next.players[i].board = placement.board;
  }
  next.phase = 'battle';
  next.turn = 0;
  return { ok: true, state: next };
}

function finish(s: MatchState, winner: PlayerIndex, byForfeit: boolean): void {
  const w = s.players[winner];
  w.score += s.config.scoring.win;
  if (!byForfeit) w.score += speedBonus(w.shotsFired, s.config);
  for (const p of s.players) p.score = Math.max(0, p.score);
  s.phase = 'finished';
  s.winner = winner;
}

function guardBattle(state: MatchState, player: unknown): EngineError | null {
  if (state.phase === 'finished') return fail('MATCH_FINISHED', 'match is finished');
  if (state.phase !== 'battle') return fail('WRONG_PHASE', 'battle has not started');
  if (!isPlayer(player)) return fail('UNKNOWN_PLAYER', 'unknown player');
  return null;
}

export type FireResult =
  | {
      ok: true;
      state: MatchState;
      shot: ShotEntry;
      points: number;
      sunkLength: number | null;
      finished: boolean;
    }
  | EngineError;

export function fire(state: MatchState, player: PlayerIndex, x: number, y: number): FireResult {
  const guard = guardBattle(state, player);
  if (guard) return guard;
  if (player !== state.turn) return fail('NOT_YOUR_TURN', 'it is not your turn');
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    return fail('INVALID_COORD', 'coordinates must be integers');
  }
  const size = state.config.boardSize;
  if (x < 0 || y < 0 || x >= size || y >= size)
    return fail('OUT_OF_BOUNDS', 'target is off the board');

  const shooterKeys = new Set(
    state.shots
      .filter((s) => s.player === player && s.outcome !== 'timeout')
      .map((s) => cellKey(s.x, s.y)),
  );
  const key = cellKey(x, y);
  if (shooterKeys.has(key)) return fail('ALREADY_SHOT', 'you already fired at that cell');
  shooterKeys.add(key);

  const opponent = otherPlayer(player);
  const target = state.players[opponent].board as Board;
  let outcome: ShotOutcome = 'miss';
  let sunkLength: number | null = null;
  if (target.mines.some((m) => m.x === x && m.y === y)) {
    outcome = 'mine';
  } else {
    const ship = target.ships.find((s) => shipCells(s).some((c) => c.x === x && c.y === y));
    if (ship) {
      const sunk = shipCells(ship).every((c) => shooterKeys.has(cellKey(c.x, c.y)));
      outcome = sunk ? 'sunk' : 'hit';
      if (sunk) sunkLength = ship.length;
    }
  }

  const next = structuredClone(state);
  const me = next.players[player];
  const points = awardFor(outcome, me.streak, sunkLength, state.config);
  me.score += points;
  me.shotsFired += 1;
  me.consecutiveTimeouts = 0;
  if (outcome === 'hit' || outcome === 'sunk') {
    me.streak += 1;
    me.hits += 1;
    me.bestStreak = Math.max(me.bestStreak, me.streak);
  } else {
    me.streak = 0;
    if (outcome === 'mine') me.minesTriggered += 1;
  }
  const shot: ShotEntry = { player, x, y, outcome };
  next.shots.push(shot);

  const won = target.ships.every((s) =>
    shipCells(s).every((c) => shooterKeys.has(cellKey(c.x, c.y))),
  );
  if (won) finish(next, player, false);
  else next.turn = opponent;
  return { ok: true, state: next, shot, points, sunkLength, finished: won };
}

export type EndResult = { ok: true; state: MatchState; finished: boolean } | EngineError;

/**
 * Skips the current player's turn. `expectedShotCount` makes stale or duplicate timers harmless:
 * pass state.shots.length as it was when the timer was armed.
 */
export function timeoutTurn(
  state: MatchState,
  opts: { expectedShotCount?: number } = {},
): EndResult {
  const guard = guardBattle(state, state.turn);
  if (guard) return guard;
  if (opts.expectedShotCount !== undefined && opts.expectedShotCount !== state.shots.length) {
    return fail('STALE_TIMER', 'the turn has already advanced');
  }
  const next = structuredClone(state);
  const idle = next.turn;
  const p = next.players[idle];
  next.shots.push({ player: idle, x: -1, y: -1, outcome: 'timeout' });
  p.streak = 0;
  p.consecutiveTimeouts += 1;
  if (p.consecutiveTimeouts >= next.config.maxConsecutiveTimeouts) {
    next.forfeit = { by: idle, reason: 'timeouts' };
    finish(next, otherPlayer(idle), true);
    return { ok: true, state: next, finished: true };
  }
  next.turn = otherPlayer(idle);
  return { ok: true, state: next, finished: false };
}

/** The other player wins +win points and no speed bonus. Valid in placement and battle. */
export function forfeit(state: MatchState, player: PlayerIndex, reason: ForfeitReason): EndResult {
  if (state.phase === 'finished') return fail('MATCH_FINISHED', 'match is finished');
  if (!isPlayer(player)) return fail('UNKNOWN_PLAYER', 'unknown player');
  const next = structuredClone(state);
  next.forfeit = { by: player, reason };
  finish(next, otherPlayer(player), true);
  return { ok: true, state: next, finished: true };
}

/** After the match: store a player's reveal if it matches their commitment. */
export function submitReveal(
  state: MatchState,
  player: PlayerIndex,
  payload: unknown,
): { ok: true; state: MatchState } | EngineError {
  if (!isPlayer(player)) return fail('UNKNOWN_PLAYER', 'unknown player');
  if (state.phase !== 'finished')
    return fail('WRONG_PHASE', 'reveals are accepted after the match');
  const commitment = state.players[player].commitment;
  if (!commitment) return fail('NO_COMMITMENT', 'this player never committed a fleet');
  const result = verifyReveal(commitment, payload, state.config);
  if (!result.ok) {
    return fail(
      result.code === 'MISMATCH' ? 'COMMITMENT_MISMATCH' : 'INVALID_REVEAL',
      result.reason,
    );
  }
  const next = structuredClone(state);
  next.players[player].reveal = result.reveal;
  return { ok: true, state: next };
}
