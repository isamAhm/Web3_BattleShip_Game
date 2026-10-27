import { Request, Response, NextFunction } from "express";
import type { Socket } from "socket.io";

/** Express middleware — rejects unauthenticated requests */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const address = (req.session as any)?.address;
  if (!address) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  next();
}

/** Socket.IO middleware — rejects sockets without a valid session */
export function socketAuth(
  socket: Socket & { data: { address?: string } },
  next: (err?: Error) => void
): void {
  const session = (socket.request as any).session;
  const address = session?.address as string | undefined;
  if (!address) {
    next(new Error("Not authenticated"));
    return;
  }
  socket.data.address = address;
  next();
}
