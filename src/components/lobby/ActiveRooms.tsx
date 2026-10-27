"use client";

import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ROOMS = [
  {
    id: "R-4421",
    name: "Admiral Vega's Fleet",
    host: "Admiral Vega",
    mode: "Classic",
    players: "1/2",
    mines: 3,
    status: "waiting",
    spectators: 4,
  },
  {
    id: "R-3817",
    name: "Rook's Blitz Room",
    host: "Rook",
    mode: "Blitz",
    players: "1/2",
    mines: 0,
    status: "waiting",
    spectators: 1,
  },
  {
    id: "R-2290",
    name: "Open Classic",
    host: "SilverHull",
    mode: "Classic",
    players: "2/2",
    mines: 5,
    status: "in-progress",
    spectators: 8,
  },
  {
    id: "R-1103",
    name: "Phantom vs Anyone",
    host: "Phantom",
    mode: "Classic",
    players: "1/2",
    mines: 3,
    status: "waiting",
    spectators: 0,
  },
  {
    id: "R-0988",
    name: "Corsair Night Match",
    host: "Corsair",
    mode: "Blitz",
    players: "2/2",
    mines: 2,
    status: "in-progress",
    spectators: 3,
  },
];

const MODE_COLORS: Record<string, string> = {
  Classic: "var(--signal)",
  Blitz: "var(--flare)",
  Tournament: "var(--brass)",
  Private: "var(--mist)",
};

export function ActiveRooms() {
  const [filter, setFilter] = useState<"all" | "waiting" | "in-progress">("all");

  const filtered = ROOMS.filter(
    (r) => filter === "all" || r.status === filter
  );

  return (
    <section>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="font-display font-bold text-[20px] tracking-tight">
          Active Rooms
        </h2>

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
                "px-3 py-1.5 rounded-[7px] text-[13px] font-medium capitalize transition-colors",
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
          <span>Room</span>
          <span>Mode</span>
          <span>Players</span>
          <span>Mines</span>
          <span>Spectators</span>
          <span className="text-right">Action</span>
        </div>

        {filtered.length === 0 && (
          <div
            className="text-center py-10 text-[var(--mist)]"
            style={{ background: "rgba(6,20,26,0.4)" }}
          >
            No rooms match this filter.
          </div>
        )}

        {filtered.map((room, i) => (
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
              <div className="font-medium text-[14px] truncate">{room.name}</div>
              <div className="text-[var(--mist)] text-[12px] mt-0.5">
                {room.host}
              </div>
            </div>

            {/* Mode */}
            <span
              className="text-[12px] font-semibold px-2.5 py-1 rounded-full w-fit"
              style={{
                background: `color-mix(in srgb, ${MODE_COLORS[room.mode]} 12%, transparent)`,
                color: MODE_COLORS[room.mode],
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
                <Link
                  href="/arena"
                  className="px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px"
                  style={{
                    background: "var(--accent-cta)",
                    color: "var(--cta-text)",
                    boxShadow: "0 4px 16px -4px var(--cta-shadow)",
                  }}
                >
                  Join
                </Link>
              ) : (
                <Link
                  href="/arena"
                  className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-all hover:bg-[var(--hull)]"
                  style={{ borderColor: "var(--line)", color: "var(--mist)" }}
                >
                  Watch
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Refresh hint */}
      <p className="text-[var(--mist)] text-[12px] mt-3 text-right">
        Rooms refresh every 10 seconds · {ROOMS.length} total
      </p>
    </section>
  );
}
