import { describe, expect, it } from 'vitest';
import { publicView, submitReveal, submitPlacement } from '../src/index.js';
import {
  BOARD0,
  BOARD1,
  SALT0,
  SALT1,
  battleMatch,
  emptyCells,
  ok,
  perfectGame,
  placementPayload,
  placingMatch,
  play,
} from './fixtures.js';

describe('publicView', () => {
  const s = play(battleMatch(), [
    [0, 1, 0],
    [1, emptyCells(BOARD0)[0]!.x, emptyCells(BOARD0)[0]!.y],
  ]);

  it('never shows spectators any board, mine or salt', () => {
    const v = publicView(s, 'spectator');
    const json = JSON.stringify(v);
    expect(v.ownBoard).toBeNull();
    expect(json).not.toContain('"mines"');
    expect(json).not.toContain('"ships"');
    expect(json).not.toContain(SALT0.slice(2));
  });

  it("shows a player only their own board, never the opponent's", () => {
    const v0 = publicView(s, 0);
    const v1 = publicView(s, 1);
    expect(v0.ownBoard).toEqual(BOARD0);
    expect(v1.ownBoard).toEqual(BOARD1);
    expect(v0.you).toBe(0);
    // Player 1's mines never appear in player 0's payload (and vice versa).
    expect(JSON.stringify(v0)).not.toContain(JSON.stringify(BOARD1.mines));
    expect(JSON.stringify(v1)).not.toContain(JSON.stringify(BOARD0.mines));
  });

  it('exposes public shot results, scores and turn', () => {
    const v = publicView(s, 'spectator');
    expect(v.shots).toHaveLength(2);
    expect(v.shots[0]).toEqual({ player: 0, x: 1, y: 0, outcome: 'hit' });
    expect(v.players[0].score).toBe(10);
    expect(v.turn).toBe(0);
  });

  it('reports sunk ships by length only', () => {
    const sunk = play(battleMatch(), [
      [0, 1, 0],
      [1, emptyCells(BOARD0)[0]!.x, emptyCells(BOARD0)[0]!.y],
      [0, 1, 1],
    ]);
    expect(publicView(sunk, 'spectator').sunkShips).toEqual([[], [2]]);
  });

  it('hides a placed fleet from the opponent during placement', () => {
    const placing = ok(submitPlacement(placingMatch(), 0, placementPayload(BOARD0, SALT0))).state;
    expect(publicView(placing, 1).ownBoard).toBeNull();
    expect(publicView(placing, 0).ownBoard).toEqual(BOARD0);
    expect(publicView(placing, 1).players[0].placed).toBe(true);
    expect(JSON.stringify(publicView(placing, 1))).not.toContain('"ships"');
  });

  it('keeps boards private after the match until a verified reveal', () => {
    const done = perfectGame();
    expect(publicView(done, 'spectator').reveals).toEqual([null, null]);
    expect(JSON.stringify(publicView(done, 'spectator'))).not.toContain('"mines"');

    let revealed = ok(submitReveal(done, 0, { board: BOARD0, salt: SALT0 })).state;
    revealed = ok(submitReveal(revealed, 1, { board: BOARD1, salt: SALT1 })).state;
    const v = publicView(revealed, 'spectator');
    expect(v.reveals[0]?.board).toEqual(BOARD0);
    expect(v.reveals[1]?.salt).toBe(SALT1);
    expect(v.turn).toBeNull();
  });

  it('returns a copy: mutating the view cannot change engine state', () => {
    const v = publicView(s, 0);
    v.shots.pop();
    v.ownBoard!.mines.pop();
    expect(s.shots).toHaveLength(2);
    expect(s.players[0].board!.mines).toHaveLength(3);
  });
});
