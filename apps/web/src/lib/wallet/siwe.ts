import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getAddress, stringToHex } from 'viem';

/** Messages are only honoured by the server for a few minutes. */
const MESSAGE_TTL_MS = 10 * 60 * 1000;

/**
 * Builds the EIP-4361 sign-in message. The address is always EIP-55 checksummed: wallets hand
 * out lower-case addresses, which the server's SIWE parser rejects.
 */
export function buildSiweMessage(params: {
  domain: string;
  address: string;
  uri: string;
  chainId: number;
  nonce: string;
  statement?: string;
  issuedAt?: Date;
  ttlMs?: number;
}): string {
  const issuedAt = params.issuedAt ?? new Date();
  const expiresAt = new Date(issuedAt.getTime() + (params.ttlMs ?? MESSAGE_TTL_MS));
  return [
    `${params.domain} wants you to sign in with your Ethereum account:`,
    getAddress(params.address),
    "",
    params.statement ?? "Sign in to Web3 Battle Arena",
    "",
    `URI: ${params.uri}`,
    "Version: 1",
    `Chain ID: ${params.chainId}`,
    `Nonce: ${params.nonce}`,
    `Issued At: ${issuedAt.toISOString()}`,
    `Expiration Time: ${expiresAt.toISOString()}`,
  ].join("\n");
}

/** Makes sure the wallet is on the game's chain, asking it to switch when it is not. */
export async function ensureWalletChain(ethereum: any, chainId: number): Promise<void> {
  const current = await ethereum.request({ method: "eth_chainId" });
  if (parseInt(current, 16) === chainId) return;
  try {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch {
    throw new Error(`Please switch your wallet to chain ${chainId} and try again.`);
  }
}

export async function signWithInjectedWallet(address: string, message: string): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No Ethereum wallet extension detected in browser.');
  }

  const ethereum = (window as any).ethereum;
  const hexMessage = stringToHex(message);
  const signature = await ethereum.request({
    method: 'personal_sign',
    params: [hexMessage, address],
  });

  return signature;
}

export function generateDevAccount() {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return {
    privateKey,
    account,
    address: account.address,
    signMessage: async (msg: string) => account.signMessage({ message: msg }),
  };
}
