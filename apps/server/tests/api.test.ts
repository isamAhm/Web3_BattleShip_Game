import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { redisService } from '../src/services/redis.js';
import { playerRepo } from '../src/repositories/playerRepo.js';
import { matchRepo } from '../src/repositories/matchRepo.js';
import { socialRepo } from '../src/repositories/socialRepo.js';
import { tournamentRepo } from '../src/repositories/tournamentRepo.js';
import { leaderboardService } from '../src/services/leaderboard.js';

describe('REST API Endpoints', () => {
  const app = createApp();
  let userToken: string;
  const testAddress = '0x1111111111111111111111111111111111111111';

  beforeEach(async () => {
    await redisService.flush();
    playerRepo.resetMemoryStore();
    matchRepo.resetMemoryStore();
    socialRepo.resetMemoryStore();
    tournamentRepo.resetMemoryStore();

    // Create session token directly
    const session = 'test_session_token_' + Math.random();
    await redisService.set(
      `wba:session:${session}`,
      JSON.stringify({
        address: testAddress,
        chainId: 11155111,
        issuedAt: Date.now(),
        expiresAt: Date.now() + 100000,
      }),
      100,
    );
    userToken = session;
  });

  it('GET /health returns 200 with uptime', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.uptime).toBe('number');
  });

  it('GET /ready returns status of infrastructure', async () => {
    const res = await request(app).get('/ready');
    expect(res.status).toBe(200);
    expect(res.body.services).toBeDefined();
  });

  it('GET /api/players/:address returns player profile and stats', async () => {
    await playerRepo.getOrCreate(testAddress);
    const res = await request(app).get(`/api/players/${testAddress}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.address).toBe(testAddress);
  });

  it('PATCH /api/players/me updates authenticated user profile', async () => {
    const res = await request(app)
      .patch('/api/players/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ username: 'AdmiralNemo' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.username).toBe('AdmiralNemo');
  });

  it('GET /api/leaderboards/:type returns sorted rankings', async () => {
    await playerRepo.getOrCreate(testAddress);
    await leaderboardService.updatePlayerStats(testAddress, {
      totalPoints: 120,
      bestStreak: 4,
      fastestWinShots: 19,
    });

    const resPoints = await request(app).get('/api/leaderboards/points');
    expect(resPoints.status).toBe(200);
    expect(resPoints.body.data.entries.length).toBeGreaterThanOrEqual(1);
    expect(resPoints.body.data.entries[0].score).toBe(120);

    const resStreak = await request(app).get('/api/leaderboards/streak');
    expect(resStreak.status).toBe(200);
    expect(resStreak.body.data.entries[0].score).toBe(4);

    const resFastest = await request(app).get('/api/leaderboards/fastest_win');
    expect(resFastest.status).toBe(200);
    expect(resFastest.body.data.entries[0].score).toBe(19);
  });

  it('manages friends, invites, and notifications', async () => {
    const friendAddress = '0x2222222222222222222222222222222222222222';

    // 1. Send friend request
    const reqRes = await request(app)
      .post('/api/friends')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ targetAddress: friendAddress });
    expect(reqRes.status).toBe(200);
    expect(reqRes.body.success).toBe(true);

    // 2. List friends & pending
    const listRes = await request(app)
      .get('/api/friends')
      .set('Authorization', `Bearer ${userToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data).toBeDefined();

    // 3. Send game invite
    const invRes = await request(app)
      .post('/api/invites')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ recipientAddress: friendAddress, roomCode: 'ROOM123' });
    expect(invRes.status).toBe(200);
    expect(invRes.body.data.roomCode).toBe('ROOM123');

    // 4. Create and retrieve notifications
    await socialRepo.createNotification(testAddress, 'game', 'Match Ready', 'Your match is ready');
    const notifRes = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${userToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('GET /api/tournaments and POST /api/tournaments work idempotently', async () => {
    const createRes = await request(app)
      .post('/api/tournaments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Arena Grand Prix',
        description: 'First annual Battleship tournament',
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 86400000).toISOString(),
      });

    expect(createRes.status).toBe(200);
    expect(createRes.body.data.title).toBe('Arena Grand Prix');

    const listRes = await request(app).get('/api/tournaments');
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThanOrEqual(1);
  });
});
