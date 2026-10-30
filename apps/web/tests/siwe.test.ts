import { describe, it, expect } from 'vitest';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { buildSiweMessage, generateDevAccount } from '../src/lib/wallet/siwe';

const base = {
  domain: 'localhost:3000',
  uri: 'http://localhost:3000',
  chainId: 11155111,
  nonce: 'abcdef1234567890',
};

describe('SIWE message builder', () => {
  it('formats an EIP-4361 message', () => {
    const issuedAt = new Date('2026-10-27T12:00:00.000Z');
    const message = buildSiweMessage({
      ...base,
      address: '0x52908400098527886E0F7030069857D2E4169EE7',
      issuedAt,
    });
    expect(message.split('\n')).toEqual([
      'localhost:3000 wants you to sign in with your Ethereum account:',
      '0x52908400098527886E0F7030069857D2E4169EE7',
      '',
      'Sign in to Web3 Battle Arena',
      '',
      'URI: http://localhost:3000',
      'Version: 1',
      'Chain ID: 11155111',
      'Nonce: abcdef1234567890',
      'Issued At: 2026-10-27T12:00:00.000Z',
      'Expiration Time: 2026-10-27T12:10:00.000Z',
    ]);
  });

  it('checksums a lower-case wallet address (wallets return lower-case)', () => {
    const account = privateKeyToAccount(generatePrivateKey());
    const message = buildSiweMessage({ ...base, address: account.address.toLowerCase() });
    expect(message.split('\n')[1]).toBe(account.address); // EIP-55 form
  });

  it('rejects something that is not an address', () => {
    expect(() => buildSiweMessage({ ...base, address: 'not-an-address' })).toThrow();
  });

  it('uses the chain it is given', () => {
    const message = buildSiweMessage({
      ...base,
      chainId: 84532,
      address: privateKeyToAccount(generatePrivateKey()).address,
    });
    expect(message).toContain('Chain ID: 84532');
  });
});

describe('Dev account', () => {
  it('should generate valid dev account with private key and address', async () => {
    const dev = generateDevAccount();
    expect(dev.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(dev.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);

    const sig = await dev.signMessage('Web3 Battle Arena signature test');
    expect(sig).toMatch(/^0x[a-fA-F0-9]{130}$/);
  });
});
