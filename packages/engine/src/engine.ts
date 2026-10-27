import {
  MatchState,
  PlayerState,
  PlayerId,
  Board,
  Shot,
  GameConfig,
  DEFAULT_CONFIG,
  EngineError,
  TOTAL_SHIP_CELLS,
} from "./types";
import { validatePlacement, shipCells } from "./placement";
import { commitPlacement, verifyReveal } from "./commitment";
import { shotPoints, nextStreak, speedBonus } from "./scoring";

// ─── Factory ─────────────────────────────────────────────────────────────────

export function createMatch(
  matchId: string,
  playerA: PlayerId,
  playerB: PlayerId,
  config: GameConfig = DEFAULT_CONFIG
): MatchState {
  const makePlayer = (id: PlayerId): PlayerState => ({
    id,
    commitment: "",
    board: null,
    shotsFired: new Set(),
    shipCellsHit: 0,
    streak: 0,
    score: 0,
    missedTurns: 0,
  });

  return {
    matchId,
    phase: "placement",
    playerIds: [playerA, playerB],
    players: {
      [playerA]: makePlayer(playerA),
      [playerB]: makePlayer(playerB),
    },
    currentTurn: 0,
    shots: [],
    winner: null,
    forfeitedBy: null,
    startedAt: null,
    endedAt: null,
  };
}

// ─── Placement phase ─────────────────────────────────────────────────────────

/**
 * Called when a player submits their board commitment.
 * Validates the board first, then stores the commitment.
 * Returns true when both players have committed (battle can start).
 */
export function submitPlacement(
  state: MatchState,
  playerId: PlayerId,
  board: Board,
  salt: string,
  config: GameConfig = DEFAULT_CONFIG
): boolean {
  if (state.phase !== "placement") {
    throw new EngineError("Not in placement phase");
  }
  if (!state.players[playerId]) {
    throw new EngineError("Unknown player");
  }

  validatePlacement(board, config);

  const commitment = commitPlacement(board, salt);
  // Store board server-side (hidden from opponent during battle)
  state.players[playerId].board = board;
  state.players[playerId].commitment = commitment;

  // Check if both players are ready
  const both = state.playerIds.every((id) => state.players[id].commitment !== "");
  if (both) {
    state.phase = "battle";
    state.startedAt = Date.now();
    state.currentTurn = 0;
  }
  return both;
}

// ─── Battle phase ─────────────────────────────────────────────────────────────

/**
 * Fire a shot. Returns the Shot record.
 * Mutates state in place.
 */
export function fireShot(
  state: MatchState,
  shooterId: PlayerId,
  row: number,
  col: number,
  config: GameConfig = DEFAULT_CONFIG
): Shot {
  if (state.phase !== "battle") {
    throw new EngineError("Not in battle phase");
  }

  const currentShooter = state.playerIds[state.currentTurn];
  if (currentShooter !== shooterId) {
    throw new EngineError("Not your turn");
  }

  const key = `${row},${col}`;
  const shooterState = state.players[shooterId];
  if (shooterState.shotsFired.has(key)) {
    throw new EngineError("Cell already fired upon");
  }
  if (row < 0 || row >= config.boardSize || col < 0 || col >= config.boardSize) {
    throw new EngineError("Cell out of bounds");
  }

  // Opponent's board
  const opponentId = state.playerIds[1 - state.currentTurn];
  const opponentState = state.players[opponentId];
  const opponentBoard = opponentState.board!;

  // Determine outcome
  let outcome: Shot["outcome"] = "miss";
  let sunkShipType: Shot["sunkShipType"];
  let sunkShipSize: Shot["sunkShipSize"];

  // Check mines first
  const isMine = opponentBoard.mines.some((m) => m.row === row && m.col === col);

  if (isMine) {
    outcome = "mine";
  } else {
    // Check ships
    for (const ship of opponentBoard.ships) {
      const cells = shipCells(ship);
      const cellHit = cells.some((c) => c.row === row && c.col === col);
      if (cellHit) {
        // Count previously hit cells of this ship
        const prevHits = cells.filter((c) =>
          shooterState.shotsFired.has(`${c.row},${c.col}`)
        ).length;

        opponentState.shipCellsHit++;

        if (prevHits === ship.size - 1) {
          // Last cell — ship sunk
          outcome = "sunk";
          sunkShipType = ship.type;
          sunkShipSize = ship.size;
        } else {
          outcome = "hit";
        }
        break;
      }
    }
  }

  const mult = Math.min(
    1.0 + shooterState.streak * config.streakStep,
    config.streakMax
  );
  const points = shotPoints(outcome, sunkShipSize, shooterState.streak, config);

  const shot: Shot = {
    shooter: shooterId,
    row,
    col,
    outcome,
    sunkShipType,
    sunkShipSize,
    points,
    multiplier: mult,
    turnIndex: state.shots.length,
  };

  // Apply changes
  shooterState.shotsFired.add(key);
  shooterState.score = Math.max(0, shooterState.score + points);
  shooterState.streak = nextStreak(outcome, shooterState.streak);
  shooterState.missedTurns = 0; // fired, so reset missed turns

  state.shots.push(shot);

  // Check win condition
  if (opponentState.shipCellsHit >= TOTAL_SHIP_CELLS) {
    _endMatch(state, shooterId, config);
  } else {
    // Advance turn
    state.currentTurn = 1 - state.currentTurn;
  }

  return shot;
}

// ─── Timeout / forfeit ────────────────────────────────────────────────────────

/**
 * Called by the server when a player's turn timer expires.
 * Skips the turn, resets streak, increments missedTurns.
 * Returns true if the player has now forfeited.
 */
export function timeoutTurn(
  state: MatchState,
  config: GameConfig = DEFAULT_CONFIG
): boolean {
  if (state.phase !== "battle") return false;

  const playerId = state.playerIds[state.currentTurn];
  const player = state.players[playerId];

  player.streak = 0;
  player.missedTurns++;
  state.currentTurn = 1 - state.currentTurn;

  if (player.missedTurns >= config.maxMissedTurns) {
    forfeit(state, playerId, config);
    return true;
  }
  return false;
}

/**
 * Forfeit the match for a player (disconnect or explicit).
 */
export function forfeit(
  state: MatchState,
  playerId: PlayerId,
  config: GameConfig = DEFAULT_CONFIG
): void {
  if (state.phase === "finished") return;
  state.forfeitedBy = playerId;
  const winnerId = state.playerIds.find((id) => id !== playerId)!;
  _endMatch(state, winnerId, config, true);
}

// ─── End match ───────────────────────────────────────────────────────────────

function _endMatch(
  state: MatchState,
  winnerId: PlayerId,
  config: GameConfig,
  isForfeit = false
): void {
  state.winner = winnerId;
  state.phase = "reveal";
  state.endedAt = Date.now();

  // Win bonus
  state.players[winnerId].score += config.points.win;

  // Speed bonus (not for forfeit wins)
  if (!isForfeit) {
    const winnerShots = state.shots.filter((s) => s.shooter === winnerId).length;
    state.players[winnerId].score += speedBonus(winnerShots, config);
  }

  // Clamp scores
  for (const id of state.playerIds) {
    state.players[id].score = Math.max(0, Math.round(state.players[id].score));
  }
}

// ─── Reveal phase ────────────────────────────────────────────────────────────

/**
 * Called after match ends. Player submits their board + salt.
 * Returns true if the commitment matches (honest play).
 */
export function submitReveal(
  state: MatchState,
  playerId: PlayerId,
  board: Board,
  salt: string
): boolean {
  const player = state.players[playerId];
  const valid = verifyReveal(board, salt, player.commitment);
  if (valid && state.phase === "reveal") {
    // Check both revealed
    const bothRevealed = state.playerIds.every(
      (id) => state.players[id].board !== null
    );
    if (bothRevealed) state.phase = "finished";
  }
  return valid;
}

// ─── Replay / record ─────────────────────────────────────────────────────────

/**
 * Canonical record for hashing and on-chain storage.
 * Deliberately excludes timestamps so it's reproducible.
 */
export function buildRecord(state: MatchState): object {
  return {
    matchId: state.matchId,
    game: "battleship",
    players: state.playerIds,
    commitments: Object.fromEntries(
      state.playerIds.map((id) => [id, state.players[id].commitment])
    ),
    shots: state.shots.map((s) => ({
      shooter: s.shooter,
      row: s.row,
      col: s.col,
      outcome: s.outcome,
      sunkShipType: s.sunkShipType ?? null,
    })),
    scores: Object.fromEntries(
      state.playerIds.map((id) => [id, state.players[id].score])
    ),
    winner: state.winner,
    forfeit: state.forfeitedBy ?? null,
  };
}

// ─── View helpers ─────────────────────────────────────────────────────────────

/**
 * Returns the subset of match state that a given viewer is allowed to see.
 * Players see their own board; opponents' boards are hidden during battle.
 */
export function publicView(
  state: MatchState,
  viewerId: PlayerId | "spectator"
): object {
  const shots = state.shots.map((s) => ({
    shooter: s.shooter,
    row: s.row,
    col: s.col,
    outcome: s.outcome,
    sunkShipType: s.sunkShipType ?? null,
    points: s.points,
    multiplier: s.multiplier,
  }));

  const players = Object.fromEntries(
    state.playerIds.map((id) => {
      const p = state.players[id];
      const revealBoard =
        state.phase === "finished" || (viewerId !== "spectator" && viewerId === id);
      return [
        id,
        {
          score: p.score,
          streak: p.streak,
          commitment: p.commitment,
          board: revealBoard ? p.board : null,
        },
      ];
    })
  );

  return {
    matchId: state.matchId,
    phase: state.phase,
    currentTurn: state.playerIds[state.currentTurn],
    players,
    shots,
    winner: state.winner,
    forfeitedBy: state.forfeitedBy,
  };
}
