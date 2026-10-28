import { LedgerModel, ILedgerEntry } from '../models/Ledger.js';
import { isMongoConnected } from '../services/mongo.js';

class InMemoryLedgerStore {
  private entries = new Map<string, ILedgerEntry>();

  public get(key: string): ILedgerEntry | null {
    return this.entries.get(key) ?? null;
  }

  public set(key: string, entry: ILedgerEntry): void {
    this.entries.set(key, entry);
  }

  public getByPlayer(address: string): ILedgerEntry[] {
    const norm = address.toLowerCase();
    return Array.from(this.entries.values()).filter((e) => e.playerAddress === norm);
  }

  public clear(): void {
    this.entries.clear();
  }
}

const memoryStore = new InMemoryLedgerStore();

export class LedgerRepository {
  public async addReward(data: {
    idempotencyKey: string;
    playerAddress: string;
    amount: number;
    type: 'match_reward' | 'win_bonus' | 'streak_bonus' | 'badge_reward' | 'tournament_reward';
    matchId?: string;
  }): Promise<ILedgerEntry | null> {
    const norm = data.playerAddress.toLowerCase();
    const entryData = {
      ...data,
      playerAddress: norm,
      status: 'completed' as const,
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await LedgerModel.create(entryData);
      } catch (err: any) {
        if (err.code === 11000) {
          // already rewarded with this idempotency key
          return null;
        }
      }
    }

    if (memoryStore.get(data.idempotencyKey)) {
      return null;
    }

    const doc = { ...entryData } as unknown as ILedgerEntry;
    memoryStore.set(data.idempotencyKey, doc);
    return doc;
  }

  public async getPlayerHistory(playerAddress: string, limit = 50): Promise<ILedgerEntry[]> {
    const norm = playerAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await LedgerModel.find({ playerAddress: norm }).sort({ createdAt: -1 }).limit(limit);
      } catch {
        // fallback
      }
    }

    const all = memoryStore.getByPlayer(norm);
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return all.slice(0, limit);
  }

  public async getPlayerBalance(playerAddress: string): Promise<number> {
    const history = await this.getPlayerHistory(playerAddress, 1000);
    return history.reduce((sum, item) => sum + item.amount, 0);
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const ledgerRepo = new LedgerRepository();
