import mongoose, { Schema, Document } from 'mongoose';

export interface IChainLog extends Document {
  txHash: string;
  matchId: string;
  winner: string;
  resultHash: string;
  mode: 'simulated' | 'testnet';
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber?: number;
  error?: string;
  recordedAt: Date;
}

const ChainLogSchema = new Schema<IChainLog>(
  {
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    matchId: {
      type: String,
      required: true,
      index: true,
    },
    winner: {
      type: String,
      required: true,
    },
    resultHash: {
      type: String,
      required: true,
    },
    mode: {
      type: String,
      enum: ['simulated', 'testnet'],
      required: true,
    },
    status: {
      type: String,
      enum: ['confirmed', 'pending', 'failed'],
      default: 'pending',
      index: true,
    },
    blockNumber: Number,
    error: String,
    recordedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

export const ChainLogModel =
  mongoose.models.ChainLog || mongoose.model<IChainLog>('ChainLog', ChainLogSchema);
