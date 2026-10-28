import { Router, Request, Response, NextFunction } from 'express';
import { tournamentRepo } from '../../repositories/tournamentRepo.js';
import { tournamentCreateSchema } from '@wba/shared';
import { requireAuth } from '../../middleware/auth.js';

export const tournamentsRouter = Router();

tournamentsRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as 'open' | 'closed' | undefined;
    const tournaments = await tournamentRepo.listTournaments(status);
    res.json({ success: true, data: tournaments });
  } catch (err) {
    next(err);
  }
});

tournamentsRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tournament = await tournamentRepo.findById(req.params.id);
    if (!tournament) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Tournament not found' },
      });
      return;
    }
    res.json({ success: true, data: tournament });
  } catch (err) {
    next(err);
  }
});

tournamentsRouter.post(
  '/:id/register',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userAddress = req.user!.address;
      const tournament = await tournamentRepo.findById(req.params.id);
      if (!tournament) {
        res.status(404).json({ success: false, error: { message: 'Tournament not found' } });
        return;
      }
      const standings = tournament.standings || [];
      const alreadyRegistered = standings.some(
        (s) => s.address.toLowerCase() === userAddress.toLowerCase(),
      );
      if (!alreadyRegistered) {
        standings.push({
          address: userAddress,
          points: 100,
          wins: 0,
          rank: standings.length + 1,
        });
        await tournamentRepo.updateStandings(req.params.id, standings);
      }
      res.json({
        success: true,
        data: {
          registered: true,
          tournamentId: req.params.id,
          standings,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

tournamentsRouter.post(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = tournamentCreateSchema.parse(req.body);
      const tournament = await tournamentRepo.create(data);
      res.json({ success: true, data: tournament });
    } catch (err) {
      next(err);
    }
  },
);
