import { createHash } from "crypto";
import { Board } from "./types";

/**
 * Produce a deterministic canonical string from a board.
 * Ships and mines are sorted so order doesn't matter.
 */
export function canonicalBoard(board: Board): string {
  const ships = [...board.ships]
    .sort((a, b) => a.type.localeCompare(b.type))
    .map((s) => `${s.type}:${s.row},${s.col},${s.vertical ? "v" : "h"}`);

  const mines = [...board.mines]
    .sort((a, b) => a.row !== b.row ? a.row - b.row : a.col - b.col)
    .map((m) => `${m.row},${m.col}`);

  return JSON.stringify({ ships, mines });
}

/**
 * Compute commitment hash: sha3-256(canonicalBoard + salt)
 * Uses Node's built-in crypto — no external deps.
 */
export function commitPlacement(board: Board, salt: string): string {
  const payload = canonicalBoard(board) + "|" + salt;
  return "0x" + createHash("sha3-256").update(payload).digest("hex");
}

/**
 * Verify that a revealed board + salt matches a previously submitted commitment.
 */
export function verifyReveal(
  board: Board,
  salt: string,
  commitment: string
): boolean {
  return commitPlacement(board, salt) === commitment;
}
