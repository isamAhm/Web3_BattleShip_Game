import { createWalletClient, createPublicClient, http, keccak256, toBytes, Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia } from 'viem/chains';
import { env } from '../config/env.js';
import { chainLogRepo } from '../repositories/chainLogRepo.js';
import { matchRepo } from '../repositories/matchRepo.js';

export interface ChainRecordResult {
  txHash: string;
  mode: 'simulated' | 'testnet';
  status: 'confirmed' | 'pending' | 'failed';
  blockNumber?: number;
}

const MATCH_REGISTRY_ABI = [
  {
    type: 'function',
    name: 'recordMatch',
    inputs: [
      { name: 'matchId', type: 'bytes32' },
      { name: 'winner', type: 'address' },
      { name: 'resultHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
] as const;

export class ChainService {
  public async recordMatch(
    matchId: string,
    winner: string | null,
    resultHash: string,
  ): Promise<ChainRecordResult> {
    const existingLog = await chainLogRepo.findByMatchId(matchId);
    if (existingLog) {
      return {
        txHash: existingLog.txHash,
        mode: existingLog.mode,
        status: existingLog.status,
        blockNumber: existingLog.blockNumber,
      };
    }

    const winnerAddress = (winner ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

    if (
      env.CHAIN_MODE === 'simulated' ||
      !env.RELAYER_PRIVATE_KEY ||
      env.MATCH_REGISTRY_ADDRESS === '0x0000000000000000000000000000000000000000'
    ) {
      return this.recordSimulated(matchId, winnerAddress, resultHash);
    } else {
      try {
        return await this.recordTestnet(matchId, winnerAddress, resultHash);
      } catch (err) {
        console.warn(
          `[ChainService] Testnet recording failed, falling back to simulated log: ${(err as Error).message}`,
        );
        return this.recordSimulated(matchId, winnerAddress, resultHash);
      }
    }
  }

  private async recordSimulated(
    matchId: string,
    winner: `0x${string}`,
    resultHash: string,
  ): Promise<ChainRecordResult> {
    // Generate deterministic clearly labeled simulated tx hash: 0xsim_<keccak256>
    const digest = keccak256(toBytes(`simulated-tx:${matchId}:${resultHash}`));
    const simulatedTxHash = `0xsim_${digest.slice(2, 62)}`;

    await chainLogRepo.create({
      txHash: simulatedTxHash,
      matchId,
      winner,
      resultHash,
      mode: 'simulated',
      status: 'confirmed',
      blockNumber: 12345678,
    });

    await matchRepo.update(matchId, {
      chainStatus: 'recorded',
      chainMode: 'simulated',
      chainTxHash: simulatedTxHash,
    });

    return {
      txHash: simulatedTxHash,
      mode: 'simulated',
      status: 'confirmed',
      blockNumber: 12345678,
    };
  }

  private async recordTestnet(
    matchId: string,
    winner: `0x${string}`,
    resultHash: string,
  ): Promise<ChainRecordResult> {
    const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as `0x${string}`);
    const walletClient = createWalletClient({
      account,
      chain: sepolia,
      transport: http(env.RPC_URL),
    });
    const publicClient = createPublicClient({
      chain: sepolia,
      transport: http(env.RPC_URL),
    });

    // Ensure matchId is 32 bytes (pad or hash if needed)
    const matchIdBytes32: Hex =
      matchId.startsWith('0x') && matchId.length === 66
        ? (matchId as Hex)
        : keccak256(toBytes(matchId));

    const resultHashBytes32 = resultHash as Hex;

    // Submit transaction
    const txHash = await walletClient.writeContract({
      address: env.MATCH_REGISTRY_ADDRESS as `0x${string}`,
      abi: MATCH_REGISTRY_ABI,
      functionName: 'recordMatch',
      args: [matchIdBytes32, winner, resultHashBytes32],
    });

    // Await receipt
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
      timeout: 30000,
    });

    const blockNumber = Number(receipt.blockNumber);

    await chainLogRepo.create({
      txHash,
      matchId,
      winner,
      resultHash,
      mode: 'testnet',
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      blockNumber,
    });

    await matchRepo.update(matchId, {
      chainStatus: receipt.status === 'success' ? 'recorded' : 'failed',
      chainMode: 'testnet',
      chainTxHash: txHash,
    });

    return {
      txHash,
      mode: 'testnet',
      status: receipt.status === 'success' ? 'confirmed' : 'failed',
      blockNumber,
    };
  }
}

export const chainService = new ChainService();
