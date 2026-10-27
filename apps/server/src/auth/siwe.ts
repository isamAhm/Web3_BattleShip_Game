import { Router, Request, Response } from "express";
import { SiweMessage } from "siwe";
import { randomBytes } from "crypto";
import { storeNonce, consumeNonce } from "../db/redis";
import { Player } from "../db/mongo";
import { config } from "../config";

export const authRouter = Router();

// ─── GET /auth/nonce ──────────────────────────────────────────────────────────
// Returns a fresh one-time nonce. Stored in Redis with 5-minute TTL.
authRouter.get("/nonce", async (_req: Request, res: Response) => {
  const nonce = randomBytes(16).toString("hex");
  await storeNonce(nonce);
  res.json({ nonce });
});

// ─── POST /auth/verify ────────────────────────────────────────────────────────
// Verifies an EIP-4361 signed message.
authRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { message, signature } = req.body as {
      message: string;
      signature: string;
    };

    if (!message || !signature) {
      res.status(400).json({ error: "message and signature required" });
      return;
    }

    // Parse and verify
    const siwe = new SiweMessage(message);

    // Domain check
    if (siwe.domain !== config.siweDomain) {
      res.status(401).json({ error: "Domain mismatch" });
      return;
    }

    const result = await siwe.verify({ signature });
    if (!result.success) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Consume nonce — rejects replays
    const valid = await consumeNonce(siwe.nonce);
    if (!valid) {
      res.status(401).json({ error: "Nonce already used or expired" });
      return;
    }

    const address = siwe.address.toLowerCase();

    // Upsert player record
    await Player.findOneAndUpdate(
      { address },
      { $setOnInsert: { address } },
      { upsert: true, new: true }
    );

    // Set session
    (req.session as any).address = address;

    res.json({ address });
  } catch (err: any) {
    console.error("SIWE verify error:", err);
    res.status(401).json({ error: err.message ?? "Verification failed" });
  }
});

// ─── GET /auth/me ─────────────────────────────────────────────────────────────
authRouter.get("/me", async (req: Request, res: Response) => {
  const address = (req.session as any).address;
  if (!address) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const player = await Player.findOne({ address });
  res.json({ address, player });
});

// ─── POST /auth/logout ────────────────────────────────────────────────────────
authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});
