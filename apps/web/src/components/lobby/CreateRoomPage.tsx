"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";

const MODES = [
  { id: "classic",    label: "Classic",    desc: "Standard 10×10, 5 ships", icon: "⚓" },
  { id: "blitz",      label: "Blitz",      desc: "30-second turns",        icon: "⚡" },
  { id: "tournament", label: "Tournament", desc: "Ranked qualifying match", icon: "🏆" },
];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function CreateRoomPage() {
  const router = useRouter();
  const { address, login } = useAuthCtx();
  const [step, setStep]         = useState<"config" | "ready">("config");
  const [name, setName]         = useState("");
  const [mode, setMode]         = useState("classic");
  const [mines, setMines]       = useState(3);
  const [turnTime, setTurnTime] = useState(30);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCode]              = useState(generateCode);
  const [copied, setCopied]     = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { createRoom } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      console.log(`[CreateRoomPage] Opponent joined! Launching match ${matchId} vs ${opponent}`);
      router.push(`/arena?match=${matchId}`);
    },
    onError: (err) => setErrorMsg(err),
  });

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreate = async () => {
    setErrorMsg("");
    setIsCreating(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
      if (!address || !token) {
        await login();
      }
      let res = await createRoom(roomCode);
      if (!res.ok) {
        const errLower = (res.error || "").toLowerCase();
        if (errLower.includes("unauthorized") || errLower.includes("session") || errLower.includes("connect")) {
          console.log("[CreateRoomPage] Session stale or disconnected, acquiring fresh session...");
          await login();
          res = await createRoom(roomCode);
        }
      }

      if (!res.ok) {
        setErrorMsg(res.error || "Failed to create room");
        return;
      }
      setStep("ready");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedMode = MODES.find((m) => m.id === mode)!;

  if (step === "ready") {
    return (
      <div className="max-w-[500px]">
        <div className="mb-8">
          <h1 className="font-display font-extrabold text-[30px] tracking-tighter mb-1">
            Sector Room Created
          </h1>
          <p className="text-[var(--mist)] text-[14px]">
            Share this access code with your rival. Battle engages automatically when they join.
          </p>
        </div>

        {/* Code display card */}
        <div
          className="rounded-[22px] border p-8 text-center mb-6 relative overflow-hidden"
          style={{
            borderColor: "var(--signal)",
            background: "linear-gradient(180deg,rgba(53,214,192,0.08),rgba(12,34,43,0.9))",
          }}
        >
          <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-2">
            Sector Access Code
          </p>
          <div className="font-display font-extrabold text-[48px] tracking-[0.25em] text-[var(--signal)] select-all mb-4">
            {roomCode}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] border text-[14px] font-semibold transition-all hover:bg-[var(--hull)]"
            style={{
              borderColor: "var(--line)",
              color: copied ? "var(--signal)" : "var(--foam)",
            }}
          >
            {copied ? "✓ Copied to clipboard!" : "📋 Copy Access Code"}
          </button>
        </div>

        {/* Live waiting state */}
        <div
          className="flex items-center gap-3.5 p-4 rounded-[16px] border mb-6"
          style={{
            background: "rgba(12,34,43,0.8)",
            borderColor: "var(--line)",
          }}
        >
          <span className="w-3.5 h-3.5 rounded-full bg-[var(--signal)] animate-ping flex-none" />
          <div>
            <div className="font-medium text-[14px]">Radar Frequency Active: Waiting for opponent…</div>
            <div className="text-[var(--mist)] text-[12px] mt-0.5">
              The match commences the instant player 2 submits your room code.
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setStep("config")}
          className="w-full py-3.5 rounded-[14px] font-display font-bold text-[15px] border transition-all hover:bg-[var(--hull)] text-[var(--mist)]"
          style={{ borderColor: "var(--line)" }}
        >
          ← Cancel Room & Edit Settings
        </button>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
      <div>
        <div className="mb-7">
          <h1 className="font-display font-extrabold text-[30px] tracking-tighter">
            Create a Room
          </h1>
          <p className="text-[var(--mist)] mt-1 text-[14px]">
            Configure your match settings, then invite your opponent directly with a sector code.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-[12px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs font-mono">
            ⚠️ {errorMsg}
          </div>
        )}

        <div className="grid gap-5">
          {/* Room name */}
          <div className="grid gap-2">
            <label className="text-[13px] font-semibold text-[var(--mist)] tracking-wide uppercase">Room name</label>
            <input
              className="input-base"
              placeholder="e.g. Commander's War Room"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Mode */}
          <div className="grid gap-2">
            <label className="text-[13px] font-semibold text-[var(--mist)] tracking-wide uppercase">Game Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className="flex flex-col items-center gap-1.5 py-4 px-2 rounded-[14px] border text-center transition-all"
                  style={{
                    background: mode === m.id ? "rgba(53,214,192,0.12)" : "var(--hull)",
                    borderColor: mode === m.id ? "var(--signal)" : "var(--line)",
                    color: mode === m.id ? "var(--signal)" : "var(--foam)",
                  }}
                >
                  <span className="text-[22px]">{m.icon}</span>
                  <span className="font-display font-bold text-[14px]">{m.label}</span>
                  <span className="text-[11px] text-[var(--mist)]">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tactical Mines */}
          <div className="flex items-center justify-between p-4 rounded-[14px] border" style={{ background: "var(--hull)", borderColor: "var(--line)" }}>
            <div>
              <div className="font-medium text-[14px]">Tactical Mines</div>
              <div className="text-[var(--mist)] text-[12px]">Deploys 3 hidden naval mines per fleet (-30 pts hazard)</div>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setMines(n)}
                  className="w-10 h-10 rounded-[10px] border text-[13px] font-bold transition-all"
                  style={{
                    background: mines === n ? "var(--signal)" : "rgba(12,34,43,0.6)",
                    color: mines === n ? "var(--abyss)" : "var(--foam)",
                    borderColor: mines === n ? "var(--signal)" : "var(--line)",
                  }}
                >
                  {n === 0 ? "Off" : n}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleCreate}
            disabled={isCreating}
            className="w-full py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-px mt-2 disabled:opacity-60"
            style={{
              background: "var(--accent-cta)",
              color: "var(--cta-text)",
              boxShadow: "0 8px 28px -8px var(--cta-shadow)",
            }}
          >
            {isCreating ? "Initializing Sector Room…" : "Deploy Room & Generate Code →"}
          </button>
        </div>
      </div>

      {/* Right Preview */}
      <div className="hidden md:block sticky top-24">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-3">Room preview</p>
        <div
          className="rounded-[20px] border p-5"
          style={{
            background: "linear-gradient(180deg,rgba(19,48,59,.6),rgba(12,34,43,.8))",
            borderColor: "var(--line)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-4">
            <div>
              <div className="font-display font-bold text-[16px] truncate max-w-[180px]">
                {name || "Commander's Sector"}
              </div>
              <div className="text-[var(--mist)] text-[12px] mt-0.5">
                Host: {address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "Connecting…"}
              </div>
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
            >
              Waiting
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px]">
            <div className="p-2.5 rounded-[10px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)]">
              <span className="text-[var(--mist)] text-[10px] block">Mode</span>
              <strong className="text-[var(--foam)]">{selectedMode.label}</strong>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)]">
              <span className="text-[var(--mist)] text-[10px] block">Turn Timer</span>
              <strong className="text-[var(--foam)]">{turnTime}s</strong>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)]">
              <span className="text-[var(--mist)] text-[10px] block">Mines</span>
              <strong className="text-[var(--foam)]">{mines > 0 ? `×${mines}` : "None"}</strong>
            </div>
            <div className="p-2.5 rounded-[10px] bg-[rgba(12,34,43,0.7)] border border-[var(--line)]">
              <span className="text-[var(--mist)] text-[10px] block">Network</span>
              <strong className="text-[var(--signal)]">Socket.IO Live</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
