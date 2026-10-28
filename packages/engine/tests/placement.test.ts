import { describe, expect, it } from 'vitest';
import { validatePlacement, type Board } from '../src/index.js';
import { BOARD0 } from './fixtures.js';

const clone = (b: Board): Board => structuredClone(b);

describe('validatePlacement', () => {
  it('accepts a legal fleet and returns a normalised copy', () => {
    const shuffled = clone(BOARD0);
    shuffled.ships.reverse();
    shuffled.mines.reverse();
    const r = validatePlacement(shuffled);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.board).toEqual(BOARD0);
  });

  it('rejects ships that leave the board', () => {
    const b = clone(BOARD0);
    b.ships[0] = { x: 6, y: 0, length: 5, orientation: 'H' };
    expect(validatePlacement(b).ok).toBe(false);
    const c = clone(BOARD0);
    c.ships[0] = { x: -1, y: 0, length: 5, orientation: 'H' };
    expect(validatePlacement(c).ok).toBe(false);
  });

  it('rejects overlapping ships', () => {
    const b = clone(BOARD0);
    b.ships[1] = { x: 0, y: 0, length: 4, orientation: 'V' };
    const r = validatePlacement(b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/overlaps/);
  });

  it('rejects the wrong fleet composition', () => {
    const b = clone(BOARD0);
    b.ships.pop();
    expect(validatePlacement(b).ok).toBe(false);
    const c = clone(BOARD0);
    c.ships[4] = { x: 0, y: 8, length: 4, orientation: 'H' };
    expect(validatePlacement(c).ok).toBe(false);
  });

  it('rejects wrong mine counts, duplicates, out-of-bounds and mines on ships', () => {
    const few = clone(BOARD0);
    few.mines.pop();
    expect(validatePlacement(few).ok).toBe(false);

    const dup = clone(BOARD0);
    dup.mines[1] = { x: 9, y: 9 };
    expect(validatePlacement(dup).ok).toBe(false);

    const oob = clone(BOARD0);
    oob.mines[0] = { x: 10, y: 0 };
    expect(validatePlacement(oob).ok).toBe(false);

    const onShip = clone(BOARD0);
    onShip.mines[0] = { x: 2, y: 0 };
    const r = validatePlacement(onShip);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toMatch(/overlaps a ship/);
  });

  it.each([
    ['null', null],
    ['array', []],
    ['string', 'board'],
    ['missing mines', { ships: [] }],
    ['extra key', { ...BOARD0, secret: 1 }],
    ['non-integer coordinate', { ...BOARD0, mines: [{ x: 1.5, y: 1 }, ...BOARD0.mines.slice(1)] }],
    [
      'bad orientation',
      { ...BOARD0, ships: [{ x: 0, y: 0, length: 5, orientation: 'D' }, ...BOARD0.ships.slice(1)] },
    ],
    [
      'extra ship key',
      { ...BOARD0, ships: [{ ...BOARD0.ships[0], hp: 9 }, ...BOARD0.ships.slice(1)] },
    ],
  ])('rejects malformed payload: %s', (_name, payload) => {
    expect(validatePlacement(payload).ok).toBe(false);
  });
});
