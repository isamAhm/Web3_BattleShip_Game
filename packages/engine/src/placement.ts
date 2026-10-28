import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import type { Board, Coord, Ship } from './types.js';

export type PlacementResult = { ok: true; board: Board } | { ok: false; errors: string[] };

const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v);
const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const onlyKeys = (o: Record<string, unknown>, keys: string[]): boolean =>
  Object.keys(o).every((k) => keys.includes(k));
const cmp = (a: string | number, b: string | number): number => (a < b ? -1 : a > b ? 1 : 0);

export const cellKey = (x: number, y: number): string => `${x},${y}`;

export function shipCells(ship: Ship): Coord[] {
  const cells: Coord[] = [];
  for (let i = 0; i < ship.length; i++) {
    cells.push(
      ship.orientation === 'H' ? { x: ship.x + i, y: ship.y } : { x: ship.x, y: ship.y + i },
    );
  }
  return cells;
}

/** Canonical ordering (y, x, orientation, length) so equal fleets serialise identically. */
export function sortShips(ships: readonly Ship[]): Ship[] {
  return ships
    .map((s) => ({ x: s.x, y: s.y, length: s.length, orientation: s.orientation }))
    .sort(
      (a, b) =>
        cmp(a.y, b.y) ||
        cmp(a.x, b.x) ||
        cmp(a.orientation, b.orientation) ||
        cmp(a.length, b.length),
    );
}

export function sortMines(mines: readonly Coord[]): Coord[] {
  return mines.map((m) => ({ x: m.x, y: m.y })).sort((a, b) => cmp(a.y, b.y) || cmp(a.x, b.x));
}

/**
 * Validates an untrusted board payload and returns a normalised copy.
 * Policy: mines may NOT occupy ship cells; unknown keys are rejected.
 */
export function validatePlacement(
  input: unknown,
  config: GameConfig = DEFAULT_CONFIG,
): PlacementResult {
  if (!isRecord(input) || !onlyKeys(input, ['ships', 'mines'])) {
    return { ok: false, errors: ['board must be an object with only "ships" and "mines"'] };
  }
  const { ships: rawShips, mines: rawMines } = input;
  if (!Array.isArray(rawShips) || !Array.isArray(rawMines)) {
    return { ok: false, errors: ['ships and mines must both be arrays'] };
  }

  const errors: string[] = [];
  const ships: Ship[] = [];
  rawShips.forEach((raw: unknown, i) => {
    if (!isRecord(raw) || !onlyKeys(raw, ['x', 'y', 'length', 'orientation'])) {
      errors.push(`ship ${i}: malformed`);
      return;
    }
    const { x, y, length, orientation } = raw;
    if (!isInt(x) || !isInt(y) || !isInt(length)) {
      errors.push(`ship ${i}: x, y and length must be integers`);
    } else if (orientation !== 'H' && orientation !== 'V') {
      errors.push(`ship ${i}: orientation must be "H" or "V"`);
    } else {
      ships.push({ x, y, length, orientation });
    }
  });
  const mines: Coord[] = [];
  rawMines.forEach((raw: unknown, i) => {
    if (!isRecord(raw) || !onlyKeys(raw, ['x', 'y']) || !isInt(raw.x) || !isInt(raw.y)) {
      errors.push(`mine ${i}: malformed`);
      return;
    }
    mines.push({ x: raw.x, y: raw.y });
  });
  if (errors.length > 0) return { ok: false, errors };

  const size = config.boardSize;
  const inBounds = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < size && y < size;

  const expected = [...config.fleet].sort((a, b) => a - b).join(',');
  const actual = ships
    .map((s) => s.length)
    .sort((a, b) => a - b)
    .join(',');
  if (expected !== actual) errors.push(`fleet must have ship lengths [${config.fleet.join(', ')}]`);

  const occupied = new Set<string>();
  ships.forEach((ship, i) => {
    if (ship.length < 1) {
      errors.push(`ship ${i}: length must be positive`);
      return;
    }
    for (const c of shipCells(ship)) {
      if (!inBounds(c.x, c.y)) {
        errors.push(`ship ${i}: out of bounds`);
        return;
      }
      const key = cellKey(c.x, c.y);
      if (occupied.has(key)) {
        errors.push(`ship ${i}: overlaps another ship at (${c.x},${c.y})`);
        return;
      }
      occupied.add(key);
    }
  });

  if (mines.length !== config.mineCount) errors.push(`exactly ${config.mineCount} mines required`);
  const mineKeys = new Set<string>();
  mines.forEach((m, i) => {
    const key = cellKey(m.x, m.y);
    if (!inBounds(m.x, m.y)) errors.push(`mine ${i}: out of bounds`);
    else if (mineKeys.has(key)) errors.push(`mine ${i}: duplicate position`);
    else if (occupied.has(key)) errors.push(`mine ${i}: overlaps a ship`);
    mineKeys.add(key);
  });

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, board: { ships: sortShips(ships), mines: sortMines(mines) } };
}
