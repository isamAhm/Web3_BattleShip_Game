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

    if (rawEntries.length === 0 && offset === 0) {
      const defaultSeed = [
        { address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', username: 'Admiral_Vega', points: 2840, streak: 8, fastest: 16, wins: 24 },
        { address: '0x71C8363714856E3B95B8cfcA4b77f86481775e53', username: 'SilverHull', points: 2310, streak: 5, fastest: 19, wins: 19 },
        { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', username: 'PhantomRook', points: 1950, streak: 4, fastest: 22, wins: 16 },
        { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', username: 'CorsairTactics', points: 1620, streak: 3, fastest: 24, wins: 13 },
        { address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df', username: 'Dreadnought_01', points: 1410, streak: 2, fastest: 27, wins: 11 },
      ];
      for (const p of defaultSeed) {
        await playerRepo.getOrCreate(p.address);
        await playerRepo.updateProfile(p.address, { username: p.username });
        await this.updatePlayerStats(p.address, {
          totalPoints: p.points,
          bestStreak: p.streak,
          fastestWinShots: p.fastest,
        });
      }
      return this.getLeaderboard(category, limit, offset);
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
