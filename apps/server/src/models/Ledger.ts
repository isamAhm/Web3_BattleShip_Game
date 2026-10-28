import mongoose, { Schema, Document } from 'mongoose';

export interface ILedgerEntry extends Document {
  idempotencyKey: string;
  playerAddress: string;
  amount: number;
  type: 'match_reward' | 'win_bonus' | 'streak_bonus' | 'badge_reward' | 'tournament_reward';
  matchId?: string;
  status: 'completed';
  createdAt: Date;
}

const LedgerSchema = new Schema<ILedgerEntry>(
  {
    idempotencyKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    playerAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    type: {
      type: String,
      enum: ['match_reward', 'win_bonus', 'streak_bonus', 'badge_reward', 'tournament_reward'],
      required: true,
    },
    matchId: {
      type: String,
      index: true,
    },
    status: {
      type: String,
      enum: ['completed'],
      default: 'completed',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const LedgerModel =
  mongoose.models.Ledger || mongoose.model<ILedgerEntry>('Ledger', LedgerSchema);
