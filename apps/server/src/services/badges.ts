import { badgeRepo } from '../repositories/badgeRepo.js';
import { playerRepo } from '../repositories/playerRepo.js';
import { BADGE_DEFINITIONS, BadgeId } from '@wba/shared';

export interface MatchSummaryForBadges {
  matchId: string;
  winner: string | null;
  forfeit: boolean;
  shots: Array<{
    shooter: string;
    outcome: string;
    shooterStreak: number;
  }>;
}

export class BadgeService {
  public async evaluateMatch(summary: MatchSummaryForBadges): Promise<void> {
    if (!summary.winner || summary.forfeit) return;

    const winnerNorm = summary.winner.toLowerCase();
    const player = await playerRepo.findByAddress(winnerNorm);
    if (!player) return;

    const winnerShots = summary.shots.filter((s) => s.shooter.toLowerCase() === winnerNorm);
    const winnerMinesHit = winnerShots.filter((s) => s.outcome === 'mine').length;
    const maxStreak = winnerShots.reduce((max, s) => Math.max(max, s.shooterStreak), 0);

    // 1. FIRST_WIN (player won at least 1 match)
    if (player.stats.wins >= 1) {
      await this.awardIfEligible(winnerNorm, 'FIRST_WIN', summary.matchId);
    }

    // 2. HOT_STREAK (5-hit streak reached)
    if (maxStreak >= 5) {
      await this.awardIfEligible(winnerNorm, 'HOT_STREAK', summary.matchId);
    }

    // 3. PERFECT_GAME (won in exactly 17 shots)
    if (winnerShots.length === 17 && winnerMinesHit === 0) {
      await this.awardIfEligible(winnerNorm, 'PERFECT_GAME', summary.matchId);
    }

    // 4. MINE_DODGER (won without triggering a single mine)
    if (winnerMinesHit === 0) {
      await this.awardIfEligible(winnerNorm, 'MINE_DODGER', summary.matchId);
    }

    // 5. ADMIRAL (10+ wins)
    if (player.stats.wins >= 10) {
      await this.awardIfEligible(winnerNorm, 'ADMIRAL', summary.matchId);
    }
  }

  private async awardIfEligible(
    playerAddress: string,
    badgeId: BadgeId,
    matchId: string,
  ): Promise<void> {
    const def = BADGE_DEFINITIONS[badgeId];
    if (!def) return;
    await badgeRepo.awardBadge(playerAddress, badgeId, def.tokenId, matchId);
  }
}

export const badgeService = new BadgeService();
