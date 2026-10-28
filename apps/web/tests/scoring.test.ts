import { describe, it, expect } from 'vitest';

describe('Authoritative Scoring & Streaks Rules', () => {
  it('should compute hit points according to streak multiplier', () => {
    // Formula: 10 * multiplier
    // Multiplier: min(2.0, 1.0 + max(0, streak - 1) * 0.25)
    const computePoints = (streak: number) => {
      const mult = Math.min(2.0, 1.0 + Math.max(0, streak - 1) * 0.25);
      return Math.round(10 * mult);
    };

    expect(computePoints(1)).toBe(10); // x1.0
    expect(computePoints(2)).toBe(13); // x1.25 -> 12.5 rounded 13
    expect(computePoints(3)).toBe(15); // x1.5 -> 15
    expect(computePoints(5)).toBe(20); // x2.0 cap
    expect(computePoints(10)).toBe(20); // capped at x2.0
  });

  it('should calculate speed bonus for winner correctly', () => {
    // Formula: max(0, 100 - 5 * max(0, shots - 17))
    const calcSpeedBonus = (shots: number) => {
      return Math.max(0, 100 - 5 * Math.max(0, shots - 17));
    };

    expect(calcSpeedBonus(17)).toBe(100); // Perfect 17 shots
    expect(calcSpeedBonus(20)).toBe(85); // 100 - 5 * 3
    expect(calcSpeedBonus(37)).toBe(0); // 100 - 5 * 20 = 0
    expect(calcSpeedBonus(50)).toBe(0); // zero floor
  });
});
