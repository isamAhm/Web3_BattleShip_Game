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
const C = '0x3333333333333333333333333333333333333333';
const ships = [
  { x: 0, y: 0, length: 5, orientation: 'H' },
  { x: 0, y: 2, length: 4, orientation: 'H' },
  { x: 0, y: 4, length: 3, orientation: 'H' },
  { x: 0, y: 6, length: 3, orientation: 'H' },
  { x: 0, y: 8, length: 2, orientation: 'H' },
] as const;
const mines = [{ x: 9, y: 9 }, { x: 8, y: 8 }, { x: 7, y: 7 }];

describe('spectating', () => {
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
    for (const a of [A, B, C]) {
      tokens[a] = `t_${a}_${Math.random()}`;
      await redisService.set(`wba:session:${tokens[a]}`, JSON.stringify({ address: a, chainId: 1, issuedAt: Date.now(), expiresAt: Date.now() + 1e5 }));
    }
  });
  afterEach(async () => {
    open.forEach((s) => s.close()); open.length = 0;
    matchManager.clear(); matchmakingService.clear();
    await new Promise<void>((r) => server.close(() => r()));
  });

  const quiet = (s: ClientSocket, ev: string, ms = 400) =>
    new Promise<boolean>((res) => { const t = setTimeout(() => res(true), ms); s.once(ev, () => { clearTimeout(t); res(false); }); });

  it('spectators get a view and their own chat room; players never see it and vice versa', async () => {
    const a = await connect(A); const b = await connect(B); const c = await connect(C);
    const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
    a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
    const [m] = await Promise.all([fa, fb]);

    const view = once(c, 'spectate:view');
    c.emit('spectate:join', { matchId: m.matchId });
    const v = await view;
    expect(v.you).toBeNull();
    expect(v.ownBoard).toBeNull();
    expect(v.usernames).toHaveLength(2);

    // spectator comment: other spectators only
    const d = await connect(C); // second socket of the same address, also spectating
    d.emit('spectate:join', { matchId: m.matchId });
    await once(d, 'spectate:view');
    const seenByD = once(d, 'spectator:chat');
    const seenByA = quiet(a, 'spectator:chat');
    const seenByAasChat = quiet(a, 'chat:message');
    c.emit('spectator:chat:send', { matchId: m.matchId, text: 'nice shot' });
    expect((await seenByD).text).toBe('nice shot');
    expect(await seenByA).toBe(true);
    expect(await seenByAasChat).toBe(true);

    // player chat: players only
    const bGot = once(b, 'chat:message');
    const cGot = quiet(c, 'chat:message');
    a.emit('chat:send', { matchId: m.matchId, text: 'secret' });
    expect((await bGot).text).toBe('secret');
    expect(await cGot).toBe(true);

    // outsiders cannot post into either chat
    const e = await connect(C);
    const noSpec = quiet(c, 'spectator:chat');
    e.emit('spectator:chat:send', { matchId: m.matchId, text: 'not spectating' });
    e.emit('chat:send', { matchId: m.matchId, text: 'not a player' });
    expect(await noSpec).toBe(true);
    expect(await quiet(a, 'chat:message')).toBe(true);
  });

  it('a player cannot spectate their own match, and unknown matches report an error', async () => {
    const a = await connect(A); const b = await connect(B);
    const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
    a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
    const [m] = await Promise.all([fa, fb]);

    const err = once(a, 'error');
    a.emit('spectate:join', { matchId: m.matchId });
    expect((await err).code).toBe('SPECTATE_IS_PLAYER');

    const c = await connect(C);
    const err2 = once(c, 'error');
    c.emit('spectate:join', { matchId: 'match_does_not_exist' });
    expect((await err2).code).toBe('SPECTATE_NOT_FOUND');
  });

  it('disconnecting removes the spectator from the count', async () => {
    const a = await connect(A); const b = await connect(B); const c = await connect(C);
    const fa = once(a, 'match:found'); const fb = once(b, 'match:found');
    a.emit('queue:join'); await once(a, 'queue:status'); b.emit('queue:join');
    const [m] = await Promise.all([fa, fb]);
    c.emit('spectate:join', { matchId: m.matchId });
    await once(c, 'spectate:view');
    expect(matchManager.getSession(m.matchId)!.spectators.size).toBe(1);
    c.close();
    await new Promise((r) => setTimeout(r, 300));
    expect(matchManager.getSession(m.matchId)!.spectators.size).toBe(0);
  });
});
