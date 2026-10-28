import { keccak256, toBytes, toHex } from 'viem';
import { DEFAULT_CONFIG, type GameConfig } from './config.js';
import { sortMines, sortShips, validatePlacement } from './placement.js';
import type { Board, Hex, Reveal } from './types.js';

/** Bump when the preimage layout changes. It is part of the hashed bytes. */
export const COMMITMENT_VERSION = 'WBA-FLEET-v1';
export const SALT_PATTERN = /^0x[0-9a-fA-F]{64}$/;
export const HASH_PATTERN = /^0x[0-9a-fA-F]{64}$/;

/** 32 bytes from the platform CSPRNG. */
export function generateSalt(): Hex {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return toHex(bytes);
}

/** Canonical, versioned preimage: ships and mines sorted, salt lower-cased. */
export function fleetPreimage(board: Board, salt: Hex): string {
  const ships = sortShips(board.ships)
    .map((s) => `${s.x},${s.y},${s.orientation},${s.length}`)
    .join(';');
  const mines = sortMines(board.mines)
    .map((m) => `${m.x},${m.y}`)
    .join(';');
  return `${COMMITMENT_VERSION}|ships=${ships}|mines=${mines}|salt=${salt.toLowerCase()}`;
}

/** Ethereum Keccak-256 (NOT NIST SHA3-256) over the UTF-8 preimage bytes. */
export function commitPlacement(board: Board, salt: Hex): Hex {
  if (!SALT_PATTERN.test(salt)) throw new Error('salt must be 32 bytes: 0x + 64 hex characters');
  return keccak256(toBytes(fleetPreimage(board, salt)));
}

export type VerifyRevealResult =
  { ok: true; reveal: Reveal } | { ok: false; code: 'MALFORMED' | 'MISMATCH'; reason: string };

/** Checks an untrusted reveal against a stored commitment. */
export function verifyReveal(
  commitment: string,
  reveal: unknown,
  config: GameConfig = DEFAULT_CONFIG,
): VerifyRevealResult {
  if (typeof reveal !== 'object' || reveal === null || Array.isArray(reveal)) {
    return { ok: false, code: 'MALFORMED', reason: 'reveal must be an object' };
  }
  const { board, salt, ...rest } = reveal as Record<string, unknown>;
  if (Object.keys(rest).length > 0) {
    return { ok: false, code: 'MALFORMED', reason: 'reveal has unexpected fields' };
  }
  if (typeof salt !== 'string' || !SALT_PATTERN.test(salt)) {
    return { ok: false, code: 'MALFORMED', reason: 'salt must be 0x + 64 hex characters' };
  }
  const placement = validatePlacement(board, config);
  if (!placement.ok) {
    return {
      ok: false,
      code: 'MALFORMED',
      reason: `invalid board: ${placement.errors.join('; ')}`,
    };
  }
  const normalizedSalt = salt.toLowerCase() as Hex;
  const computed = commitPlacement(placement.board, normalizedSalt);
  if (computed !== commitment.toLowerCase()) {
    return { ok: false, code: 'MISMATCH', reason: 'board and salt do not match the commitment' };
  }
  return { ok: true, reveal: { board: placement.board, salt: normalizedSalt } };
}
