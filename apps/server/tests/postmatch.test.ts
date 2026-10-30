import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { postMatchProcessor } from '../src/workers/postMatchWorker.js';
import { matchRepo } from '../src/repositories/matchRepo.js';
import { playerRepo } from '../src/repositories/playerRepo.js';
import { ledgerRepo } from '../src/repositories/ledgerRepo.js';
import { badgeRepo } from '../src/repositories/badgeRepo.js';
import { chainLogRepo } from '../src/repositories/chainLogRepo.js';
import { tournamentRepo } from '../src/repositories/tournamentRepo.js';
import { rewardService } from '../src/services/rewards.js';

const P1 = '0x1111111111111111111111111111111111111111';
const P2 = '0x2222222222222222222222222222222222222222';

const shot = (shooter: string, target: string, streak: number) => ({
  shooter,
  target,
  coordinate: { x: 0, y: 0 },
  outcome: 'hit',
  pointsAwarded: 10,
  shooterStreak: streak,
  shooterScore: 10 * streak,
  timestamp: Date.now(),
});

async function endedMatch(matchId: string, winner: string | null) {
  await matchRepo.create({
    matchId,
    players: [P1, P2],
    status: 'ended',
    winner,
    forfeit: false,
    scores: new Map([
      [P1, 110],
      [P2, 30],
    ]),
    shots: [shot(P1, P2, 1), shot(P1, P2, 2), shot(P2, P1, 1)],
    resultHash: `0x${'bb'.repeat(32)}`,
  });
}

describe('post-match processing is idempotent', () => {
  beforeEach(async () => {
    matchRepo.resetMemoryStore();
    playerRepo.resetMemoryStore();
    ledgerRepo.resetMemoryStore();
    badgeRepo.resetMemoryStore();
    chainLogRepo.resetMemoryStore();
    tournamentRepo.resetMemoryStore();
    await playerRepo.getOrCreate(P1);
    await playerRepo.getOrCreate(P2);
  });

  afterEach(() => vi.restoreAllMocks());

  it('counts a match once when the job runs twice', async () => {
    await endedMatch('m_idem_1', P1);
    await postMatchProcessor.processMatch('m_idem_1');
    await postMatchProcessor.processMatch('m_idem_1');

    const p1 = await playerRepo.findByAddress(P1);
    const p2 = await playerRepo.findByAddress(P2);
    expect(p1?.stats).toMatchObject({ matchesPlayed: 1, wins: 1, losses: 0, totalPoints: 110 });
    expect(p2?.stats).toMatchObject({ matchesPlayed: 1, wins: 0, losses: 1, totalPoints: 30 });
    expect(await rewardService.getBalance(P1)).toBe(160); // 110 score + 50 win bonus, once
  });

  it('counts a match once when duplicate jobs run at the same time', async () => {
    await endedMatch('m_idem_2', P1);
    await Promise.all([
      postMatchProcessor.processMatch('m_idem_2'),
      postMatchProcessor.processMatch('m_idem_2'),
      postMatchProcessor.processMatch('m_idem_2'),
    ]);
    const p1 = await playerRepo.findByAddress(P1);
    expect(p1?.stats.matchesPlayed).toBe(1);
    expect(p1?.stats.wins).toBe(1);
  });

  it('retry after a partial failure finishes the job without double counting', async () => {
    await endedMatch('m_idem_3', P1);
    const real = playerRepo.updateStats.bind(playerRepo);
    let calls = 0;
    vi.spyOn(playerRepo, 'updateStats').mockImplementation(async (address, update) => {
      calls++;
      if (address === P2 && calls === 2) throw new Error('db hiccup'); // P1 already applied
      return real(address, update);
    });

    await expect(postMatchProcessor.processMatch('m_idem_3')).rejects.toThrow('db hiccup');
    await postMatchProcessor.processMatch('m_idem_3'); // what BullMQ's retry does

    const p1 = await playerRepo.findByAddress(P1);
    const p2 = await playerRepo.findByAddress(P2);
    expect(p1?.stats.matchesPlayed).toBe(1); // not 2
    expect(p2?.stats.matchesPlayed).toBe(1); // applied by the retry
  });

  it('adds tournament points once', async () => {
    const t = await tournamentRepo.create({
      title: 'Idempotency Cup',
      startTime: new Date(Date.now() - 1000),
      endTime: new Date(Date.now() + 86_400_000),
    });
    await endedMatch('m_idem_4', P1);
    await postMatchProcessor.processMatch('m_idem_4');
    await postMatchProcessor.processMatch('m_idem_4');

    const after = await tournamentRepo.findById(t.tournamentId);
    const row = after?.standings.find((s) => s.address.toLowerCase() === P1);
    expect(row).toMatchObject({ points: 110, wins: 1 });
  });

  it('skips a match with no winner entirely', async () => {
    await endedMatch('m_idem_5', null);
    await postMatchProcessor.processMatch('m_idem_5');
    expect((await playerRepo.findByAddress(P1))?.stats.matchesPlayed).toBe(0);
    expect((await playerRepo.findByAddress(P2))?.stats.matchesPlayed).toBe(0);
    expect(await rewardService.getBalance(P1)).toBe(0);
  });
});
