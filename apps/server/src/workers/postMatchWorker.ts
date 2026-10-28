import { Queue, Worker, Job } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { matchRepo } from '../repositories/matchRepo.js';
import { playerRepo } from '../repositories/playerRepo.js';
import { leaderboardService } from '../services/leaderboard.js';
import { badgeService } from '../services/badges.js';
import { rewardService } from '../services/rewards.js';
import { chainService } from '../services/chain.js';
import { tournamentRepo } from '../repositories/tournamentRepo.js';

export interface PostMatchJobData {
  matchId: string;
}

export class PostMatchProcessor {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private redisConnection: Redis | null = null;

  constructor() {
    this.initQueue();
  }

  private initQueue(): void {
    if (env.NODE_ENV === 'test') {
      // In tests, we run synchronously in-process
      return;
    }

    try {
      this.redisConnection = new Redis(env.REDIS_URL, {
        maxRetriesPerRequest: null,
        enableOfflineQueue: false,
        retryStrategy: () => null, // don't infinite retry if offline
        lazyConnect: true,
      });

      this.redisConnection
        .connect()
        .then(() => {
          this.queue = new Queue('post-match-queue', {
            connection: this.redisConnection as any,
            defaultJobOptions: {
              attempts: 3,
              backoff: { type: 'exponential', delay: 1000 },
              removeOnComplete: true,
            },
          });

          this.queue.on('error', (err) => {
            console.warn('[PostMatchWorker] Queue connection error:', err.message);
          });

          this.worker = new Worker(
            'post-match-queue',
            async (job: Job<PostMatchJobData>) => {
              await this.processMatch(job.data.matchId);
            },
            { connection: this.redisConnection as any },
          );

          this.worker.on('error', (err) => {
            console.warn('[PostMatchWorker] Worker connection error:', err.message);
          });

          this.worker.on('failed', (job, err) => {
            console.error(`[PostMatchWorker] Job ${job?.id} failed:`, err);
          });

          console.log('[PostMatchWorker] BullMQ queue and worker initialized with Redis');
        })
        .catch((err) => {
          console.warn(
            '[PostMatchWorker] Redis connection failed, falling back to direct in-process processing:',
            err.message,
          );
          this.queue = null;
          this.worker = null;
        });
    } catch (err) {
      this.queue = null;
      this.worker = null;
      console.warn(
        '[PostMatchWorker] BullMQ queue initialization skipped, in-process processing will be used:',
        (err as Error).message,
      );
    }
  }

  public async scheduleProcessing(matchId: string): Promise<void> {
    if (this.queue) {
      try {
        await this.queue.add('process-match', { matchId }, { jobId: `match_${matchId}` });
        return;
      } catch {
        // fallback to direct in-process
      }
    }
    // Direct in-process execution fallback
    await this.processMatch(matchId);
  }

  public async processMatch(matchId: string): Promise<void> {
    const match = await matchRepo.findById(matchId);
    if (!match) {
      console.warn(`[PostMatchProcessor] Match ${matchId} not found`);
      return;
    }

    const { players, winner, forfeit, shots, scores, resultHash } = match;
    const player1 = players[0].toLowerCase();
    const player2 = players[1].toLowerCase();

    const score1 = scores instanceof Map ? (scores.get(player1) ?? 0) : (scores[player1] ?? 0);
    const score2 = scores instanceof Map ? (scores.get(player2) ?? 0) : (scores[player2] ?? 0);

    const shots1 = shots.filter((s) => s.shooter.toLowerCase() === player1);
    const shots2 = shots.filter((s) => s.shooter.toLowerCase() === player2);

    const streak1 = shots1.reduce((m, s) => Math.max(m, s.shooterStreak), 0);
    const streak2 = shots2.reduce((m, s) => Math.max(m, s.shooterStreak), 0);

    // 1. Update Player 1 Stats
    const p1Updated = await playerRepo.updateStats(player1, {
      isWin: winner?.toLowerCase() === player1,
      points: score1,
      streak: streak1,
      shotsUsed: shots1.length,
    });

    // 2. Update Player 2 Stats
    const p2Updated = await playerRepo.updateStats(player2, {
      isWin: winner?.toLowerCase() === player2,
      points: score2,
      streak: streak2,
      shotsUsed: shots2.length,
    });

    // 3. Update Leaderboards
    if (p1Updated) {
      await leaderboardService.updatePlayerStats(player1, p1Updated.stats);
    }
    if (p2Updated) {
      await leaderboardService.updatePlayerStats(player2, p2Updated.stats);
    }

    // 4. Evaluate Badges
    await badgeService.evaluateMatch({
      matchId,
      winner,
      forfeit,
      shots,
    });

    // 5. Award ARENA ledger rewards (idempotent)
    await rewardService.awardMatchCompletion(
      matchId,
      player1,
      score1,
      winner?.toLowerCase() === player1,
    );
    await rewardService.awardMatchCompletion(
      matchId,
      player2,
      score2,
      winner?.toLowerCase() === player2,
    );

    // 6. Record on chain if verified and resultHash is present
    if (resultHash) {
      await chainService.recordMatch(matchId, winner, resultHash);
    }

    // 7. Update Tournament Standings if open tournaments exist
    const openTournaments = await tournamentRepo.listTournaments('open');
    for (const tourn of openTournaments) {
      const standingsMap = new Map<string, { points: number; wins: number }>();
      tourn.standings.forEach((s) => {
        standingsMap.set(s.address.toLowerCase(), { points: s.points, wins: s.wins });
      });

      const s1 = standingsMap.get(player1) ?? { points: 0, wins: 0 };
      s1.points += Math.max(0, score1);
      if (winner?.toLowerCase() === player1) s1.wins += 1;
      standingsMap.set(player1, s1);

      const s2 = standingsMap.get(player2) ?? { points: 0, wins: 0 };
      s2.points += Math.max(0, score2);
      if (winner?.toLowerCase() === player2) s2.wins += 1;
      standingsMap.set(player2, s2);

      const updatedList = Array.from(standingsMap.entries())
        .map(([address, data]) => ({ address, points: data.points, wins: data.wins, rank: 1 }))
        .sort((a, b) => {
          if (b.points !== a.points) return b.points - a.points;
          return b.wins - a.wins;
        });

      updatedList.forEach((item, idx) => {
        item.rank = idx + 1;
      });

      await tournamentRepo.updateStandings(tourn.tournamentId, updatedList);
    }
  }

  public async close(): Promise<void> {
    if (this.worker) {
      try {
        await this.worker.close();
      } catch {
        // ignore
      }
      this.worker = null;
    }
    if (this.queue) {
      try {
        await this.queue.close();
      } catch {
        // ignore
      }
      this.queue = null;
    }
    if (this.redisConnection) {
      try {
        await this.redisConnection.quit();
      } catch {
        // ignore
      }
      this.redisConnection = null;
    }
  }
}

export const postMatchProcessor = new PostMatchProcessor();
