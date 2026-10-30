/** Chain the game runs on. Must equal the server's SUPPORTED_CHAIN_ID. */
export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

const CHAIN_NAMES: Record<number, string> = {
  1: "Ethereum",
  11155111: "Sepolia",
  84532: "Base Sepolia",
  8453: "Base",
};
export const CHAIN_NAME = CHAIN_NAMES[CHAIN_ID] ?? `Chain ${CHAIN_ID}`;

/**
 * Burner (throwaway key) logins are for local development and two-browser testing only.
 * In production a real wallet is required unless this is explicitly switched on.
 */
export const ALLOW_DEV_WALLET =
  process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_ALLOW_DEV_WALLET === "true";
