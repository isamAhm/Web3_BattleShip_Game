import mongoose, { Schema, Document } from 'mongoose';

export interface IPlayerStats {
  matchesPlayed: number;
  wins: number;
  losses: number;
  totalPoints: number;
  bestStreak: number;
  fastestWinShots: number | null;
}

export interface IPlayer extends Document {
  address: string;
  username: string;
  /** True once the player picked their own nickname (otherwise username is the generated default) */
  nicknameSet?: boolean;
  avatar: string;
  stats: IPlayerStats;
  createdAt: Date;
  updatedAt: Date;
}

const PlayerStatsSchema = new Schema<IPlayerStats>(
  {
    matchesPlayed: { type: Number, default: 0, min: 0 },
    wins: { type: Number, default: 0, min: 0 },
    losses: { type: Number, default: 0, min: 0 },
    totalPoints: { type: Number, default: 0, min: 0 },
    bestStreak: { type: Number, default: 0, min: 0 },
    fastestWinShots: { type: Number, default: null },
  },
  { _id: false },
);

const PlayerSchema = new Schema<IPlayer>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    username: {
      type: String,
      required: true,
      trim: true,
    },
    nicknameSet: {
      type: Boolean,
      default: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    stats: {
      type: PlayerStatsSchema,
      default: () => ({
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0,
        bestStreak: 0,
        fastestWinShots: null,
      }),
    },
  },
  {
    timestamps: true,
  },
);

export const PlayerModel =
  mongoose.models.Player || mongoose.model<IPlayer>('Player', PlayerSchema);
