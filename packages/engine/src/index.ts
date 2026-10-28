export * from './config.js';
export * from './types.js';
export * from './scoring.js';
export { validatePlacement, shipCells, sortShips, sortMines, cellKey } from './placement.js';
export type { PlacementResult } from './placement.js';
export {
  COMMITMENT_VERSION,
  generateSalt,
  fleetPreimage,
  commitPlacement,
  verifyReveal,
} from './commitment.js';
export type { VerifyRevealResult } from './commitment.js';
export {
  createMatch,
  submitPlacement,
  startBattleWithBoards,
  fire,
  timeoutTurn,
  forfeit,
  submitReveal,
  normalizeAddress,
  otherPlayer,
} from './match.js';
export type { FireResult, EndResult, SubmitPlacementResult } from './match.js';
export { publicView } from './view.js';
export type { Viewer, PublicMatchView, PublicPlayerView } from './view.js';
export {
  RECORD_VERSION,
  ZERO_HASH,
  canonicalize,
  canonicalRecord,
  buildRecord,
  resultHash,
} from './record.js';
export type { MatchRecord, RecordForfeit } from './record.js';
export { replayScores, verifyRecord, verifyMatch } from './replay.js';
export type {
  ReplayInput,
  ReplayResult,
  VerificationResult,
  VerificationStatus,
} from './replay.js';
