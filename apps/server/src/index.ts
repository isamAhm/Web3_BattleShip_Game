import express from "express";
import { createServer } from "http";
import { Server as IoServer } from "socket.io";
import session from "express-session";
import { createClient } from "redis";
import { createAdapter } from "@socket.io/redis-adapter";
import cookieParser from "cookie-parser";
import cors from "cors";

import { config } from "./config";
import { connectMongo } from "./db/mongo";
import { connectRedis, redis } from "./db/redis";
import { authRouter } from "./auth/siwe";
import { socketAuth } from "./auth/middleware";
import { playersRouter } from "./routes/players";
import { matchesRouter } from "./routes/matches";
import { leaderboardRouter } from "./routes/leaderboard";
import { registerGameHandlers } from "./sockets/gameHandler";

async function main() {
  // ── Database connections ──────────────────────────────────────────────────
  await connectMongo();
  await connectRedis();

  // ── Express app ───────────────────────────────────────────────────────────
  const app = express();

  app.use(cors({
    origin: config.clientOrigin,
    credentials: true,
  }));
  app.use(express.json());
  app.use(cookieParser());

  // Session middleware shared with Socket.IO
  const sessionMiddleware = session({
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: config.nodeEnv === "production" ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  });

  app.use(sessionMiddleware);

  // ── Routes ────────────────────────────────────────────────────────────────
  app.use("/auth",        authRouter);
  app.use("/players",     playersRouter);
  app.use("/matches",     matchesRouter);
  app.use("/leaderboard", leaderboardRouter);

  app.get("/health", (_req, res) => res.json({ ok: true, ts: Date.now() }));

  // ── HTTP + Socket.IO server ───────────────────────────────────────────────
  const httpServer = createServer(app);

  const io = new IoServer(httpServer, {
    cors: {
      origin: config.clientOrigin,
      credentials: true,
    },
  });

  // Share session with sockets
  io.engine.use(sessionMiddleware);

  // Auth gate
  io.use(socketAuth as any);

  // Register game event handlers
  io.on("connection", (socket) => {
    const typedSocket = socket as typeof socket & { data: { address: string } };
    console.log(`🔌 Connected: ${typedSocket.data.address} (${socket.id})`);
    registerGameHandlers(io, typedSocket);

    socket.on("disconnect", () => {
      console.log(`🔌 Disconnected: ${typedSocket.data.address}`);
    });
  });

  // ── Start ─────────────────────────────────────────────────────────────────
  httpServer.listen(config.port, () => {
    console.log(`🚀 Server running on http://localhost:${config.port}`);
    console.log(`   Chain mode: ${config.chainMode}`);
    console.log(`   Client origin: ${config.clientOrigin}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
