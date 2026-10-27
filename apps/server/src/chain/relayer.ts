import { createWalletClient, createPublicClient, http, parseAbi, toHex, keccak256, stringToHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { config } from "../config";
import { Match } from "../db/mongo";

// ── ABI fragments ─────────────────────────────────────────────────────────────

const REGISTRY_ABI = parseAbi([
  "function recordMatch(bytes32 matchId, address winner, uint256 timestamp, bytes32 resultHash) external",
  "function verify(bytes32 matchId, bytes32 recomputedHash) external view returns (bool)",
]);

const BADGES_ABI = parseAbi([
  "function mintBadge(address player, uint256 badgeId) external",
  "function mintBadges(address player, uint256[] calldata badgeIds) external",
  "function hasBadge(address player, uint256 badgeId) external view returns (bool)",
]);

// ── Client setup ──────────────────────────────────────────────────────────────

function getClients() {
  if (!config.relayerKey) throw new Error("RELAYER_PRIVATE_KEY not set");
  if (!config.rpcUrl)     throw new Error("RPC_URL not set");

  const account = privateKeyToAccount(config.relayerKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });

  return { walletClient, publicClient, account };
}

// ── Match recording ───────────────────────────────────────────────────────────

/**
 * Write a match result to MatchRegistry on-chain.
 * Updates MongoDB with txHash and chainStatus.
 */
export async function recordMatchOnChain(
  matchId: string,
  winner: string,
  timestamp: number,
  resultHash: string
): Promise<string> {
  const { walletClient, publicClient } = getClients();

  // Convert string matchId → bytes32
  const matchIdBytes = keccak256(stringToHex(matchId)) as `0x${string}`;
  const resultHashBytes = resultHash as `0x${string}`;

  const txHash = await walletClient.writeContract({
    address: config.registryAddress as `0x${string}`,
    abi: REGISTRY_ABI,
    functionName: "recordMatch",
    args: [
      matchIdBytes,
      winner as `0x${string}`,
      BigInt(Math.floor(timestamp / 1000)),
      resultHashBytes,
    ],
  });

  // Wait for confirmation
  await publicClient.waitForTransactionReceipt({ hash: txHash });

  // Update DB
  await Match.updateOne(
    { matchId },
    { txHash, chainStatus: "confirmed" }
  );

  console.log(`⛓  On-chain: ${txHash}`);
  return txHash;
}

// ── Badge minting ─────────────────────────────────────────────────────────────

export async function mintBadgeOnChain(
  player: string,
  badgeId: number
): Promise<string> {
  const { walletClient, publicClient } = getClients();

  const txHash = await walletClient.writeContract({
    address: (process.env.BADGES_ADDRESS ?? "") as `0x${string}`,
    abi: BADGES_ABI,
    functionName: "mintBadge",
    args: [player as `0x${string}`, BigInt(badgeId)],
  });

  await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log(`🏅 Badge ${badgeId} minted for ${player}: ${txHash}`);
  return txHash;
}

export async function checkBadgeOnChain(
  player: string,
  badgeId: number
): Promise<boolean> {
  const { publicClient } = getClients();

  return publicClient.readContract({
    address: (process.env.BADGES_ADDRESS ?? "") as `0x${string}`,
    abi: BADGES_ABI,
    functionName: "hasBadge",
    args: [player as `0x${string}`, BigInt(badgeId)],
  }) as Promise<boolean>;
}
