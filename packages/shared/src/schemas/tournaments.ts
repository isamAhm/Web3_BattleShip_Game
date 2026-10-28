import { z } from 'zod';

export const tournamentCreateSchema = z.object({
  title: z.string().trim().min(3).max(64),
  description: z.string().trim().max(255).default(''),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  entryFeePoints: z.number().int().nonnegative().default(0),
});

export type TournamentCreateInput = z.infer<typeof tournamentCreateSchema>;
