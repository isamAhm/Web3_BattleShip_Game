import { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export function correlationId(req: Request, res: Response, next: NextFunction): void {
  const reqId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('x-request-id', reqId);
  next();
}
