import { PlayerModel, IPlayer } from '../models/Player.js';
import { isMongoConnected } from '../services/mongo.js';

class InMemoryPlayerStore {
  private players = new Map<string, IPlayer>();

  public get(address: string): IPlayer | null {
    return this.players.get(address.toLowerCase()) ?? null;
  }

  public set(address: string, player: IPlayer): void {
    this.players.set(address.toLowerCase(), player);
  }

  public list(): IPlayer[] {
    return Array.from(this.players.values());
  }

  public clear(): void {
    this.players.clear();
  }
}

const memoryStore = new InMemoryPlayerStore();

export class PlayerRepository {
  public async findByAddress(address: string): Promise<IPlayer | null> {
    const normalized = address.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await PlayerModel.findOne({ address: normalized });
      } catch {
        // fallback to memory
      }
    }
    return memoryStore.get(normalized);
  }

  public async getOrCreate(address: string): Promise<IPlayer> {
    const normalized = address.toLowerCase();
    const existing = await this.findByAddress(normalized);
    if (existing) return existing;

    const defaultUsername = `Player_${normalized.slice(2, 8)}`;
    const newPlayerData = {
      address: normalized,
      username: defaultUsername,
      nicknameSet: false,
      avatar: '',
      stats: {
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        totalPoints: 0,
        bestStreak: 0,
        fastestWinShots: null,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await PlayerModel.create(newPlayerData);
      } catch {
        // fallback
      }
    }

    const mockDoc = { ...newPlayerData } as unknown as IPlayer;
    memoryStore.set(normalized, mockDoc);
    return mockDoc;
  }

  /** Case-insensitive check; the player's own current name does not count as taken. */
  public async isUsernameTaken(username: string, exceptAddress: string): Promise<boolean> {
    const except = exceptAddress.toLowerCase();
    const wanted = username.toLowerCase();
    if (isMongoConnected()) {
      try {
        const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const hit = await PlayerModel.findOne({
          username: new RegExp(`^${escaped}$`, 'i'),
          address: { $ne: except },
        });
        return !!hit;
      } catch {
        // fallback to memory
      }
    }
    return memoryStore.list().some((p) => p.username.toLowerCase() === wanted && p.address !== except);
  }

  /** Records a player-chosen nickname. */
  public async setNickname(address: string, username: string): Promise<IPlayer | null> {
    const normalized = address.toLowerCase();
    await this.getOrCreate(normalized);
    if (isMongoConnected()) {
      try {
        return await PlayerModel.findOneAndUpdate(
          { address: normalized },
          { $set: { username, nicknameSet: true } },
          { new: true },
        );
      } catch {
        // fallback
      }
    }
    const p = memoryStore.get(normalized)!;
    p.username = username;
    p.nicknameSet = true;
    p.updatedAt = new Date();
    return p;
  }

  public async updateProfile(
    address: string,
    data: { username?: string; avatar?: string },
  ): Promise<IPlayer | null> {
    const normalized = address.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await PlayerModel.findOneAndUpdate(
          { address: normalized },
          { $set: data },
          { new: true },
        );
      } catch {
        // fallback
      }
    }

    let p = memoryStore.get(normalized);
    if (!p) {
      p = await this.getOrCreate(normalized);
    }
    if (data.username !== undefined) p.username = data.username;
    if (data.avatar !== undefined) p.avatar = data.avatar;
    p.updatedAt = new Date();
    return p;
  }

  public async updateStats(
    address: string,
    update: {
      isWin: boolean;
      points: number;
      streak: number;
      shotsUsed?: number;
    },
  ): Promise<IPlayer | null> {
    const normalized = address.toLowerCase();

    if (isMongoConnected()) {
      try {
        const player = await PlayerModel.findOne({ address: normalized });
        if (!player) return null;

        player.stats.matchesPlayed += 1;
        if (update.isWin) {
          player.stats.wins += 1;
        } else {
          player.stats.losses += 1;
        }
        player.stats.totalPoints += Math.max(0, update.points);
        if (update.streak > player.stats.bestStreak) {
          player.stats.bestStreak = update.streak;
        }
        if (update.isWin && update.shotsUsed) {
          if (
            player.stats.fastestWinShots === null ||
            update.shotsUsed < player.stats.fastestWinShots
          ) {
            player.stats.fastestWinShots = update.shotsUsed;
          }
        }
        return await player.save();
      } catch {
        // fallback
      }
    }

    let p = memoryStore.get(normalized);
    if (!p) {
      p = await this.getOrCreate(normalized);
    }
    p.stats.matchesPlayed += 1;
    if (update.isWin) {
      p.stats.wins += 1;
    } else {
      p.stats.losses += 1;
    }
    p.stats.totalPoints += Math.max(0, update.points);
    if (update.streak > p.stats.bestStreak) {
      p.stats.bestStreak = update.streak;
    }
    if (update.isWin && update.shotsUsed) {
      if (p.stats.fastestWinShots === null || update.shotsUsed < p.stats.fastestWinShots) {
        p.stats.fastestWinShots = update.shotsUsed;
      }
    }
    p.updatedAt = new Date();
    return p;
  }

  public async listAll(): Promise<IPlayer[]> {
    if (isMongoConnected()) {
      try {
        return await PlayerModel.find({});
      } catch {
        // fallback
      }
    }
    return memoryStore.list();
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const playerRepo = new PlayerRepository();
