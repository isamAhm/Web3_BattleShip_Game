import { Router, Request, Response } from "express";
import { lbTop } from "../db/redis";
import { Player } from "../db/mongo";

export const leaderboardRouter = Router();

// GET /leaderboard/:board  (points | streak | fastest)
leaderboardRouter.get("/:board", async (req: Request, res: Response) => {
  const board = req.params.board;
  if (!["points", "streak", "fastest"].includes(board)) {
    res.status(400).json({ error: "Unknown leaderboard" });
    return;
  }

  const entries = await lbTop(board, 20);

  // Enrich with player usernames
  const addresses = entries.map((e) => e.member);
  const players = await Player.find({ address: { $in: addresses } });
  const nameMap = new Map(players.map((p) => [p.address, p.username || p.address]));

  const result = entries.map((e, i) => ({
    rank: i + 1,
    address: e.member,
    name: nameMap.get(e.member) ?? e.member,
    score: board === "fastest" ? -e.score : e.score, // fastest stored as negative
  }));

  res.json({ board, entries: result });
});
