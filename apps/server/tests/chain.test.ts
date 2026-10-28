import { describe, it, expect, beforeEach } from 'vitest';
import { chainService } from '../src/services/chain.js';
import { chainLogRepo } from '../src/repositories/chainLogRepo.js';
import { matchRepo } from '../src/repositories/matchRepo.js';
import { badgeService } from '../src/services/badges.js';
import { badgeRepo } from '../src/repositories/badgeRepo.js';
import { rewardService } from '../src/services/rewards.js';
import { ledgerRepo } from '../src/repositories/ledgerRepo.js';
import { playerRepo } from '../src/repositories/playerRepo.js';
import { postMatchProcessor } from '../src/workers/postMatchWorker.js';

describe('Blockchain Integration, Verification & Idempotent Post-Match Jobs', () => {
  const p1Address = '0x1111111111111111111111111111111111111111';
  const p2Address = '0x2222222222222222222222222222222222222222';

  beforeEach(() => {
    chainLogRepo.resetMemoryStore();
    matchRepo.resetMemoryStore();
    badgeRepo.resetMemoryStore();
    ledgerRepo.resetMemoryStore();
    playerRepo.resetMemoryStore();
  });

  it('records verified matches in simulated blockchain mode with deterministic txHash', async () => {
    const matchId = 'match_test_chain_1';
    const resultHash = '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

    const res = await chainService.recordMatch(matchId, p1Address, resultHash);

    expect(res.mode).toBe('simulated');
    expect(res.status).toBe('confirmed');
    expect(res.txHash.startsWith('0xsim_')).toBe(true);

    // Verify stored in chain_log
    const log = await chainLogRepo.findByMatchId(matchId);
    expect(log).toBeDefined();
    expect(log?.txHash).toBe(res.txHash);
    expect(log?.winner.toLowerCase()).toBe(p1Address.toLowerCase());

    // Idempotent duplicate call returns the same record
    const secondCall = await chainService.recordMatch(matchId, p1Address, resultHash);
    expect(secondCall.txHash).toBe(res.txHash);
  });

  it('evaluates and awards badges without duplicates', async () => {
    await playerRepo.getOrCreate(p1Address);
    await playerRepo.updateStats(p1Address, {
      isWin: true,
      points: 80,
      streak: 5,
      shotsUsed: 17,
    });

    await badgeService.evaluateMatch({
      matchId: 'match_badge_test',
      winner: p1Address,
      forfeit: false,
      shots: [{ shooter: p1Address, outcome: 'hit', shooterStreak: 5 }],
    });

    const badges = await badgeRepo.getBadgesForPlayer(p1Address);
    expect(badges.length).toBeGreaterThanOrEqual(1);

    const hasFirstWin = badges.some((b) => b.badgeId === 'FIRST_WIN');
    expect(hasFirstWin).toBe(true);

    const hasHotStreak = badges.some((b) => b.badgeId === 'HOT_STREAK');
    expect(hasHotStreak).toBe(true);

    // Second evaluation will NOT create duplicate badges
    await badgeService.evaluateMatch({
      matchId: 'match_badge_test_2',
      winner: p1Address,
      forfeit: false,
      shots: [{ shooter: p1Address, outcome: 'hit', shooterStreak: 5 }],
    });

    const badgesAfter = await badgeRepo.getBadgesForPlayer(p1Address);
    const firstWinCount = badgesAfter.filter((b) => b.badgeId === 'FIRST_WIN').length;
    expect(firstWinCount).toBe(1);
  });

  it('records ARENA rewards ledger entries idempotently', async () => {
    await rewardService.awardMatchCompletion('match_reward_1', p1Address, 100, true);
    const balance = await rewardService.getBalance(p1Address);
    expect(balance).toBe(150); // 100 match score + 50 win bonus

    // Re-running same reward idempotently does not double-award
    await rewardService.awardMatchCompletion('match_reward_1', p1Address, 100, true);
    const balanceAfter = await rewardService.getBalance(p1Address);
    expect(balanceAfter).toBe(150);
  });

  it('runs complete postMatchProcessor pipeline end to end', async () => {
    const matchId = 'pipeline_match_1';
    await matchRepo.create({
      matchId,
      players: [p1Address, p2Address],
      status: 'ended',
      winner: p1Address,
      forfeit: false,
      scores: new Map([
        [p1Address, 110],
        [p2Address, 30],
      ]),
      shots: [
        {
          shooter: p1Address,
          target: p2Address,
          coordinate: { x: 0, y: 0 },
          outcome: 'hit',
          pointsAwarded: 10,
          shooterStreak: 1,
          shooterScore: 10,
          timestamp: Date.now(),
        },
      ],
      resultHash: '0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    });

    await postMatchProcessor.processMatch(matchId);

    // Verify stats updated
    const p1 = await playerRepo.findByAddress(p1Address);
    expect(p1?.stats.wins).toBe(1);
    expect(p1?.stats.totalPoints).toBe(110);

    // Verify chain log created
    const chainRecord = await chainLogRepo.findByMatchId(matchId);
    expect(chainRecord).toBeDefined();
    expect(chainRecord?.mode).toBe('simulated');

    // Verify ledger entry created
    const balance = await rewardService.getBalance(p1Address);
    expect(balance).toBe(160); // 110 + 50
  });
});
