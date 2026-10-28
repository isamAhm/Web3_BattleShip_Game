import { z } from 'zod';
import { ethAddressSchema } from './auth.js';

export const coordinateSchema = z.object({
  x: z.number().int().min(0).max(9),
  y: z.number().int().min(0).max(9),
});

export const shipPlacementSchema = z
  .object({
    id: z.string().optional(),
    x: z.number().int().min(0).max(9),
    y: z.number().int().min(0).max(9),
    length: z.number().int().min(2).max(5).optional(),
    size: z.number().int().min(2).max(5).optional(),
    orientation: z.enum(['H', 'V']).optional(),
    direction: z.enum(['horizontal', 'vertical']).optional(),
  })
  .transform((val) => {
    const len = val.length ?? val.size ?? 2;
    const orient: 'H' | 'V' = val.orientation ?? (val.direction === 'vertical' ? 'V' : 'H');
    return {
      x: val.x,
      y: val.y,
      length: len,
      orientation: orient,
    };
  });

export const hexHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid 32-byte hex hash');

export const placementPayloadSchema = z.object({
  matchId: z.string().min(1),
  commitment: hexHashSchema,
  ships: z.array(shipPlacementSchema).length(5),
  mines: z.array(coordinateSchema).length(3),
});

export type PlacementPayload = z.infer<typeof placementPayloadSchema>;

export const firePayloadSchema = z.object({
  matchId: z.string().min(1),
  coordinate: coordinateSchema,
});

export type FirePayload = z.infer<typeof firePayloadSchema>;

export const revealPayloadSchema = z.object({
  matchId: z.string().min(1),
  salt: hexHashSchema,
  ships: z.array(shipPlacementSchema).length(5),
  mines: z.array(coordinateSchema).length(3),
});

export type RevealPayload = z.infer<typeof revealPayloadSchema>;

export const shotResultSchema = z.object({
  matchId: z.string(),
  shooter: ethAddressSchema,
  target: ethAddressSchema,
  coordinate: coordinateSchema,
  outcome: z.enum(['miss', 'hit', 'sunk', 'mine']),
  shipId: z.string().optional(),
  shipSize: z.number().optional(),
  shipCells: z.array(coordinateSchema).optional(),
  pointsAwarded: z.number(),
  shooterStreak: z.number(),
  shooterScore: z.number(),
  nextTurn: ethAddressSchema.nullable(),
  gameOver: z.boolean(),
  winner: ethAddressSchema.nullable(),
  forfeit: z.boolean().optional(),
});

export type ShotResultEvent = z.infer<typeof shotResultSchema>;
