import { z } from 'zod';
import { ethAddressSchema } from './auth.js';

export const friendRequestSchema = z.object({
  targetAddress: ethAddressSchema,
});

export const friendActionSchema = z.object({
  action: z.enum(['accept', 'reject']),
});

export const inviteCreateSchema = z.object({
  recipientAddress: ethAddressSchema,
  roomCode: z.string().min(4).max(16),
});

export const inviteActionSchema = z.object({
  action: z.enum(['accept', 'decline']),
});

export const notificationUpdateSchema = z.object({
  read: z.boolean(),
});
