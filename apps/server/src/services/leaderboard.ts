import { redisService } from './redis.js';
import { playerRepo } from '../repositories/playerRepo.js';
import { LeaderboardCategory, LeaderboardEntry } from '@wba/shared';

const KEY_POINTS = 'leaderboard:points';
const KEY_STREAK = 'leaderboard:streak';
const KEY_FASTEST_WIN = 'leaderboard:fastest_win';

export class LeaderboardService {
  public async updatePlayerStats(
    address: string,
    stats: { totalPoints: number; bestStreak: number; fastestWinShots: number | null },
  ): Promise<void> {
    const norm = address.toLowerCase();

    // 1. Points
    await redisService.zadd(KEY_POINTS, Math.max(0, stats.totalPoints), norm);

    // 2. Best streak
    await redisService.zadd(KEY_STREAK, Math.max(0, stats.bestStreak), norm);

    // 3. Fastest win (only if won at least once)
    if (stats.fastestWinShots !== null && stats.fastestWinShots > 0) {
      await redisService.zadd(KEY_FASTEST_WIN, stats.fastestWinShots, norm);
    }
  }

  public async getLeaderboard(
    category: LeaderboardCategory,
    limit = 50,
    offset = 0,
  ): Promise<LeaderboardEntry[]> {
    let rawEntries: Array<{ member: string; score: number }>;

    if (category === 'fastest_win') {
      // Ascending order: fewest shots = top rank
      rawEntries = await redisService.zrangeWithScores(KEY_FASTEST_WIN, offset, offset + limit - 1);
    } else {
      const key = category === 'points' ? KEY_POINTS : KEY_STREAK;
      // Descending order: highest points / streak = top rank
      rawEntries = await redisService.zrevrangeWithScores(key, offset, offset + limit - 1);
    }

    const entries: LeaderboardEntry[] = [];

    for (let i = 0; i < rawEntries.length; i++) {
      const { member, score } = rawEntries[i];
      const player = await playerRepo.findByAddress(member);
      entries.push({
        rank: offset + i + 1,
        address: member,
        username: player?.username ?? `Player_${member.slice(2, 8)}`,
        avatar: player?.avatar,
        score,
        wins: player?.stats.wins,
      });
    }

    return entries;
  }

  public async reconcile(): Promise<void> {
    const allPlayers = await playerRepo.listAll();
    for (const player of allPlayers) {
      await this.updatePlayerStats(player.address, player.stats);
    }
  }
}

export const leaderboardService = new LeaderboardService();
