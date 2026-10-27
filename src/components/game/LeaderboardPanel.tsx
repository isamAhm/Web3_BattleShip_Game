"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { LeaderboardEntry } from "@/types/game";

const TABS = ["Points", "Best streak", "Fastest win"];

export function LeaderboardPanel({ entries }: { entries: LeaderboardEntry[] }) {
  const [active, setActive] = useState(0);

  return (
    <section
      className="rounded-[20px] p-5 border"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <h2 className="font-display font-bold text-[17px] tracking-tight">
        Leaderboard
      </h2>

      {/* Tabs */}
      <div
        className="flex gap-1 mt-3 p-1 rounded-[12px] w-max"
        style={{ background: "var(--abyss)" }}
        role="group"
        aria-label="Leaderboard view"
      >
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            aria-pressed={i === active}
            onClick={() => setActive(i)}
            className={cn(
              "border-0 px-3.5 py-1.5 rounded-[9px] text-[14px] font-medium transition-colors",
              i === active
                ? "bg-[var(--hull)] text-[var(--foam)]"
                : "bg-transparent text-[var(--mist)] hover:text-[var(--foam)]"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      <table className="w-full border-collapse mt-3">
        <thead>
          <tr>
            <th className="text-left font-medium text-[var(--mist)] text-[13px] py-1.5 w-[34px]">
              #
            </th>
            <th className="text-left font-medium text-[var(--mist)] text-[13px] py-1.5">
              Player
            </th>
            <th className="text-left font-medium text-[var(--mist)] text-[13px] py-1.5">
              Wins
            </th>
            <th className="text-right font-medium text-[var(--mist)] text-[13px] py-1.5">
              Points
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr
              key={entry.rank}
              style={{ color: entry.isYou ? "var(--brass)" : undefined }}
            >
              <td
                className="py-[11px] font-display font-extrabold text-[16px] text-[var(--mist)]"
                style={{
                  borderTop: "1px solid var(--line)",
                  color: entry.isYou ? "var(--brass)" : undefined,
                }}
              >
                {entry.rank}
              </td>
              <td style={{ borderTop: "1px solid var(--line)", paddingTop: 11, paddingBottom: 11 }}>
                {entry.name}
              </td>
              <td style={{ borderTop: "1px solid var(--line)", paddingTop: 11, paddingBottom: 11 }}>
                {entry.wins}
              </td>
              <td
                className="text-right"
                style={{ borderTop: "1px solid var(--line)", paddingTop: 11, paddingBottom: 11 }}
              >
                {entry.points.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
