import { describe, it, expect } from 'vitest';
import {
  validatePlacement,
  commitPlacement,
  generateSalt,
  DEFAULT_CONFIG,
  type Ship,
  type Coord,
} from '@wba/engine';

describe('Fleet Placement & Commitments', () => {
  const validShips: Ship[] = [
    { x: 0, y: 0, length: 5, orientation: 'H' }, // Carrier (5)
    { x: 0, y: 2, length: 4, orientation: 'H' }, // Battleship (4)
    { x: 0, y: 4, length: 3, orientation: 'H' }, // Cruiser (3)
    { x: 0, y: 6, length: 3, orientation: 'H' }, // Submarine (3)
    { x: 0, y: 8, length: 2, orientation: 'H' }, // Destroyer (2)
  ];

  const validMines: Coord[] = [
    { x: 9, y: 9 },
    { x: 8, y: 8 },
    { x: 7, y: 7 },
  ];

  it('should validate a legal fleet and 3 mines', () => {
    const result = validatePlacement({ ships: validShips, mines: validMines }, DEFAULT_CONFIG);
    expect(result.ok).toBe(true);
  });

  it('should reject when fewer than 3 mines are placed', () => {
    const result = validatePlacement(
      { ships: validShips, mines: [{ x: 9, y: 9 }] },
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e: string) => e.includes('3 mines'))).toBe(true);
    }
  });

  it('should reject when a mine overlaps a warship', () => {
    const overlappingMines: Coord[] = [
      { x: 0, y: 0 }, // Collides with Carrier at (0,0)
      { x: 8, y: 8 },
      { x: 7, y: 7 },
    ];
    const result = validatePlacement(
      { ships: validShips, mines: overlappingMines },
      DEFAULT_CONFIG,
    );
    expect(result.ok).toBe(false);
  });

  it('should generate deterministic Keccak-256 commitment hash', () => {
    const salt = generateSalt();
    expect(salt).toMatch(/^0x[a-f0-9]{64}$/);

    const hash1 = commitPlacement({ ships: validShips, mines: validMines }, salt);
    const hash2 = commitPlacement({ ships: validShips, mines: validMines }, salt);

    expect(hash1).toMatch(/^0x[a-f0-9]{64}$/);
    expect(hash1).toBe(hash2);
  });
});
