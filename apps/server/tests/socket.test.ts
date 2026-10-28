import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import http from 'node:http';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { createApp } from '../src/app.js';
import { setupSocketServer } from '../src/sockets/index.js';
import { redisService } from '../src/services/redis.js';
import { commitPlacement, generateSalt, type Ship, type Coord } from '@wba/engine';
import { matchManager } from '../src/services/matchManager.js';
import { matchmakingService } from '../src/services/matchmaking.js';

describe('Real-Time Multiplayer Socket.IO Server', () => {
  let server: http.Server;
  let serverPort: number;
  const p1Address = '0x1111111111111111111111111111111111111111';
  const p2Address = '0x2222222222222222222222222222222222222222';
  let token1: string;
  let token2: string;
  const socketsToClose: ClientSocket[] = [];

  beforeEach(async () => {
    await redisService.flush();
    matchmakingService.clear();
    matchManager.clear();

    const app = createApp();
    server = http.createServer(app);
    setupSocketServer(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address() as any;
        serverPort = addr.port;
        resolve();
      });
    });

    token1 = 'token_p1_' + Math.random();
    token2 = 'token_p2_' + Math.random();

    await redisService.set(
      `wba:session:${token1}`,
      JSON.stringify({
        address: p1Address,
        chainId: 11155111,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 100000,
      }),
    );

    await redisService.set(
      `wba:session:${token2}`,
      JSON.stringify({
        address: p2Address,
        chainId: 11155111,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 100000,
      }),
    );
  });

  afterEach(async () => {
    socketsToClose.forEach((s) => s.close());
    socketsToClose.length = 0;
    matchManager.clear();
    matchmakingService.clear();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('rejects unauthenticated socket connections', async () => {
    const socket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      autoConnect: false,
    });
    socketsToClose.push(socket);

    const err = await new Promise((resolve) => {
      socket.on('connect_error', (e) => resolve(e));
      socket.connect();
    });

    expect(err).toBeDefined();
    expect((err as Error).message).toContain('Unauthorized');
  });

  it('connects authenticated players and pairs them in matchmaking queue', async () => {
    const s1 = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: token1 },
    });
    const s2 = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: token2 },
    });
    socketsToClose.push(s1, s2);

    await Promise.all([
      new Promise<void>((resolve) => s1.on('connect', () => resolve())),
      new Promise<void>((resolve) => s2.on('connect', () => resolve())),
    ]);

    // Listen for match:found
    const p1MatchPromise = new Promise<any>((resolve) => s1.on('match:found', resolve));
    const p2MatchPromise = new Promise<any>((resolve) => s2.on('match:found', resolve));

    s1.emit('queue:join', {});
    s2.emit('queue:join', {});

    const [m1, m2] = await Promise.all([p1MatchPromise, p2MatchPromise]);

    expect(m1.matchId).toBeDefined();
    expect(m1.matchId).toBe(m2.matchId);
    expect(m1.roomCode).toBe(m2.roomCode);

    // Fleet Placement
    const ships: Ship[] = [
      { x: 0, y: 0, length: 5, orientation: 'H' },
      { x: 0, y: 2, length: 4, orientation: 'H' },
      { x: 0, y: 4, length: 3, orientation: 'H' },
      { x: 0, y: 6, length: 3, orientation: 'H' },
      { x: 0, y: 8, length: 2, orientation: 'H' },
    ];
    const mines: Coord[] = [
      { x: 9, y: 0 },
      { x: 9, y: 1 },
      { x: 9, y: 2 },
    ];

    const salt1 = generateSalt();
    const commit1 = commitPlacement({ ships, mines }, salt1);

    const salt2 = generateSalt();
    const commit2 = commitPlacement({ ships, mines }, salt2);

    const startPromise = new Promise<any>((resolve) => s1.on('match:start', resolve));

    s1.emit('placement:submit', {
      matchId: m1.matchId,
      commitment: commit1,
      ships,
      mines,
    });

    s2.emit('placement:submit', {
      matchId: m2.matchId,
      commitment: commit2,
      ships,
      mines,
    });

    const startData = await startPromise;
    expect(startData.matchId).toBe(m1.matchId);
    expect(startData.currentTurn).toBeDefined();

    // Turn 0 fires shot
    const shooter = startData.currentTurn.toLowerCase() === p1Address ? s1 : s2;
    const shotResultPromise = new Promise<any>((resolve) => shooter.on('shot:result', resolve));

    shooter.emit('shot:fire', {
      matchId: m1.matchId,
      coordinate: { x: 5, y: 5 },
    });

    const shotRes = await shotResultPromise;
    expect(shotRes.coordinate).toEqual({ x: 5, y: 5 });
    expect(shotRes.outcome).toBe('miss');
  });

  it('permits spectator to join and masks hidden ship positions', async () => {
    const s1 = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: token1 },
    });
    const s2 = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: token2 },
    });
    socketsToClose.push(s1, s2);

    await Promise.all([
      new Promise<void>((resolve) => s1.on('connect', () => resolve())),
      new Promise<void>((resolve) => s2.on('connect', () => resolve())),
    ]);

    const matchPromise = new Promise<any>((resolve) => s1.on('match:found', resolve));
    s1.emit('queue:join', {});
    s2.emit('queue:join', {});
    const match = await matchPromise;

    // Connect a 3rd spectator client
    const specToken = 'token_spec_' + Math.random();
    const specAddress = '0x3333333333333333333333333333333333333333';
    await redisService.set(
      `wba:session:${specToken}`,
      JSON.stringify({
        address: specAddress,
        chainId: 11155111,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 100000,
      }),
    );

    const spectator = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      auth: { token: specToken },
    });
    socketsToClose.push(spectator);

    await new Promise<void>((resolve) => spectator.on('connect', () => resolve()));

    const viewPromise = new Promise<any>((resolve) => spectator.on('spectate:view', resolve));
    spectator.emit('spectate:join', { matchId: match.matchId });
    const view = await viewPromise;

    // Verify spectator cannot see hidden boards
    expect(view.ownBoard).toBeNull();
    expect(view.matchId).toBe(match.matchId);
  });
});
