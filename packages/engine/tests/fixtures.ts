import {
  commitPlacement,
  createMatch,
  fire,
  submitPlacement,
  type Board,
  type Coord,
  type Hex,
  type MatchState,
  type PlayerIndex,
  shipCells,
} from '../src/index.js';

export const ADDR0 = `0x${'Ab'.repeat(20)}`; // mixed case on purpose
export const ADDR1 = `0x${'cD'.repeat(20)}`;
export const SALT0: Hex = `0x${'11'.repeat(32)}`;
export const SALT1: Hex = `0x${'22'.repeat(32)}`;

/** Player 0: horizontal ships in columns 0-4, mines bottom-right. Stored in canonical sort order. */
export const BOARD0: Board = {
  ships: [
    { x: 0, y: 0, length: 5, orientation: 'H' },
    { x: 0, y: 2, length: 4, orientation: 'H' },
    { x: 0, y: 4, length: 3, orientation: 'H' },
    { x: 0, y: 6, length: 3, orientation: 'H' },
    { x: 0, y: 8, length: 2, orientation: 'H' },
  ],
  mines: [
    { x: 7, y: 9 },
    { x: 8, y: 9 },
    { x: 9, y: 9 },
  ],
};

/** Player 1: vertical ships in columns 9, 7, 5, 3, 1. Mines at (0,9), (2,9), (4,9). */
export const BOARD1: Board = {
  ships: [
    { x: 1, y: 0, length: 2, orientation: 'V' },
    { x: 3, y: 0, length: 3, orientation: 'V' },
    { x: 5, y: 0, length: 3, orientation: 'V' },
    { x: 7, y: 0, length: 4, orientation: 'V' },
    { x: 9, y: 0, length: 5, orientation: 'V' },
  ],
  mines: [
    { x: 0, y: 9 },
    { x: 2, y: 9 },
    { x: 4, y: 9 },
  ],
};

export function ok<T extends { ok: boolean }>(r: T): Extract<T, { ok: true }> {
  if (!r.ok) throw new Error(`expected ok result, got ${JSON.stringify(r)}`);
  return r as Extract<T, { ok: true }>;
}

export function placementPayload(board: Board, salt: Hex) {
  return { board, commitment: commitPlacement(board, salt) };
}

export function placingMatch(): MatchState {
  return createMatch({ matchId: 'm-1', players: [ADDR0, ADDR1] });
}

/** Both fleets placed and committed: battle phase, player 0 to move. */
export function battleMatch(): MatchState {
  let s = placingMatch();
  s = ok(submitPlacement(s, 0, placementPayload(BOARD0, SALT0))).state;
  s = ok(submitPlacement(s, 1, placementPayload(BOARD1, SALT1))).state;
  return s;
}

export function emptyCells(board: Board): Coord[] {
  const taken = new Set(
    [...board.ships.flatMap((s) => shipCells(s)), ...board.mines].map((c) => `${c.x},${c.y}`),
  );
  const out: Coord[] = [];
  for (let y = 0; y < 10; y++)
    for (let x = 0; x < 10; x++) if (!taken.has(`${x},${y}`)) out.push({ x, y });
  return out;
}

export function play(state: MatchState, shots: Array<[PlayerIndex, number, number]>): MatchState {
  let s = state;
  for (const [p, x, y] of shots) s = ok(fire(s, p, x, y)).state;
  return s;
}

/** Winning order for player 0 against BOARD1: sinks 5, 4, 3, 3, 2 in turn. */
export const WINNING_SHOTS: Array<[number, number]> = [
  ...[0, 1, 2, 3, 4].map((y): [number, number] => [9, y]),
  ...[0, 1, 2, 3].map((y): [number, number] => [7, y]),
  ...[0, 1, 2].map((y): [number, number] => [5, y]),
  ...[0, 1, 2].map((y): [number, number] => [3, y]),
  ...[0, 1].map((y): [number, number] => [1, y]),
];

/** Player 0 wins in exactly 17 shots; player 1 only misses. */
export function perfectGame(): MatchState {
  const misses = emptyCells(BOARD0);
  let s = battleMatch();
  WINNING_SHOTS.forEach(([x, y], i) => {
    s = ok(fire(s, 0, x, y)).state;
    if (i < WINNING_SHOTS.length - 1) {
      const m = misses[i] as Coord;
      s = ok(fire(s, 1, m.x, m.y)).state;
    }
  });
  return s;
}
