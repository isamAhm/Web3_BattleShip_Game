import { describe, it, expect, beforeEach } from 'vitest';
import { commitPlacement, generateSalt, type Board } from '@wba/engine';
import { matchManager } from '../src/services/matchManager.js';
import { matchRepo } from '../src/repositories/matchRepo.js';

const P1 = '0x1111111111111111111111111111111111111111';
const P2 = '0x2222222222222222222222222222222222222222';

const board: Board = {
  ships: [
    { x: 0, y: 0, length: 5, orientation: 'H' },
    { x: 0, y: 2, length: 4, orientation: 'V' },
    { x: 3, y: 2, length: 3, orientation: 'H' },
    { x: 3, y: 4, length: 3, orientation: 'H' },
    { x: 9, y: 8, length: 2, orientation: 'V' },
  ],
  mines: [
    { x: 9, y: 0 },
    { x: 9, y: 1 },
    { x: 9, y: 2 },
  ],
};

describe('shot:result carries the sunk ship so clients can animate it', () => {
  const events: Array<{ event: string; data: any }> = [];

  beforeEach(() => {
    matchManager.clear();
    matchRepo.resetMemoryStore();
    events.length = 0;
    matchManager.setIoEmit((_room, event, data) => events.push({ event, data }));
  });

  it('includes every cell of the ship on the sinking shot only', async () => {
    const s = matchManager.createSession('m_sunk_1', P1, P2, 'ROOMX');
    for (const p of [P1, P2]) {
      expect(
        s.handlePlacement(p, commitPlacement(board, generateSalt()), board.ships, board.mines).ok,
      ).toBe(true);
    }

    // P1 shoots P2's vertical 4-ship at x=0, y=2..5. P2 answers with misses at x=5.
    const shots = [
      { x: 0, y: 2 },
      { x: 0, y: 3 },
      { x: 0, y: 4 },
      { x: 0, y: 5 },
    ];
    const misses = [
      { x: 5, y: 0 },
      { x: 5, y: 1 },
      { x: 5, y: 2 },
    ];
    for (let i = 0; i < shots.length; i++) {
      expect(s.handleFire(P1, shots[i]).ok).toBe(true);
      if (i < shots.length - 1) expect(s.handleFire(P2, misses[i]).ok).toBe(true);
    }

    const results = events.filter((e) => e.event === 'shot:result' && e.data.shooter === P1);
    expect(results.slice(0, 3).every((r) => r.data.sunkShip === null)).toBe(true);

    const sinking = results[3].data;
    expect(sinking.outcome).toBe('sunk');
    expect(sinking.sunkShip.length).toBe(4);
    expect(sinking.sunkShip.orientation).toBe('V');
    expect(sinking.sunkShip.cells).toEqual([
      { x: 0, y: 2 },
      { x: 0, y: 3 },
      { x: 0, y: 4 },
      { x: 0, y: 5 },
    ]);
  });
});
