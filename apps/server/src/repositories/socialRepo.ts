import { FriendModel, IFriend } from '../models/Friend.js';
import { InviteModel, IInvite } from '../models/Invite.js';
import { NotificationModel, INotification } from '../models/Notification.js';
import { isMongoConnected } from '../services/mongo.js';
import crypto from 'node:crypto';

class InMemorySocialStore {
  public friends: IFriend[] = [];
  public invites: IInvite[] = [];
  public notifications: INotification[] = [];

  public clear(): void {
    this.friends = [];
    this.invites = [];
    this.notifications = [];
  }
}

const memoryStore = new InMemorySocialStore();

export class SocialRepository {
  // --- Friends ---

  public async getFriends(userAddress: string): Promise<IFriend[]> {
    const norm = userAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await FriendModel.find({
          $or: [{ userAddress: norm }, { friendAddress: norm }],
          status: 'accepted',
        });
      } catch {
        // fallback
      }
    }

    return memoryStore.friends.filter(
      (f) => (f.userAddress === norm || f.friendAddress === norm) && f.status === 'accepted',
    );
  }

  public async getPendingRequests(userAddress: string): Promise<IFriend[]> {
    const norm = userAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await FriendModel.find({
          friendAddress: norm,
          status: 'pending',
        });
      } catch {
        // fallback
      }
    }

    return memoryStore.friends.filter((f) => f.friendAddress === norm && f.status === 'pending');
  }

  public async createFriendRequest(
    userAddress: string,
    friendAddress: string,
  ): Promise<IFriend | null> {
    const u = userAddress.toLowerCase();
    const f = friendAddress.toLowerCase();
    if (u === f) return null;

    const data = {
      userAddress: u,
      friendAddress: f,
      status: 'pending' as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await FriendModel.create(data);
      } catch {
        return null;
      }
    }

    const exists = memoryStore.friends.some(
      (rel) =>
        (rel.userAddress === u && rel.friendAddress === f) ||
        (rel.userAddress === f && rel.friendAddress === u),
    );
    if (exists) return null;

    const doc = { ...data, _id: crypto.randomUUID() } as unknown as IFriend;
    memoryStore.friends.push(doc);
    return doc;
  }

  public async updateFriendStatus(
    id: string,
    targetUser: string,
    status: 'accepted' | 'rejected',
  ): Promise<IFriend | null> {
    const norm = targetUser.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await FriendModel.findOneAndUpdate(
          { _id: id, friendAddress: norm },
          { $set: { status } },
          { new: true },
        );
      } catch {
        // fallback
      }
    }

    const match = memoryStore.friends.find(
      (f) => (f as any)._id === id && f.friendAddress === norm,
    );
    if (!match) return null;
    match.status = status;
    match.updatedAt = new Date();
    return match;
  }

  public async removeFriend(userAddress: string, friendAddress: string): Promise<boolean> {
    const u = userAddress.toLowerCase();
    const f = friendAddress.toLowerCase();

    if (isMongoConnected()) {
      try {
        const res = await FriendModel.deleteOne({
          $or: [
            { userAddress: u, friendAddress: f },
            { userAddress: f, friendAddress: u },
          ],
        });
        return res.deletedCount > 0;
      } catch {
        // fallback
      }
    }

    const idx = memoryStore.friends.findIndex(
      (rel) =>
        (rel.userAddress === u && rel.friendAddress === f) ||
        (rel.userAddress === f && rel.friendAddress === u),
    );
    if (idx >= 0) {
      memoryStore.friends.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- Invites ---

  public async createInvite(from: string, to: string, roomCode: string): Promise<IInvite> {
    const inviteId = `inv_${crypto.randomUUID()}`;
    const data = {
      inviteId,
      fromAddress: from.toLowerCase(),
      toAddress: to.toLowerCase(),
      roomCode,
      status: 'pending' as const,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await InviteModel.create(data);
      } catch {
        // fallback
      }
    }

    const doc = { ...data, _id: inviteId } as unknown as IInvite;
    memoryStore.invites.push(doc);
    return doc;
  }

  public async getPendingInvites(toAddress: string): Promise<IInvite[]> {
    const norm = toAddress.toLowerCase();
    const now = new Date();
    if (isMongoConnected()) {
      try {
        return await InviteModel.find({
          toAddress: norm,
          status: 'pending',
          expiresAt: { $gt: now },
        }).sort({ createdAt: -1 });
      } catch {
        // fallback
      }
    }

    return memoryStore.invites.filter(
      (inv) => inv.toAddress === norm && inv.status === 'pending' && inv.expiresAt > now,
    );
  }

  public async updateInviteStatus(
    inviteId: string,
    userAddress: string,
    status: 'accepted' | 'declined',
  ): Promise<IInvite | null> {
    const norm = userAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await InviteModel.findOneAndUpdate(
          { inviteId, toAddress: norm },
          { $set: { status } },
          { new: true },
        );
      } catch {
        // fallback
      }
    }

    const inv = memoryStore.invites.find((i) => i.inviteId === inviteId && i.toAddress === norm);
    if (!inv) return null;
    inv.status = status;
    return inv;
  }

  // --- Notifications ---

  public async createNotification(
    userAddress: string,
    type: string,
    title: string,
    message: string,
    data?: any,
  ): Promise<INotification> {
    const id = `notif_${crypto.randomUUID()}`;
    const notifData = {
      id,
      userAddress: userAddress.toLowerCase(),
      type,
      title,
      message,
      read: false,
      data,
      createdAt: new Date(),
    };

    if (isMongoConnected()) {
      try {
        return await NotificationModel.create(notifData);
      } catch {
        // fallback
      }
    }

    const doc = { ...notifData, _id: id } as unknown as INotification;
    memoryStore.notifications.push(doc);
    return doc;
  }

  public async getNotifications(userAddress: string, limit = 50): Promise<INotification[]> {
    const norm = userAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await NotificationModel.find({ userAddress: norm })
          .sort({ createdAt: -1 })
          .limit(limit);
      } catch {
        // fallback
      }
    }

    const list = memoryStore.notifications.filter((n) => n.userAddress === norm);
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(0, limit);
  }

  public async markNotificationRead(
    id: string,
    userAddress: string,
    read = true,
  ): Promise<INotification | null> {
    const norm = userAddress.toLowerCase();
    if (isMongoConnected()) {
      try {
        return await NotificationModel.findOneAndUpdate(
          { id, userAddress: norm },
          { $set: { read } },
          { new: true },
        );
      } catch {
        // fallback
      }
    }

    const n = memoryStore.notifications.find((item) => item.id === id && item.userAddress === norm);
    if (!n) return null;
    n.read = read;
    return n;
  }

  public resetMemoryStore(): void {
    memoryStore.clear();
  }
}

export const socialRepo = new SocialRepository();
