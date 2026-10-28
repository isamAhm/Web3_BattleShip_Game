"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthCtx } from "@/lib/AuthContext";

interface Tournament {
  tournamentId: string;
  title: string;
  description: string;
  status: "open" | "closed";
  startTime: string;
  endTime: string;
  standings?: Array<{ address: string; points: number; wins: number; rank: number }>;
}

export default function TournamentsPage() {
  const router = useRouter();
  const { address } = useAuthCtx();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);

  useEffect(() => {
    setIsLoading(true);
    api.tournaments.list()
      .then((data) => {
        setTournaments(data || []);
      })
      .catch((err) => {
        console.warn("Could not load tournaments:", err);
      })
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[var(--line)] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display font-extrabold text-[32px] tracking-tight">
              Tactical Tournament Sectors
            </h1>
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase"
              style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
            >
              On-Chain Verified
            </span>
          </div>
          <p className="text-[14px] text-[var(--mist)] mt-1 max-w-2xl leading-relaxed">
            Scheduled competitive combat windows with verifiable commit-reveal proofs, dynamic multipliers, and prize distributions.
          </p>
        </div>

        <Link
          href="/play"
          className="flex items-center gap-2 px-5 py-2.5 rounded-[12px] font-bold text-[14px] transition-all hover:-translate-y-px"
          style={{
            background: "var(--accent-cta)",
            color: "var(--cta-text)",
            boxShadow: "0 4px 18px -4px var(--cta-shadow)",
          }}
        >
          ⚔️ Enter Active Arena
        </Link>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-[22px] border p-6 bg-[rgba(12,34,43,0.5)] border-[var(--line)] animate-pulse space-y-4"
            >
              <div className="h-6 w-32 bg-[rgba(53,214,192,0.1)] rounded-[8px]" />
              <div className="h-16 bg-[rgba(12,34,43,0.8)] rounded-[12px]" />
            </div>
          ))
        ) : tournaments.length === 0 ? (
          <div className="col-span-full rounded-[22px] border p-12 text-center" style={{ background: "rgba(12,34,43,0.6)", borderColor: "var(--line)" }}>
            <span className="text-[40px] block mb-3 opacity-60">🏆</span>
            <h3 className="font-display font-bold text-[20px]">Season 1 Open Qualifier Active</h3>
            <p className="text-[13px] text-[var(--mist)] mt-1.5 max-w-md mx-auto">
              All matches played in ranked Quick Match automatically accrue points toward the Season 1 global standings.
            </p>
            <Link
              href="/play"
              className="inline-block mt-5 px-6 py-2.5 rounded-[12px] font-bold text-[14px]"
              style={{ background: "var(--accent-cta)", color: "var(--cta-text)" }}
            >
              Queue For Ranked Match
            </Link>
          </div>
        ) : (
          tournaments.map((t) => {
            const isOpen = t.status === "open";
            return (
              <div
                key={t.tournamentId}
                className="rounded-[22px] border p-6 flex flex-col justify-between transition-all hover:-translate-y-1"
                style={{
                  background: "linear-gradient(180deg,rgba(19,48,59,.65),rgba(12,34,43,.85))",
                  borderColor: isOpen ? "var(--signal)" : "var(--line)",
                  boxShadow: isOpen ? "0 12px 30px -10px rgba(53,214,192,0.15)" : undefined,
                }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase tracking-wider"
                      style={{
                        background: isOpen ? "rgba(53,214,192,0.12)" : "rgba(100,116,139,0.2)",
                        color: isOpen ? "var(--signal)" : "var(--mist)",
                      }}
                    >
                      {isOpen ? "🟢 Registration Open" : "Concluded"}
                    </span>
                    <span className="text-[11px] font-mono text-[var(--mist)]">
                      {new Date(t.startTime).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-[19px] tracking-tight text-[var(--foam)]">
                    {t.title}
                  </h3>
                  <p className="text-[13px] text-[var(--mist)] mt-2 leading-relaxed">
                    {t.description}
                  </p>

                  {/* Standings preview */}
                  {t.standings && t.standings.length > 0 && (
                    <div className="mt-5 p-3 rounded-[12px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)]">
                      <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--mist)] block mb-1.5">
                        Top Sector Leader
                      </span>
                      <div className="flex items-center justify-between text-[12px]">
                        <span className="font-mono font-bold text-[var(--signal)]">
                          {t.standings[0].address.slice(0, 6)}…{t.standings[0].address.slice(-4)}
                        </span>
                        <span className="font-bold text-[var(--brass)]">
                          {t.standings[0].points} PTS ({t.standings[0].wins}W)
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between">
                  <span className="text-[12px] font-mono text-[var(--signal)] font-bold">
                    10,000 ARENA Pool
                  </span>
                  <button
                    type="button"
                    onClick={() => router.push("/play")}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:bg-[var(--hull)]"
                    style={{
                      background: isOpen ? "var(--accent-cta)" : "var(--hull)",
                      color: isOpen ? "var(--cta-text)" : "var(--mist)",
                    }}
                  >
                    {isOpen ? "Deploy Fleet →" : "View Bracket"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
