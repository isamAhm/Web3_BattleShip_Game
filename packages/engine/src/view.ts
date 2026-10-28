import { shipCells, cellKey } from './placement.js';
import type {
  Address,
  Board,
  Forfeit,
  Hex,
  MatchState,
  Phase,
  PlayerIndex,
  Reveal,
  ShotEntry,
} from './types.js';

export type Viewer = PlayerIndex | 'spectator';

export interface PublicPlayerView {
  address: Address;
  placed: boolean;
  score: number;
  streak: number;
  bestStreak: number;
  shotsFired: number;
  hits: number;
  minesTriggered: number;
}

export interface PublicMatchView {
  matchId: string;
  phase: Phase;
  turn: PlayerIndex | null;
  you: PlayerIndex | null;
  players: [PublicPlayerView, PublicPlayerView];
  commitments: [Hex | null, Hex | null];
  shots: ShotEntry[];
  /** Lengths of each player's ships that have been sunk by the opponent. */
  sunkShips: [number[], number[]];
  winner: PlayerIndex | null;
  forfeit: Forfeit | null;
  /** Only the viewer's own board. Always null for spectators. */
  ownBoard: Board | null;
  /** Verified reveals (board + salt). Only present once the match is over. */
  reveals: [Reveal | null, Reveal | null];
}

function sunkLengths(state: MatchState, owner: PlayerIndex): number[] {
  const board = state.players[owner].board;
  if (!board) return [];
  const hitKeys = new Set(
    state.shots
      .filter((s) => s.player !== owner && s.outcome !== 'timeout')
      .map((s) => cellKey(s.x, s.y)),
  );
  return board.ships
    .filter((ship) => shipCells(ship).every((c) => hitKeys.has(cellKey(c.x, c.y))))
    .map((ship) => ship.length)
    .sort((a, b) => b - a);
}

/**
 * The ONLY object that should ever be sent to clients. Builds a fresh, viewer-specific
 * snapshot: opponents' ships/mines never appear, and salts appear only after verified reveals.
 */
export function publicView(state: MatchState, viewer: Viewer): PublicMatchView {
  const finished = state.phase === 'finished';
  const pv = (i: PlayerIndex): PublicPlayerView => {
    const p = state.players[i];
    return {
      address: p.address,
      placed: p.board !== null,
      score: p.score,
      streak: p.streak,
      bestStreak: p.bestStreak,
      shotsFired: p.shotsFired,
      hits: p.hits,
      minesTriggered: p.minesTriggered,
    };
  };
  const view: PublicMatchView = {
    matchId: state.matchId,
    phase: state.phase,
    turn: finished ? null : state.turn,
    you: viewer === 'spectator' ? null : viewer,
    players: [pv(0), pv(1)],
    commitments: [state.players[0].commitment, state.players[1].commitment],
    shots: state.shots.map((s) => ({ ...s })),
    sunkShips: [sunkLengths(state, 0), sunkLengths(state, 1)],
    winner: state.winner,
    forfeit: state.forfeit ? { ...state.forfeit } : null,
    ownBoard: viewer === 'spectator' ? null : structuredClone(state.players[viewer].board),
    reveals: [
      finished ? structuredClone(state.players[0].reveal) : null,
      finished ? structuredClone(state.players[1].reveal) : null,
    ],
  };
  return view;
}
