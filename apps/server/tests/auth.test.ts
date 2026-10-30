import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { SiweMessage } from 'siwe';
import { createApp } from '../src/app.js';
import { redisService } from '../src/services/redis.js';
import { playerRepo } from '../src/repositories/playerRepo.js';

describe('SIWE Authentication & Session Security', () => {
  const app = createApp();

  beforeEach(async () => {
    await redisService.flush();
    playerRepo.resetMemoryStore();
  });

  it('generates a single-use cryptographically secure nonce', async () => {
    const res = await request(app).get('/api/auth/nonce');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nonce).toBeDefined();
    expect(typeof res.body.data.nonce).toBe('string');
    expect(res.body.data.nonce.length).toBeGreaterThanOrEqual(16);
  });

  it('verifies valid SIWE signature, issues session cookie, and permits access to protected routes', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    // 1. Get nonce
    const nonceRes = await request(app).get('/api/auth/nonce');
    const nonce = nonceRes.body.data.nonce;

    // 2. Prepare SIWE message
    const siweMessage = new SiweMessage({
      domain: 'localhost:3000',
      address: account.address,
      statement: 'Sign in to Web3 Battle Arena',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 11155111,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const messageStr = siweMessage.prepareMessage();
    const signature = await account.signMessage({ message: messageStr });

    // 3. Verify
    const verifyRes = await request(app)
      .post('/api/auth/verify')
      .send({ message: messageStr, signature });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.success).toBe(true);
    expect(verifyRes.body.data.user.address.toLowerCase()).toBe(account.address.toLowerCase());
    expect(verifyRes.body.data.sessionToken).toBeDefined();

    // Verify Set-Cookie header contains wba_session
    const cookies = verifyRes.headers['set-cookie'];
    expect(cookies).toBeDefined();
    const cookieStr = Array.isArray(cookies) ? cookies.join(';') : String(cookies);
    expect(cookieStr).toContain('wba_session=');

    const sessionToken = verifyRes.body.data.sessionToken;

    // 4. Access protected route with Bearer header
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.address.toLowerCase()).toBe(account.address.toLowerCase());

    // 5. Logout invalidates session
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(logoutRes.status).toBe(200);

    // 6. Accessing after logout is rejected
    const postLogoutRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${sessionToken}`);

    expect(postLogoutRes.status).toBe(401);
  });

  it('rejects reused or invalid nonces atomically', async () => {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);

    const nonceRes = await request(app).get('/api/auth/nonce');
    const nonce = nonceRes.body.data.nonce;

    const siweMessage = new SiweMessage({
      domain: 'localhost:3000',
      address: account.address,
      statement: 'Sign in',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 11155111,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const messageStr = siweMessage.prepareMessage();
    const signature = await account.signMessage({ message: messageStr });

    // First attempt succeeds
    const firstVerify = await request(app)
      .post('/api/auth/verify')
      .send({ message: messageStr, signature });
    expect(firstVerify.status).toBe(200);

    // Second attempt with same nonce MUST fail
    const secondVerify = await request(app)
      .post('/api/auth/verify')
      .send({ message: messageStr, signature });
    expect(secondVerify.status).toBe(401);
    expect(secondVerify.body.success).toBe(false);
  });

  it('rejects forged signatures from wrong private key', async () => {
    const victimAccount = privateKeyToAccount(generatePrivateKey());
    const attackerAccount = privateKeyToAccount(generatePrivateKey());

    const nonceRes = await request(app).get('/api/auth/nonce');
    const nonce = nonceRes.body.data.nonce;

    // Attacker signs message claiming to be victim
    const siweMessage = new SiweMessage({
      domain: 'localhost:3000',
      address: victimAccount.address,
      statement: 'Sign in',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 11155111,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const messageStr = siweMessage.prepareMessage();
    const forgedSignature = await attackerAccount.signMessage({ message: messageStr });

    const res = await request(app)
      .post('/api/auth/verify')
      .send({ message: messageStr, signature: forgedSignature });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  describe('login message validation', () => {
    const login = async (overrides: Record<string, unknown> = {}) => {
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
        ...overrides,
      }).prepareMessage();
      const signature = await account.signMessage({ message });
      return request(app).post('/api/auth/verify').send({ message, signature });
    };

    it('accepts a correct message', async () => {
      expect((await login()).status).toBe(200);
    });

    it('rejects a message for another chain', async () => {
      const res = await login({ chainId: 1 });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Unsupported chain/);
    });

    it('rejects a message for another domain', async () => {
      const res = await login({ domain: 'evil.example' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Invalid SIWE domain/);
    });

    it('rejects a message for another origin (uri)', async () => {
      const res = await login({ uri: 'https://evil.example' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/Invalid SIWE uri/);
    });

    it('rejects a stale message', async () => {
      const res = await login({ issuedAt: '2020-01-01T00:00:00.000Z' });
      expect(res.status).toBe(401);
      expect(res.body.error.message).toMatch(/too old/);
    });

    it('rejects a message issued in the future', async () => {
      const res = await login({ issuedAt: new Date(Date.now() + 3600_000).toISOString() });
      expect(res.status).toBe(401);
    });

    it('rejects an already expired message', async () => {
      const res = await login({ expirationTime: new Date(Date.now() - 1000).toISOString() });
      expect(res.status).toBe(401);
    });

    it('rejects garbage as a 401, not a server error', async () => {
      const res = await request(app)
        .post('/api/auth/verify')
        .send({ message: 'not a siwe message', signature: `0x${'ab'.repeat(65)}` });
      expect(res.status).toBe(401);
    });
  });
});
