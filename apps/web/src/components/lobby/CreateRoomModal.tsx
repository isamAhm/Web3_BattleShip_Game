"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";

const MODES = [
  { id: "classic",    label: "Classic",    icon: "⚓" },
  { id: "blitz",      label: "Blitz",      icon: "⚡" },
  { id: "tournament", label: "Tournament", icon: "🏆" },
];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function CreateRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { address, login } = useAuthCtx();
  const [step, setStep]         = useState<"config" | "ready">("config");
  const [name, setName]         = useState("");
  const [mode, setMode]         = useState("classic");
  const [mines, setMines]       = useState(3);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCode]              = useState(generateCode);
  const [copied, setCopied]     = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const { createRoom } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      console.log(`[CreateRoom] Opponent ${opponent} joined! Launching match ${matchId}`);
      router.push(`/arena?match=${matchId}`);
    },
    onError: (err) => setErrorMsg(err),
  });

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStartCreate = async () => {
    setErrorMsg("");
    setIsCreating(true);
    try {
      if (!address) {
        await login(false);
      }
      const res = await createRoom(roomCode);
      if (!res.ok) {
        setErrorMsg(res.error || "Failed to create room");
        return;
      }
      setStep("ready");
    } catch (err: any) {
      setErrorMsg(err.message || "Connection error");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,14,22,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[500px] rounded-[24px] border relative"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.97),rgba(12,34,43,.99))",
          borderColor: "var(--line)",
          boxShadow: "0 40px 80px -20px rgba(0,0,0,0.7)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-7 py-5 border-b" style={{ borderColor: "var(--line)" }}>
          <div>
            <h2 className="font-display font-bold text-[20px] tracking-tight">
              {step === "config" ? "Create a Room" : "Room Created & Active!"}
            </h2>
            <p className="text-[var(--mist)] text-[13px] mt-0.5">
              {step === "config" ? "Configure your match settings." : "Broadcasting battle frequency. Share code to invite your rival."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--hull)] transition-colors flex-none"
            style={{ color: "var(--mist)" }}
            aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-7">
          {errorMsg && (
            <div className="mb-4 p-3 rounded-[12px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono">
              ⚠️ {errorMsg}
            </div>
          )}

          {step === "config" ? (
            <div className="grid gap-5">
              {/* Room name */}
              <div className="grid gap-1.5">
                <label className="text-[12px] font-semibold tracking-widest uppercase text-[var(--mist)]">Room name</label>
                <input
                  className="input-base"
                  placeholder="e.g. Admiral's War Room"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              {/* Mode */}
              <div className="grid gap-1.5">
                <label className="text-[12px] font-semibold tracking-widest uppercase text-[var(--mist)]">Mode</label>
                <div className="grid grid-cols-3 gap-2">
                  {MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMode(m.id)}
                      className="flex flex-col items-center gap-1 py-3 rounded-[12px] border text-[13px] font-semibold transition-all"
                      style={{
                        background: mode === m.id ? "rgba(53,214,192,0.12)" : "var(--hull)",
                        borderColor: mode === m.id ? "var(--signal)" : "var(--line)",
                        color: mode === m.id ? "var(--signal)" : "var(--foam)",
                      }}
                    >
                      <span className="text-[18px]">{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mines */}
              <div className="flex items-center justify-between py-2 border-y" style={{ borderColor: "var(--line)" }}>
                <div>
                  <div className="font-medium text-[14px]">Tactical Mines</div>
                  <div className="text-[var(--mist)] text-[12px]">Hidden hazards on board (-30 pts if hit)</div>
                </div>
                <div className="flex items-center gap-2">
                  {[0, 1, 3].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setMines(n)}
                      className="w-9 h-9 rounded-[9px] border text-[13px] font-bold transition-all"
                      style={{
                        background: mines === n ? "var(--signal)" : "var(--hull)",
                        color: mines === n ? "var(--abyss)" : "var(--foam)",
                        borderColor: mines === n ? "var(--signal)" : "var(--line)",
                      }}
                    >
                      {n === 0 ? "Off" : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Private toggle */}
              <div
                className="flex items-center justify-between py-2 cursor-pointer"
                onClick={() => setIsPrivate(!isPrivate)}
              >
                <div>
                  <div className="font-medium text-[14px]">Private Match</div>
                  <div className="text-[var(--mist)] text-[12px]">Only accessible with room code</div>
                </div>
                <span
                  className="w-11 h-6 rounded-full border relative flex-none transition-colors"
                  style={{
                    background: isPrivate ? "var(--signal)" : "var(--hull)",
                    borderColor: isPrivate ? "var(--signal)" : "var(--line)",
                  }}
                >
                  <span
                    className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all duration-200"
                    style={{
                      background: isPrivate ? "var(--abyss)" : "var(--mist)",
                      left: isPrivate ? "calc(100% - 21px)" : "3px",
                    }}
                  />
                </span>
              </div>

              <button
                type="button"
                onClick={handleStartCreate}
                disabled={isCreating}
                className="w-full py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px disabled:opacity-60"
                style={{ background: "var(--accent-cta)", color: "var(--cta-text)", boxShadow: "0 6px 24px -6px var(--cta-shadow)" }}
              >
                {isCreating ? "Broadcasting Room…" : "Create Room →"}
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              {/* Code display */}
              <div
                className="rounded-[18px] border py-6 text-center relative overflow-hidden"
                style={{ borderColor: "var(--signal)", background: "rgba(53,214,192,0.04)" }}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[rgba(53,214,192,0.05)] to-transparent pointer-events-none animate-pulse" />
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-2">Room Code</p>
                <div className="font-display font-extrabold text-[44px] tracking-[0.25em] text-[var(--signal)] select-all mb-3">
                  {roomCode}
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-[9px] border text-[13px] font-semibold transition-all hover:bg-[var(--hull)]"
                  style={{ borderColor: "var(--line)", color: copied ? "var(--signal)" : "var(--foam)" }}
                >
                  {copied ? "✓ Copied to clipboard!" : "📋 Copy Room Code"}
                </button>
              </div>

              {/* Waiting status with pulse */}
              <div className="flex items-center justify-center gap-3 py-3 px-4 rounded-[12px] border" style={{ background: "rgba(12,34,43,0.7)", borderColor: "var(--line)" }}>
                <span className="w-3 h-3 rounded-full bg-[var(--signal)] animate-ping" />
                <span className="text-[13px] font-mono text-[var(--mist)]">
                  Waiting for player 2 to join with code <strong className="text-[var(--signal)]">{roomCode}</strong>…
                </span>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-3 gap-2 text-center text-[13px]">
                {[
                  { label: "Mode",  value: MODES.find(m => m.id === mode)?.label ?? mode },
                  { label: "Mines", value: mines > 0 ? `×${mines}` : "None" },
                  { label: "Access",value: isPrivate ? "Private" : "Public" },
                ].map((s) => (
                  <div key={s.label} className="rounded-[10px] py-2.5 px-2" style={{ background: "rgba(12,34,43,0.5)", border: "1px solid var(--line)" }}>
                    <div className="text-[var(--mist)] text-[11px]">{s.label}</div>
                    <div className="font-display font-bold mt-0.5">{s.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-[12px] font-semibold text-[14px] border hover:bg-[var(--hull)] transition-colors text-[var(--mist)]"
                  style={{ borderColor: "var(--line)" }}
                >
                  Close & Wait in Lobby
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
