import mongoose, { Schema, Document } from 'mongoose';

export interface ITournamentStanding {
  address: string;
  points: number;
  wins: number;
  rank: number;
}

export interface ITournament extends Document {
  tournamentId: string;
  title: string;
  description: string;
  status: 'open' | 'closed';
  startTime: Date;
  endTime: Date;
  standings: ITournamentStanding[];
  createdAt: Date;
  updatedAt: Date;
}

const TournamentStandingSchema = new Schema<ITournamentStanding>(
  {
    address: { type: String, required: true },
    points: { type: Number, default: 0 },
    wins: { type: Number, default: 0 },
    rank: { type: Number, default: 1 },
  },
  { _id: false },
);

const TournamentSchema = new Schema<ITournament>(
  {
    tournamentId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'closed'],
      default: 'open',
      index: true,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
      index: true,
    },
    standings: {
      type: [TournamentStandingSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const TournamentModel =
  mongoose.models.Tournament || mongoose.model<ITournament>('Tournament', TournamentSchema);
