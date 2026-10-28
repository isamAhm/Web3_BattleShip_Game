"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const MODE_COLORS: Record<string, string> = {
  Classic: "var(--signal)",
  Blitz: "var(--flare)",
  Tournament: "var(--brass)",
  Private: "var(--mist)",
};

export interface ActiveRoomsProps {
  onJoinRoom?: (roomCode: string) => void;
}

export function ActiveRooms({ onJoinRoom }: ActiveRoomsProps) {
  const [filter, setFilter] = useState<"all" | "waiting" | "in-progress">("all");
  const [rooms, setRooms] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchRooms = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const data = await api.activeRoomsAndMatches();
      const waiting = (data.rooms || []).map((r: any) => ({
        id: r.id || r.roomCode,
        roomCode: r.isPrivate ? undefined : r.roomCode,
        name: r.name || (r.isPrivate ? `🔒 Private Sector (${r.host})` : `Room ${r.roomCode}`),
        host: r.host || "Host Commander",
        mode: r.isPrivate ? "Private" : (r.mode || "Classic"),
        isPrivate: r.isPrivate ?? true,
        players: r.players || "1/2",
        mines: r.mines ?? 3,
        status: "waiting",
        spectators: r.spectators ?? 0,
      }));

      const active = (data.matches || []).map((m: any) => ({
        id: m.id || m.matchId,
        matchId: m.matchId,
        roomCode: m.roomCode,
        name: m.name || `Battle ${m.matchId.slice(0, 8)}`,
        host: m.host || "Commander Alpha",
        opponent: m.opponent,
        mode: m.mode || "Classic",
        players: m.players || "2/2",
        mines: m.mines ?? 3,
        status: "in-progress",
        spectators: m.spectators ?? 0,
      }));

      setRooms([...waiting, ...active]);
      setLastRefreshed(new Date());
    } catch (err) {
      console.warn("[ActiveRooms] Failed to load active rooms:", err);
    } finally {
      setIsLoading(false);
      if (manual) setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
    const interval = setInterval(() => {
      fetchRooms();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchRooms]);

  const filtered = rooms.filter(
    (r) => filter === "all" || r.status === filter
  );

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-display font-bold text-[20px] tracking-tight">
            Active Rooms & Battles
          </h2>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono font-semibold bg-[rgba(53,214,192,0.1)] text-[var(--signal)] border border-[rgba(53,214,192,0.25)]">
            <span className="w-2 h-2 rounded-full bg-[var(--signal)] animate-pulse" />
            LIVE FEED
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Refresh button */}
          <button
            type="button"
            onClick={() => fetchRooms(true)}
            disabled={isRefreshing}
            className="p-1.5 rounded-[8px] text-[var(--mist)] hover:text-[var(--foam)] transition-colors border border-[var(--line)] hover:bg-[var(--hull)] text-xs flex items-center gap-1 cursor-pointer"
            title="Refresh active rooms"
          >
            <svg
              className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin text-[var(--signal)]")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
              <path d="M16 21h5v-5" />
            </svg>
            <span className="hidden sm:inline">Sync</span>
          </button>

          {/* Filter tabs */}
          <div
            className="flex gap-1 p-1 rounded-[10px]"
            style={{ background: "var(--abyss)" }}
            role="group"
            aria-label="Filter rooms"
          >
            {(["all", "waiting", "in-progress"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-[7px] text-[13px] font-medium capitalize transition-colors cursor-pointer",
                  filter === f
                    ? "bg-[var(--hull)] text-[var(--foam)]"
                    : "text-[var(--mist)] hover:text-[var(--foam)]"
                )}
              >
                {f === "in-progress" ? "In Progress" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-[18px] border overflow-hidden"
        style={{ borderColor: "var(--line)" }}
      >
        {/* Table header */}
        <div
          className="grid gap-4 px-5 py-3 text-[12px] font-semibold text-[var(--mist)] uppercase tracking-wide"
          style={{
            gridTemplateColumns: "1fr 90px 80px 70px 100px 110px",
            background: "rgba(12,34,43,0.8)",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <span>Room / Battle</span>
          <span>Mode</span>
          <span>Players</span>
          <span>Mines</span>
          <span>Spectators</span>
          <span className="text-right">Action</span>
        </div>

        {isLoading ? (
          <div
            className="text-center py-12 text-[var(--mist)] font-mono text-[13px] animate-pulse"
            style={{ background: "rgba(6,20,26,0.4)" }}
          >
            Scanning tactical frequencies…
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-12 px-4"
            style={{ background: "rgba(6,20,26,0.4)" }}
          >
            <p className="text-[14px] text-[var(--mist)]">
              {rooms.length === 0
                ? "No active rooms or ongoing battles detected."
                : "No rooms match the selected filter."}
            </p>
            <p className="text-[12px] text-[var(--mist)] mt-1 opacity-75">
              Create a room or queue for Quick Match above to launch a combat session.
            </p>
          </div>
        ) : (
          filtered.map((room, i) => (
            <div
              key={room.id}
              className="grid gap-4 px-5 py-4 items-center transition-colors hover:bg-[rgba(53,214,192,0.03)]"
              style={{
                gridTemplateColumns: "1fr 90px 80px 70px 100px 110px",
                borderTop: i === 0 ? undefined : "1px solid var(--line)",
                background:
                  i % 2 === 0
                    ? "rgba(12,34,43,0.5)"
                    : "rgba(6,20,26,0.3)",
              }}
            >
              {/* Name + host */}
              <div className="min-w-0">
                <div className="font-medium text-[14px] truncate flex items-center gap-2">
                  <span>{room.name}</span>
                  {room.isPrivate && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[rgba(235,181,74,0.12)] text-[var(--brass)] border border-[rgba(235,181,74,0.25)]">
                      Code Required
                    </span>
                  )}
                  {room.roomCode && !room.isPrivate && (
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-[rgba(53,214,192,0.1)] text-[var(--signal)]">
                      {room.roomCode}
                    </span>
                  )}
                </div>
                <div className="text-[var(--mist)] text-[12px] mt-0.5 truncate">
                  Host: {room.host} {room.opponent ? `vs ${room.opponent}` : ""}
                </div>
              </div>

              {/* Mode */}
              <span
                className="text-[12px] font-semibold px-2.5 py-1 rounded-full w-fit"
                style={{
                  background: `color-mix(in srgb, ${MODE_COLORS[room.mode] || "var(--signal)"} 12%, transparent)`,
                  color: MODE_COLORS[room.mode] || "var(--signal)",
                }}
              >
                {room.mode}
              </span>

              {/* Players */}
              <div className="flex items-center gap-1.5 text-[13px]">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                  <circle cx="5" cy="4" r="2" stroke="var(--mist)" strokeWidth="1.2" />
                  <path d="M1 11c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="var(--mist)" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                </svg>
                <span style={{ color: room.players === "2/2" ? "var(--mist)" : "var(--foam)" }}>
                  {room.players}
                </span>
              </div>

              {/* Mines */}
              <span className="text-[13px] text-[var(--mist)]">
                {room.mines > 0 ? (
                  <span className="flex items-center gap-1">
                    <span
                      className="w-2 h-2 rounded-sm rotate-45 inline-block"
                      style={{ background: "var(--brass)" }}
                      aria-hidden="true"
                    />
                    ×{room.mines}
                  </span>
                ) : (
                  <span className="opacity-40">—</span>
                )}
              </span>

              {/* Spectators */}
              <span className="text-[13px] text-[var(--mist)]">
                {room.spectators > 0 ? `👁 ${room.spectators}` : "—"}
              </span>

              {/* Action */}
              <div className="flex justify-end">
                {room.status === "waiting" ? (
                  <button
                    type="button"
                    onClick={() => {
                      // Private rooms must require the player to enter the secret code themselves!
                      if (onJoinRoom) {
                        onJoinRoom("");
                      }
                    }}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px cursor-pointer"
                    style={{
                      background: "var(--accent-cta)",
                      color: "var(--cta-text)",
                      boxShadow: "0 4px 16px -4px var(--cta-shadow)",
                    }}
                  >
                    Join
                  </button>
                ) : (
                  <Link
                    href={`/arena?match=${room.matchId || room.id}&spectate=true`}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-all hover:bg-[var(--hull)] text-[var(--mist)] hover:text-[var(--foam)] flex items-center gap-1.5"
                    style={{ borderColor: "var(--line)" }}
                  >
                    <span>👁️</span> Watch
                  </Link>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh hint */}
      <div className="flex items-center justify-between text-[var(--mist)] text-[12px] mt-3">
        <span>Auto-sync active (every 5s)</span>
        <span>
          {rooms.length} {rooms.length === 1 ? "room" : "rooms"} active · Updated {lastRefreshed.toLocaleTimeString()}
        </span>
      </div>
    </section>
  );
}
