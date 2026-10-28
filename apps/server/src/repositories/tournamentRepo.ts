import { TournamentModel, ITournament } from '../models/Tournament.js';
import { isMongoConnected } from '../services/mongo.js';
import crypto from 'node:crypto';

class InMemoryTournamentStore {
  public tournaments: ITournament[] = [];

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
        return await TournamentModel.findOne({ tournamentId });
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
        return await TournamentModel.find(query).sort({ startTime: -1 });
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
