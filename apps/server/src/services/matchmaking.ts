import crypto from 'node:crypto';
import { matchManager } from './matchManager.js';

export interface MatchFoundResult {
  matchId: string;
  roomCode: string;
  players: [string, string];
}

export interface PrivateRoom {
  code: string;
  host: string;
  guest?: string;
  matchId?: string;
  createdAt: number;
}

export class MatchmakingService {
  private queue: string[] = []; // queued player addresses
  private privateRooms = new Map<string, PrivateRoom>(); // roomCode -> room

  public joinQueue(address: string): { ok: boolean; error?: string; match?: MatchFoundResult } {
    const norm = address.toLowerCase();

    // Check if already in active match
    if (matchManager.getActiveMatchForPlayer(norm)) {
      return { ok: false, error: 'Player is already in an active match' };
    }

    // Check if already in queue
    if (this.queue.includes(norm)) {
      return { ok: false, error: 'Player is already in the matchmaking queue' };
    }

    this.queue.push(norm);

    // If 2 or more players, pair the first two
    if (this.queue.length >= 2) {
      const p1 = this.queue.shift()!;
      const p2 = this.queue.shift()!;
      const matchId = `match_${crypto.randomUUID()}`;
      const roomCode = `room_${crypto.randomBytes(4).toString('hex')}`;

      matchManager.createSession(matchId, p1, p2, roomCode);

      return {
        ok: true,
        match: {
          matchId,
          roomCode,
          players: [p1, p2],
        },
      };
    }

    return { ok: true };
  }

  public leaveQueue(address: string): void {
    const norm = address.toLowerCase();
    this.queue = this.queue.filter((a) => a !== norm);
  }

  public createPrivateRoom(
    hostAddress: string,
    customCode?: string,
  ): { ok: boolean; roomCode?: string; error?: string } {
    const norm = hostAddress.toLowerCase();
    if (matchManager.getActiveMatchForPlayer(norm)) {
      return { ok: false, error: 'Player is already in an active match' };
    }

    const code = customCode
      ? customCode.toUpperCase()
      : crypto.randomBytes(3).toString('hex').toUpperCase();
    if (this.privateRooms.has(code)) {
      return { ok: false, error: 'Room code already exists' };
    }

    this.privateRooms.set(code, {
      code,
      host: norm,
      createdAt: Date.now(),
    });

    return { ok: true, roomCode: code };
  }

  public joinPrivateRoom(
    guestAddress: string,
    roomCode: string,
  ): { ok: boolean; error?: string; match?: MatchFoundResult } {
    const norm = guestAddress.toLowerCase();
    const code = roomCode.toUpperCase();
    const room = this.privateRooms.get(code);

    if (!room) {
      return { ok: false, error: 'Room not found' };
    }

    if (room.host === norm) {
      return { ok: false, error: 'Cannot join your own room as guest' };
    }

    if (room.guest) {
      return { ok: false, error: 'Room is already full' };
    }

    if (matchManager.getActiveMatchForPlayer(norm)) {
      return { ok: false, error: 'Player is already in an active match' };
    }

    room.guest = norm;
    const matchId = `match_${crypto.randomUUID()}`;
    room.matchId = matchId;

    matchManager.createSession(matchId, room.host, room.guest, code);

    return {
      ok: true,
      match: {
        matchId,
        roomCode: code,
        players: [room.host, room.guest],
      },
    };
  }

  public getPrivateRoom(roomCode: string): PrivateRoom | null {
    return this.privateRooms.get(roomCode.toUpperCase()) ?? null;
  }

  public listPrivateRooms(): PrivateRoom[] {
    return Array.from(this.privateRooms.values()).filter((r) => !r.guest);
  }

  public removePrivateRoom(roomCode: string): void {
    this.privateRooms.delete(roomCode.toUpperCase());
  }

  public clear(): void {
    this.queue = [];
    this.privateRooms.clear();
  }
}

export const matchmakingService = new MatchmakingService();
