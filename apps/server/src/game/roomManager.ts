import { MatchState, GameConfig, DEFAULT_CONFIG } from "@battle-arena/engine";
import { createMatch } from "@battle-arena/engine";

interface RoomMeta {
  state: MatchState;
  config: GameConfig;
  /** socket IDs keyed by player address */
  sockets: Record<string, string>;
  /** turn timer handle */
  timer: NodeJS.Timeout | null;
  /** spectator socket IDs */
  spectators: Set<string>;
}

// In-memory room store (replace with Redis for multi-process)
const rooms = new Map<string, RoomMeta>();

export function createRoom(
  matchId: string,
  playerA: string,
  playerB: string,
  config: GameConfig = DEFAULT_CONFIG
): RoomMeta {
  const state = createMatch(matchId, playerA, playerB, config);
  const room: RoomMeta = {
    state,
    config,
    sockets: {},
    timer: null,
    spectators: new Set(),
  };
  rooms.set(matchId, room);
  return room;
}

export function getRoom(matchId: string): RoomMeta | undefined {
  return rooms.get(matchId);
}

export function deleteRoom(matchId: string): void {
  const room = rooms.get(matchId);
  if (room?.timer) clearTimeout(room.timer);
  rooms.delete(matchId);
}

export function getRoomByPlayer(address: string): RoomMeta | undefined {
  for (const room of rooms.values()) {
    if (room.state.playerIds.includes(address)) return room;
  }
  return undefined;
}

/** All rooms (for admin/debug) */
export function allRooms(): RoomMeta[] {
  return [...rooms.values()];
}
