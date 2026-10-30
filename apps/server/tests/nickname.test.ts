import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';
import { createApp } from '../src/app.js';
import { redisService } from '../src/services/redis.js';
import { playerRepo } from '../src/repositories/playerRepo.js';

describe('Player nickname', () => {
  const app = createApp();

  beforeEach(async () => {
    await redisService.flush();
    playerRepo.resetMemoryStore();
  });

  async function login(): Promise<{ token: string; address: string }> {
    const account = privateKeyToAccount(generatePrivateKey());
    const nonce = (await request(app).get('/api/auth/nonce')).body.data.nonce;
    const message = new SiweMessage({
      domain: 'localhost:3000',
      address: account.address,
      statement: 'Sign in to Web3 Battle Arena',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 11155111,
      nonce,
      issuedAt: new Date().toISOString(),
    }).prepareMessage();
    const signature = await account.signMessage({ message });
    const res = await request(app).post('/api/auth/verify').send({ message, signature });
    return { token: res.body.data.sessionToken, address: account.address };
  }

  const setNick = (token: string, nickname: unknown) =>
    request(app).put('/api/players/me/nickname').set('Authorization', `Bearer ${token}`).send({ nickname });

  it('new players have a generated name and no chosen nickname', async () => {
    const { token } = await login();
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.player.username).toMatch(/^Player_/);
    expect(me.body.data.player.nicknameSet).toBeFalsy();
  });

  it('saves a valid nickname and marks it as chosen', async () => {
    const { token } = await login();
    const res = await setNick(token, 'Admiral_Nova');
    expect(res.status).toBe(200);
    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(me.body.data.player.username).toBe('Admiral_Nova');
    expect(me.body.data.player.nicknameSet).toBe(true);
  });

  it('rejects invalid and reserved nicknames', async () => {
    const { token } = await login();
    for (const bad of ['ab', 'has space', 'x'.repeat(17), '<b>hi</b>', 'Player_abc123', '', 42]) {
      expect((await setNick(token, bad)).status).toBe(400);
    }
  });

  it('rejects a nickname another player already uses (case-insensitive)', async () => {
    const a = await login();
    const b = await login();
    expect((await setNick(a.token, 'Corsair')).status).toBe(200);
    expect((await setNick(b.token, 'cORSAIR')).status).toBe(409);
    // the owner can re-save their own name
    expect((await setNick(a.token, 'Corsair')).status).toBe(200);
  });

  it('requires a session', async () => {
    const res = await request(app).put('/api/players/me/nickname').send({ nickname: 'Anon_One' });
    expect(res.status).toBe(401);
  });
});
