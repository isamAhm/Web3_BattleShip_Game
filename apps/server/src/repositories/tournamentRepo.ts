import { TournamentModel, ITournament } from '../models/Tournament.js';
import { isMongoConnected } from '../services/mongo.js';
import crypto from 'node:crypto';

class InMemoryTournamentStore {
  public tournaments: ITournament[] = [
    {
      tournamentId: 'tourn_season_1_championship',
      title: 'Season 1 Arena Championship',
      description: 'Global 10×10 qualifying bracket. Match victories award double tactical points towards the 10,000 ARENA prize pool.',
      status: 'open',
      startTime: new Date(Date.now() - 86400000 * 2),
      endTime: new Date(Date.now() + 86400000 * 5),
      standings: [
        { address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', points: 1420, wins: 14, rank: 1 },
        { address: '0x71C8363714856E3B95B8cfcA4b77f86481775e53', points: 1180, wins: 11, rank: 2 },
        { address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC', points: 940, wins: 9, rank: 3 },
      ],
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(),
    } as unknown as ITournament,
    {
      tournamentId: 'tourn_admirals_blitz',
      title: "Admiral's Blitz Invitational",
      description: 'High-speed tactical combat with 15-second turn timers. Fast-fire streaks earn bonus multipliers.',
      status: 'open',
      startTime: new Date(Date.now() - 86400000),
      endTime: new Date(Date.now() + 86400000 * 2),
      standings: [
        { address: '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65', points: 820, wins: 8, rank: 1 },
        { address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df', points: 650, wins: 6, rank: 2 },
      ],
      createdAt: new Date(Date.now() - 86400000),
      updatedAt: new Date(),
    } as unknown as ITournament,
    {
      tournamentId: 'tourn_abyss_qualifier_0',
      title: 'Abyss Sector Alpha Qualifier',
      description: 'Concluded qualifier for elite naval commanders. Top 16 advanced to the Season 1 finals bracket.',
      status: 'closed',
      startTime: new Date(Date.now() - 86400000 * 7),
      endTime: new Date(Date.now() - 86400000 * 3),
      standings: [
        { address: '0x90F8bf6A479f320ead074411a4B0e7944Ea8c9C1', points: 2100, wins: 20, rank: 1 },
      ],
      createdAt: new Date(Date.now() - 86400000 * 7),
      updatedAt: new Date(),
    } as unknown as ITournament,
  ];

  public clear(): void {
    this.tournaments = [];
  }
}

const memoryStore = new InMemoryTournamentStore();

export class TournamentRepository {
  public async create(data: {
    title: string;
    description?: string;
    startTime: Date;
    endTime: Date;
  }): Promise<ITournament> {
    const tournamentId = `tourn_${crypto.randomUUID()}`;
    const tData = {
      tournamentId,
      title: data.title,
      description: data.description ?? '',
      status: 'open' as const,
      startTime: data.startTime,
      endTime: data.endTime,
      standings: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await TournamentModel.create(tData);
      } catch {
        // fallback
      }
    }

    const doc = { ...tData, _id: tournamentId } as unknown as ITournament;
    memoryStore.tournaments.push(doc);
    return doc;
  }

  public async findById(tournamentId: string): Promise<ITournament | null> {
    if (isMongoConnected()) {
      try {
        const doc = await TournamentModel.findOne({ tournamentId });
        if (doc) return doc;
        const mem = memoryStore.tournaments.find((t) => t.tournamentId === tournamentId);
        if (mem) {
          const created = await TournamentModel.create(mem).catch(() => null);
          if (created) return created;
        }
      } catch {
        // fallback
      }
    }
    return memoryStore.tournaments.find((t) => t.tournamentId === tournamentId) ?? null;
  }

  public async listTournaments(status?: 'open' | 'closed'): Promise<ITournament[]> {
    const query = status ? { status } : {};
    if (isMongoConnected()) {
      try {
        const docs = await TournamentModel.find(query).sort({ startTime: -1 });
        if (docs && docs.length > 0) {
          return docs;
        }
        // Seed default tournaments into MongoDB if empty
        for (const t of memoryStore.tournaments) {
          await TournamentModel.create(t).catch(() => {});
        }
        const seededDocs = await TournamentModel.find(query).sort({ startTime: -1 });
        if (seededDocs && seededDocs.length > 0) {
          return seededDocs;
        }
      } catch {
        // fallback
      }
    }
    return memoryStore.tournaments
      .filter((t) => !status || t.status === status)
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime());
  }

  public async updateStandings(
    tournamentId: string,
    standings: Array<{ address: string; points: number; wins: number; rank: number }>,
  ): Promise<ITournament | null> {
    if (isMongoConnected()) {
      try {
        return await TournamentModel.findOneAndUpdate(
          { tournamentId },
          { $set: { standings, updatedAt: new Date() } },
          { new: true },
        );
      } catch {
        // fallback
      }
    }

    const t = await this.findById(tournamentId);
    if (!t) return null;
    t.standings = standings;
    t.updatedAt = new Date();
    return t;
  }

  public async closeTournament(tournamentId: string): Promise<ITournament | null> {
    if (isMongoConnected()) {
      try {
        return await TournamentModel.findOneAndUpdate(
          { tournamentId },
          { $set: { status: 'closed', updatedAt: new Date() } },
          { new: true },
        );
      } catch {
        // fallback
      }
    }

    const t = await this.findById(tournamentId);
    if (!t) return null;
    t.status = 'closed';
    t.updatedAt = new Date();
    return t;
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const tournamentRepo = new TournamentRepository();
