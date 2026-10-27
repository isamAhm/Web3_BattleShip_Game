import { Board, Cell, ShipPlacement, SHIP_DEFS, GameConfig, EngineError } from "./types";

/**
 * Returns the list of cells occupied by a ship placement.
 */
export function shipCells(s: ShipPlacement): Cell[] {
  const cells: Cell[] = [];
  for (let i = 0; i < s.size; i++) {
    cells.push({
      row: s.row + (s.vertical ? i : 0),
      col: s.col + (s.vertical ? 0 : i),
    });
  }
  return cells;
}

/**
 * Validate a full board placement.
 * Throws EngineError with a descriptive message on any violation.
 */
export function validatePlacement(board: Board, config: GameConfig): void {
  const { boardSize, minesPerPlayer } = config;

  // ── Ship checks ──────────────────────────────────────────────────────────
  if (board.ships.length !== SHIP_DEFS.length) {
    throw new EngineError(
      `Expected ${SHIP_DEFS.length} ships, got ${board.ships.length}`
    );
  }

  // Every ship type must appear exactly once with the correct size
  const remaining = new Map(SHIP_DEFS.map((d) => [d.type, d.size]));
  for (const ship of board.ships) {
    if (!remaining.has(ship.type)) {
      throw new EngineError(`Unexpected or duplicate ship type: ${ship.type}`);
    }
    const expected = remaining.get(ship.type)!;
    if (ship.size !== expected) {
      throw new EngineError(
        `Ship ${ship.type} has size ${ship.size}, expected ${expected}`
      );
    }
    remaining.delete(ship.type);
  }

  // Collect all occupied ship cells and check bounds + overlaps
  const occupied = new Set<string>();
  for (const ship of board.ships) {
    const cells = shipCells(ship);
    for (const c of cells) {
      if (c.row < 0 || c.row >= boardSize || c.col < 0 || c.col >= boardSize) {
        throw new EngineError(
          `Ship ${ship.type} extends outside the board at (${c.row},${c.col})`
        );
      }
      const key = `${c.row},${c.col}`;
      if (occupied.has(key)) {
        throw new EngineError(`Ships overlap at (${c.row},${c.col})`);
      }
      occupied.add(key);
    }
  }

  // ── Mine checks ──────────────────────────────────────────────────────────
  if (board.mines.length !== minesPerPlayer) {
    throw new EngineError(
      `Expected ${minesPerPlayer} mines, got ${board.mines.length}`
    );
  }

  const mineKeys = new Set<string>();
  for (const mine of board.mines) {
    if (
      mine.row < 0 ||
      mine.row >= boardSize ||
      mine.col < 0 ||
      mine.col >= boardSize
    ) {
      throw new EngineError(
        `Mine outside board at (${mine.row},${mine.col})`
      );
    }
    const key = `${mine.row},${mine.col}`;
    if (occupied.has(key)) {
      throw new EngineError(`Mine overlaps a ship at (${mine.row},${mine.col})`);
    }
    if (mineKeys.has(key)) {
      throw new EngineError(`Duplicate mine at (${mine.row},${mine.col})`);
    }
    mineKeys.add(key);
  }
}

/**
 * Auto-place ships and mines randomly (used for placement timeouts).
 */
export function autoPlace(config: GameConfig): Board {
  const { boardSize, minesPerPlayer } = config;
  const occupied = new Set<string>();
  const ships: ShipPlacement[] = [];

  for (const def of SHIP_DEFS) {
    let placed = false;
    while (!placed) {
      const vertical = Math.random() < 0.5;
      const maxRow = vertical ? boardSize - def.size : boardSize - 1;
      const maxCol = vertical ? boardSize - 1 : boardSize - def.size;
      const row = Math.floor(Math.random() * (maxRow + 1));
      const col = Math.floor(Math.random() * (maxCol + 1));
      const cells: Cell[] = [];
      let ok = true;
      for (let i = 0; i < def.size; i++) {
        const r = row + (vertical ? i : 0);
        const c = col + (vertical ? 0 : i);
        if (occupied.has(`${r},${c}`)) { ok = false; break; }
        cells.push({ row: r, col: c });
      }
      if (ok) {
        cells.forEach((c) => occupied.add(`${c.row},${c.col}`));
        ships.push({ ...def, row, col, vertical });
        placed = true;
      }
    }
  }

  const mines: Cell[] = [];
  while (mines.length < minesPerPlayer) {
    const row = Math.floor(Math.random() * boardSize);
    const col = Math.floor(Math.random() * boardSize);
    const key = `${row},${col}`;
    if (!occupied.has(key) && !mines.some((m) => m.row === row && m.col === col)) {
      mines.push({ row, col });
    }
  }

  return { ships, mines };
}
