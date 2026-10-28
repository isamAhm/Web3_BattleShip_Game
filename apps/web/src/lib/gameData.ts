import type {
  Ship,
  FleetShip,
  ShotLogEntry,
  ChatMessage,
  Player,
  LeaderboardEntry,
  Badge,
  MatchStep,
  BoardCells,
} from "@/types/game";

export const LETTERS = "ABCDEFGHIJ";

export const YOU: Player = {
  name: "Captain Mira",
  address: "0x7a3f…c91d",
  score: 285,
  wins: 12,
  streak: 3,
  streakMultiplier: "×1.75",
  streakPips: [true, true, true, false, false],
};

export const OPPONENT: Player = {
  name: "Kestrel",
  address: "0x91be…42a7",
  score: 140,
  wins: 9,
  streak: 0,
  streakMultiplier: "×1.0",
  streakPips: [false, false, false, false, false],
};

export const YOUR_FLEET: FleetShip[] = [
  { name: "Carrier", type: "carrier", hits: 1, size: 5, sunk: false },
  { name: "Battleship", type: "battleship", hits: 1, size: 4, sunk: false },
  { name: "Cruiser", type: "cruiser", hits: 1, size: 3, sunk: false },
  { name: "Submarine", type: "submarine", hits: 0, size: 3, sunk: false },
  { name: "Destroyer", type: "destroyer", hits: 0, size: 2, sunk: false },
];

export const MY_SHIPS: Ship[] = [
  { type: "carrier", size: 5, row: 1, col: 1, vertical: false },
  { type: "battleship", size: 4, row: 2, col: 8, vertical: true },
  { type: "cruiser", size: 3, row: 6, col: 1, vertical: false },
  { type: "submarine", size: 3, row: 8, col: 4, vertical: false },
  { type: "destroyer", size: 2, row: 4, col: 3, vertical: false },
];

function makeCells(
  hits: string[],
  misses: string[],
  mines: string[]
): BoardCells {
  const cells: BoardCells = {};
  hits.forEach((k) => (cells[k] = "hit"));
  misses.forEach((k) => (cells[k] = "miss"));
  mines.forEach((k) => (cells[k] = "mine"));
  return cells;
}

export const MY_BOARD_CELLS: BoardCells = makeCells(
  ["1,1", "2,8", "6,1"],
  ["0,0", "5,5", "7,2", "9,8", "2,9"],
  ["3,6", "7,8", "9,1"]
);

export const FOE_BOARD_CELLS: BoardCells = {
  "4,4": "hit",
  "4,5": "hit",
  "4,6": "hit",
  "7,2": "sunk",
  "7,3": "sunk",
  "2,2": "boom",
  "0,6": "miss",
  "1,1": "miss",
  "5,8": "miss",
  "8,5": "miss",
  "9,0": "miss",
  "6,6": "miss",
  "3,3": "miss",
};

export const FOE_SHIPS: Ship[] = [
  { type: "destroyer", size: 2, row: 7, col: 2, vertical: false, wreck: true },
];

export const SHOT_LOG: ShotLogEntry[] = [
  { cell: "E5", actor: "you", result: "hit", multiplier: "×1.75" },
  { cell: "H3", actor: "opponent", result: "miss" },
  { cell: "E4", actor: "you", result: "hit", multiplier: "×1.5" },
  { cell: "B2", actor: "opponent", result: "hit" },
  { cell: "H3", actor: "you", result: "sunk", detail: "Destroyer sunk" },
  { cell: "C3", actor: "you", result: "mine", detail: "Mine −20" },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  { sender: "Kestrel", text: "nice shot, lucky streak" },
  { sender: "You", text: "aiming for the carrier next", isMe: true },
  { sender: "Rook", text: "this is a good one" },
];

export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: "Admiral Vega", wins: 41, points: 6820 },
  { rank: 2, name: "Kestrel", wins: 9, points: 1950 },
  { rank: 3, name: "Captain Mira (you)", wins: 12, points: 1740, isYou: true },
  { rank: 4, name: "Rook", wins: 7, points: 1210 },
];

export const BADGES: Badge[] = [
  { name: "First Win", locked: false, color: "gold" },
  { name: "Hot Streak", locked: false, color: "red" },
  { name: "Mine Dodger", locked: false, color: "teal" },
  { name: "Perfect Game", locked: true, color: "gold" },
  { name: "Admiral", locked: true, color: "gold" },
];

export const MATCH_STEPS: MatchStep[] = [
  {
    label: "Boards committed",
    description: "Both fleets locked before the first shot",
    status: "done",
  },
  {
    label: "Battle in progress",
    description: "Result is saved when the match ends",
    status: "active",
  },
  {
    label: "Recorded on-chain",
    description: "No gas needed from you",
    status: "pending",
  },
  {
    label: "Replay verified",
    description: "Anyone can recompute the result hash",
    status: "pending",
  },
];
