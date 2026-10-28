export type HexAddress = `0x${string}`;

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type BadgeId = 'FIRST_WIN' | 'HOT_STREAK' | 'PERFECT_GAME' | 'MINE_DODGER' | 'ADMIRAL';

export interface BadgeDefinition {
  id: BadgeId;
  tokenId: number; // for ERC-1155
  name: string;
  description: string;
  icon: string;
}

export const BADGE_DEFINITIONS: Record<BadgeId, BadgeDefinition> = {
  FIRST_WIN: {
    id: 'FIRST_WIN',
    tokenId: 1,
    name: 'First Win',
    description: 'First match victory in the arena',
    icon: 'trophy',
  },
  HOT_STREAK: {
    id: 'HOT_STREAK',
    tokenId: 2,
    name: 'Hot Streak',
    description: 'Achieve a 5-hit streak in a single match',
    icon: 'fire',
  },
  PERFECT_GAME: {
    id: 'PERFECT_GAME',
    tokenId: 3,
    name: 'Perfect Game',
    description: 'Win a match with exactly 17 shots without missing',
    icon: 'bullseye',
  },
  MINE_DODGER: {
    id: 'MINE_DODGER',
    tokenId: 4,
    name: 'Mine Dodger',
    description: 'Finish a winning match without triggering an enemy mine',
    icon: 'shield',
  },
  ADMIRAL: {
    id: 'ADMIRAL',
    tokenId: 5,
    name: 'Admiral',
    description: 'Achieve 10 total match victories',
    icon: 'crown',
  },
};

export type LeaderboardCategory = 'points' | 'streak' | 'fastest_win';

export interface LeaderboardEntry {
  rank: number;
  address: string;
  username: string;
  avatar?: string;
  score: number;
  wins?: number;
  secondaryScore?: number;
}
