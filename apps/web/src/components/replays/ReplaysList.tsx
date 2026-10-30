"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MatchRecord {
  matchId: string;
  players: string[];
  winner: string;
  scores: Record<string, number>;
  resultHash: string;
  chainStatus: string;
  txHash?: string;
  startedAt?: string;
  endedAt?: string;
  shots?: any[];
}

interface VerifyResult {
  verified: boolean;
  computed: string;
  stored: string;
  chainTx: string | null;
  chainStatus: string;
}

export function ReplaysList() {
  const [matches, setMatches]       = useState<MatchRecord[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [verifying, setVerifying]   = useState<string | null>(null);
  const [verifyResults, setVerifyResults] = useState<Record<string, VerifyResult>>({});

  useEffect(() => {
    api.matches(undefined, 20)
      .then((data) => setMatches(data.matches ?? []))
      .catch(() => setError("Could not load replays — is the server running?"))
      .finally(() => setLoading(false));
  }, []);

  const handleVerify = async (matchId: string) => {
    setVerifying(matchId);
    try {
      const result = await api.matchVerify(matchId);
      setVerifyResults((prev) => ({ ...prev, [matchId]: result }));
      if (result.stored) {
        setMatches((prev) =>
          prev.map((m) =>
            m.matchId === matchId
              ? {
                  ...m,
                  resultHash: result.stored,
                  chainStatus: result.match?.chainStatus ?? m.chainStatus,
                  txHash: result.chainTx || m.txHash,
                }
              : m
          )
        );
      }
    } catch {
      setVerifyResults((prev) => ({
        ...prev,
        [matchId]: { verified: false, computed: "", stored: "", chainTx: null, chainStatus: "error" },
      }));
    } finally {
      setVerifying(null);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return "—";
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <div>
      {loading && (
        <div className="text-center py-16 text-[var(--mist)]">Loading replays…</div>
      )}

      {error && (
        <div className="rounded-[16px] border p-6 text-center text-[var(--flare)]" style={{ borderColor: "var(--line)" }}>
          {error}
        </div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div
          className="rounded-[20px] border p-12 text-center"
          style={{ background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))", borderColor: "var(--line)" }}
        >
          <div className="text-[32px] mb-3">⚓</div>
          <div className="font-display font-bold text-[18px] mb-1">No recorded matches yet</div>
          <div className="text-[var(--mist)] text-[14px]">
            Play a game in the arena and the audit record will appear here automatically.
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {matches.map((m) => {
          const vResult = verifyResults[m.matchId];
          const isVerifying = verifying === m.matchId;
          const p1 = m.players?.[0] ? `${m.players[0].slice(0, 6)}…${m.players[0].slice(-4)}` : "P1";
          const p2 = m.players?.[1] ? `${m.players[1].slice(0, 6)}…${m.players[1].slice(-4)}` : "P2";

          return (
            <div
              key={m.matchId}
              className="rounded-[20px] p-6 border transition-all hover:border-[var(--signal)]"
              style={{
                background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
                borderColor: "var(--line)",
              }}
            >
              <div className="flex items-start justify-between gap-4 mb-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-extrabold text-[18px]">
                      {p1} vs {p2}
                    </span>
                    <span
                      className="px-2.5 py-0.5 rounded-full text-[12px] font-bold"
                      style={{
                        background: m.winner ? "rgba(53,214,192,0.12)" : "rgba(235,181,74,0.12)",
                        color: m.winner ? "var(--signal)" : "var(--brass)",
                      }}
                    >
                      {m.winner ? "Completed" : "In Progress"}
                    </span>
                  </div>
                  <div className="text-[var(--mist)] text-[13px] mt-1">
                    {formatDate(m.endedAt || m.startedAt)} · {m.shots?.length ?? 0} shots fired
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isVerifying}
                  onClick={() => handleVerify(m.matchId)}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-all hover:-translate-y-px disabled:opacity-60"
                  style={{
                    background: vResult?.verified ? "rgba(53,214,192,0.1)" : "var(--hull)",
                    borderColor: vResult?.verified ? "var(--signal)" : "var(--line)",
                    color: vResult?.verified ? "var(--signal)" : "var(--foam)",
                  }}
                >
                  {isVerifying ? "Verifying…" : vResult ? (vResult.verified ? "✓ Verified" : "✗ Invalid") : "Verify On-Chain"}
                </button>
              </div>

              {/* Hash strip */}
              <div
                className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] font-mono text-[12px] text-[var(--mist)] overflow-x-auto"
                style={{ background: "rgba(0,0,0,0.25)" }}
              >
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--mist)]">Hash</span>
                <span className="truncate">{m.resultHash || "Pending hash computation…"}</span>
              </div>

              {/* Verify result detail */}
              {vResult && (
                <div
                  className="mt-3 p-3.5 rounded-[12px] text-[12px] font-mono border"
                  style={{
                    background: vResult.verified ? "rgba(53,214,192,0.06)" : "rgba(240,107,74,0.06)",
                    borderColor: vResult.verified ? "rgba(53,214,192,0.3)" : "rgba(240,107,74,0.3)",
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold">
                      {vResult.verified ? "✓ Cryptographic Proof Confirmed" : "✗ Verification Failed"}
                    </span>
                    <span className="text-[var(--mist)] capitalize">{vResult.chainStatus}</span>
                  </div>
                  {vResult.chainTx && (
                    <div className="text-[var(--mist)] truncate mt-1">
                      Tx: {vResult.chainTx}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
