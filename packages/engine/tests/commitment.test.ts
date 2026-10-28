import { keccak256, toBytes } from 'viem';
import { describe, expect, it } from 'vitest';
import {
  commitPlacement,
  fleetPreimage,
  generateSalt,
  verifyReveal,
  type Board,
} from '../src/index.js';
import { BOARD0, BOARD1, SALT0, SALT1 } from './fixtures.js';

describe('commit-reveal', () => {
  it('uses Ethereum Keccak-256, not NIST SHA3-256', () => {
    expect(keccak256(toBytes(''))).toBe(
      '0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470',
    );
    const c = commitPlacement(BOARD0, SALT0);
    expect(c).toBe(keccak256(toBytes(fleetPreimage(BOARD0, SALT0))));
    expect(fleetPreimage(BOARD0, SALT0).startsWith('WBA-FLEET-v1|')).toBe(true);
  });

  it('is deterministic and independent of array order', () => {
    const shuffled: Board = structuredClone(BOARD0);
    shuffled.ships.reverse();
    shuffled.mines.reverse();
    expect(commitPlacement(shuffled, SALT0)).toBe(commitPlacement(BOARD0, SALT0));
  });

  it('changes when the board or salt changes', () => {
    const base = commitPlacement(BOARD0, SALT0);
    expect(commitPlacement(BOARD0, SALT1)).not.toBe(base);
    expect(commitPlacement(BOARD1, SALT0)).not.toBe(base);
  });

  it('rejects malformed salts', () => {
    expect(() => commitPlacement(BOARD0, '0x1234')).toThrow();
  });

  it('generates 32-byte, non-repeating salts', () => {
    const a = generateSalt();
    expect(a).toMatch(/^0x[0-9a-f]{64}$/);
    expect(generateSalt()).not.toBe(a);
  });

  describe('verifyReveal', () => {
    const commitment = commitPlacement(BOARD0, SALT0);

    it('accepts the genuine reveal', () => {
      const r = verifyReveal(commitment, { board: BOARD0, salt: SALT0 });
      expect(r.ok).toBe(true);
    });

    it('rejects a wrong salt', () => {
      const r = verifyReveal(commitment, { board: BOARD0, salt: SALT1 });
      expect(r).toMatchObject({ ok: false, code: 'MISMATCH' });
    });

    it('rejects an altered board', () => {
      const moved = structuredClone(BOARD0);
      moved.mines[0] = { x: 6, y: 9 };
      expect(verifyReveal(commitment, { board: moved, salt: SALT0 })).toMatchObject({
        ok: false,
        code: 'MISMATCH',
      });
    });

    it.each([
      ['null', null],
      ['no salt', { board: BOARD0 }],
      ['short salt', { board: BOARD0, salt: '0xabcd' }],
      ['extra field', { board: BOARD0, salt: SALT0, note: 'hi' }],
      ['invalid board', { board: { ships: [], mines: [] }, salt: SALT0 }],
    ])('flags malformed reveals: %s', (_n, payload) => {
      expect(verifyReveal(commitment, payload)).toMatchObject({ ok: false, code: 'MALFORMED' });
    });
  });
});
