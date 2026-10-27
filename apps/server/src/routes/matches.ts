import { Router, Request, Response } from "express";
import { Match, ChainLog } from "../db/mongo";

export const matchesRouter = Router();

// GET /matches/:matchId
matchesRouter.get("/:matchId", async (req: Request, res: Response) => {
  const match = await Match.findOne({ matchId: req.params.matchId });
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }
  res.json({ match });
});

// GET /matches/:matchId/verify
// Recomputes the result hash server-side and returns verification status
matchesRouter.get("/:matchId/verify", async (req: Request, res: Response) => {
  const match = await Match.findOne({ matchId: req.params.matchId });
  if (!match) { res.status(404).json({ error: "Match not found" }); return; }

  // Recompute hash from stored record
  const { createHash } = await import("crypto");
  const record = {
    matchId: match.matchId,
    game: "battleship",
    players: match.players,
    commitments: match.commitments,
    shots: (match.shots as any[]).map((s: any) => ({
      shooter: s.shooter,
      row: s.row,
      col: s.col,
      outcome: s.outcome,
      sunkShipType: s.sunkShipType ?? null,
    })),
    scores: match.scores,
    winner: match.winner,
    forfeit: match.forfeitedBy ?? null,
  };
  const computed = "0x" + createHash("sha3-256").update(JSON.stringify(record)).digest("hex");
  const verified = computed === match.resultHash;

  // Chain record (simulated)
  const chainLog = await ChainLog.findOne({ matchId: match.matchId });

  res.json({
    match,
    computed,
    stored: match.resultHash,
    verified,
    chainTx: chainLog?.txHash ?? match.txHash ?? null,
    chainStatus: match.chainStatus,
  });
});

// GET /matches?player=0x...&limit=20
matchesRouter.get("/", async (req: Request, res: Response) => {
  const { player, limit = "20", skip = "0" } = req.query as Record<string, string>;
  const query: Record<string, any> = {};
  if (player) query.players = player.toLowerCase();
  const matches = await Match.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip(parseInt(skip));
  res.json({ matches });
});
