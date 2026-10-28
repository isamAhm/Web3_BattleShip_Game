"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthCtx } from "@/lib/AuthContext";
import type { LeaderboardEntry } from "@/types/game";

const TABS = [
  { label: "Points", key: "points" as const },
  { label: "Best streak", key: "streak" as const },
  { label: "Fastest win", key: "fastest" as const },
];

export function LeaderboardPanel({ entries: propEntries }: { entries?: LeaderboardEntry[] }) {
  const { address } = useAuthCtx();
  const [activeTabIdx, setActiveTabIdx] = useState(0);
  const [entries, setEntries] = useState<LeaderboardEntry[]>(propEntries ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const catKey = TABS[activeTabIdx].key;
        const res = await api.leaderboard(catKey);
        if (!cancelled && res?.entries) {
          const mapped: LeaderboardEntry[] = res.entries.map((e: any, idx: number) => ({
            rank: e.rank ?? idx + 1,
            name: e.username || (e.address ? `${e.address.slice(0, 6)}…${e.address.slice(-4)}` : `Commander #${idx + 1}`),
            wins: e.wins ?? Math.max(1, Math.floor((e.score ?? 100) / 100)),
            points: e.score ?? 0,
            isYou: address && e.address ? e.address.toLowerCase() === address.toLowerCase() : false,
          }));
          setEntries(mapped);
        }
      } catch (err) {
        console.warn("[LeaderboardPanel] Failed to fetch leaderboard:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchLeaderboard();
    return () => {
      cancelled = true;
    };
  }, [activeTabIdx, address]);

  const scoreColumnLabel = activeTabIdx === 1 ? "Streak" : activeTabIdx === 2 ? "Shots" : "Points";

  return (
    <section
      className="rounded-[20px] p-5 border flex flex-col justify-between"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[17px] tracking-tight">
            Leaderboard
          </h2>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[rgba(53,214,192,0.1)] text-[var(--signal)]">
            ● Live Sync
          </span>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 mt-3 p-1 rounded-[12px] w-max flex-wrap"
          style={{ background: "var(--abyss)" }}
          role="group"
          aria-label="Leaderboard view"
        >
          {TABS.map((tab, i) => (
            <button
              key={tab.label}
              type="button"
              aria-pressed={i === activeTabIdx}
              onClick={() => setActiveTabIdx(i)}
              className={cn(
                "border-0 px-3.5 py-1.5 rounded-[9px] text-[13px] font-medium transition-colors cursor-pointer",
                i === activeTabIdx
                  ? "bg-[var(--hull)] text-[var(--foam)]"
                  : "bg-transparent text-[var(--mist)] hover:text-[var(--foam)]"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="py-8 text-center text-[var(--mist)] font-mono text-[13px] animate-pulse">
            Loading sector rankings…
          </div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-[var(--mist)] text-[13px]">
            No commanders recorded for this sector yet.
          </div>
        ) : (
          <table className="w-full border-collapse mt-3">
            <thead>
              <tr>
                <th className="text-left font-medium text-[var(--mist)] text-[12px] py-1.5 w-[34px]">
                  #
                </th>
                <th className="text-left font-medium text-[var(--mist)] text-[12px] py-1.5">
                  Commander
                </th>
                <th className="text-left font-medium text-[var(--mist)] text-[12px] py-1.5">
                  Wins
                </th>
                <th className="text-right font-medium text-[var(--mist)] text-[12px] py-1.5">
                  {scoreColumnLabel}
                </th>
              </tr>
            </thead>
            <tbody>
              {entries.slice(0, 5).map((entry) => (
                <tr
                  key={entry.rank}
                  style={{ color: entry.isYou ? "var(--brass)" : undefined }}
                  className="transition-colors hover:bg-[rgba(53,214,192,0.03)]"
                >
                  <td
                    className="py-[9px] font-display font-extrabold text-[15px] text-[var(--mist)]"
                    style={{
                      borderTop: "1px solid var(--line)",
                      color: entry.isYou ? "var(--brass)" : undefined,
                    }}
                  >
                    {entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : entry.rank}
                  </td>
                  <td
                    className="truncate max-w-[120px] font-mono text-[13px]"
                    style={{ borderTop: "1px solid var(--line)", paddingTop: 9, paddingBottom: 9 }}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="truncate">{entry.name}</span>
                      {entry.isYou && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--brass)] text-black font-bold">YOU</span>
                      )}
                    </span>
                  </td>
                  <td
                    className="text-[13px] font-mono"
                    style={{ borderTop: "1px solid var(--line)", paddingTop: 9, paddingBottom: 9 }}
                  >
                    {entry.wins}
                  </td>
                  <td
                    className="text-right font-mono font-bold text-[13px]"
                    style={{ borderTop: "1px solid var(--line)", paddingTop: 9, paddingBottom: 9 }}
                  >
                    {entry.points.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 pt-2.5 border-t border-[var(--line)] flex justify-between items-center text-[11px] text-[var(--mist)]">
        <span>Accrued on-chain via Sepolia proofs</span>
        <span>Top 5 commanders</span>
      </div>
    </section>
  );
}
