import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import type { Server as SocketIOServer } from 'socket.io';
import { createApp } from '../src/app.js';
import { setupSocketServer } from '../src/sockets/index.js';
import { redisService } from '../src/services/redis.js';
import { matchManager } from '../src/services/matchManager.js';
import { matchmakingService } from '../src/services/matchmaking.js';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';

describe('Quick match / room pairing', () => {
  let server: http.Server;
  let io: SocketIOServer;
  let port: number;
  const open: ClientSocket[] = [];
  const tokens: Record<string, string> = {};

  const connect = async (address: string): Promise<ClientSocket> => {
    const s = Client(`http://localhost:${port}`, {
      transports: ['websocket'],
      auth: { token: tokens[address] },
      reconnection: false,
    });
    open.push(s);
    await new Promise<void>((resolve) => s.on('connect', () => resolve()));
    return s;
  };

  const once = <T = any>(s: ClientSocket, event: string, ms = 2000) =>
    new Promise<T>((resolve, reject) => {
      const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
      s.once(event, (d: T) => {
        clearTimeout(t);
        resolve(d);
      });
    });

  const tick = (ms = 100) => new Promise((r) => setTimeout(r, ms));

  beforeEach(async () => {
    await redisService.flush();
    matchmakingService.clear();
    matchManager.clear();
    server = http.createServer(createApp());
    io = setupSocketServer(server);
    await new Promise<void>((resolve) =>
      server.listen(0, () => {
        port = (server.address() as any).port;
        resolve();
      }),
    );
    for (const address of [A, B]) {
      tokens[address] = `tok_${address}_${Math.random()}`;
      await redisService.set(
        `wba:session:${tokens[address]}`,
        JSON.stringify({
          address,
          chainId: 11155111,
          issuedAt: Date.now(),
          expiresAt: Date.now() + 100000,
        }),
      );
    }
  });

  afterEach(async () => {
    open.forEach((s) => s.close());
    open.length = 0;
    matchManager.clear();
    matchmakingService.clear();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('notifies BOTH players when the second one joins the queue', async () => {
    const a = await connect(A);
    const b = await connect(B);
    const foundA = once(a, 'match:found');
    const foundB = once(b, 'match:found');
    a.emit('queue:join');
    await once(a, 'queue:status');
    b.emit('queue:join');

    const [ma, mb] = await Promise.all([foundA, foundB]);
    expect(ma.matchId).toBe(mb.matchId);
    expect(ma.roomCode).toBe(mb.roomCode);
  });

  it('still pairs a player whose old socket disconnects AFTER the new one connected', async () => {
    const oldA = await connect(A);
    oldA.emit('queue:join');
    await once(oldA, 'queue:status');

    // Page reload / token swap: the new socket is up before the old disconnect is processed.
    const newA = await connect(A);
    oldA.close();
    await tick();
    expect(matchmakingService['queue']).toContain(A); // queue entry survived

    const b = await connect(B);
    const foundA = once(newA, 'match:found');
    const foundB = once(b, 'match:found');
    b.emit('queue:join');
    const [ma, mb] = await Promise.all([foundA, foundB]);
    expect(ma.matchId).toBe(mb.matchId);
  });

  it('notifies every open tab of a player', async () => {
    const tab1 = await connect(A);
    const tab2 = await connect(A);
    const b = await connect(B);
    const f1 = once(tab1, 'match:found');
    const f2 = once(tab2, 'match:found');
    tab1.emit('queue:join');
    await once(tab1, 'queue:status');
    b.emit('queue:join');
    const [m1, m2] = await Promise.all([f1, f2]);
    expect(m1.matchId).toBe(m2.matchId);
  });

  it('removes the queue entry only when the last socket of a player is gone', async () => {
    const a = await connect(A);
    a.emit('queue:join');
    await once(a, 'queue:status');
    a.close();
    await tick();
    expect(matchmakingService['queue']).not.toContain(A);
  });

  it('puts a guest who typed the room code in lowercase into the match room', async () => {
    const host = await connect(A);
    const guest = await connect(B);
    host.emit('room:create', { customCode: 'abcd12' }, () => {});
    const created = await once(host, 'room:created');
    expect(created.roomCode).toBe('ABCD12');

    const foundHost = once(host, 'match:found');
    const foundGuest = once(guest, 'match:found');
    const ack = await new Promise<any>((resolve) =>
      guest.emit('room:join', { roomCode: 'abcd12' }, resolve),
    );
    expect(ack.ok).toBe(true);
    const [mh, mg] = await Promise.all([foundHost, foundGuest]);
    expect(mg.roomCode).toBe('ABCD12');
    expect(mh.matchId).toBe(mg.matchId);
    expect(io.sockets.adapter.rooms.get('ABCD12')?.size).toBe(2);
  });
});
