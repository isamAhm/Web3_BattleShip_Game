import mongoose, { Schema, Document } from 'mongoose';

export interface IMatch extends Document {
  matchId: string;
  players: [string, string];
  status: 'placement' | 'battle' | 'ended';
  commitments: Map<string, string>;
  shots: Array<{
    shooter: string;
    target: string;
    coordinate: { x: number; y: number };
    outcome: string;
    pointsAwarded: number;
    shooterStreak: number;
    shooterScore: number;
    timestamp: number;
  }>;
  reveals: Map<
    string,
    {
      salt: string;
      ships: any[];
      mines: any[];
    }
  >;
  scores: Map<string, number>;
  winner: string | null;
  forfeit: boolean;
  verification: {
    status: 'verified' | 'invalid' | 'incomplete';
    reason?: string;
    details?: any;
  };
  canonicalRecord?: any;
  resultHash?: string;
  /** Post-match steps that already ran (stats0, stats1, tournaments): makes the job re-runnable. */
  postSteps?: Record<string, boolean>;
  chainStatus: 'pending' | 'recorded' | 'failed';
  chainMode: 'simulated' | 'testnet';
  chainTxHash?: string;
  startedAt: Date;
  endedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MatchSchema = new Schema<IMatch>(
  {
    matchId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    players: {
      type: [String],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['placement', 'battle', 'ended'],
      default: 'placement',
      index: true,
    },
    commitments: {
      type: Map,
      of: String,
      default: () => new Map(),
    },
    shots: {
      type: [
        {
          shooter: String,
          target: String,
          coordinate: {
            x: Number,
            y: Number,
          },
          outcome: String,
          pointsAwarded: Number,
          shooterStreak: Number,
          shooterScore: Number,
          timestamp: Number,
        },
      ],
      default: [],
    },
    reveals: {
      type: Map,
      of: Schema.Types.Mixed,
      default: () => new Map(),
    },
    scores: {
      type: Map,
      of: Number,
      default: () => new Map(),
    },
    winner: {
      type: String,
      default: null,
      index: true,
    },
    forfeit: {
      type: Boolean,
      default: false,
    },
    verification: {
      status: {
        type: String,
        enum: ['verified', 'invalid', 'incomplete'],
        default: 'incomplete',
        index: true,
      },
      reason: String,
      details: Schema.Types.Mixed,
    },
    canonicalRecord: Schema.Types.Mixed,
    postSteps: { type: Schema.Types.Mixed, default: () => ({}) },
    resultHash: {
      type: String,
      index: true,
    },
    chainStatus: {
      type: String,
      enum: ['pending', 'recorded', 'failed'],
      default: 'pending',
      index: true,
    },
    chainMode: {
      type: String,
      enum: ['simulated', 'testnet'],
      default: 'simulated',
    },
    chainTxHash: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    endedAt: Date,
  },
  {
    timestamps: true,
  },
);

export const MatchModel = mongoose.models.Match || mongoose.model<IMatch>('Match', MatchSchema);
