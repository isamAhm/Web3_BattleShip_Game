import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { verifyReveal } from './commitment.js';
import { createMatch, fire, forfeit, startBattleWithBoards, timeoutTurn } from './match.js';
import {
  ZERO_HASH,
  buildRecord,
  resultHash,
  type MatchRecord,
  type RecordForfeit,
} from './record.js';
import type { Address, Board, Hex, MatchState, PlayerIndex, Reveal, ShotEntry } from './types.js';

export interface ReplayInput {
  matchId: string;
  players: [Address, Address];
  boards: [Board, Board];
  shots: readonly ShotEntry[];
  forfeit: RecordForfeit | null;
}

export type ReplayResult =
  | { ok: true; scores: [number, number]; winner: Address; forfeit: RecordForfeit | null }
  | { ok: false; errors: string[] };

/**
 * Re-runs the whole shot log against the revealed boards using the same engine rules as live
 * play. Any inconsistency (turn order, impossible results, shots after the end, bogus forfeit)
 * is reported instead of being trusted.
 */
export function replayScores(
  input: ReplayInput,
  config: GameConfig = DEFAULT_CONFIG,
): ReplayResult {
  const bad = (message: string): ReplayResult => ({ ok: false, errors: [message] });

  let state: MatchState;
  try {
    state = createMatch({ matchId: input.matchId, players: input.players, config });
  } catch (e) {
    return bad(e instanceof Error ? e.message : 'invalid match header');
  }
  const started = startBattleWithBoards(state, input.boards);
  if (!started.ok) return bad(started.message);
  state = started.state;

  for (const [i, entry] of input.shots.entries()) {
    if (state.phase === 'finished') return bad(`shot ${i}: logged after the match ended`);
    if (entry.player !== state.turn) return bad(`shot ${i}: out of turn`);
    if (entry.outcome === 'timeout') {
      if (entry.x !== -1 || entry.y !== -1) return bad(`shot ${i}: malformed timeout entry`);
      const t = timeoutTurn(state);
      if (!t.ok) return bad(`shot ${i}: ${t.message}`);
      state = t.state;
      continue;
    }
    const r = fire(state, entry.player, entry.x, entry.y);
    if (!r.ok) return bad(`shot ${i}: ${r.message}`);
    if (r.shot.outcome !== entry.outcome) {
      return bad(`shot ${i}: logged "${entry.outcome}" but replay produced "${r.shot.outcome}"`);
    }
    state = r.state;
  }

  const claimed = input.forfeit;
  if (state.phase !== 'finished') {
    if (!claimed) return bad('log ends before the match is decided and no forfeit is recorded');
    if (claimed.reason === 'timeouts') {
      return bad('timeout forfeit recorded without three consecutive timeouts in the log');
    }
    const idx = input.players.indexOf(claimed.by);
    if (idx < 0) return bad('forfeit names a player who is not in the match');
    const f = forfeit(state, idx as PlayerIndex, claimed.reason);
    if (!f.ok) return bad(f.message);
    state = f.state;
  } else if (state.forfeit) {
    const replayed = { by: input.players[state.forfeit.by], reason: state.forfeit.reason };
    if (!claimed || claimed.by !== replayed.by || claimed.reason !== replayed.reason) {
      return bad('log ends in a timeout forfeit that the record does not state');
    }
  } else if (claimed) {
    return bad('forfeit recorded, but the log ends with a fleet being destroyed');
  }

  return {
    ok: true,
    scores: [state.players[0].score, state.players[1].score],
    winner: input.players[state.winner as PlayerIndex],
    forfeit: state.forfeit
      ? { by: input.players[state.forfeit.by], reason: state.forfeit.reason }
      : null,
  };
}

/** 'verified' only if every check passed. Missing reveals can never yield 'verified'. */
export type VerificationStatus = 'verified' | 'invalid' | 'incomplete';

export interface VerificationResult {
  status: VerificationStatus;
  errors: string[];
  missingReveals: PlayerIndex[];
  resultHash: Hex;
}

/**
 * Independent audit of a stored record: reveals vs commitments, then full replay, then
 * claimed scores/winner/forfeit vs recomputed ones. Works from persisted data alone.
 */
export function verifyRecord(
  record: MatchRecord,
  reveals: [unknown, unknown],
  config: GameConfig = DEFAULT_CONFIG,
): VerificationResult {
  const errors: string[] = [];
  const missing: PlayerIndex[] = [];
  const checked: [Reveal | null, Reveal | null] = [null, null];
  const hash = resultHash(record);

  for (const i of [0, 1] as const) {
    const raw = reveals[i];
    if (raw === null || raw === undefined) {
      missing.push(i);
      continue;
    }
    if (record.commitments[i] === ZERO_HASH) {
      errors.push(`player ${i} supplied a reveal but never committed a fleet`);
      continue;
    }
    const r = verifyReveal(record.commitments[i], raw, config);
    if (r.ok) checked[i] = r.reveal;
    else errors.push(`player ${i}: ${r.reason}`);
  }

  if (checked[0] && checked[1]) {
    const replay = replayScores(
      {
        matchId: record.matchId,
        players: record.players,
        boards: [checked[0].board, checked[1].board],
        shots: record.shots,
        forfeit: record.forfeit,
      },
      config,
    );
    if (!replay.ok) {
      errors.push(...replay.errors);
    } else {
      if (replay.scores[0] !== record.scores[0] || replay.scores[1] !== record.scores[1]) {
        errors.push(
          `score mismatch: record ${record.scores.join('-')} vs replay ${replay.scores.join('-')}`,
        );
      }
      if (replay.winner !== record.winner) errors.push('winner mismatch');
    }
  }

  const status: VerificationStatus =
    errors.length > 0 ? 'invalid' : missing.length > 0 ? 'incomplete' : 'verified';
  return { status, errors, missingReveals: missing, resultHash: hash };
}

/**
 * Verifies a live/finished MatchState. Also catches a player who placed one board in the game
 * but committed (and later reveals) a different one.
 */
export function verifyMatch(state: MatchState): VerificationResult {
  const result = verifyRecord(
    buildRecord(state),
    [state.players[0].reveal, state.players[1].reveal],
    state.config,
  );
  for (const i of [0, 1] as const) {
    const { reveal, board } = state.players[i];
    if (reveal && board && JSON.stringify(reveal.board) !== JSON.stringify(board)) {
      result.errors.push(`player ${i}: revealed board differs from the board used in play`);
      result.status = 'invalid';
    }
  }
  return result;
}
