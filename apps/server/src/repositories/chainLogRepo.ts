import { ChainLogModel, IChainLog } from '../models/ChainLog.js';
import { isMongoConnected } from '../services/mongo.js';

class InMemoryChainLogStore {
  private logs = new Map<string, IChainLog>();

  public get(txHash: string): IChainLog | null {
    return this.logs.get(txHash) ?? null;
  }

  public set(txHash: string, log: IChainLog): void {
    this.logs.set(txHash, log);
  }

  public findByMatchId(matchId: string): IChainLog | null {
    return Array.from(this.logs.values()).find((l) => l.matchId === matchId) ?? null;
  }

  public clear(): void {
    this.logs.clear();
  }
}

const memoryStore = new InMemoryChainLogStore();

export class ChainLogRepository {
  public async create(data: {
    txHash: string;
    matchId: string;
    winner: string;
    resultHash: string;
    mode: 'simulated' | 'testnet';
    status: 'confirmed' | 'pending' | 'failed';
    blockNumber?: number;
    error?: string;
  }): Promise<IChainLog> {
    const logData = {
      ...data,
      recordedAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await ChainLogModel.create(logData);
      } catch {
        // fallback
      }
    }

    const doc = { ...logData } as unknown as IChainLog;
    memoryStore.set(data.txHash, doc);
    return doc;
  }

  public async findByTxHash(txHash: string): Promise<IChainLog | null> {
    if (isMongoConnected()) {
      try {
        return await ChainLogModel.findOne({ txHash });
      } catch {
        // fallback
      }
    }
    return memoryStore.get(txHash);
  }

  public async findByMatchId(matchId: string): Promise<IChainLog | null> {
    if (isMongoConnected()) {
      try {
        return await ChainLogModel.findOne({ matchId });
      } catch {
        // fallback
      }
    }
    return memoryStore.findByMatchId(matchId);
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const chainLogRepo = new ChainLogRepository();
