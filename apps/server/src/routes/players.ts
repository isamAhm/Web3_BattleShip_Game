import { Router, Request, Response } from "express";
import { Player, Match, Badge } from "../db/mongo";
import { lbTop, lbRank } from "../db/redis";
import { requireAuth } from "../auth/middleware";

export const playersRouter = Router();

// GET /players/:address
playersRouter.get("/:address", async (req: Request, res: Response) => {
  const address = req.params.address.toLowerCase();
  const player = await Player.findOne({ address });
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  const [pointsRank, streakRank, fastRank] = await Promise.all([
    lbRank("points", address),
    lbRank("streak", address),
    lbRank("fastest", address),
  ]);

  res.json({ player, ranks: { points: pointsRank, streak: streakRank, fastest: fastRank } });
});

// PATCH /players/me  (update username/avatar)
playersRouter.patch("/me", requireAuth, async (req: Request, res: Response) => {
  const address = (req.session as any).address;
  const { username, avatar } = req.body as { username?: string; avatar?: string };
  const update: Record<string, string> = {};
  if (username) update.username = username.slice(0, 32);
  if (avatar)   update.avatar   = avatar.slice(0, 200);
  const player = await Player.findOneAndUpdate({ address }, update, { new: true });
  res.json({ player });
});

// GET /players/:address/badges
playersRouter.get("/:address/badges", async (req: Request, res: Response) => {
  const address = req.params.address.toLowerCase();
  const badges = await Badge.find({ address });
  res.json({ badges });
});
