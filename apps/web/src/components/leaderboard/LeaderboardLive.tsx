"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = ["points", "streak", "fastest"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  points:  "Points",
  streak:  "Best streak",
  fastest: "Fastest win",
};

const SCORE_LABELS: Record<Tab, string> = {
  points:  "Points",
  streak:  "Streak",
  fastest: "Accuracy %",
};

interface Entry {
  rank: number;
  address: string;
  name: string;
  score: number;
}

export function LeaderboardLive() {
  const [tab, setTab]       = useState<Tab>("points");
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api.leaderboard(tab)
      .then((data) => setEntries(data.entries || []))
      .catch(() => setError("Could not load leaderboard — is the server running?"))
      .finally(() => setLoading(false));
  }, [tab]);

  return (
    <>
      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total matches", value: entries.length > 0 ? `${entries.length * 3}+` : "—" },
          { label: "Ranked players", value: entries.length > 0 ? String(entries.length) : "—" },
          { label: "Chain mode",    value: "Base Sepolia" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[20px] p-5 border"
            style={{ background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))", borderColor: "var(--line)" }}
          >
            <div className="font-display font-extrabold text-[28px] tracking-tighter">{stat.value}</div>
            <div className="text-[var(--mist)] text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{ background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))", borderColor: "var(--line)" }}
      >
        {/* Tab bar */}
        <div
          className="flex items-center gap-1 px-5 py-4 border-b"
          style={{ borderColor: "var(--line)" }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "px-4 py-2 rounded-[10px] text-[14px] font-medium transition-colors",
                tab === t ? "bg-[var(--hull)] text-[var(--foam)]" : "text-[var(--mist)] hover:text-[var(--foam)]"
              )}
            >
              {TAB_LABELS[t]}
            </button>
          ))}
        </div>

        {loading && (
          <div className="text-center py-12 text-[var(--mist)]">Loading leaderboard…</div>
        )}

        {error && (
          <div className="text-center py-12 text-[var(--flare)] text-[14px] px-6">{error}</div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12 text-[var(--mist)]">
            No matches recorded yet. Play a game to appear here!
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["#", "Player", SCORE_LABELS[tab]].map((h, i) => (
                  <th
                    key={h}
                    className="text-left font-medium text-[var(--mist)] text-[13px] py-4 px-5"
                    style={i === 2 ? { textAlign: "right" } : {}}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, i) => (
                <tr
                  key={entry.address || i}
                  className="hover:bg-[rgba(53,214,192,0.03)] transition-colors"
                  style={{ borderTop: i === 0 ? undefined : "1px solid var(--line)" }}
                >
                  <td className="py-4 px-5 font-display font-extrabold text-[16px] text-[var(--mist)] w-[50px]">
                    {entry.rank || i + 1}
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-8 h-8 rounded-full flex-none"
                        style={{ background: "linear-gradient(135deg,var(--signal),#3a6df0)" }}
                        aria-hidden="true"
                      />
                      <div>
                        <div className="font-medium text-[14px]">{entry.name || "Anonymous Sailor"}</div>
                        <div className="text-[var(--mist)] text-[12px] font-mono">
                          {entry.address ? `${entry.address.slice(0, 10)}…` : "—"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-5 text-right font-display font-bold text-[15px]">
                    {entry.score?.toLocaleString() ?? "0"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
