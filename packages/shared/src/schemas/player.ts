import { z } from 'zod';
import { ethAddressSchema } from './auth.js';

export const updatePlayerProfileSchema = z.object({
  username: z.string().trim().min(2).max(30).optional(),
  avatar: z.string().url().max(255).optional().or(z.literal('')),
});

export type UpdatePlayerProfileInput = z.infer<typeof updatePlayerProfileSchema>;

export const playerStatsSchema = z.object({
  matchesPlayed: z.number().int().nonnegative(),
  wins: z.number().int().nonnegative(),
  losses: z.number().int().nonnegative(),
  totalPoints: z.number().nonnegative(),
  bestStreak: z.number().int().nonnegative(),
  fastestWinShots: z.number().int().positive().nullable(),
});

export type PlayerStats = z.infer<typeof playerStatsSchema>;

export const playerProfileSchema = z.object({
  address: ethAddressSchema,
  username: z.string(),
  avatar: z.string().optional(),
  stats: playerStatsSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type PlayerProfile = z.infer<typeof playerProfileSchema>;
