import { MatchModel, IMatch } from '../models/Match.js';
import { isMongoConnected } from '../services/mongo.js';

class InMemoryMatchStore {
  private matches = new Map<string, IMatch>();

  public get(matchId: string): IMatch | null {
    return this.matches.get(matchId) ?? null;
  }

  public set(matchId: string, match: IMatch): void {
    this.matches.set(matchId, match);
  }

  public findByPlayer(address: string): IMatch[] {
    const norm = address.toLowerCase();
    return Array.from(this.matches.values()).filter((m) =>
      m.players.map((p) => p.toLowerCase()).includes(norm),
    );
  }

  public clear(): void {
    this.matches.clear();
  }
}

const memoryStore = new InMemoryMatchStore();

export class MatchRepository {
  public async findById(matchId: string): Promise<IMatch | null> {
    if (isMongoConnected()) {
      try {
        return await MatchModel.findOne({ matchId });
      } catch {
        // fallback
      }
    }
    return memoryStore.get(matchId);
  }

  public async create(
    data: Partial<IMatch> & { matchId: string; players: [string, string] },
  ): Promise<IMatch> {
    const matchData = {
      matchId: data.matchId,
      players: [data.players[0].toLowerCase(), data.players[1].toLowerCase()] as [string, string],
      status: data.status ?? 'placement',
      commitments: data.commitments ?? new Map(),
      shots: data.shots ?? [],
      reveals: data.reveals ?? new Map(),
      scores: data.scores ?? new Map(),
      winner: data.winner ?? null,
      forfeit: data.forfeit ?? false,
      verification: data.verification ?? { status: 'incomplete' },
      canonicalRecord: data.canonicalRecord,
      resultHash: data.resultHash,
      chainStatus: data.chainStatus ?? 'pending',
      chainMode: data.chainMode ?? 'simulated',
      chainTxHash: data.chainTxHash ?? null,
      startedAt: data.startedAt ?? new Date(),
      endedAt: data.endedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await MatchModel.create(matchData);
      } catch {
        // fallback
      }
    }

    const doc = { ...matchData } as unknown as IMatch;
    memoryStore.set(data.matchId, doc);
    return doc;
  }

  public async update(matchId: string, updates: Partial<IMatch>): Promise<IMatch | null> {
    if (isMongoConnected()) {
      try {
        return await MatchModel.findOneAndUpdate({ matchId }, { $set: updates }, { new: true });
      } catch {
        // fallback
      }
    }

    const m = memoryStore.get(matchId);
    if (!m) return null;
    Object.assign(m, updates, { updatedAt: new Date() });
    return m;
  }

  public async findByPlayer(address: string, limit = 20, offset = 0): Promise<IMatch[]> {
    const normalized = address.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await MatchModel.find({ players: normalized })
          .sort({ startedAt: -1 })
          .skip(offset)
          .limit(limit);
      } catch {
        // fallback
      }
    }

    const all = memoryStore.findByPlayer(normalized);
    all.sort((a, b) => (b.startedAt?.getTime?.() ?? 0) - (a.startedAt?.getTime?.() ?? 0));
    return all.slice(offset, offset + limit);
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const matchRepo = new MatchRepository();
