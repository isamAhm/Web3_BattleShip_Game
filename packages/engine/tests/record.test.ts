import { keccak256, toBytes } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  ZERO_HASH,
  buildRecord,
  canonicalRecord,
  canonicalize,
  forfeit,
  resultHash,
  submitReveal,
  timeoutTurn,
  verifyMatch,
  verifyRecord,
  fire,
  type MatchRecord,
  type MatchState,
} from '../src/index.js';
import {
  ADDR0,
  ADDR1,
  BOARD0,
  BOARD1,
  SALT0,
  SALT1,
  battleMatch,
  emptyCells,
  ok,
  perfectGame,
  placingMatch,
} from './fixtures.js';

function reveal(s: MatchState): MatchState {
  let r = ok(submitReveal(s, 0, { board: BOARD0, salt: SALT0 })).state;
  r = ok(submitReveal(r, 1, { board: BOARD1, salt: SALT1 })).state;
  return r;
}
const reveals = (): [unknown, unknown] => [
  { board: BOARD0, salt: SALT0 },
  { board: BOARD1, salt: SALT1 },
];

describe('canonical record + result hash', () => {
  it('builds a normalised record from a finished match only', () => {
    expect(() => buildRecord(battleMatch())).toThrow();
    const r = buildRecord(perfectGame());
    expect(r.players).toEqual([ADDR0.toLowerCase(), ADDR1.toLowerCase()]);
    expect(r.winner).toBe(ADDR0.toLowerCase());
    expect(r.scores).toEqual([885, 0]);
    expect(r.shots).toHaveLength(33);
    expect(r.forfeit).toBeNull();
    expect(Object.keys(r).sort()).toEqual([
      'commitments',
      'forfeit',
      'game',
      'matchId',
      'players',
      'scores',
      'shots',
      'version',
      'winner',
    ]);
  });

  it('canonicalize sorts keys, strips whitespace and rejects the unrepresentable', () => {
    expect(canonicalize({ b: 1, a: [true, null, 'x'] })).toBe('{"a":[true,null,"x"],"b":1}');
    expect(canonicalize(-0)).toBe('0');
    expect(() => canonicalize(NaN)).toThrow();
    expect(() => canonicalize({ a: undefined })).toThrow();
  });

  it('hash is stable, key-order independent and Keccak-256 of the canonical bytes', () => {
    const record = buildRecord(perfectGame());
    const h = resultHash(record);
    expect(h).toMatch(/^0x[0-9a-f]{64}$/);
    expect(resultHash(buildRecord(perfectGame()))).toBe(h);
    const reordered = Object.fromEntries(
      Object.entries(record).reverse(),
    ) as unknown as MatchRecord;
    expect(resultHash(reordered)).toBe(h);
    expect(h).toBe(keccak256(toBytes(canonicalRecord(record))));
  });

  it('any change to the record changes the hash', () => {
    const record = buildRecord(perfectGame());
    const h = resultHash(record);
    expect(resultHash({ ...record, scores: [884, 0] })).not.toBe(h);
    expect(resultHash({ ...record, matchId: 'm-2' })).not.toBe(h);
  });
});

describe('replay verification', () => {
  it('verifies an honest match end to end', () => {
    const s = reveal(perfectGame());
    const v = verifyMatch(s);
    expect(v).toMatchObject({ status: 'verified', errors: [], missingReveals: [] });
    expect(v.resultHash).toBe(resultHash(buildRecord(s)));
  });

  it('is never "verified" while reveals are missing', () => {
    const done = perfectGame();
    expect(verifyMatch(done)).toMatchObject({ status: 'incomplete', missingReveals: [0, 1] });
    const half = ok(submitReveal(done, 0, { board: BOARD0, salt: SALT0 })).state;
    expect(verifyMatch(half)).toMatchObject({ status: 'incomplete', missingReveals: [1] });
  });

  it('flags wrong salts and altered boards in reveals', () => {
    const record = buildRecord(perfectGame());
    const wrongSalt = verifyRecord(record, [{ board: BOARD0, salt: SALT1 }, reveals()[1]]);
    expect(wrongSalt.status).toBe('invalid');
    const moved = structuredClone(BOARD1);
    moved.mines[0] = { x: 6, y: 9 };
    expect(verifyRecord(record, [reveals()[0], { board: moved, salt: SALT1 }]).status).toBe(
      'invalid',
    );
  });

  it('detects a tampered shot outcome', () => {
    const record = buildRecord(perfectGame());
    record.shots[0] = { ...record.shots[0]!, outcome: 'miss' };
    const v = verifyRecord(record, reveals());
    expect(v.status).toBe('invalid');
    expect(v.errors.join(' ')).toMatch(/shot 0/);
  });

  it('detects forged scores and a forged winner', () => {
    const base = buildRecord(perfectGame());
    expect(verifyRecord({ ...base, scores: [886, 0] }, reveals()).errors.join(' ')).toMatch(
      /score mismatch/,
    );
    expect(verifyRecord({ ...base, winner: base.players[1] }, reveals()).status).toBe('invalid');
  });

  it('detects invalid turn order and shots logged after the end', () => {
    const base = buildRecord(perfectGame());
    const swapped = structuredClone(base);
    swapped.shots[1] = { ...swapped.shots[1]!, player: 0 };
    expect(verifyRecord(swapped, reveals()).errors.join(' ')).toMatch(/out of turn/);

    const extra = structuredClone(base);
    extra.shots.push({ player: 1, x: 9, y: 9, outcome: 'miss' });
    expect(verifyRecord(extra, reveals()).errors.join(' ')).toMatch(/after the match ended/);
  });

  it('detects an impossible log (repeated cell) and a truncated log', () => {
    const base = buildRecord(perfectGame());
    const repeated = structuredClone(base);
    repeated.shots[2] = { ...repeated.shots[0]! };
    expect(verifyRecord(repeated, reveals()).status).toBe('invalid');

    const truncated = structuredClone(base);
    truncated.shots = truncated.shots.slice(0, 10);
    expect(verifyRecord(truncated, reveals()).status).toBe('invalid');
  });

  it('verifies forfeits, and rejects a fabricated one', () => {
    let s = ok(fire(battleMatch(), 0, 9, 0)).state;
    s = ok(forfeit(s, 1, 'disconnect')).state;
    expect(verifyMatch(reveal(s)).status).toBe('verified');

    const clean = buildRecord(perfectGame());
    const forged: MatchRecord = {
      ...clean,
      forfeit: { by: clean.players[1], reason: 'resigned' },
    };
    expect(verifyRecord(forged, reveals()).status).toBe('invalid');
  });

  it('verifies a timeout forfeit and rejects a fake one', () => {
    const misses = emptyCells(BOARD0);
    let s = battleMatch();
    s = ok(timeoutTurn(s)).state;
    s = ok(fire(s, 1, misses[0]!.x, misses[0]!.y)).state;
    s = ok(timeoutTurn(s)).state;
    s = ok(fire(s, 1, misses[1]!.x, misses[1]!.y)).state;
    s = ok(timeoutTurn(s)).state;
    expect(s.forfeit).toEqual({ by: 0, reason: 'timeouts' });
    expect(verifyMatch(reveal(s)).status).toBe('verified');

    const record = buildRecord(s);
    const fake = { ...record, shots: record.shots.slice(0, 2), forfeit: record.forfeit };
    expect(verifyRecord(fake, reveals()).status).toBe('invalid');
  });

  it('catches a player who commits to one board but plays another', () => {
    // Player 1 plays BOARD1 in the game but committed to BOARD0 (a different, valid fleet).
    let s = placingMatch();
    s = ok(submitWithCommitment(s, 0, BOARD0, SALT0)).state;
    s = ok(submitWithCommitment(s, 1, BOARD1, SALT1, BOARD0)).state;
    s = playOut(s);
    // The cheater reveals the board they committed to; it matches the commitment...
    let r = ok(submitReveal(s, 0, { board: BOARD0, salt: SALT0 })).state;
    r = ok(submitReveal(r, 1, { board: BOARD0, salt: SALT1 })).state;
    // ...but the replay contradicts what actually happened in the game.
    const v = verifyMatch(r);
    expect(v.status).toBe('invalid');
    expect(v.errors.join(' ')).toMatch(/revealed board differs/);
    expect(v.errors.join(' ')).toMatch(/replay produced/);
  });

  it('exposes ZERO_HASH for players who never committed', () => {
    const s = ok(forfeit(placingMatch(), 1, 'placement_timeout')).state;
    const record = buildRecord(s);
    expect(record.commitments).toEqual([ZERO_HASH, ZERO_HASH]);
    expect(verifyRecord(record, [null, null]).status).toBe('incomplete');
  });
});

import { commitPlacement, submitPlacement } from '../src/index.js';
import type { Board, Hex, PlayerIndex } from '../src/index.js';

function submitWithCommitment(
  s: MatchState,
  p: PlayerIndex,
  board: Board,
  salt: Hex,
  committedBoard: Board = board,
) {
  return submitPlacement(s, p, { board, commitment: commitPlacement(committedBoard, salt) });
}

function playOut(s: MatchState): MatchState {
  const misses = emptyCells(BOARD0);
  const shots: Array<[number, number]> = [
    [9, 0],
    [9, 1],
    [9, 2],
    [9, 3],
    [9, 4],
    [7, 0],
    [7, 1],
    [7, 2],
    [7, 3],
    [5, 0],
    [5, 1],
    [5, 2],
    [3, 0],
    [3, 1],
    [3, 2],
    [1, 0],
    [1, 1],
  ];
  let cur = s;
  shots.forEach(([x, y], i) => {
    cur = ok(fire(cur, 0, x, y)).state;
    if (i < shots.length - 1) cur = ok(fire(cur, 1, misses[i]!.x, misses[i]!.y)).state;
  });
  return cur;
}
