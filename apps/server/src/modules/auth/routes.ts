import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth.js';
import { requireAuth } from '../../middleware/auth.js';
import { siweVerifyRequestSchema } from '@wba/shared';
import { playerRepo } from '../../repositories/playerRepo.js';
import { env } from '../../config/env.js';

export const authRouter = Router();

authRouter.get('/nonce', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.generateNonce();
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { message, signature } = siweVerifyRequestSchema.parse(req.body);
    const { sessionToken, user, player } = await authService.verifySiwe(message, signature);

    // Set secure HTTP-only cookie
    res.cookie('wba_session', sessionToken, {
      httpOnly: true,
      secure: env.COOKIE_SECURE,
      sameSite: 'lax',
      maxAge: env.SESSION_TTL_SECONDS * 1000,
      path: '/',
    });

    res.json({
      success: true,
      data: {
        user,
        player,
        sessionToken, // also returned for clients that use Authorization header
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get('/me', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const player = await playerRepo.findByAddress(req.user!.address);
    res.json({
      success: true,
      data: {
        user: req.user,
        player,
      },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.cookies?.wba_session || req.sessionToken;
    if (sessionToken) {
      await authService.invalidateSession(sessionToken);
    }
    res.clearCookie('wba_session', { path: '/' });
    res.json({
      success: true,
      data: { message: 'Logged out successfully' },
    });
  } catch (err) {
    next(err);
  }
});
