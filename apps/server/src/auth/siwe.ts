import { Router, Request, Response } from "express";
import { randomBytes } from "crypto";
import { createPublicClient, http, verifyMessage } from "viem";
import { baseSepolia } from "viem/chains";
import { storeNonce, consumeNonce } from "../db/redis";
import { Player } from "../db/mongo";
import { config } from "../config";

export const authRouter = Router();

// ─── GET /auth/nonce ──────────────────────────────────────────────────────────
authRouter.get("/nonce", async (_req: Request, res: Response) => {
  const nonce = randomBytes(16).toString("hex");
  await storeNonce(nonce);
  res.json({ nonce });
});

// ─── POST /auth/verify ────────────────────────────────────────────────────────
// Body: { message: string, signature: `0x${string}`, address: `0x${string}` }
authRouter.post("/verify", async (req: Request, res: Response) => {
  try {
    const { message, signature, address } = req.body as {
      message: string;
      signature: string;
      address: string;
    };

    if (!message || !signature || !address) {
      res.status(400).json({ error: "message, signature and address required" });
      return;
    }

    // Parse nonce from the EIP-4361 message
    const nonceMatch = message.match(/Nonce:\s*([a-f0-9]+)/i);
    if (!nonceMatch) {
      res.status(400).json({ error: "Nonce not found in message" });
      return;
    }
    const nonce = nonceMatch[1];

    // Parse domain
    const domainMatch = message.match(/^(.+?) wants you to sign in/m);
    const domain = domainMatch?.[1];
    if (domain && domain !== config.siweDomain) {
      res.status(401).json({ error: "Domain mismatch" });
      return;
    }

    // Verify signature using viem
    const valid = await verifyMessage({
      address: address as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!valid) {
      res.status(401).json({ error: "Invalid signature" });
      return;
    }

    // Consume nonce (one-time use, prevents replays)
    const consumed = await consumeNonce(nonce);
    if (!consumed) {
      res.status(401).json({ error: "Nonce already used or expired" });
      return;
    }

    const normalizedAddress = address.toLowerCase();

    // Upsert player
    await Player.findOneAndUpdate(
      { address: normalizedAddress },
      { $setOnInsert: { address: normalizedAddress } },
      { upsert: true, new: true }
    );

    // Set session
    (req.session as any).address = normalizedAddress;

    res.json({ address: normalizedAddress });
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
  req.session.destroy(() => res.json({ ok: true }));
});
