import { describe, expect, it } from 'vitest';
import {
  fire,
  forfeit,
  speedBonus,
  streakMultiplier,
  submitPlacement,
  timeoutTurn,
  createMatch,
  DEFAULT_CONFIG,
  type PlayerIndex,
} from '../src/index.js';
import {
  ADDR0,
  BOARD0,
  BOARD1,
  SALT0,
  battleMatch,
  emptyCells,
  ok,
  perfectGame,
  placementPayload,
  placingMatch,
} from './fixtures.js';

const miss0 = emptyCells(BOARD0); // cells where player 1 can safely miss
const missAt = (i: number): [number, number] => {
  const c = miss0[i]!;
  return [c.x, c.y];
};

describe('match setup', () => {
  it('normalises addresses and starts in placement', () => {
    const s = placingMatch();
    expect(s.phase).toBe('placement');
    expect(s.players[0].address).toBe(ADDR0.toLowerCase());
  });

  it('rejects identical or malformed players', () => {
    expect(() => createMatch({ matchId: 'x', players: [ADDR0, ADDR0.toLowerCase()] })).toThrow();
    expect(() => createMatch({ matchId: 'x', players: [ADDR0, '0x123'] })).toThrow();
  });

  it('starts battle only after BOTH valid placements', () => {
    const s = placingMatch();
    const first = ok(submitPlacement(s, 0, placementPayload(BOARD0, SALT0)));
    expect(first.battleStarted).toBe(false);
    expect(first.state.phase).toBe('placement');
    expect(fire(first.state, 0, 9, 0)).toMatchObject({ ok: false, error: 'WRONG_PHASE' });
    const second = ok(submitPlacement(first.state, 1, placementPayload(BOARD1, SALT0)));
    expect(second.battleStarted).toBe(true);
    expect(second.state.phase).toBe('battle');
    expect(second.state.turn).toBe(0);
  });

  it('rejects duplicate, malformed, and invalid placements', () => {
    const s = ok(submitPlacement(placingMatch(), 0, placementPayload(BOARD0, SALT0))).state;
    expect(submitPlacement(s, 0, placementPayload(BOARD0, SALT0))).toMatchObject({
      error: 'ALREADY_SUBMITTED',
    });
    expect(submitPlacement(s, 1, { board: BOARD1, commitment: '0x12' })).toMatchObject({
      error: 'INVALID_COMMITMENT',
    });
    expect(
      submitPlacement(s, 1, { board: { ships: [], mines: [] }, commitment: `0x${'a'.repeat(64)}` }),
    ).toMatchObject({
      error: 'INVALID_PLACEMENT',
    });
    expect(submitPlacement(s, 1, 'nope')).toMatchObject({ error: 'INVALID_PLACEMENT' });
    expect(submitPlacement(s, 2 as PlayerIndex, placementPayload(BOARD1, SALT0))).toMatchObject({
      error: 'UNKNOWN_PLAYER',
    });
  });
});

describe('firing rules', () => {
  it('enforces alternating turns', () => {
    const s = battleMatch();
    expect(fire(s, 1, 0, 0)).toMatchObject({ ok: false, error: 'NOT_YOUR_TURN' });
    const after = ok(fire(s, 0, 0, 0));
    expect(after.state.turn).toBe(1);
    expect(fire(after.state, 0, 1, 1)).toMatchObject({ error: 'NOT_YOUR_TURN' });
  });

  it('rejects repeated targets, bad and off-board coordinates', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 0, 0)).state;
    s = ok(fire(s, 1, ...missAt(0))).state;
    expect(fire(s, 0, 0, 0)).toMatchObject({ ok: false, error: 'ALREADY_SHOT' });
    expect(fire(s, 0, -1, 0)).toMatchObject({ error: 'OUT_OF_BOUNDS' });
    expect(fire(s, 0, 10, 3)).toMatchObject({ error: 'OUT_OF_BOUNDS' });
    expect(fire(s, 0, 1.5, 3)).toMatchObject({ error: 'INVALID_COORD' });
    expect(fire(s, 0, 'a' as unknown as number, 3)).toMatchObject({ error: 'INVALID_COORD' });
  });

  it('lets each player target the same cell on the opposing board', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 0, 0)).state; // miss on BOARD1
    expect(fire(s, 1, 0, 0)).toMatchObject({ ok: true }); // hit on BOARD0, different target board
  });

  it('does not mutate the input state', () => {
    const s = battleMatch();
    const before = JSON.stringify(s);
    ok(fire(s, 0, 9, 0));
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('scoring', () => {
  it('scores hits with the pre-shot streak multiplier', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 9, 0)).state; // streak 0 -> x1.0 = 10
    expect(s.players[0].score).toBe(10);
    s = ok(fire(s, 1, ...missAt(0))).state;
    s = ok(fire(s, 0, 9, 1)).state; // streak 1 -> x1.25 = 12.5
    expect(s.players[0].score).toBe(22.5);
    expect(s.players[0].streak).toBe(2);
  });

  it('a sinking shot earns hit points AND the sunk bonus, both x multiplier', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 1, 0)).state; // +10, streak 1
    s = ok(fire(s, 1, ...missAt(0))).state;
    const r = ok(fire(s, 0, 1, 1)); // 2-cell ship: (10 + 25 + 5*2) * 1.25
    expect(r.shot.outcome).toBe('sunk');
    expect(r.sunkLength).toBe(2);
    expect(r.points).toBe(56.25);
    expect(r.state.players[0].score).toBe(66.25);
  });

  it('miss scores zero and resets the streak', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 9, 0)).state;
    s = ok(fire(s, 1, ...missAt(0))).state;
    const r = ok(fire(s, 0, 0, 0));
    expect(r.shot.outcome).toBe('miss');
    expect(r.points).toBe(0);
    expect(r.state.players[0].streak).toBe(0);
    expect(r.state.players[0].bestStreak).toBe(1);
  });

  it('a mine costs the shooter 20, resets the streak, and rewards nobody', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 9, 0)).state;
    s = ok(fire(s, 1, ...missAt(0))).state;
    const r = ok(fire(s, 0, 0, 9)); // BOARD1 mine
    expect(r.shot.outcome).toBe('mine');
    expect(r.state.players[0].score).toBe(-10); // raw score may dip below zero mid-match
    expect(r.state.players[0].streak).toBe(0);
    expect(r.state.players[0].minesTriggered).toBe(1);
    expect(r.state.players[1].score).toBe(0);
    expect(r.state.turn).toBe(1);
  });

  it('streak multiplier and speed bonus formulas', () => {
    const m = (n: number) => streakMultiplier(n, DEFAULT_CONFIG);
    expect([m(0), m(1), m(2), m(3), m(4), m(10)]).toEqual([1, 1.25, 1.5, 1.75, 2, 2]);
    const b = (n: number) => speedBonus(n, DEFAULT_CONFIG);
    expect([b(17), b(18), b(30), b(37), b(80)]).toEqual([100, 95, 35, 0, 0]);
  });

  it('a perfect 17-shot win scores 885 (735 shots + 50 win + 100 speed) and ends the match', () => {
    const s = perfectGame();
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe(0);
    expect(s.players[0].shotsFired).toBe(17);
    expect(s.players[0].bestStreak).toBe(17);
    expect(s.players.map((p) => p.score)).toEqual([885, 0]);
  });
});

describe('forfeits', () => {
  it('forfeit gives the opponent the win bonus but no speed bonus', () => {
    const s = ok(forfeit(battleMatch(), 0, 'disconnect')).state;
    expect(s.phase).toBe('finished');
    expect(s.winner).toBe(1);
    expect(s.forfeit).toEqual({ by: 0, reason: 'disconnect' });
    expect(s.players.map((p) => p.score)).toEqual([0, 50]);
  });

  it('works during placement', () => {
    const s = ok(forfeit(placingMatch(), 1, 'placement_timeout')).state;
    expect(s.winner).toBe(0);
    expect(s.players[0].score).toBe(50);
  });

  it('clamps negative scores to zero at the end', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 0, 9)).state; // mine: -20
    expect(s.players[0].score).toBe(-20);
    s = ok(forfeit(s, 0, 'resigned')).state;
    expect(s.players.map((p) => p.score)).toEqual([0, 50]);
  });
});

describe('timeouts', () => {
  it('skips the turn, resets the streak and logs the timeout', () => {
    let s = battleMatch();
    s = ok(fire(s, 0, 9, 0)).state;
    s = ok(fire(s, 1, ...missAt(0))).state;
    expect(s.players[0].streak).toBe(1);
    s = ok(timeoutTurn(s)).state;
    expect(s.players[0].streak).toBe(0);
    expect(s.turn).toBe(1);
    expect(s.shots.at(-1)).toEqual({ player: 0, x: -1, y: -1, outcome: 'timeout' });
  });

  it('three consecutive timeouts by one player forfeit the match', () => {
    let s = battleMatch();
    s = ok(timeoutTurn(s)).state; // p0 #1
    s = ok(fire(s, 1, ...missAt(0))).state;
    s = ok(timeoutTurn(s)).state; // p0 #2
    s = ok(fire(s, 1, ...missAt(1))).state;
    const last = ok(timeoutTurn(s)); // p0 #3
    expect(last.finished).toBe(true);
    expect(last.state.forfeit).toEqual({ by: 0, reason: 'timeouts' });
    expect(last.state.winner).toBe(1);
    expect(last.state.players[1].score).toBe(50);
  });

  it('a real shot resets the consecutive-timeout counter', () => {
    let s = battleMatch();
    s = ok(timeoutTurn(s)).state;
    s = ok(fire(s, 1, ...missAt(0))).state;
    s = ok(fire(s, 0, 0, 0)).state; // p0 acts again
    s = ok(fire(s, 1, ...missAt(1))).state;
    s = ok(timeoutTurn(s)).state;
    s = ok(fire(s, 1, ...missAt(2))).state;
    s = ok(timeoutTurn(s)).state;
    expect(s.phase).toBe('battle');
    expect(s.players[0].consecutiveTimeouts).toBe(2);
  });

  it('ignores stale or duplicate timers', () => {
    let s = battleMatch();
    const armedAt = s.shots.length;
    s = ok(fire(s, 0, 0, 0)).state;
    expect(timeoutTurn(s, { expectedShotCount: armedAt })).toMatchObject({
      ok: false,
      error: 'STALE_TIMER',
    });
    expect(timeoutTurn(s, { expectedShotCount: s.shots.length })).toMatchObject({ ok: true });
  });
});

describe('finished matches are immutable', () => {
  it('rejects every further action', () => {
    const s = perfectGame();
    expect(fire(s, 1, 0, 0)).toMatchObject({ ok: false, error: 'MATCH_FINISHED' });
    expect(fire(s, 0, 0, 0)).toMatchObject({ error: 'MATCH_FINISHED' });
    expect(timeoutTurn(s)).toMatchObject({ error: 'MATCH_FINISHED' });
    expect(forfeit(s, 1, 'resigned')).toMatchObject({ error: 'MATCH_FINISHED' });
    expect(submitPlacement(s, 0, placementPayload(BOARD0, SALT0))).toMatchObject({
      error: 'MATCH_FINISHED',
    });
  });
});
