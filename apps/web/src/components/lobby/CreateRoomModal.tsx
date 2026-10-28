"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  const [step, setStep]         = useState<"config" | "ready">("config");
  const [name, setName]         = useState("");
  const [mode, setMode]         = useState("classic");
  const [mines, setMines]       = useState(3);
  const [isPrivate, setIsPrivate] = useState(false);
  const [roomCode]              = useState(generateCode);
  const [copied, setCopied]     = useState(false);

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
              {step === "config" ? "Create a Room" : "Room Created!"}
            </h2>
            <p className="text-[var(--mist)] text-[13px] mt-0.5">
              {step === "config" ? "Configure your match settings." : "Share the code to invite your opponent."}
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
          {step === "config" ? (
            <div className="grid gap-5">
              {/* Room name */}
              <div className="grid gap-1.5">
                <label className="text-[12px] font-semibold tracking-widest uppercase text-[var(--mist)]">Room name</label>
                <input
                  className="input-base"
                  placeholder="e.g. Captain's War Room"
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
                        background: mode === m.id ? "color-mix(in srgb, var(--accent-cta) 18%, var(--hull))" : "var(--hull)",
                        borderColor: mode === m.id ? "var(--accent-cta)" : "var(--line)",
                        color: mode === m.id ? "var(--foam)" : "var(--mist)",
                      }}
                    >
                      <span>{m.icon}</span>
                      <span>{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mines */}
              <div className="grid gap-2">
                <label className="text-[12px] font-semibold tracking-widest uppercase text-[var(--mist)]">
                  Mines per player — {mines === 0 ? "off" : `×${mines}`}
                </label>
                <input
                  type="range" min={0} max={5} value={mines}
                  onChange={(e) => setMines(Number(e.target.value))}
                  className="w-full"
                  style={{ accentColor: "var(--signal)" }}
                />
                <div className="flex justify-between text-[11px] text-[var(--mist)]">
                  {[0,1,2,3,4,5].map((n) => (
                    <span key={n} style={{ color: mines === n ? "var(--signal)" : undefined }}>{n}</span>
                  ))}
                </div>
              </div>

              {/* Private toggle */}
              <div
                className="flex items-center justify-between px-4 py-3.5 rounded-[14px] border cursor-pointer"
                style={{ borderColor: "var(--line)", background: "rgba(12,34,43,0.4)" }}
                onClick={() => setIsPrivate(!isPrivate)}
                role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setIsPrivate(!isPrivate)}
              >
                <div>
                  <div className="font-medium text-[14px]">Private room</div>
                  <div className="text-[var(--mist)] text-[12px]">Only players with the code can join</div>
                </div>
                <span
                  className="relative w-11 h-6 rounded-full border flex-none transition-colors"
                  style={{ background: isPrivate ? "var(--signal)" : "var(--hull)", borderColor: isPrivate ? "var(--signal)" : "var(--line)" }}
                >
                  <span className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all duration-200"
                    style={{ background: isPrivate ? "var(--abyss)" : "var(--mist)", left: isPrivate ? "calc(100% - 21px)" : "3px" }}
                  />
                </span>
              </div>

              <button
                type="button"
                onClick={() => setStep("ready")}
                className="w-full py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px"
                style={{ background: "var(--accent-cta)", color: "var(--cta-text)", boxShadow: "0 6px 24px -6px var(--cta-shadow)" }}
              >
                Create Room →
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              {/* Code display */}
              <div
                className="rounded-[18px] border py-6 text-center"
                style={{ borderColor: "var(--signal)", background: "rgba(53,214,192,0.04)" }}
              >
                <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-3">Room Code</p>
                <div className="font-display font-extrabold text-[44px] tracking-[0.25em] text-[var(--signal)] select-all mb-4">
                  {roomCode}
                </div>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-[9px] border text-[13px] font-semibold transition-all hover:bg-[var(--hull)]"
                  style={{ borderColor: "var(--line)", color: copied ? "var(--signal)" : "var(--foam)" }}
                >
                  {copied ? "✓ Copied!" : "Copy code"}
                </button>
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

              <button
                type="button"
                onClick={() => router.push("/arena")}
                className="w-full py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px"
                style={{ background: "var(--accent-cta)", color: "var(--cta-text)", boxShadow: "0 6px 24px -6px var(--cta-shadow)" }}
              >
                Enter Arena
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
