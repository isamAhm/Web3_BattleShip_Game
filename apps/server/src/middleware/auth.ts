import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.js';
import { SessionUser } from '@wba/shared';

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
      sessionToken?: string;
    }
  }
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const cookieToken = req.cookies?.wba_session;
  const headerToken = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.substring(7)
    : undefined;

  const sessionToken = cookieToken || headerToken;
  if (!sessionToken) {
    return next();
  }

  try {
    const user = await authService.getSession(sessionToken);
    if (user) {
      req.user = user;
      req.sessionToken = sessionToken;
    }
  } catch {
    // Session retrieval error, continue unauthenticated
  }

  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in with your Ethereum wallet.',
      },
    });
    return;
  }
  next();
}
