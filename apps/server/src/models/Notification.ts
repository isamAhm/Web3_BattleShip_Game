import mongoose, { Schema, Document } from 'mongoose';

export interface INotification extends Document {
  id: string;
  userAddress: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  data?: any;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    id: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userAddress: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    data: Schema.Types.Mixed,
  },
  {
    timestamps: true,
  },
);

export const NotificationModel =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
