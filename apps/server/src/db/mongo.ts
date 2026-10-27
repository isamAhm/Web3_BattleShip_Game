import mongoose from "mongoose";
import { config } from "../config";

export async function connectMongo(): Promise<void> {
  await mongoose.connect(config.mongoUri);
  console.log("✅ MongoDB connected");
}

// ─── Player schema ────────────────────────────────────────────────────────────

const playerSchema = new mongoose.Schema({
  address:    { type: String, required: true, unique: true, lowercase: true },
  username:   { type: String, default: "" },
  avatar:     { type: String, default: "" },
  stats: {
    wins:        { type: Number, default: 0 },
    losses:      { type: Number, default: 0 },
    points:      { type: Number, default: 0 },
    bestStreak:  { type: Number, default: 0 },
    fastestWin:  { type: Number, default: Infinity },
  },
  createdAt: { type: Date, default: Date.now },
});

export const Player = mongoose.model("Player", playerSchema);

// ─── Match schema ─────────────────────────────────────────────────────────────

const matchSchema = new mongoose.Schema({
  matchId:     { type: String, required: true, unique: true },
  players:     [String],
  commitments: mongoose.Schema.Types.Mixed,
  shots:       mongoose.Schema.Types.Mixed,
  revealedBoards: mongoose.Schema.Types.Mixed,
  scores:      mongoose.Schema.Types.Mixed,
  winner:      String,
  forfeitedBy: String,
  resultHash:  String,
  chainStatus: { type: String, enum: ["pending", "confirmed", "simulated"], default: "pending" },
  txHash:      String,
  startedAt:   Date,
  endedAt:     Date,
  createdAt:   { type: Date, default: Date.now },
});

export const Match = mongoose.model("Match", matchSchema);

// ─── Chain log (simulated mode) ───────────────────────────────────────────────

const chainLogSchema = new mongoose.Schema({
  matchId:    { type: String, required: true, unique: true },
  txHash:     String,
  record:     mongoose.Schema.Types.Mixed,
  createdAt:  { type: Date, default: Date.now },
});

export const ChainLog = mongoose.model("ChainLog", chainLogSchema);

// ─── Badge schema ─────────────────────────────────────────────────────────────

const badgeSchema = new mongoose.Schema({
  address:   { type: String, required: true },
  badgeType: { type: String, required: true },
  mintStatus:{ type: String, enum: ["pending", "minted"], default: "pending" },
  txHash:    String,
  awardedAt: { type: Date, default: Date.now },
});

export const Badge = mongoose.model("Badge", badgeSchema);
