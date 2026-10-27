import { Board } from "./types";
import { sha3_256 } from "js-sha3";

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
 * Compute commitment hash: keccak256(canonicalBoard + salt)
 */
export function commitPlacement(board: Board, salt: string): string {
  const payload = canonicalBoard(board) + "|" + salt;
  return "0x" + sha3_256(payload);
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
