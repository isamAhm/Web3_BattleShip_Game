import crypto from 'node:crypto';
import { SiweMessage } from 'siwe';
import { env } from '../config/env.js';
import { redisService } from './redis.js';
import { playerRepo } from '../repositories/playerRepo.js';
import { SessionUser } from '@wba/shared';

const NONCE_TTL_SECONDS = 300; // 5 minutes

export class AuthService {
  public async generateNonce(): Promise<{ nonce: string; expiresAt: number }> {
    // Single-use cryptographically secure alphanumeric nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    const key = `siwe:nonce:${nonce}`;
    await redisService.set(key, '1', NONCE_TTL_SECONDS);
    return {
      nonce,
      expiresAt: Date.now() + NONCE_TTL_SECONDS * 1000,
    };
  }

  public async verifySiwe(
    messageStr: string,
    signature: string,
  ): Promise<{ sessionToken: string; user: SessionUser; player: any }> {
    const siweMessage = new SiweMessage(messageStr);

    // Verify domain and address format
    if (env.NODE_ENV === 'production') {
      if (siweMessage.domain !== env.SIWE_DOMAIN) {
        throw new Error(
          `Invalid SIWE domain: expected ${env.SIWE_DOMAIN}, got ${siweMessage.domain}`,
        );
      }
    }

    // Verify SIWE signature and validate fields
    const verifyResult = await siweMessage.verify({
      signature,
      domain: env.NODE_ENV === 'production' ? env.SIWE_DOMAIN : undefined,
    });

    if (!verifyResult.success) {
      throw new Error(
        `SIWE verification failed: ${verifyResult.error?.type || 'Invalid signature'}`,
      );
    }

    const { nonce, address, chainId } = verifyResult.data;

    // Atomic single-use nonce consumption
    const nonceKey = `siwe:nonce:${nonce}`;
    const consumed = await redisService.getdel(nonceKey);
    if (!consumed) {
      throw new Error('Nonce expired or already used');
    }

    const normalizedAddress = address.toLowerCase();

    // Ensure or fetch player in database
    const player = await playerRepo.getOrCreate(normalizedAddress);

    // Issue session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const now = Date.now();
    const expiresAt = now + env.SESSION_TTL_SECONDS * 1000;

    const user: SessionUser = {
      address: normalizedAddress as `0x${string}`,
      chainId: chainId || env.SUPPORTED_CHAIN_ID,
      issuedAt: now,
      expiresAt,
    };

    const sessionKey = `wba:session:${sessionToken}`;
    await redisService.set(sessionKey, JSON.stringify(user), env.SESSION_TTL_SECONDS);

    return {
      sessionToken,
      user,
      player,
    };
  }

  public async getSession(sessionToken: string): Promise<SessionUser | null> {
    if (!sessionToken) return null;
    const sessionKey = `wba:session:${sessionToken}`;
    const raw = await redisService.get(sessionKey);
    if (!raw) return null;

    try {
      const user = JSON.parse(raw) as SessionUser;
      if (Date.now() > user.expiresAt) {
        await redisService.del(sessionKey);
        return null;
      }
      return user;
    } catch {
      return null;
    }
  }

  public async invalidateSession(sessionToken: string): Promise<void> {
    if (!sessionToken) return;
    const sessionKey = `wba:session:${sessionToken}`;
    await redisService.del(sessionKey);
  }
}

export const authService = new AuthService();
