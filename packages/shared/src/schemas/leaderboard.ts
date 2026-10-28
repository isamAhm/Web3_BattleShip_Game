import { z } from 'zod';

export const leaderboardTypeSchema = z.enum(['points', 'streak', 'fastest_win']);

export const leaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});
