import { Router, Request, Response, NextFunction } from 'express';
import { requireAuth } from '../../middleware/auth.js';
import { rewardService } from '../../services/rewards.js';
import { badgeRepo } from '../../repositories/badgeRepo.js';
import { BADGE_DEFINITIONS } from '@wba/shared';

export const rewardsRouter = Router();

rewardsRouter.get(
  '/rewards/me',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const address = req.user!.address;
      const balance = await rewardService.getBalance(address);
      const history = await rewardService.getHistory(address);
      res.json({
        success: true,
        data: {
          balance,
          history,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

rewardsRouter.get('/badges', async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      success: true,
      data: Object.values(BADGE_DEFINITIONS),
    });
  } catch (err) {
    next(err);
  }
});

rewardsRouter.get(
  '/players/:address/badges',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const badges = await badgeRepo.getBadgesForPlayer(req.params.address);
      res.json({
        success: true,
        data: badges,
      });
    } catch (err) {
      next(err);
    }
  },
);
