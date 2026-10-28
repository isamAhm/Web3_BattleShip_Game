import { Router, Request, Response, NextFunction } from 'express';
import { matchRepo } from '../../repositories/matchRepo.js';
import { matchManager } from '../../services/matchManager.js';
import { matchmakingService } from '../../services/matchmaking.js';
import { revealPayloadSchema } from '@wba/shared';
import { replayScores } from '@wba/engine';
import { requireAuth } from '../../middleware/auth.js';

export const matchesRouter = Router();

matchesRouter.get('/active', async (req: Request, res: Response) => {
  try {
    const waitingRooms = matchmakingService.listPrivateRooms().map((r) => ({
      id: r.code,
      roomCode: r.isPrivate ? undefined : r.code,
      name: r.isPrivate ? `🔒 Private Room (${r.host.slice(0, 6)}…)` : `${r.host.slice(0, 6)}…'s Fleet`,
      host: `${r.host.slice(0, 6)}…${r.host.slice(-4)}`,
      mode: r.isPrivate ? 'Private' : 'Classic',
      isPrivate: r.isPrivate ?? true,
      players: '1/2',
      mines: 3,
      status: 'waiting',
      spectators: 0,
      createdAt: r.createdAt,
    }));

    const activeSessions = matchManager.listActiveSessions().map((s) => ({
      id: s.matchId,
      matchId: s.matchId,
      roomCode: s.roomCode,
      name: `${s.players[0].slice(0, 6)} vs ${s.players[1].slice(0, 6)}`,
      host: `${s.players[0].slice(0, 6)}…${s.players[0].slice(-4)}`,
      opponent: `${s.players[1].slice(0, 6)}…${s.players[1].slice(-4)}`,
      mode: 'Classic',
      players: '2/2',
      mines: 3,
      status: 'in-progress',
      spectators: s.spectatorsCount,
      phase: s.phase,
    }));

    res.json({
      success: true,
      data: {
        rooms: waitingRooms,
        matches: activeSessions,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

matchesRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const offset = Number(req.query.offset) || 0;
    const player = req.query.player as string | undefined;

    let matches;
    if (player) {
      matches = await matchRepo.findByPlayer(player, limit, offset);
    } else {
      matches = await matchRepo.listAll(limit, offset);
    }

    res.json({
      success: true,
      data: {
        matches,
        limit,
        offset,
        total: matches.length,
      },
    });
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id;
    const session = matchManager.getSession(matchId);

    if (session) {
      // For active match, return viewer-filtered public view
      const userAddress = req.user?.address;
      const idx = userAddress ? session.getPlayerIndex(userAddress) : null;
      const view = session.getView(idx !== null ? idx : 'spectator');
      res.json({ success: true, data: view });
      return;
    }

    const match = await matchRepo.findById(matchId);
    if (!match) {
      res.status(404).json({
        success: false,
        error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' },
      });
      return;
    }

    res.json({ success: true, data: match });
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/:id/replay', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id;
    const match = await matchRepo.findById(matchId);

    if (!match) {
      res.status(404).json({
        success: false,
        error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' },
      });
      return;
    }

    // Convert reveals map
    const revealsObj: Record<string, any> = {};
    if (match.reveals instanceof Map) {
      match.reveals.forEach((v, k) => {
        revealsObj[k] = v;
      });
    } else if (match.reveals) {
      Object.assign(revealsObj, match.reveals);
    }

    const [p1, p2] = match.players;
    const r1 = revealsObj[p1];
    const r2 = revealsObj[p2];

    if (!r1 || !r2) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REPLAY_UNAVAILABLE',
          message: 'Both players must submit reveals before replay can be audited',
        },
      });
      return;
    }

    const player0 = p1.toLowerCase() as any;
    const player1 = p2.toLowerCase() as any;

    const board0 = { ships: r1.ships, mines: r1.mines };
    const board1 = { ships: r2.ships, mines: r2.mines };

    const shots = match.shots.map((s) => ({
      player: (s.shooter.toLowerCase() === player0 ? 0 : 1) as 0 | 1,
      x: s.coordinate.x,
      y: s.coordinate.y,
      outcome: s.outcome as any,
    }));

    const forfeitRecord = match.forfeit
      ? {
          by: match.winner?.toLowerCase() === player0 ? player1 : player0,
          reason: 'resigned' as const,
        }
      : null;

    const replayResult = replayScores({
      matchId,
      players: [player0, player1],
      boards: [board0, board1],
      shots,
      forfeit: forfeitRecord,
    });

    res.json({
      success: true,
      data: {
        matchId,
        players: match.players,
        shots: match.shots,
        reveals: revealsObj,
        replayResult,
      },
    });
  } catch (err) {
    next(err);
  }
});

matchesRouter.get('/:id/verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const matchId = req.params.id;
    const match = await matchRepo.findById(matchId);

    if (!match) {
      res.status(404).json({
        success: false,
        error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        matchId,
        verification: match.verification,
        canonicalRecord: match.canonicalRecord,
        resultHash: match.resultHash,
        chainStatus: match.chainStatus,
        chainMode: match.chainMode,
        chainTxHash: match.chainTxHash,
      },
    });
  } catch (err) {
    next(err);
  }
});

matchesRouter.post(
  '/:id/reveal',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const matchId = req.params.id;
      const { salt, ships, mines } = revealPayloadSchema.parse({ ...req.body, matchId });
      const session = matchManager.getSession(matchId);

      if (session) {
        const result = session.handleReveal(req.user!.address, salt as `0x${string}`, ships, mines);
        if (!result.ok) {
          res.status(400).json({
            success: false,
            error: { code: 'INVALID_REVEAL', message: result.error || 'Invalid reveal' },
          });
          return;
        }
      } else {
        // Offline / finished match reveal update
        const match = await matchRepo.findById(matchId);
        if (!match) {
          res.status(404).json({
            success: false,
            error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' },
          });
          return;
        }

        const reveals =
          match.reveals instanceof Map
            ? match.reveals
            : new Map(Object.entries(match.reveals || {}));
        reveals.set(req.user!.address.toLowerCase(), { salt, ships, mines });
        await matchRepo.update(matchId, { reveals: reveals as any });
      }

      res.json({ success: true, data: { message: 'Reveal submitted successfully' } });
    } catch (err) {
      next(err);
    }
  },
);
