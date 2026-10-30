import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { commitPlacement, generateSalt, type Board, type Hex } from '@wba/engine';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { redisService } from '../src/services/redis.js';
import { matchManager } from '../src/services/matchManager.js';
import { matchmakingService } from '../src/services/matchmaking.js';
import { chainService } from '../src/services/chain.js';
import { matchRepo } from '../src/repositories/matchRepo.js';
import { chainLogRepo } from '../src/repositories/chainLogRepo.js';
import { playerRepo } from '../src/repositories/playerRepo.js';
import { ledgerRepo } from '../src/repositories/ledgerRepo.js';
import { badgeRepo } from '../src/repositories/badgeRepo.js';

const P1 = '0x1111111111111111111111111111111111111111';
const P2 = '0x2222222222222222222222222222222222222222';
const P3 = '0x3333333333333333333333333333333333333333';

const board: Board = {
  ships: [
    { x: 0, y: 0, length: 5, orientation: 'H' },
    { x: 0, y: 2, length: 4, orientation: 'H' },
    { x: 0, y: 4, length: 3, orientation: 'H' },
    { x: 0, y: 6, length: 3, orientation: 'H' },
    { x: 0, y: 8, length: 2, orientation: 'H' },
  ],
  mines: [
    { x: 9, y: 9 },
    { x: 8, y: 8 },
    { x: 7, y: 7 },
  ],
};

const shipCells = board.ships.flatMap((s) =>
  Array.from({ length: s.length }, (_, i) => ({ x: s.x + i, y: s.y })),
);
// Safe misses against `board`: rows 1 and 3 hold neither ships nor mines.
const misses = [
  ...Array.from({ length: 10 }, (_, x) => ({ x, y: 1 })),
  ...Array.from({ length: 10 }, (_, x) => ({ x, y: 3 })),
];

async function session(token: string, address: string) {
  await redisService.set(
    `wba:session:${token}`,
    JSON.stringify({
      address,
      chainId: 11155111,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 100000,
    }),
  );
}

interface Played {
  matchId: string;
  salt: [Hex, Hex];
}

/** Plays a full match: P1 sinks P2's fleet, P2 only misses. */
async function playFullMatch(matchId: string, roomCode: string): Promise<Played> {
  const s = matchManager.createSession(matchId, P1, P2, roomCode);
  const salts: [Hex, Hex] = [generateSalt(), generateSalt()];
  expect(
    s.handlePlacement(P1, commitPlacement(board, salts[0]), board.ships, board.mines).ok,
  ).toBe(true);
  expect(
    s.handlePlacement(P2, commitPlacement(board, salts[1]), board.ships, board.mines).ok,
  ).toBe(true);

  for (let i = 0; i < shipCells.length; i++) {
    expect(s.handleFire(P1, shipCells[i]).ok).toBe(true);
    if (i < shipCells.length - 1) expect(s.handleFire(P2, misses[i]).ok).toBe(true);
  }
  expect(s.matchState.phase).toBe('finished');

  await vi.waitFor(async () => {
    const m = await matchRepo.findById(matchId);
    expect(m?.status).toBe('ended');
    expect(m?.resultHash).toBeDefined();
  });
  return { matchId, salt: salts };
}

describe('Persistence of shots, record and reveals', () => {
  beforeEach(async () => {
    await redisService.flush();
    matchmakingService.clear();
    matchManager.clear();
    matchRepo.resetMemoryStore();
    chainLogRepo.resetMemoryStore();
    playerRepo.resetMemoryStore();
    ledgerRepo.resetMemoryStore();
    badgeRepo.resetMemoryStore();
  });

  afterEach(() => {
    matchManager.clear();
  });

  it('saves every shot, the canonical record and the result hash at match end', async () => {
    const { matchId } = await playFullMatch('m_persist_1', 'ROOM1');
    const m = await matchRepo.findById(matchId);

    expect(m?.shots).toHaveLength(17 + 16);
    expect(m?.shots[0]).toMatchObject({ shooter: P1, target: P2, outcome: 'hit' });
    expect(m?.shots.some((s) => s.shooterStreak > 0)).toBe(true);
    expect(m?.canonicalRecord?.shots).toHaveLength(17 + 16);
    expect(m?.resultHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(m?.winner).toBe(P1);
  });

  it('feeds real shot data into player stats and badges', async () => {
    await playerRepo.getOrCreate(P1);
    await playerRepo.getOrCreate(P2);
    await playFullMatch('m_persist_stats', 'ROOMS');

    await vi.waitFor(async () => {
      const p1 = await playerRepo.findByAddress(P1);
      expect(p1?.stats.wins).toBe(1);
    });
    const p1 = await playerRepo.findByAddress(P1);
    expect(p1?.stats.bestStreak).toBe(17); // previously always 0: shots were never saved
    expect(p1?.stats.fastestWinShots).toBe(17);
    await vi.waitFor(async () => {
      const badges = (await badgeRepo.getBadgesForPlayer(P1)).map((b) => b.badgeId);
      expect(badges).toEqual(expect.arrayContaining(['FIRST_WIN', 'HOT_STREAK', 'PERFECT_GAME']));
    });
  });

  it('keeps the finished session alive so players can reveal, and verifies both reveals', async () => {
    const { matchId, salt } = await playFullMatch('m_persist_2', 'ROOM2');
    const s = matchManager.getSession(matchId);
    expect(s).not.toBeNull();
    expect(matchManager.getActiveMatchForPlayer(P1)).toBeNull();

    expect(s!.handleReveal(P1, salt[0], board.ships, board.mines).ok).toBe(true);
    expect(s!.handleReveal(P2, salt[1], board.ships, board.mines).ok).toBe(true);

    await vi.waitFor(async () => {
      const m = await matchRepo.findById(matchId);
      expect(m?.verification.status).toBe('verified');
    });
    const m = await matchRepo.findById(matchId);
    const reveals = m!.reveals as Map<string, { salt: string }>;
    expect(reveals.get(P1)?.salt).toBe(salt[0].toLowerCase());
    expect(reveals.size).toBe(2);
  });

  it('rejects an in-session reveal that does not match the commitment', async () => {
    const { matchId } = await playFullMatch('m_persist_3', 'ROOM3');
    const s = matchManager.getSession(matchId)!;
    const res = s.handleReveal(P1, generateSalt(), board.ships, board.mines);
    expect(res.ok).toBe(false);
  });

  it('serves a replay that audits cleanly once both reveals are stored', async () => {
    const { matchId, salt } = await playFullMatch('m_persist_4', 'ROOM4');
    const s = matchManager.getSession(matchId)!;
    s.handleReveal(P1, salt[0], board.ships, board.mines);
    s.handleReveal(P2, salt[1], board.ships, board.mines);
    await vi.waitFor(async () => {
      expect((await matchRepo.findById(matchId))?.verification.status).toBe('verified');
    });

    const res = await request(createApp()).get(`/api/matches/${matchId}/replay`);
    expect(res.status).toBe(200);
    expect(res.body.data.replayResult.ok).toBe(true);
    expect(res.body.data.replayResult.winner).toBe(P1);
  });
});

describe('REST reveal after the session expired', () => {
  const app = createApp();
  let salt: [Hex, Hex];

  beforeEach(async () => {
    await redisService.flush();
    matchmakingService.clear();
    matchManager.clear();
    matchRepo.resetMemoryStore();
    chainLogRepo.resetMemoryStore();
    await session('tok1', P1);
    await session('tok2', P2);
    await session('tok3', P3);
    const played = await playFullMatch('m_rest_1', 'ROOMR');
    salt = played.salt;
    matchManager.removeSession('m_rest_1'); // simulate the reveal window expiring
  });

  const body = (s: Hex) => ({ salt: s, ships: board.ships, mines: board.mines });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/matches/m_rest_1/reveal').send(body(salt[0]));
    expect(res.status).toBe(401);
  });

  it('rejects users who are not in the match', async () => {
    const res = await request(app)
      .post('/api/matches/m_rest_1/reveal')
      .set('Authorization', 'Bearer tok3')
      .send(body(salt[0]));
    expect(res.status).toBe(403);
  });

  it('rejects a reveal that does not match the stored commitment', async () => {
    const res = await request(app)
      .post('/api/matches/m_rest_1/reveal')
      .set('Authorization', 'Bearer tok1')
      .send(body(generateSalt()));
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_REVEAL');
    expect((await matchRepo.findById('m_rest_1'))?.reveals.size ?? 0).toBe(0);
  });

  it('stores valid reveals and flips verification to verified after both', async () => {
    const r1 = await request(app)
      .post('/api/matches/m_rest_1/reveal')
      .set('Authorization', 'Bearer tok1')
      .send(body(salt[0]));
    expect(r1.status).toBe(200);
    expect((await matchRepo.findById('m_rest_1'))?.verification.status).toBe('incomplete');

    const r2 = await request(app)
      .post('/api/matches/m_rest_1/reveal')
      .set('Authorization', 'Bearer tok2')
      .send(body(salt[1]));
    expect(r2.status).toBe(200);
    expect((await matchRepo.findById('m_rest_1'))?.verification.status).toBe('verified');
  });
});

describe('GET /matches/:id/verification', () => {
  beforeEach(() => {
    matchRepo.resetMemoryStore();
  });

  it('does not fabricate a hash, proof or chain tx for an ended match', async () => {
    await matchRepo.create({
      matchId: 'm_verify_1',
      players: [P1, P2],
      status: 'ended',
      winner: P1,
    });
    const res = await request(createApp()).get('/api/matches/m_verify_1/verification');
    expect(res.status).toBe(200);
    expect(res.body.data.resultHash).toBeUndefined();
    expect(res.body.data.chainTxHash).toBeNull();
    expect(res.body.data.chainStatus).toBe('pending');
    expect(res.body.data.verification.status).toBe('incomplete');

    const stored = await matchRepo.findById('m_verify_1');
    expect(stored?.chainStatus).toBe('pending'); // GET no longer mutates state
  });
});

describe('ChainService in testnet mode', () => {
  const original = { mode: env.CHAIN_MODE, rpc: env.RPC_URL, reg: env.MATCH_REGISTRY_ADDRESS };

  beforeEach(() => {
    chainLogRepo.resetMemoryStore();
    matchRepo.resetMemoryStore();
    (env as any).CHAIN_MODE = 'testnet';
    (env as any).RPC_URL = 'http://127.0.0.1:1'; // nothing listens here
    (env as any).MATCH_REGISTRY_ADDRESS = '0x00000000000000000000000000000000000000aa';
  });

  afterEach(() => {
    (env as any).CHAIN_MODE = original.mode;
    (env as any).RPC_URL = original.rpc;
    (env as any).MATCH_REGISTRY_ADDRESS = original.reg;
  });

  it('reports failure instead of faking a simulated confirmation', async () => {
    await matchRepo.create({ matchId: 'm_chain_fail', players: [P1, P2], status: 'ended' });
    const hash = `0x${'ab'.repeat(32)}`;

    const res = await chainService.recordMatch('m_chain_fail', P1, hash);

    expect(res.status).toBe('failed');
    expect(res.mode).toBe('testnet');
    expect(res.txHash.startsWith('0xsim_')).toBe(false);
    expect(await chainLogRepo.findByMatchId('m_chain_fail')).toBeNull();
    expect((await matchRepo.findById('m_chain_fail'))?.chainStatus).toBe('failed');
  }, 30000);

  it('retries a previously failed match instead of returning the failure', async () => {
    await matchRepo.create({ matchId: 'm_chain_retry', players: [P1, P2], status: 'ended' });
    await chainLogRepo.create({
      txHash: `0x${'cd'.repeat(32)}`,
      matchId: 'm_chain_retry',
      winner: P1,
      resultHash: `0x${'ab'.repeat(32)}`,
      mode: 'testnet',
      status: 'failed',
    });
    (env as any).CHAIN_MODE = 'simulated';

    const res = await chainService.recordMatch('m_chain_retry', P1, `0x${'ab'.repeat(32)}`);
    expect(res.status).toBe('confirmed'); // the stale 'failed' log did not short-circuit
    expect(res.txHash.startsWith('0xsim_')).toBe(true);
  });
});
