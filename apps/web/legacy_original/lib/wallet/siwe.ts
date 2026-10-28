import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export function createSiweMessage(params: {
  domain: string;
  address: string;
  statement: string;
  uri: string;
  version: string;
  chainId: number;
  nonce: string;
  issuedAt: string;
}): string {
  return `${params.domain} wants you to sign in with your Ethereum account:
${params.address}

${params.statement}

URI: ${params.uri}
Version: ${params.version}
Chain ID: ${params.chainId}
Nonce: ${params.nonce}
Issued At: ${params.issuedAt}`;
}

export async function signWithInjectedWallet(address: string, message: string): Promise<string> {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('No Ethereum wallet extension detected in browser.');
  }

  const ethereum = (window as any).ethereum;
  const signature = await ethereum.request({
    method: 'personal_sign',
    params: [message, address],
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
