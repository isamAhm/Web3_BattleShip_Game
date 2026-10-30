import crypto from 'node:crypto';
import { SiweMessage } from 'siwe';
import { env } from '../config/env.js';
import { redisService } from './redis.js';
import { playerRepo } from '../repositories/playerRepo.js';
import { SessionUser } from '@wba/shared';

const NONCE_TTL_SECONDS = 300; // 5 minutes
/** A signed login message is only honoured shortly after it was created. */
const MAX_MESSAGE_AGE_MS = 10 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 60 * 1000;

/** Login failures are the caller's fault (401), not server errors. */
export class AuthError extends Error {
  public readonly status = 401;
  public readonly code = 'AUTH_FAILED';
}

function sameOrigin(a: string, b: string): boolean {
  try {
    return new URL(a).origin === new URL(b).origin;
  } catch {
    return false;
  }
}

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
    let siweMessage: SiweMessage;
    try {
      siweMessage = new SiweMessage(messageStr);
    } catch (err) {
      throw new AuthError(`Invalid SIWE message: ${(err as Error).message ?? 'malformed'}`);
    }

    // The message must be for THIS app on THIS chain, in every environment.
    if (siweMessage.domain !== env.SIWE_DOMAIN) {
      throw new AuthError(
        `Invalid SIWE domain: expected ${env.SIWE_DOMAIN}, got ${siweMessage.domain}`,
      );
    }
    if (!sameOrigin(siweMessage.uri, env.SIWE_URI)) {
      throw new AuthError(`Invalid SIWE uri: expected ${env.SIWE_URI}, got ${siweMessage.uri}`);
    }
    if (siweMessage.chainId !== env.SUPPORTED_CHAIN_ID) {
      throw new AuthError(
        `Unsupported chain: expected ${env.SUPPORTED_CHAIN_ID}, got ${siweMessage.chainId}`,
      );
    }
    const issuedAtMs = siweMessage.issuedAt ? Date.parse(siweMessage.issuedAt) : NaN;
    const checkedAt = Date.now();
    if (
      !Number.isFinite(issuedAtMs) ||
      checkedAt - issuedAtMs > MAX_MESSAGE_AGE_MS ||
      issuedAtMs - checkedAt > MAX_CLOCK_SKEW_MS
    ) {
      throw new AuthError('SIWE message is too old or not yet valid. Please sign in again.');
    }

    // Verify the signature (also enforces expirationTime / notBefore when present).
    // siwe rejects with a SiweError on failure instead of returning success: false.
    let verifyResult: Awaited<ReturnType<SiweMessage['verify']>>;
    try {
      verifyResult = await siweMessage.verify({ signature, domain: env.SIWE_DOMAIN });
    } catch (err) {
      const type = (err as { error?: { type?: string } })?.error?.type ?? 'Invalid signature';
      throw new AuthError(`SIWE verification failed: ${type}`);
    }
    if (!verifyResult.success) {
      throw new AuthError(
        `SIWE verification failed: ${verifyResult.error?.type || 'Invalid signature'}`,
      );
    }

    const { nonce, address, chainId } = verifyResult.data;

    // Atomic single-use nonce consumption
    const nonceKey = `siwe:nonce:${nonce}`;
    const consumed = await redisService.getdel(nonceKey);
    if (!consumed) {
      throw new AuthError('Nonce expired or already used');
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
