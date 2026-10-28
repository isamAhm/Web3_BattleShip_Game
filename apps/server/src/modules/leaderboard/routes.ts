import { Router, Request, Response, NextFunction } from 'express';
import { leaderboardService } from '../../services/leaderboard.js';
import { leaderboardTypeSchema, leaderboardQuerySchema } from '@wba/shared';

export const leaderboardRouter = Router();

leaderboardRouter.get('/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const type = leaderboardTypeSchema.parse(req.params.type);
    const { limit, offset } = leaderboardQuerySchema.parse(req.query);

    const entries = await leaderboardService.getLeaderboard(type, limit, offset);
    res.json({
      success: true,
      data: {
        category: type,
        limit,
        offset,
        entries,
      },
    });
  } catch (err) {
    next(err);
  }
});
