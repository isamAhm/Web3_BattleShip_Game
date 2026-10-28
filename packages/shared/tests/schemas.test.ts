import { describe, it, expect } from 'vitest';
import {
  ethAddressSchema,
  coordinateSchema,
  BADGE_DEFINITIONS,
  leaderboardTypeSchema,
} from '../src/index.js';

describe('@wba/shared Schemas & Types', () => {
  it('validates Ethereum addresses', () => {
    expect(ethAddressSchema.safeParse('0x1111111111111111111111111111111111111111').success).toBe(
      true,
    );
    expect(ethAddressSchema.safeParse('invalid-address').success).toBe(false);
  });

  it('validates 10x10 board coordinates', () => {
    expect(coordinateSchema.safeParse({ x: 0, y: 0 }).success).toBe(true);
    expect(coordinateSchema.safeParse({ x: 9, y: 9 }).success).toBe(true);
    expect(coordinateSchema.safeParse({ x: 10, y: 0 }).success).toBe(false);
    expect(coordinateSchema.safeParse({ x: -1, y: 5 }).success).toBe(false);
  });

  it('validates leaderboard types', () => {
    expect(leaderboardTypeSchema.safeParse('points').success).toBe(true);
    expect(leaderboardTypeSchema.safeParse('streak').success).toBe(true);
    expect(leaderboardTypeSchema.safeParse('fastest_win').success).toBe(true);
    expect(leaderboardTypeSchema.safeParse('random').success).toBe(false);
  });

  it('contains all 5 badge definitions with ERC-1155 token IDs', () => {
    expect(Object.keys(BADGE_DEFINITIONS)).toHaveLength(5);
    expect(BADGE_DEFINITIONS.FIRST_WIN.tokenId).toBe(1);
    expect(BADGE_DEFINITIONS.HOT_STREAK.tokenId).toBe(2);
    expect(BADGE_DEFINITIONS.PERFECT_GAME.tokenId).toBe(3);
    expect(BADGE_DEFINITIONS.MINE_DODGER.tokenId).toBe(4);
    expect(BADGE_DEFINITIONS.ADMIRAL.tokenId).toBe(5);
  });
});
