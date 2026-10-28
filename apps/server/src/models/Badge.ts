import mongoose, { Schema, Document } from 'mongoose';

export interface IBadge extends Document {
  playerAddress: string;
  badgeId: string;
  tokenId: number;
  matchId: string;
  awardedAt: Date;
}

const BadgeSchema = new Schema<IBadge>(
  {
    playerAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    badgeId: {
      type: String,
      required: true,
      enum: ['FIRST_WIN', 'HOT_STREAK', 'PERFECT_GAME', 'MINE_DODGER', 'ADMIRAL'],
    },
    tokenId: {
      type: Number,
      required: true,
    },
    matchId: {
      type: String,
      required: true,
    },
    awardedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// Compound unique index prevents awarding the same badge twice to the same player
BadgeSchema.index({ playerAddress: 1, badgeId: 1 }, { unique: true });

export const BadgeModel = mongoose.models.Badge || mongoose.model<IBadge>('Badge', BadgeSchema);
