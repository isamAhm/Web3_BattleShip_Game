import mongoose from 'mongoose';
import { env } from '../config/env.js';

let isConnected = false;

export async function connectMongo(): Promise<boolean> {
  if (isConnected) return true;

  try {
    mongoose.set('strictQuery', true);
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 2000,
      connectTimeoutMS: 2000,
    });
    isConnected = true;
    console.log('[MongoDB] Connected successfully');
    return true;
  } catch (err) {
    isConnected = false;
    if (env.NODE_ENV !== 'test') {
      console.warn(
        '[MongoDB] Direct connection failed, in-memory repository fallback will be used if needed:',
        (err as Error).message,
      );
    }
    return false;
  }
}

export function isMongoConnected(): boolean {
  return isConnected && mongoose.connection.readyState === 1;
}

export async function closeMongo(): Promise<void> {
  if (isConnected) {
    try {
      await mongoose.disconnect();
    } catch {
      // ignore
    }
    isConnected = false;
  }
}
