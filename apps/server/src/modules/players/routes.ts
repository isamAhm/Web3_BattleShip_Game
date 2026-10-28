import { Router, Request, Response, NextFunction } from 'express';
import { playerRepo } from '../../repositories/playerRepo.js';
import { matchRepo } from '../../repositories/matchRepo.js';
import { requireAuth } from '../../middleware/auth.js';
import { updatePlayerProfileSchema } from '@wba/shared';

export const playersRouter = Router();

playersRouter.get('/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const player = await playerRepo.findByAddress(req.params.address);
    if (!player) {
      res.status(404).json({
        success: false,
        error: { code: 'PLAYER_NOT_FOUND', message: 'Player profile not found' },
      });
      return;
    }
    res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
});

playersRouter.patch('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = updatePlayerProfileSchema.parse(req.body);
    const updated = await playerRepo.updateProfile(req.user!.address, data);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
});

playersRouter.get('/:address/matches', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const offset = Math.max(0, parseInt(req.query.offset as string) || 0);
    const matches = await matchRepo.findByPlayer(req.params.address, limit, offset);
    res.json({ success: true, data: matches });
  } catch (err) {
    next(err);
  }
});
