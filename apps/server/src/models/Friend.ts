import mongoose, { Schema, Document } from 'mongoose';

export interface IFriend extends Document {
  userAddress: string;
  friendAddress: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

const FriendSchema = new Schema<IFriend>(
  {
    userAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    friendAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

FriendSchema.index({ userAddress: 1, friendAddress: 1 }, { unique: true });

export const FriendModel =
  mongoose.models.Friend || mongoose.model<IFriend>('Friend', FriendSchema);
