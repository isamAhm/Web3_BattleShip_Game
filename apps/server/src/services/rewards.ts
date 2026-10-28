import { ledgerRepo } from '../repositories/ledgerRepo.js';

export class RewardService {
  public async awardMatchCompletion(
    matchId: string,
    playerAddress: string,
    score: number,
    isWinner: boolean,
  ): Promise<void> {
    const norm = playerAddress.toLowerCase();

    // 1. Base match score reward
    if (score > 0) {
      await ledgerRepo.addReward({
        idempotencyKey: `match_score:${matchId}:${norm}`,
        playerAddress: norm,
        amount: Math.round(score),
        type: 'match_reward',
        matchId,
      });
    }

    // 2. Victory bonus reward
    if (isWinner) {
      await ledgerRepo.addReward({
        idempotencyKey: `match_win_bonus:${matchId}:${norm}`,
        playerAddress: norm,
        amount: 50,
        type: 'win_bonus',
        matchId,
      });
    }
  }

  public async getBalance(playerAddress: string): Promise<number> {
    return ledgerRepo.getPlayerBalance(playerAddress);
  }

  public async getHistory(playerAddress: string) {
    return ledgerRepo.getPlayerHistory(playerAddress);
  }
}

export const rewardService = new RewardService();
