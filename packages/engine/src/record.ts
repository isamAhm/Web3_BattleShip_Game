import { keccak256, toBytes } from 'viem';
import type { Address, ForfeitReason, Hex, MatchState, ShotEntry } from './types.js';

export const RECORD_VERSION = 1;
export const ZERO_HASH: Hex = `0x${'0'.repeat(64)}`;

export interface RecordForfeit {
  by: Address;
  reason: ForfeitReason;
}

/** The canonical, hashable summary of a finished match. No timestamps, no database metadata. */
export interface MatchRecord {
  version: typeof RECORD_VERSION;
  game: 'battleship';
  matchId: string;
  players: [Address, Address];
  /** ZERO_HASH if a player never committed (e.g. forfeited during placement). */
  commitments: [Hex, Hex];
  shots: ShotEntry[];
  scores: [number, number];
  winner: Address;
  forfeit: RecordForfeit | null;
}

/** Deterministic JSON: sorted keys, no whitespace, finite numbers only, -0 normalised to 0. */
export function canonicalize(value: unknown): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
      return JSON.stringify(value);
    case 'boolean':
      return value ? 'true' : 'false';
    case 'number':
      if (!Number.isFinite(value)) throw new Error('cannot canonicalize a non-finite number');
      return JSON.stringify(Object.is(value, -0) ? 0 : value);
    case 'object': {
      if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
      const obj = value as Record<string, unknown>;
      const keys = Object.keys(obj).sort();
      return `{${keys
        .map((k) => {
          if (obj[k] === undefined) throw new Error(`cannot canonicalize undefined at "${k}"`);
          return `${JSON.stringify(k)}:${canonicalize(obj[k])}`;
        })
        .join(',')}}`;
    }
    default:
      throw new Error(`cannot canonicalize ${typeof value}`);
  }
}

export function buildRecord(state: MatchState): MatchRecord {
  if (state.phase !== 'finished' || state.winner === null) {
    throw new Error('a record can only be built for a finished match');
  }
  const [p0, p1] = state.players;
  return {
    version: RECORD_VERSION,
    game: 'battleship',
    matchId: state.matchId,
    players: [p0.address, p1.address],
    commitments: [p0.commitment ?? ZERO_HASH, p1.commitment ?? ZERO_HASH],
    shots: state.shots.map((s) => ({ player: s.player, x: s.x, y: s.y, outcome: s.outcome })),
    scores: [p0.score, p1.score],
    winner: state.players[state.winner].address,
    forfeit: state.forfeit
      ? { by: state.players[state.forfeit.by].address, reason: state.forfeit.reason }
      : null,
  };
}

export const canonicalRecord = (record: MatchRecord): string => canonicalize(record);

/** Keccak-256 of the canonical record bytes. This is the value recorded on-chain. */
export function resultHash(record: MatchRecord): Hex {
  return keccak256(toBytes(canonicalRecord(record)));
}
