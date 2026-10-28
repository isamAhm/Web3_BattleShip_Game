import { describe, it, expect } from 'vitest';
import { createSiweMessage, generateDevAccount } from '../src/lib/wallet/siwe';

describe('SIWE Authentication & Dev Account', () => {
  it('should format EIP-4361 SIWE message correctly', () => {
    const message = createSiweMessage({
      domain: 'localhost:3000',
      address: '0x1234567890123456789012345678901234567890',
      statement: 'Sign in to Web3 Battle Arena',
      uri: 'http://localhost:3000',
      version: '1',
      chainId: 11155111,
      nonce: 'abcdef123456',
      issuedAt: '2026-10-27T12:00:00.000Z',
    });

    expect(message).toContain('localhost:3000 wants you to sign in with your Ethereum account:');
    expect(message).toContain('0x1234567890123456789012345678901234567890');
    expect(message).toContain('Sign in to Web3 Battle Arena');
    expect(message).toContain('Nonce: abcdef123456');
    expect(message).toContain('Chain ID: 11155111');
  });

  it('should generate valid dev account with private key and address', async () => {
    const dev = generateDevAccount();
    expect(dev.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(dev.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);

    const testMsg = 'Web3 Battle Arena signature test';
    const sig = await dev.signMessage(testMsg);
    expect(sig).toMatch(/^0x[a-fA-F0-9]{130}$/);
  });
});
