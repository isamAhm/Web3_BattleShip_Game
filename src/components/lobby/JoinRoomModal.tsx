"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const MOCK_ROOMS: Record<string, { name: string; host: string; mode: string; mines: number; turnTime: number }> = {
  "ABC123": { name: "Admiral Vega's Fleet",    host: "Admiral Vega", mode: "Classic", mines: 3, turnTime: 30 },
  "XK92PW": { name: "Rook's Blitz Room",       host: "Rook",         mode: "Blitz",   mines: 0, turnTime: 15 },
  "DEMO01": { name: "Captain Mira's War Room", host: "Captain Mira", mode: "Classic", mines: 3, turnTime: 30 },
};

export function JoinRoomModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [slots, setSlots]   = useState(["","","","","",""]);
  const [error, setError]   = useState("");
  const [room, setRoom]     = useState<typeof MOCK_ROOMS[string] | null>(null);
  const inputRefs           = useRef<(HTMLInputElement | null)[]>([]);
  const code = slots.join("");

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    inputRefs.current[0]?.focus();
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSlot = (i: number, val: string) => {
    const char = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    const next = [...slots]; next[i] = char; setSlots(next); setError("");
    if (char && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !slots[i] && i > 0) inputRefs.current[i - 1]?.focus();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g,"").toUpperCase().slice(0,6);
    const next = [...slots];
    text.split("").forEach((c, i) => { next[i] = c; });
    setSlots(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const lookup = () => {
    const found = MOCK_ROOMS[code];
    if (!found) { setError("Room not found. Check the code and try again."); return; }
    setRoom(found);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,14,22,0.85)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-[24px] border relative"
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
              {room ? "Room Found" : "Join a Room"}
            </h2>
            <p className="text-[var(--mist)] text-[13px] mt-0.5">
              {room ? "Review details before joining." : "Enter the 6-character room code."}
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            className="w-8 h-8 rounded-full grid place-items-center hover:bg-[var(--hull)] transition-colors"
            style={{ color: "var(--mist)" }} aria-label="Close"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        <div className="p-7">
          {!room ? (
            <div className="grid gap-5">
              {/* Code boxes */}
              <div>
                <p className="text-[12px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-3 text-center">
                  Room Code
                </p>
                <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                  {slots.map((s, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text" inputMode="text" maxLength={1} value={s}
                      onChange={(e) => handleSlot(i, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(i, e)}
                      className={cn(
                        "w-12 h-14 text-center font-display font-extrabold text-[22px] rounded-[12px] border outline-none transition-all",
                        error ? "border-[var(--flare)]" : "border-[var(--line)] focus:border-[var(--signal)]"
                      )}
                      style={{ background: s ? "rgba(53,214,192,0.06)" : "var(--abyss)", caretColor: "var(--signal)", color: "var(--foam)" }}
                      aria-label={`Code character ${i + 1}`}
                    />
                  ))}
                </div>
                {error && (
                  <p className="text-center text-[var(--flare)] text-[12px] mt-3 flex items-center justify-center gap-1.5">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <circle cx="6" cy="6" r="5" stroke="var(--flare)" strokeWidth="1.2"/>
                      <line x1="6" y1="3.5" x2="6" y2="7" stroke="var(--flare)" strokeWidth="1.2" strokeLinecap="round"/>
                      <circle cx="6" cy="8.5" r="0.7" fill="var(--flare)"/>
                    </svg>
                    {error}
                  </p>
                )}
              </div>

              <button
                type="button" onClick={lookup} disabled={code.length < 6}
                className="w-full py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--accent-cta)", color: "var(--cta-text)", boxShadow: code.length === 6 ? "0 6px 24px -6px var(--cta-shadow)" : undefined }}
              >
                Find Room
              </button>

              <p className="text-center text-[var(--mist)] text-[12px]">
                Try:{" "}
                {["DEMO01","ABC123"].map((c, i) => (
                  <button key={c} type="button"
                    className="font-mono font-bold text-[var(--signal)] hover:underline mx-1"
                    onClick={() => { setSlots(c.split("")); setTimeout(lookup, 50); }}
                  >{c}</button>
                ))}
              </p>
            </div>
          ) : (
            <div className="grid gap-5">
              {/* Room card */}
              <div
                className="rounded-[18px] border p-5 relative overflow-hidden"
                style={{ borderColor: "rgba(53,214,192,0.3)", background: "rgba(53,214,192,0.03)" }}
              >
                <div
                  className="absolute top-0 left-0 right-0 h-px"
                  style={{ background: "linear-gradient(90deg,transparent,var(--signal),transparent)" }}
                  aria-hidden="true"
                />
                <div className="flex items-start justify-between gap-2 mb-4">
                  <div>
                    <h3 className="font-display font-bold text-[17px] tracking-tight">{room.name}</h3>
                    <p className="text-[var(--mist)] text-[12px] mt-0.5">by {room.host}</p>
                  </div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}>
                    Open
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[
                    { label: "Mode",      value: room.mode },
                    { label: "Mines",     value: room.mines > 0 ? `×${room.mines}` : "None" },
                    { label: "Turn time", value: `${room.turnTime}s` },
                  ].map((s) => (
                    <div key={s.label} className="rounded-[10px] py-2 px-1" style={{ background: "rgba(12,34,43,0.6)", border: "1px solid var(--line)" }}>
                      <div className="text-[var(--mist)] text-[10px]">{s.label}</div>
                      <div className="font-display font-bold text-[13px] mt-0.5">{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/arena")}
                  className="flex-1 py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px"
                  style={{ background: "var(--accent-cta)", color: "var(--cta-text)", boxShadow: "0 6px 24px -6px var(--cta-shadow)" }}
                >
                  Join Match
                </button>
                <button
                  type="button"
                  onClick={() => { setRoom(null); setSlots(["","","","","",""]); setError(""); }}
                  className="px-5 py-3.5 rounded-[14px] font-semibold text-[14px] border transition-all hover:bg-[var(--hull)]"
                  style={{ borderColor: "var(--line)" }}
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
