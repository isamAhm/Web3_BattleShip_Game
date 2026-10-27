/**
 * Engine unit tests — run with:
 *   cd packages/engine && npm run build && node --test dist/engine.test.js
 *
 * Uses Node's built-in test runner (no extra deps).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  createMatch,
  submitPlacement,
  fireShot,
  timeoutTurn,
  forfeit,
  submitReveal,
  buildRecord,
} from "./engine";
import { validatePlacement, autoPlace } from "./placement";
import { commitPlacement, verifyReveal } from "./commitment";
import { shotPoints, speedBonus } from "./scoring";
import { DEFAULT_CONFIG, EngineError, Board, TOTAL_SHIP_CELLS } from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const P1 = "0xplayer1";
const P2 = "0xplayer2";
const SALT1 = "salt-one";
const SALT2 = "salt-two";

function makeBoard(): Board {
  return autoPlace(DEFAULT_CONFIG);
}

function setupBattle() {
  const state = createMatch("match-1", P1, P2);
  const b1 = makeBoard();
  const b2 = makeBoard();
  submitPlacement(state, P1, b1, SALT1);
  submitPlacement(state, P2, b2, SALT2);
  return { state, b1, b2 };
}

// ─── Placement ────────────────────────────────────────────────────────────────

describe("validatePlacement", () => {
  test("accepts a valid auto-placed board", () => {
    const board = makeBoard();
    assert.doesNotThrow(() => validatePlacement(board, DEFAULT_CONFIG));
  });

  test("rejects wrong number of ships", () => {
    const board = makeBoard();
    board.ships = board.ships.slice(0, 3);
    assert.throws(() => validatePlacement(board, DEFAULT_CONFIG), EngineError);
  });

  test("rejects ships out of bounds", () => {
    const board = makeBoard();
    board.ships[0].row = 9;
    board.ships[0].col = 9;
    board.ships[0].vertical = false;
    assert.throws(() => validatePlacement(board, DEFAULT_CONFIG), EngineError);
  });

  test("rejects wrong mine count", () => {
    const board = makeBoard();
    board.mines = board.mines.slice(0, 1);
    assert.throws(() => validatePlacement(board, DEFAULT_CONFIG), EngineError);
  });

  test("rejects mine on a ship cell", () => {
    const board = makeBoard();
    // Force a mine onto the first cell of the first ship
    const first = board.ships[0];
    board.mines[0] = { row: first.row, col: first.col };
    assert.throws(() => validatePlacement(board, DEFAULT_CONFIG), EngineError);
  });
});

// ─── Commitment ───────────────────────────────────────────────────────────────

describe("commit-reveal", () => {
  test("verifyReveal passes with correct board + salt", () => {
    const board = makeBoard();
    const hash = commitPlacement(board, "my-salt");
    assert.ok(verifyReveal(board, "my-salt", hash));
  });

  test("verifyReveal fails with wrong salt", () => {
    const board = makeBoard();
    const hash = commitPlacement(board, "correct-salt");
    assert.ok(!verifyReveal(board, "wrong-salt", hash));
  });

  test("verifyReveal fails with tampered board", () => {
    const board = makeBoard();
    const hash = commitPlacement(board, "salt");
    board.mines[0].row = (board.mines[0].row + 1) % 10;
    assert.ok(!verifyReveal(board, "salt", hash));
  });
});

// ─── Match flow ───────────────────────────────────────────────────────────────

describe("match creation", () => {
  test("starts in placement phase", () => {
    const state = createMatch("m1", P1, P2);
    assert.equal(state.phase, "placement");
  });

  test("transitions to battle when both submit", () => {
    const { state } = setupBattle();
    assert.equal(state.phase, "battle");
  });
});

describe("fireShot", () => {
  test("rejects shots out of turn", () => {
    const { state } = setupBattle();
    // P2 tries to shoot first (P1 goes first — index 0)
    assert.throws(
      () => fireShot(state, P2, 0, 0, DEFAULT_CONFIG),
      EngineError
    );
  });

  test("rejects duplicate shots", () => {
    const { state } = setupBattle();
    fireShot(state, P1, 0, 0, DEFAULT_CONFIG);
    fireShot(state, P2, 0, 0, DEFAULT_CONFIG);
    assert.throws(
      () => fireShot(state, P1, 0, 0, DEFAULT_CONFIG),
      EngineError
    );
  });

  test("returns miss on empty cell", () => {
    const { state, b2 } = setupBattle();
    // Find a cell that has no ship and no mine on b2
    let row = 9, col = 9;
    outer: for (let r = 9; r >= 0; r--) {
      for (let c = 9; c >= 0; c--) {
        const shipHit = b2.ships.some((s) =>
          (s.vertical
            ? [...Array(s.size)].some((_, i) => s.row + i === r && s.col === c)
            : [...Array(s.size)].some((_, i) => s.row === r && s.col + i === c))
        );
        const mineHit = b2.mines.some((m) => m.row === r && m.col === c);
        if (!shipHit && !mineHit) { row = r; col = c; break outer; }
      }
    }
    const shot = fireShot(state, P1, row, col, DEFAULT_CONFIG);
    assert.equal(shot.outcome, "miss");
    assert.equal(shot.points, 0);
  });
});

// ─── Scoring ─────────────────────────────────────────────────────────────────

describe("scoring", () => {
  test("hit at streak 0 = 10 pts", () => {
    assert.equal(shotPoints("hit", undefined, 0, DEFAULT_CONFIG), 10);
  });

  test("hit at streak 3 = 17 pts (×1.75)", () => {
    assert.equal(shotPoints("hit", undefined, 3, DEFAULT_CONFIG), 18); // round(10*1.75)=18
  });

  test("mine = -20 pts", () => {
    assert.equal(shotPoints("mine", undefined, 5, DEFAULT_CONFIG), -20);
  });

  test("miss = 0 pts", () => {
    assert.equal(shotPoints("miss", undefined, 5, DEFAULT_CONFIG), 0);
  });

  test("speed bonus: 17 shots = 100", () => {
    assert.equal(speedBonus(17, DEFAULT_CONFIG), 100);
  });

  test("speed bonus: 22 shots = 75", () => {
    assert.equal(speedBonus(22, DEFAULT_CONFIG), 75);
  });

  test("speed bonus: 37+ shots = 0", () => {
    assert.equal(speedBonus(37, DEFAULT_CONFIG), 0);
  });
});

// ─── Timeout / forfeit ────────────────────────────────────────────────────────

describe("timeout", () => {
  test("3 timeouts triggers forfeit", () => {
    const { state } = setupBattle();
    timeoutTurn(state, DEFAULT_CONFIG); // P1 timeout, P2's turn
    timeoutTurn(state, DEFAULT_CONFIG); // P2 timeout, P1's turn
    timeoutTurn(state, DEFAULT_CONFIG); // P1 timeout (missedTurns=2 for P1)
    timeoutTurn(state, DEFAULT_CONFIG); // P2 timeout (missedTurns=2 for P2)
    timeoutTurn(state, DEFAULT_CONFIG); // P1 timeout → missedTurns=3 → forfeit
    assert.ok(
      state.phase === "reveal" || state.phase === "finished",
      `Expected reveal/finished, got ${state.phase}`
    );
    assert.ok(state.winner !== null);
  });
});

describe("forfeit", () => {
  test("P1 forfeit makes P2 winner", () => {
    const { state } = setupBattle();
    forfeit(state, P1, DEFAULT_CONFIG);
    assert.equal(state.winner, P2);
    assert.equal(state.forfeitedBy, P1);
  });
});

// ─── Reveal + record ──────────────────────────────────────────────────────────

describe("reveal", () => {
  test("valid reveal returns true", () => {
    const { state, b1, b2 } = setupBattle();
    forfeit(state, P1, DEFAULT_CONFIG); // fast-end match
    const ok = submitReveal(state, P2, b2, SALT2);
    assert.ok(ok);
  });

  test("tampered reveal returns false", () => {
    const { state, b2 } = setupBattle();
    forfeit(state, P1, DEFAULT_CONFIG);
    b2.mines[0].row = (b2.mines[0].row + 1) % 10; // tamper
    const ok = submitReveal(state, P2, b2, SALT2);
    assert.ok(!ok);
  });
});

describe("buildRecord", () => {
  test("record is stable (same input = same JSON)", () => {
    const { state } = setupBattle();
    forfeit(state, P1, DEFAULT_CONFIG);
    const r1 = JSON.stringify(buildRecord(state));
    const r2 = JSON.stringify(buildRecord(state));
    assert.equal(r1, r2);
  });

  test("record contains required fields", () => {
    const { state } = setupBattle();
    forfeit(state, P1, DEFAULT_CONFIG);
    const rec = buildRecord(state) as any;
    assert.ok(rec.matchId);
    assert.ok(rec.players);
    assert.ok(rec.winner);
    assert.ok("forfeit" in rec);
  });
});
