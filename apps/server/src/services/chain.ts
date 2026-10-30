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
  /**
   * Records a match result. Never fabricates on-chain state: in testnet mode a failure is
   * reported as `failed` (and retried on the next call) instead of falling back to simulated.
   */
  public async recordMatch(
    matchId: string,
    winner: string | null,
    resultHash: string,
  ): Promise<ChainRecordResult> {
    const confirmed = await chainLogRepo.findByMatchId(matchId, 'confirmed');
    if (confirmed) return this.toResult(confirmed);

    const winnerAddress = (winner ?? '0x0000000000000000000000000000000000000000') as `0x${string}`;

    if (env.CHAIN_MODE === 'simulated') {
      return this.recordSimulated(matchId, winnerAddress, resultHash);
    }

    const pending = await chainLogRepo.findByMatchId(matchId, 'pending');
    if (pending) {
      const reconciled = await this.reconcilePending(matchId, pending);
      if (reconciled) return reconciled;
    }

    try {
      return await this.recordTestnet(matchId, winnerAddress, resultHash);
    } catch (err) {
      const message = (err as Error).message;
      console.error(`[ChainService] Testnet recording failed for ${matchId}: ${message}`);
      await matchRepo.update(matchId, { chainStatus: 'failed', chainMode: 'testnet' });
      return { txHash: '', mode: 'testnet', status: 'failed' };
    }
  }

  private toResult(log: {
    txHash: string;
    mode: 'simulated' | 'testnet';
    status: 'confirmed' | 'pending' | 'failed';
    blockNumber?: number;
  }): ChainRecordResult {
    return {
      txHash: log.txHash,
      mode: log.mode,
      status: log.status,
      blockNumber: log.blockNumber,
    };
  }

  private toBytes32MatchId(matchId: string): Hex {
    return matchId.startsWith('0x') && matchId.length === 66
      ? (matchId as Hex)
      : keccak256(toBytes(matchId));
  }

  private clients() {
    const account = privateKeyToAccount(env.RELAYER_PRIVATE_KEY as `0x${string}`);
    const transport = http(env.RPC_URL);
    return {
      walletClient: createWalletClient({ account, chain: sepolia, transport }),
      publicClient: createPublicClient({ chain: sepolia, transport }),
    };
  }

  /** A previous attempt timed out waiting for a receipt: check whether the tx actually landed. */
  private async reconcilePending(
    matchId: string,
    log: { txHash: string; winner: string; resultHash: string },
  ): Promise<ChainRecordResult | null> {
    try {
      const { publicClient } = this.clients();
      const receipt = await publicClient.getTransactionReceipt({ hash: log.txHash as Hex });
      const ok = receipt.status === 'success';
      const blockNumber = Number(receipt.blockNumber);
      await chainLogRepo.updateStatus(log.txHash, {
        status: ok ? 'confirmed' : 'failed',
        blockNumber,
      });
      await matchRepo.update(matchId, {
        chainStatus: ok ? 'recorded' : 'failed',
        chainMode: 'testnet',
        chainTxHash: log.txHash,
      });
      return ok
        ? { txHash: log.txHash, mode: 'testnet', status: 'confirmed', blockNumber }
        : null;
    } catch {
      // Receipt not available yet: still pending. Do not resubmit and risk a duplicate record.
      return { txHash: log.txHash, mode: 'testnet', status: 'pending' };
    }
  }

  private async recordSimulated(
    matchId: string,
    winner: `0x${string}`,
    resultHash: string,
  ): Promise<ChainRecordResult> {
    // Deterministic, clearly labelled simulated tx hash: 0xsim_<keccak256>
    const digest = keccak256(toBytes(`simulated-tx:${matchId}:${resultHash}`));
    const simulatedTxHash = `0xsim_${digest.slice(2, 62)}`;

    await chainLogRepo.create({
      txHash: simulatedTxHash,
      matchId,
      winner,
      resultHash,
      mode: 'simulated',
      status: 'confirmed',
    });

    await matchRepo.update(matchId, {
      chainStatus: 'recorded',
      chainMode: 'simulated',
      chainTxHash: simulatedTxHash,
    });

    return { txHash: simulatedTxHash, mode: 'simulated', status: 'confirmed' };
  }

  private async recordTestnet(
    matchId: string,
    winner: `0x${string}`,
    resultHash: string,
  ): Promise<ChainRecordResult> {
    const { walletClient, publicClient } = this.clients();

    const txHash = await walletClient.writeContract({
      address: env.MATCH_REGISTRY_ADDRESS as `0x${string}`,
      abi: MATCH_REGISTRY_ABI,
      functionName: 'recordMatch',
      args: [this.toBytes32MatchId(matchId), winner, resultHash as Hex],
    });

    // The tx is on the network from here on: log it as pending before waiting.
    await chainLogRepo.create({
      txHash,
      matchId,
      winner,
      resultHash,
      mode: 'testnet',
      status: 'pending',
    });
    await matchRepo.update(matchId, {
      chainStatus: 'pending',
      chainMode: 'testnet',
      chainTxHash: txHash,
    });

    let receipt;
    try {
      receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 30000 });
    } catch (err) {
      // Timed out: leave it pending so the next attempt reconciles instead of resubmitting.
      console.warn(`[ChainService] No receipt yet for ${txHash}: ${(err as Error).message}`);
      return { txHash, mode: 'testnet', status: 'pending' };
    }

    const ok = receipt.status === 'success';
    const blockNumber = Number(receipt.blockNumber);
    await chainLogRepo.updateStatus(txHash, {
      status: ok ? 'confirmed' : 'failed',
      blockNumber,
      ...(ok ? {} : { error: 'transaction reverted' }),
    });
    await matchRepo.update(matchId, {
      chainStatus: ok ? 'recorded' : 'failed',
      chainMode: 'testnet',
      chainTxHash: txHash,
    });

    return { txHash, mode: 'testnet', status: ok ? 'confirmed' : 'failed', blockNumber };
  }
}

export const chainService = new ChainService();
