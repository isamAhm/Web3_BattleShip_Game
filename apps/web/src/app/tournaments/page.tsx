"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuthCtx } from "@/lib/AuthContext";
import { cn } from "@/lib/utils";

interface Standing {
  address: string;
  points: number;
  wins: number;
  rank: number;
}

interface Tournament {
  tournamentId: string;
  title: string;
  description: string;
  status: "open" | "closed";
  startTime: string;
  endTime: string;
  standings?: Standing[];
}

export default function TournamentsPage() {
  const router = useRouter();
  const { address, login } = useAuthCtx();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState<"bracket" | "standings" | "prizes">("bracket");
  const [isRegistering, setIsRegistering] = useState(false);
  const [regSuccessMsg, setRegSuccessMsg] = useState("");
  const [regErrorMsg, setRegErrorMsg] = useState("");

  const loadTournaments = async () => {
    try {
      const data = await api.tournaments.list();
      setTournaments(data || []);
    } catch (err) {
      console.warn("Could not load tournaments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsLoading(true);
    loadTournaments();
  }, []);

  const handleRegister = async (tId: string) => {
    setRegErrorMsg("");
    setRegSuccessMsg("");
    setIsRegistering(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
      let userAddr = address;
      if (!userAddr || !token) {
        userAddr = await login(false);
      }

      const res = await api.tournaments.register(tId);
      setRegSuccessMsg("🎖️ Commander successfully registered! 100 base qualifier points granted.");

      // Refresh list and selected tournament standings
      const updatedList = await api.tournaments.list();
      setTournaments(updatedList || []);
      const updatedCurr = updatedList?.find((t: Tournament) => t.tournamentId === tId);
      if (updatedCurr) {
        setSelectedTournament(updatedCurr);
      }
    } catch (err: any) {
      setRegErrorMsg(err.message || "Failed to register for tournament.");
    } finally {
      setIsRegistering(false);
    }
  };

  const isUserRegistered = (t: Tournament | null) => {
    if (!t || !address || !t.standings) return false;
    return t.standings.some((s) => s.address.toLowerCase() === address.toLowerCase());
  };

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
            const registered = isUserRegistered(t);
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
                      {isOpen ? "🟢 Registration Open" : "🏁 Concluded"}
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

                  {registered && (
                    <div className="mt-3 flex items-center gap-1.5 text-[12px] text-[var(--signal)] font-mono font-semibold">
                      <span>✓</span> Commander Registered
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--line)] flex items-center justify-between">
                  <span className="text-[12px] font-mono text-[var(--signal)] font-bold">
                    10,000 ARENA Pool
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTournament(t);
                      setActiveTab("bracket");
                      setRegSuccessMsg("");
                      setRegErrorMsg("");
                    }}
                    className="px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:bg-[var(--hull)] cursor-pointer"
                    style={{
                      background: isOpen ? "var(--accent-cta)" : "var(--hull)",
                      color: isOpen ? "var(--cta-text)" : "var(--mist)",
                    }}
                  >
                    View Bracket & Details →
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Interactive Tournament Details & Bracket Modal */}
      {selectedTournament && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(6,14,22,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setSelectedTournament(null)}
        >
          <div
            className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-[24px] border relative flex flex-col"
            style={{
              background: "linear-gradient(180deg,rgba(19,48,59,.98),rgba(12,34,43,.99))",
              borderColor: "var(--line)",
              boxShadow: "0 40px 80px -20px rgba(0,0,0,0.8)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--line)] flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-display font-extrabold text-[24px] tracking-tight text-[var(--foam)]">
                    {selectedTournament.title}
                  </h2>
                  <span
                    className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold uppercase"
                    style={{
                      background: selectedTournament.status === "open" ? "rgba(53,214,192,0.12)" : "rgba(100,116,139,0.2)",
                      color: selectedTournament.status === "open" ? "var(--signal)" : "var(--mist)",
                    }}
                  >
                    {selectedTournament.status === "open" ? "🟢 Active Tournament" : "🏁 Concluded"}
                  </span>
                </div>
                <p className="text-[13px] text-[var(--mist)] mt-1">
                  {selectedTournament.description}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTournament(null)}
                className="w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--hull)] text-[var(--mist)] hover:text-white transition-colors"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* Sub-header Navigation Tabs */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--line)] bg-[rgba(6,20,26,0.4)] flex-wrap gap-3">
              <div className="flex gap-2">
                {(["bracket", "standings", "prizes"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-1.5 rounded-[8px] text-[13px] font-semibold transition-colors capitalize",
                      activeTab === tab
                        ? "bg-[var(--hull)] text-[var(--signal)] border border-[rgba(53,214,192,0.3)]"
                        : "text-[var(--mist)] hover:text-[var(--foam)]"
                    )}
                  >
                    {tab === "bracket" ? "Elimination Bracket" : tab === "standings" ? "Standings & Roster" : "Prize Pool"}
                  </button>
                ))}
              </div>

              {/* Action Buttons in Sub-header */}
              <div className="flex items-center gap-3">
                {selectedTournament.status === "open" && (
                  isUserRegistered(selectedTournament) ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTournament(null);
                        router.push("/arena");
                      }}
                      className="px-4 py-1.5 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px"
                      style={{ background: "var(--accent-cta)", color: "var(--cta-text)" }}
                    >
                      ⚔️ Launch Tournament Match
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleRegister(selectedTournament.tournamentId)}
                      disabled={isRegistering}
                      className="px-4 py-1.5 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px disabled:opacity-50"
                      style={{ background: "var(--brass)", color: "#06141a" }}
                    >
                      {isRegistering ? "Registering…" : "Register Commander (+100 PTS)"}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Notification Banner */}
            {regSuccessMsg && (
              <div className="mx-6 mt-4 p-3 rounded-[10px] bg-[rgba(53,214,192,0.1)] border border-[rgba(53,214,192,0.3)] text-[var(--signal)] text-[13px] font-medium flex items-center justify-between">
                <span>{regSuccessMsg}</span>
                <button type="button" onClick={() => setRegSuccessMsg("")} className="text-xs opacity-75 hover:opacity-100">✕</button>
              </div>
            )}
            {regErrorMsg && (
              <div className="mx-6 mt-4 p-3 rounded-[10px] bg-red-950/40 border border-red-500/30 text-red-400 text-[13px] font-medium flex items-center justify-between">
                <span>⚠️ {regErrorMsg}</span>
                <button type="button" onClick={() => setRegErrorMsg("")} className="text-xs opacity-75 hover:opacity-100">✕</button>
              </div>
            )}

            {/* Modal Body */}
            <div className="p-6">
              {activeTab === "bracket" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-[13px] text-[var(--mist)]">
                      8-Commander Single Elimination Tree · On-chain verifiable naval combats.
                    </p>
                    <span className="text-[12px] font-mono text-[var(--signal)]">Best of 1 Standard 10×10</span>
                  </div>

                  {/* Bracket visualization */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
                    {/* Quarter-Finals */}
                    <div className="space-y-4">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--mist)]">
                        Quarter-Finals (Round 1)
                      </div>
                      {[
                        { p1: selectedTournament.standings?.[0]?.address || "0x90F8...c9C1", s1: 1, p2: "0x15d3...6A65", s2: 0, w: 1 },
                        { p1: selectedTournament.standings?.[1]?.address || "0x71C8...5e53", s1: 1, p2: "0x8B22...A14d", s2: 0, w: 1 },
                        { p1: selectedTournament.standings?.[2]?.address || "0x3C44...93BC", s1: 1, p2: "0xFA99...771B", s2: 0, w: 1 },
                        { p1: "0x44D1...902E", s1: 0, p2: "0x9965...A4df", s2: 1, w: 2 },
                      ].map((m, idx) => (
                        <div key={idx} className="p-3 rounded-[12px] bg-[rgba(12,34,43,0.8)] border border-[var(--line)] text-xs space-y-1.5">
                          <div className={cn("flex justify-between items-center", m.w === 1 ? "text-[var(--signal)] font-bold" : "text-[var(--mist)]")}>
                            <span className="font-mono truncate">{m.p1.slice(0, 8)}…</span>
                            <span>{m.s1}</span>
                          </div>
                          <div className={cn("flex justify-between items-center border-t border-[var(--line)] pt-1", m.w === 2 ? "text-[var(--signal)] font-bold" : "text-[var(--mist)]")}>
                            <span className="font-mono truncate">{m.p2.slice(0, 8)}…</span>
                            <span>{m.s2}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Semi-Finals */}
                    <div className="space-y-8 flex flex-col justify-around">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--mist)]">
                        Semi-Finals
                      </div>
                      {[
                        { p1: selectedTournament.standings?.[0]?.address || "0x90F8...c9C1", s1: 1, p2: selectedTournament.standings?.[1]?.address || "0x71C8...5e53", s2: 0, w: 1 },
                        { p1: selectedTournament.standings?.[2]?.address || "0x3C44...93BC", s1: 0, p2: "0x9965...A4df", s2: 1, w: 2 },
                      ].map((m, idx) => (
                        <div key={idx} className="p-3 rounded-[12px] bg-[rgba(12,34,43,0.9)] border border-[var(--line)] text-xs space-y-1.5 shadow-md">
                          <div className={cn("flex justify-between items-center", m.w === 1 ? "text-[var(--signal)] font-bold" : "text-[var(--mist)]")}>
                            <span className="font-mono truncate">{m.p1.slice(0, 8)}…</span>
                            <span>{m.s1}</span>
                          </div>
                          <div className={cn("flex justify-between items-center border-t border-[var(--line)] pt-1", m.w === 2 ? "text-[var(--signal)] font-bold" : "text-[var(--mist)]")}>
                            <span className="font-mono truncate">{m.p2.slice(0, 8)}…</span>
                            <span>{m.s2}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Championship Final */}
                    <div className="space-y-4 flex flex-col justify-center">
                      <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[var(--brass)] flex items-center gap-1.5">
                        <span>🏆</span> Grand Championship
                      </div>
                      <div className="p-4 rounded-[14px] bg-[rgba(19,48,59,0.9)] border-2 border-[var(--brass)] text-xs space-y-2 shadow-xl">
                        <div className="flex justify-between items-center text-[var(--brass)] font-extrabold text-[13px]">
                          <span className="font-mono truncate">0x90F8…c9C1</span>
                          <span>In Combat</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-[var(--line)] pt-1 text-[var(--foam)] font-bold">
                          <span className="font-mono truncate">0x9965…A4df</span>
                          <span>In Combat</span>
                        </div>
                        <div className="pt-2 text-center text-[11px] font-mono text-[var(--mist)]">
                          Winner takes 5,000 ARENA
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "standings" && (
                <div className="space-y-4">
                  <div className="rounded-[16px] border border-[var(--line)] overflow-hidden">
                    <div
                      className="grid grid-cols-4 px-5 py-3 text-[12px] font-semibold text-[var(--mist)] uppercase tracking-wide bg-[rgba(12,34,43,0.8)] border-b border-[var(--line)]"
                    >
                      <span>Rank</span>
                      <span>Commander</span>
                      <span>Score</span>
                      <span className="text-right">Wins</span>
                    </div>

                    {(!selectedTournament.standings || selectedTournament.standings.length === 0) ? (
                      <div className="p-8 text-center text-[var(--mist)]">
                        No commanders registered yet. Be the first to register!
                      </div>
                    ) : (
                      selectedTournament.standings.map((s, idx) => {
                        const isMe = address && s.address.toLowerCase() === address.toLowerCase();
                        return (
                          <div
                            key={s.address + idx}
                            className={cn(
                              "grid grid-cols-4 px-5 py-3.5 items-center text-[13px] border-t border-[var(--line)] transition-colors",
                              isMe ? "bg-[rgba(53,214,192,0.08)] font-bold text-[var(--signal)]" : "hover:bg-[rgba(53,214,192,0.02)]"
                            )}
                          >
                            <span className="font-mono">
                              {idx === 0 ? "🥇 #1" : idx === 1 ? "🥈 #2" : idx === 2 ? "🥉 #3" : `#${s.rank || idx + 1}`}
                            </span>
                            <span className="font-mono truncate flex items-center gap-1.5">
                              <span>{s.address.slice(0, 6)}…{s.address.slice(-4)}</span>
                              {isMe && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--signal)] text-black">YOU</span>}
                            </span>
                            <span className="font-bold text-[var(--brass)]">{s.points} PTS</span>
                            <span className="text-right font-mono text-[var(--foam)]">{s.wins} W</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "prizes" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-[16px] bg-[rgba(19,48,59,0.7)] border-2 border-[var(--brass)] text-center space-y-2">
                      <span className="text-[32px] block">🥇</span>
                      <h4 className="font-display font-extrabold text-[18px] text-[var(--brass)]">1st Place</h4>
                      <p className="font-mono text-[20px] font-black text-white">5,000 ARENA</p>
                      <p className="text-[12px] text-[var(--mist)]">50% Prize Pool + "Abyss Sovereign" On-chain Title</p>
                    </div>

                    <div className="p-5 rounded-[16px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)] text-center space-y-2">
                      <span className="text-[32px] block">🥈</span>
                      <h4 className="font-display font-bold text-[18px] text-[var(--foam)]">2nd Place</h4>
                      <p className="font-mono text-[20px] font-black text-[var(--signal)]">3,000 ARENA</p>
                      <p className="text-[12px] text-[var(--mist)]">30% Prize Pool + Silver Hull Badge</p>
                    </div>

                    <div className="p-5 rounded-[16px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)] text-center space-y-2">
                      <span className="text-[32px] block">🥉</span>
                      <h4 className="font-display font-bold text-[18px] text-[var(--foam)]">3rd Place</h4>
                      <p className="font-mono text-[20px] font-black text-[var(--foam)]">2,000 ARENA</p>
                      <p className="text-[12px] text-[var(--mist)]">20% Prize Pool + Bronze Cannon Badge</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-[14px] bg-[rgba(6,20,26,0.5)] border border-[var(--line)] space-y-2 text-[13px] text-[var(--mist)]">
                    <h5 className="font-bold text-[var(--foam)] text-[14px]">Sector Tournament Rules</h5>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Single-elimination combat on standard 10×10 naval battlefields.</li>
                      <li>3 defensive mine placements per fleet. Sinking all enemy ships advances commander.</li>
                      <li>Commit-reveal proofs submitted to Ethereum Sepolia on completion for tamper-proof scoring.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[var(--line)] flex items-center justify-between bg-[rgba(6,20,26,0.3)] flex-wrap gap-4">
              <span className="text-[12px] font-mono text-[var(--mist)]">
                Tournament ID: {selectedTournament.tournamentId}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedTournament(null)}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border border-[var(--line)] hover:bg-[var(--hull)] text-[var(--mist)]"
                >
                  Close
                </button>
                {selectedTournament.status === "open" && !isUserRegistered(selectedTournament) && (
                  <button
                    type="button"
                    onClick={() => handleRegister(selectedTournament.tournamentId)}
                    disabled={isRegistering}
                    className="px-5 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px"
                    style={{ background: "var(--accent-cta)", color: "var(--cta-text)" }}
                  >
                    {isRegistering ? "Registering…" : "Register Now"}
                  </button>
                )}
                <Link
                  href="/play"
                  className="px-5 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px"
                  style={{ background: "var(--hull)", color: "var(--foam)", border: "1px solid var(--line)" }}
                >
                  Queue for Battle →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
