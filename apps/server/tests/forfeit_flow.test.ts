import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { setupSocketServer } from '../src/sockets/index.js';
import { redisService } from '../src/services/redis.js';
import { matchManager } from '../src/services/matchManager.js';
import { matchmakingService } from '../src/services/matchmaking.js';
import { commitPlacement, generateSalt } from '@wba/engine';

const A = '0x1111111111111111111111111111111111111111';
const B = '0x2222222222222222222222222222222222222222';
const ships = [
  { x: 0, y: 0, length: 5, orientation: 'H' },
  { x: 0, y: 2, length: 4, orientation: 'H' },
  { x: 0, y: 4, length: 3, orientation: 'H' },
  { x: 0, y: 6, length: 3, orientation: 'H' },
  { x: 0, y: 8, length: 2, orientation: 'H' },
] as const;
const mines = [{ x: 9, y: 9 }, { x: 8, y: 8 }, { x: 7, y: 7 }];

describe('forfeit flow', () => {
  let server: http.Server;
  let port: number;
  const open: ClientSocket[] = [];
  const tokens: Record<string, string> = {};
  const connect = async (address: string) => {
    const s = Client(`http://localhost:${port}`, { transports: ['websocket'], auth: { token: tokens[address] }, reconnection: false });
    open.push(s);
    await new Promise<void>((r) => s.on('connect', () => r()));
    return s;
  };
  const once = <T = any>(s: ClientSocket, ev: string, ms = 2000) =>
    new Promise<T>((res, rej) => {
      const t = setTimeout(() => rej(new Error('timeout ' + ev)), ms);
      s.once(ev, (d: T) => { clearTimeout(t); res(d); });
    });

  beforeEach(async () => {
    await redisService.flush();
    matchmakingService.clear();
    matchManager.clear();
    server = http.createServer(createApp());
    setupSocketServer(server);
    await new Promise<void>((r) => server.listen(0, () => { port = (server.address() as any).port; r(); }));
    for (const a of [A, B]) {
      tokens[a] = `t_${a}_${Math.random()}`;
      await redisService.set(`wba:session:${tokens[a]}`, JSON.stringify({ address: a, chainId: 1, issuedAt: Date.now(), expiresAt: Date.now() + 1e5 }));
    }
  });
  afterEach(async () => {
    open.forEach((s) => s.close()); open.length = 0;
    matchManager.clear(); matchmakingService.clear();
    await new Promise<void>((r) => server.close(() => r()));
  });

  for (const placed of [false, true]) {
    it(`winner gets match:end and both can re-queue (fleets placed: ${placed})`, async () => {
      const a = await connect(A); const b = await connect(B);
      const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
      a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
      const [m] = await Promise.all([fa, fb]);
      if (placed) {
        for (const s of [a, b]) {
          const salt = generateSalt();
          s.emit('placement:submit', { matchId: m.matchId, commitment: commitPlacement({ ships: ships as any, mines }, salt), ships, mines });
        }
        await once(a, 'match:start');
      }
      const endB = once(b, 'match:end');
      const endA = once(a, 'match:end');
      const ack = await new Promise<any>((r) => a.emit('match:forfeit', { matchId: m.matchId }, r));
      expect(ack.ok).toBe(true);
      const [ea, eb] = await Promise.all([endA, endB]);
      expect(eb.winner).toBe(B);
      expect(eb.forfeitedBy).toBe(A);
      expect(ea.forfeit).toBe(true);

      await new Promise((r) => setTimeout(r, 200));
      expect(matchManager.getActiveMatchForPlayer(A)).toBeNull();
      expect(matchManager.getActiveMatchForPlayer(B)).toBeNull();

      const f2a = once(a, 'match:found'); const f2b = once(b, 'match:found');
      a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
      await Promise.all([f2a, f2b]);
    });
  }

  it('refuses a queue join during an unfinished match and names that match', async () => {
    const a = await connect(A); const b = await connect(B);
    const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
    a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
    const [m] = await Promise.all([fa, fb]);

    const err = once(a, 'error');
    a.emit('queue:join');
    const e = await err;
    expect(e.code).toBe('ACTIVE_MATCH');
    expect(e.matchId).toBe(m.matchId);

    // Forfeiting the old match frees the player immediately, and the opponent is told
    const endB = once(b, 'match:end');
    const ack = await new Promise<any>((r) => a.emit('match:forfeit', { matchId: m.matchId }, r));
    expect(ack.ok).toBe(true);
    expect((await endB).forfeitedBy).toBe(A);
    const f2 = once(a, 'queue:status');
    a.emit('queue:join');
    expect((await f2).inQueue).toBe(true);
  });

  it('answers a forfeit for an already finished match without re-broadcasting', async () => {
    const a = await connect(A); const b = await connect(B);
    const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
    a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
    const [m] = await Promise.all([fa, fb]);
    await new Promise<any>((r) => a.emit('match:forfeit', { matchId: m.matchId }, r));

    await new Promise((r) => setTimeout(r, 200)); // let the first forfeit's broadcasts land
    let notices = 0;
    b.on('match:forfeit-notification', () => notices++);
    const ack = await new Promise<any>((r) => b.emit('match:forfeit', { matchId: m.matchId }, r));
    expect(ack).toMatchObject({ ok: true, alreadyFinished: true });
    await new Promise((r) => setTimeout(r, 150));
    expect(notices).toBe(0);
  });

  it('does not let a non-participant forfeit someone else\'s match', async () => {
    const a = await connect(A); const b = await connect(B);
    const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
    a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
    const [m] = await Promise.all([fa, fb]);

    const C = '0x3333333333333333333333333333333333333333';
    tokens[C] = `t_${C}`;
    await redisService.set(`wba:session:${tokens[C]}`, JSON.stringify({ address: C, chainId: 1, issuedAt: Date.now(), expiresAt: Date.now() + 1e5 }));
    const c = await connect(C);
    const ack = await new Promise<any>((r) => c.emit('match:forfeit', { matchId: m.matchId }, r));
    expect(ack.ok).toBe(false);
    expect(matchManager.getActiveMatchForPlayer(A)).not.toBeNull();
  });
});
