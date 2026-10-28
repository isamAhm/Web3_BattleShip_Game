import { MatchModel, IMatch } from '../models/Match.js';
import { isMongoConnected } from '../services/mongo.js';

class InMemoryMatchStore {
  public matches = new Map<string, IMatch>();

  constructor() {
    this.seedDefaultMatches();
  }

  private seedDefaultMatches(): void {
    const m1Id = 'match_historic_alpha_01';
    const m2Id = 'match_historic_beta_02';

    const p1 = '0x90f8bf6a479f320ead074411a4b0e7944ea8c9c1';
    const p2 = '0x15d34aaf54267db7d7c367839aaf71a00a2c6a65';
    const p3 = '0x71c8363714856e3b95b8cfca4b77f86481775e53';
    const p4 = '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc';

    const sampleShots = [
      { shooter: p1, target: p2, coordinate: { x: 2, y: 1 }, outcome: 'hit', pointsAwarded: 15, shooterStreak: 1, shooterScore: 15, timestamp: Date.now() - 3600000 },
      { shooter: p2, target: p1, coordinate: { x: 5, y: 5 }, outcome: 'miss', pointsAwarded: 0, shooterStreak: 0, shooterScore: 0, timestamp: Date.now() - 3550000 },
      { shooter: p1, target: p2, coordinate: { x: 2, y: 2 }, outcome: 'hit', pointsAwarded: 25, shooterStreak: 2, shooterScore: 40, timestamp: Date.now() - 3500000 },
      { shooter: p2, target: p1, coordinate: { x: 1, y: 3 }, outcome: 'hit', pointsAwarded: 15, shooterStreak: 1, shooterScore: 15, timestamp: Date.now() - 3450000 },
      { shooter: p1, target: p2, coordinate: { x: 2, y: 3 }, outcome: 'sunk', pointsAwarded: 50, shooterStreak: 3, shooterScore: 90, timestamp: Date.now() - 3400000 },
    ];

    this.matches.set(m1Id, {
      matchId: m1Id,
      players: [p1, p2],
      status: 'ended',
      commitments: new Map([[p1, '0xcommit1...'], [p2, '0xcommit2...']]),
      shots: sampleShots,
      reveals: new Map(),
      scores: new Map([[p1, 340], [p2, 180]]),
      winner: p1,
      forfeit: false,
      verification: { status: 'verified' },
      resultHash: '0xa549f4882142d765955639b7d8b598b04a919349c2518e38d72856f6424e101f',
      chainStatus: 'recorded',
      chainMode: 'testnet',
      chainTxHash: '0x7d2f928e44a569c73ef890a82410bc39871587421946059e847c2105a300d81b',
      startedAt: new Date(Date.now() - 86400000),
      endedAt: new Date(Date.now() - 86400000 + 420000),
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(Date.now() - 86400000 + 420000),
    } as unknown as IMatch);

    this.matches.set(m2Id, {
      matchId: m2Id,
      players: [p3, p4],
      status: 'ended',
      commitments: new Map([[p3, '0xcommit3...'], [p4, '0xcommit4...']]),
      shots: sampleShots,
      reveals: new Map(),
      scores: new Map([[p3, 290], [p4, 140]]),
      winner: p3,
      forfeit: false,
      verification: { status: 'verified' },
      resultHash: '0xd82a1762bca8194017649581bc67829402846101938461028374950184719284',
      chainStatus: 'recorded',
      chainMode: 'testnet',
      chainTxHash: '0x9183bc6723ef5102a901842bc1947e83461049581a938c647b01938561849201',
      startedAt: new Date(Date.now() - 172800000),
      endedAt: new Date(Date.now() - 172800000 + 380000),
      createdAt: new Date(Date.now() - 172800000),
      updatedAt: new Date(Date.now() - 172800000 + 380000),
    } as unknown as IMatch);
  }

  public get(matchId: string): IMatch | null {
    return this.matches.get(matchId) ?? null;
  }

  public set(matchId: string, match: IMatch): void {
    this.matches.set(matchId, match);
  }

  public listAll(limit = 20, offset = 0): IMatch[] {
    const all = Array.from(this.matches.values());
    all.sort((a, b) => new Date(b.startedAt || 0).getTime() - new Date(a.startedAt || 0).getTime());
    return all.slice(offset, offset + limit);
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

  public async listAll(limit = 20, offset = 0): Promise<IMatch[]> {
    if (isMongoConnected()) {
      try {
        return await MatchModel.find({})
          .sort({ startedAt: -1 })
          .skip(offset)
          .limit(limit);
      } catch {
        // fallback
      }
    }
    return memoryStore.listAll(limit, offset);
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const matchRepo = new MatchRepository();
