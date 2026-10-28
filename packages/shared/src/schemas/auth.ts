import { z } from 'zod';

export const ethAddressSchema = z
  .string()
  .trim()
  .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format');

export const siweNonceResponseSchema = z.object({
  nonce: z.string().min(8),
  expiresAt: z.number(),
});

export type SiweNonceResponse = z.infer<typeof siweNonceResponseSchema>;

export const siweVerifyRequestSchema = z.object({
  message: z.string().min(1, 'SIWE message is required'),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/, 'Invalid signature format'),
});

export type SiweVerifyRequest = z.infer<typeof siweVerifyRequestSchema>;

export const sessionUserSchema = z.object({
  address: ethAddressSchema,
  chainId: z.number().int().positive(),
  issuedAt: z.number(),
  expiresAt: z.number(),
});

export type SessionUser = z.infer<typeof sessionUserSchema>;
