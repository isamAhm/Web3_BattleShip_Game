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
    if (diff < 60_000) return "just now";
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
    return d.toLocaleDateString();
  };

  const shotCount = (m: MatchRecord) => m.shots?.length ?? "—";

  const duration = (m: MatchRecord) => {
    if (!m.startedAt || !m.endedAt) return "—";
    const ms = new Date(m.endedAt).getTime() - new Date(m.startedAt).getTime();
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  if (loading) return <div className="text-center py-20 text-[var(--mist)]">Loading replays…</div>;

  if (error) return (
    <div className="text-center py-20 text-[var(--flare)] text-[14px]">{error}</div>
  );

  if (matches.length === 0) return (
    <div
      className="text-center py-20 rounded-[20px] border"
      style={{ borderColor: "var(--line)", background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))" }}
    >
      <div className="text-[40px] mb-4">⚓</div>
      <div className="font-display font-bold text-[18px] mb-2">No matches yet</div>
      <div className="text-[var(--mist)] text-[14px]">
        Play a match and it will appear here with a verifiable result hash.
      </div>
    </div>
  );

  return (
    <div className="grid gap-4">
      {matches.map((match) => {
        const vr = verifyResults[match.matchId];
        const isVerifying = verifying === match.matchId;
        const shortId = match.matchId.slice(0, 8);
        const shortHash = match.resultHash
          ? `${match.resultHash.slice(0, 10)}…${match.resultHash.slice(-6)}`
          : "pending";

        return (
          <div
            key={match.matchId}
            className="rounded-[20px] p-5 border flex flex-col md:flex-row md:items-center gap-4"
            style={{
              background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
              borderColor: "var(--line)",
            }}
          >
            {/* Result badge */}
            <span
              className="w-16 h-16 rounded-[18px] flex-none grid place-items-center font-display font-extrabold text-[13px] text-center"
              style={{
                background: match.winner ? "rgba(53,214,192,0.12)" : "rgba(143,176,173,0.1)",
                color: "var(--signal)",
                border: "1px solid rgba(53,214,192,0.25)",
              }}
            >
              {match.winner ? "Done" : "Draw"}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-display font-bold text-[15px] tracking-tight mb-1">
                Match #{shortId}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[var(--mist)] text-[13px]">
                <span>🏆 {match.winner ? `${match.winner.slice(0, 8)}…` : "—"}</span>
                <span>⏱ {duration(match)}</span>
                <span>🎯 {shotCount(match)} shots</span>
                <span>🕐 {formatDate(match.endedAt)}</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                  match.chainStatus === "simulated" ? "bg-[rgba(53,214,192,0.1)] text-[var(--signal)]" :
                  match.chainStatus === "confirmed" ? "bg-[rgba(53,214,192,0.2)] text-[var(--signal)]" :
                  "bg-[rgba(235,181,74,0.1)] text-[var(--brass)]"
                )}>
                  {match.chainStatus}
                </span>
              </div>
              <div
                className="mt-2 px-2.5 py-1 rounded-[8px] text-[12px] text-[var(--mist)] font-mono truncate"
                style={{ background: "var(--abyss)" }}
              >
                {shortHash}
              </div>

              {/* Verify result */}
              {vr && (
                <div
                  className={cn(
                    "mt-2 px-3 py-2 rounded-[10px] text-[13px] flex items-center gap-2",
                    vr.verified ? "bg-[rgba(53,214,192,0.08)]" : "bg-[rgba(255,106,77,0.08)]"
                  )}
                >
                  <span>{vr.verified ? "✅ Verified" : "❌ Mismatch"}</span>
                  {vr.chainTx && (
                    <span className="text-[var(--mist)] font-mono text-[11px] truncate">
                      tx: {vr.chainTx.slice(0, 16)}…
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-none">
              <button
                type="button"
                onClick={() => handleVerify(match.matchId)}
                disabled={isVerifying}
                className="px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all hover:-translate-y-px disabled:opacity-50"
                style={{ background: "var(--signal)", color: "var(--abyss)" }}
              >
                {isVerifying ? "…" : "Verify"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
