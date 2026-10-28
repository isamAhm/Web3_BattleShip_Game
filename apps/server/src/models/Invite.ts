import mongoose, { Schema, Document } from 'mongoose';

export interface IInvite extends Document {
  inviteId: string;
  fromAddress: string;
  toAddress: string;
  roomCode: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  expiresAt: Date;
  createdAt: Date;
}

const InviteSchema = new Schema<IInvite>(
  {
    inviteId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    fromAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    toAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    roomCode: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending',
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

export const InviteModel =
  mongoose.models.Invite || mongoose.model<IInvite>('Invite', InviteSchema);
