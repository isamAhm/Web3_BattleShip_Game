import type { Server as IoServer, Socket } from "socket.io";
import {
  submitPlacement,
  fireShot,
  timeoutTurn,
  forfeit,
  submitReveal,
  publicView,
  autoPlace,
  Board,
  DEFAULT_CONFIG,
} from "@battle-arena/engine";
import { joinQueue, leaveQueue } from "../game/matchmaking";
import { getRoom, getRoomByPlayer, deleteRoom, createRoom } from "../game/roomManager";
import { recordMatch } from "../game/recordMatch";
import { v4 as uuidv4 } from "uuid";

const TURN_MS = DEFAULT_CONFIG.turnSeconds * 1000;
const PLACEMENT_MS = DEFAULT_CONFIG.placementSeconds * 1000;

export function registerGameHandlers(io: IoServer, socket: Socket & { data: { address: string } }) {
  const addr = socket.data.address;

  // Each player subscribes to a personal room so we can target them by address
  socket.join(`player:${addr}`);

  // Rejoin any existing match room (reconnect)
  const existing = getRoomByPlayer(addr);
  if (existing) {
    socket.join(existing.state.matchId);
    existing.sockets[addr] = socket.id;
    socket.emit("match:rejoin", {
      matchId: existing.state.matchId,
      state: publicView(existing.state, addr),
    });
  }

  // ── Queue ──────────────────────────────────────────────────────────────────

  socket.on("queue:join", async () => {
    await joinQueue(addr, io);
    socket.emit("queue:joined");
  });

  socket.on("queue:leave", async () => {
    await leaveQueue(addr);
    socket.emit("queue:left");
  });

  // ── Private rooms ──────────────────────────────────────────────────────────

  socket.on("room:create", (cb: Function) => {
    const matchId = uuidv4();
    createRoom(matchId, addr, "", DEFAULT_CONFIG); // second player TBD
    socket.join(matchId);
    cb?.({ matchId });
  });

  socket.on("room:join", ({ matchId }: { matchId: string }, cb: Function) => {
    const room = getRoom(matchId);
    if (!room) { cb?.({ error: "Room not found" }); return; }

    // Fill the second player slot if empty
    if (room.state.playerIds[1] === "") {
      room.state.playerIds[1] = addr;
      room.state.players[addr] = {
        id: addr,
        commitment: "",
        board: null,
        shotsFired: new Set(),
        shipCellsHit: 0,
        streak: 0,
        score: 0,
        missedTurns: 0,
      };
    } else if (!room.state.playerIds.includes(addr)) {
      cb?.({ error: "Room full" }); return;
    }

    room.sockets[addr] = socket.id;
    socket.join(matchId);
    io.to(matchId).emit("match:found", {
      matchId,
      opponent: room.state.playerIds.find((id) => id !== addr),
    });
    cb?.({ ok: true });
  });

  // ── Placement ──────────────────────────────────────────────────────────────

  socket.on(
    "placement:submit",
    ({ matchId, board, salt }: { matchId: string; board: Board; salt: string }) => {
      const room = getRoom(matchId);
      if (!room) { socket.emit("error", { msg: "Room not found" }); return; }

      try {
        const battleReady = submitPlacement(room.state, addr, board, salt, room.config);

        socket.emit("placement:ack", {
          commitment: room.state.players[addr].commitment,
        });

        if (battleReady) {
          // Cancel placement timer if running
          if (room.timer) clearTimeout(room.timer);

          io.to(matchId).emit("match:start", {
            matchId,
            state: (() => {
              // Each player gets their own view
              for (const [pid, sid] of Object.entries(room.sockets)) {
                io.to(sid).emit("match:start", {
                  matchId,
                  state: publicView(room.state, pid),
                });
              }
            })(),
          });

          startTurnTimer(io, matchId);
        } else {
          // Start/reset placement timer for the player who just submitted
          if (!room.timer) {
            room.timer = setTimeout(() => {
              // Auto-place for any player who hasn't submitted
              for (const pid of room.state.playerIds) {
                if (!room.state.players[pid].commitment) {
                  const auto = autoPlace(room.config);
                  const salt = uuidv4();
                  try {
                    submitPlacement(room.state, pid, auto, salt, room.config);
                  } catch (_) {}
                }
              }
              startTurnTimer(io, matchId);
            }, PLACEMENT_MS);
          }
        }
      } catch (err: any) {
        socket.emit("error", { msg: err.message });
      }
    }
  );

  // ── Battle ─────────────────────────────────────────────────────────────────

  socket.on(
    "shot:fire",
    async ({ matchId, row, col }: { matchId: string; row: number; col: number }) => {
      const room = getRoom(matchId);
      if (!room) { socket.emit("error", { msg: "Room not found" }); return; }

      try {
        const shot = fireShot(room.state, addr, row, col, room.config);

        // Cancel current turn timer
        if (room.timer) { clearTimeout(room.timer); room.timer = null; }

        // Broadcast shot result to all in room (no board revealed)
        io.to(matchId).emit("shot:result", {
          shooter: addr,
          row,
          col,
          outcome: shot.outcome,
          sunkShipType: shot.sunkShipType ?? null,
          points: shot.points,
          multiplier: shot.multiplier,
          scores: Object.fromEntries(
            room.state.playerIds.map((id) => [id, room.state.players[id].score])
          ),
          streaks: Object.fromEntries(
            room.state.playerIds.map((id) => [id, room.state.players[id].streak])
          ),
        });

        if (room.state.phase === "reveal") {
          io.to(matchId).emit("match:end", {
            winner: room.state.winner,
            scores: Object.fromEntries(
              room.state.playerIds.map((id) => [id, room.state.players[id].score])
            ),
            forfeitedBy: room.state.forfeitedBy,
          });
          await _finishMatch(io, matchId);
        } else {
          startTurnTimer(io, matchId);
        }
      } catch (err: any) {
        socket.emit("error", { msg: err.message });
      }
    }
  );

  // ── Reveal ─────────────────────────────────────────────────────────────────

  socket.on(
    "reveal:submit",
    async ({ matchId, board, salt }: { matchId: string; board: Board; salt: string }) => {
      const room = getRoom(matchId);
      if (!room) return;

      const valid = submitReveal(room.state, addr, board, salt);
      socket.emit("reveal:ack", { valid });

      if (room.state.phase === "finished") {
        // Both revealed — record
        await recordMatch(room.state);
        io.to(matchId).emit("match:verified", {
          resultHash: (await import("../game/recordMatch")).resultHash(room.state),
        });
        deleteRoom(matchId);
      }
    }
  );

  // ── Spectate ───────────────────────────────────────────────────────────────

  socket.on("spectate:join", ({ matchId }: { matchId: string }) => {
    const room = getRoom(matchId);
    if (!room) { socket.emit("error", { msg: "Room not found" }); return; }
    room.spectators.add(socket.id);
    socket.join(matchId);
    socket.emit("spectate:state", publicView(room.state, "spectator"));
  });

  // ── Chat ───────────────────────────────────────────────────────────────────

  socket.on("chat:send", ({ matchId, text }: { matchId: string; text: string }) => {
    if (typeof text !== "string" || text.length > 200) return;
    io.to(matchId).emit("chat:message", {
      sender: addr,
      text: text.trim(),
      ts: Date.now(),
    });
  });

  // ── Invites ────────────────────────────────────────────────────────────────

  socket.on("invite:send", ({ to }: { to: string }) => {
    io.to(`player:${to.toLowerCase()}`).emit("invite:received", {
      from: addr,
      ts: Date.now(),
    });
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────

  socket.on("disconnect", () => {
    const room = getRoomByPlayer(addr);
    if (!room || room.state.phase === "finished") return;

    if (room.state.phase === "battle") {
      forfeit(room.state, addr, room.config);
      io.to(room.state.matchId).emit("match:end", {
        winner: room.state.winner,
        forfeitedBy: addr,
        scores: Object.fromEntries(
          room.state.playerIds.map((id) => [id, room.state.players[id].score])
        ),
      });
      recordMatch(room.state).catch(console.error);
      deleteRoom(room.state.matchId);
    }
  });
}

// ─── Turn timer ───────────────────────────────────────────────────────────────

function startTurnTimer(io: IoServer, matchId: string): void {
  const room = getRoom(matchId);
  if (!room || room.state.phase !== "battle") return;

  const currentPlayer = room.state.playerIds[room.state.currentTurn];

  // Broadcast timer start
  io.to(matchId).emit("turn:timer", {
    player: currentPlayer,
    seconds: DEFAULT_CONFIG.turnSeconds,
  });

  room.timer = setTimeout(async () => {
    const forfeited = timeoutTurn(room.state, room.config);

    io.to(matchId).emit("turn:timeout", { player: currentPlayer });

    if (forfeited) {
      io.to(matchId).emit("match:end", {
        winner: room.state.winner,
        forfeitedBy: currentPlayer,
        scores: Object.fromEntries(
          room.state.playerIds.map((id) => [id, room.state.players[id].score])
        ),
      });
      await _finishMatch(io, matchId);
    } else {
      startTurnTimer(io, matchId);
    }
  }, TURN_MS);
}

async function _finishMatch(io: IoServer, matchId: string): Promise<void> {
  const room = getRoom(matchId);
  if (!room) return;
  try {
    await recordMatch(room.state);
    const { resultHash } = await import("../game/recordMatch");
    io.to(matchId).emit("match:verified", {
      resultHash: resultHash(room.state),
    });
  } catch (err) {
    console.error("recordMatch error:", err);
  }
}
