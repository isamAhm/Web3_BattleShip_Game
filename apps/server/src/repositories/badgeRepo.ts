import { BadgeModel, IBadge } from '../models/Badge.js';
import { isMongoConnected } from '../services/mongo.js';

class InMemoryBadgeStore {
  private badges: IBadge[] = [];

  public hasBadge(playerAddress: string, badgeId: string): boolean {
    const norm = playerAddress.toLowerCase();
    return this.badges.some((b) => b.playerAddress === norm && b.badgeId === badgeId);
  }

  public add(badge: IBadge): void {
    this.badges.push(badge);
  }

  public getByPlayer(playerAddress: string): IBadge[] {
    const norm = playerAddress.toLowerCase();
    return this.badges.filter((b) => b.playerAddress === norm);
  }

  public clear(): void {
    this.badges = [];
  }
}

const memoryStore = new InMemoryBadgeStore();

export class BadgeRepository {
  public async hasBadge(playerAddress: string, badgeId: string): Promise<boolean> {
    const norm = playerAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        const count = await BadgeModel.countDocuments({
          playerAddress: norm,
          badgeId,
        });
        return count > 0;
      } catch {
        // fallback
      }
    }
    return memoryStore.hasBadge(norm, badgeId);
  }

  public async awardBadge(
    playerAddress: string,
    badgeId: string,
    tokenId: number,
    matchId: string,
  ): Promise<IBadge | null> {
    const norm = playerAddress.toLowerCase();
    const alreadyHas = await this.hasBadge(norm, badgeId);
    if (alreadyHas) return null;

    const data = {
      playerAddress: norm,
      badgeId,
      tokenId,
      matchId,
      awardedAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await BadgeModel.create(data);
      } catch (err: any) {
        // Handle duplicate key error gracefully
        if (err.code === 11000) return null;
      }
    }

    const doc = { ...data } as unknown as IBadge;
    memoryStore.add(doc);
    return doc;
  }

  public async getBadgesForPlayer(playerAddress: string): Promise<IBadge[]> {
    const norm = playerAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await BadgeModel.find({ playerAddress: norm }).sort({ awardedAt: -1 });
      } catch {
        // fallback
      }
    }
    return memoryStore.getByPlayer(norm);
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const badgeRepo = new BadgeRepository();
