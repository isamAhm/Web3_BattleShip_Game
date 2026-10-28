import { z } from 'zod';
import { ethAddressSchema } from './auth.js';

// Client-to-server payloads
export const queueJoinPayloadSchema = z.object({
  mode: z.enum(['ranked', 'casual']).default('ranked'),
});

export const queueLeavePayloadSchema = z.object({});

export const roomCreatePayloadSchema = z.object({
  customCode: z.string().min(4).max(16).optional(),
});

export const roomJoinPayloadSchema = z.object({
  roomCode: z.string().min(4).max(16),
});

export const spectateJoinPayloadSchema = z.object({
  matchId: z.string().min(1),
});

export const chatSendPayloadSchema = z.object({
  matchId: z.string().min(1),
  text: z.string().trim().min(1).max(200),
});

export const inviteSendPayloadSchema = z.object({
  recipientAddress: ethAddressSchema,
  roomCode: z.string().min(4).max(16),
});

// Server-to-client events
export const matchFoundEventSchema = z.object({
  matchId: z.string(),
  roomCode: z.string(),
  players: z.tuple([ethAddressSchema, ethAddressSchema]),
  expiresAt: z.number(), // placement deadline
});

export const matchStartEventSchema = z.object({
  matchId: z.string(),
  currentTurn: ethAddressSchema,
  turnDeadline: z.number(),
});

export const turnTimerEventSchema = z.object({
  matchId: z.string(),
  currentTurn: ethAddressSchema,
  secondsRemaining: z.number(),
  deadline: z.number(),
});

export const matchEndEventSchema = z.object({
  matchId: z.string(),
  winner: ethAddressSchema.nullable(),
  forfeit: z.boolean(),
  scores: z.record(z.string(), z.number()),
  stats: z.record(z.string(), z.any()).optional(),
  resultHash: z.string().optional(),
});

export const chatMessageEventSchema = z.object({
  sender: ethAddressSchema,
  username: z.string(),
  text: z.string(),
  timestamp: z.number(),
});

export const inviteReceivedEventSchema = z.object({
  inviteId: z.string(),
  from: ethAddressSchema,
  fromUsername: z.string(),
  roomCode: z.string(),
  createdAt: z.string(),
});

export const notificationEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  data: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});
