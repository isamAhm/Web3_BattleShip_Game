export type CellState =
  | "empty"
  | "ship"
  | "hit"
  | "miss"
  | "sunk"
  | "mine"
  | "boom"
  | "aim";

export type ShipType =
  | "carrier"
  | "battleship"
  | "cruiser"
  | "submarine"
  | "destroyer";

export interface Ship {
  type: ShipType;
  size: number;
  row: number;
  col: number;
  vertical: boolean;
  wreck?: boolean;
}

export interface FleetShip {
  name: string;
  type: ShipType;
  hits: number;
  size: number;
  sunk: boolean;
}

export interface ShotLogEntry {
  cell: string;
  actor: "you" | "opponent";
  result: "hit" | "miss" | "sunk" | "mine";
  multiplier?: string;
  detail?: string;
}

export interface ChatMessage {
  sender: string;
  text: string;
  isMe?: boolean;
}

export interface Player {
  name: string;
  address: string;
  score: number;
  wins: number;
  streak: number;
  streakMultiplier: string;
  streakPips: boolean[];
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  wins: number;
  points: number;
  isYou?: boolean;
}

export interface Badge {
  name: string;
  locked: boolean;
  color: "gold" | "red" | "teal";
}

export interface MatchStep {
  label: string;
  description: string;
  status: "done" | "active" | "pending";
}

export type BoardCells = Record<string, CellState>;

/** Re-export Board shape for socket payloads */
export interface Board {
  ships: Ship[];
  mines: Cell[];
}

export interface Cell {
  row: number;
  col: number;
}
