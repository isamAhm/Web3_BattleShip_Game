"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/* Mock room lookup — replace with real API */
const MOCK_ROOMS: Record<string, {
  name: string; host: string; mode: string; mines: number;
  turnTime: number; players: string; spectators: boolean;
}> = {
  "ABC123": { name: "Admiral Vega's Fleet",    host: "Admiral Vega",  mode: "Classic",    mines: 3, turnTime: 30, players: "1/2", spectators: true },
  "XK92PW": { name: "Rook's Blitz Room",       host: "Rook",          mode: "Blitz",      mines: 0, turnTime: 15, players: "1/2", spectators: false },
  "DEMO01": { name: "Captain Mira's War Room", host: "Captain Mira",  mode: "Classic",    mines: 3, turnTime: 30, players: "1/2", spectators: true },
};

type Step = "enter" | "preview" | "joining";

export function JoinRoomPage() {
  const router = useRouter();
  const [step, setStep]         = useState<Step>("enter");
  const [slots, setSlots]       = useState(["", "", "", "", "", ""]);
  const [error, setError]       = useState("");
  const [room, setRoom]         = useState<typeof MOCK_ROOMS[string] | null>(null);
  const inputRefs               = useRef<(HTMLInputElement | null)[]>([]);

  const code = slots.join("");

  /* Auto-advance focus when a digit is typed */
  const handleSlot = (i: number, val: string) => {
    const char = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    const next = [...slots];
    next[i] = char;
    setSlots(next);
    setError("");
    if (char && i < 5) inputRefs.current[i + 1]?.focus();
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !slots[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
    const next = [...slots];
    text.split("").forEach((c, i) => { next[i] = c; });
    setSlots(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const lookupRoom = () => {
    setError("");
    const found = MOCK_ROOMS[code];
    if (!found) {
      setError("Room not found. Double-check the code and try again.");
      return;
    }
    setRoom(found);
    setStep("preview");
  };

  const confirmJoin = () => {
    setStep("joining");
    setTimeout(() => router.push("/arena"), 1800);
  };

  /* ── Step: enter code ── */
  if (step === "enter") {
    return (
      <div className="max-w-[520px]">
        <div className="mb-8">
          <h1 className="font-display font-extrabold text-[30px] tracking-tighter mb-1">
            Join a Room
          </h1>
          <p className="text-[var(--mist)] text-[14px]">
            Enter the 6-character code shared by the host.
          </p>
        </div>

        {/* Code input */}
        <div
          className="rounded-[24px] border p-8 mb-6"
          style={{
            background: "linear-gradient(180deg,rgba(19,48,59,.6),rgba(12,34,43,.8))",
            borderColor: "var(--line)",
          }}
        >
          <p className="text-center text-[13px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-5">
            Room Code
          </p>

          {/* 6-box code input */}
          <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
            {slots.map((s, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="text"
                maxLength={1}
                value={s}
                onChange={(e) => handleSlot(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={cn(
                  "w-12 h-14 text-center font-display font-extrabold text-[22px] rounded-[12px] border outline-none transition-all",
                  s ? "text-[var(--foam)]" : "text-[var(--mist)]",
                  error ? "border-[var(--flare)]" : "border-[var(--line)] focus:border-[var(--signal)] focus:shadow-[0_0_0_3px_color-mix(in_srgb,var(--signal)_15%,transparent)]"
                )}
                style={{
                  background: s ? "rgba(53,214,192,0.06)" : "var(--abyss)",
                  caretColor: "var(--signal)",
                }}
                aria-label={`Code character ${i + 1}`}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <p className="text-center text-[var(--flare)] text-[13px] mb-4 flex items-center justify-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="6" stroke="var(--flare)" strokeWidth="1.4"/>
                <line x1="7" y1="4" x2="7" y2="8" stroke="var(--flare)" strokeWidth="1.4" strokeLinecap="round"/>
                <circle cx="7" cy="10" r="0.8" fill="var(--flare)"/>
              </svg>
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={lookupRoom}
            disabled={code.length < 6}
            className="w-full py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{
              background: "var(--accent-cta)",
              color: "var(--cta-text)",
              boxShadow: code.length === 6 ? "0 6px 24px -6px var(--cta-shadow)" : undefined,
            }}
          >
            Find Room
          </button>
        </div>

        {/* Hint */}
        <div
          className="rounded-[14px] border p-4 flex gap-3 items-start"
          style={{ borderColor: "var(--line)", background: "rgba(12,34,43,0.4)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-none mt-0.5" aria-hidden="true">
            <circle cx="9" cy="9" r="7.5" stroke="var(--signal)" strokeWidth="1.4" fill="rgba(53,214,192,0.06)"/>
            <line x1="9" y1="8" x2="9" y2="13" stroke="var(--signal)" strokeWidth="1.6" strokeLinecap="round"/>
            <circle cx="9" cy="5.5" r="0.9" fill="var(--signal)"/>
          </svg>
          <p className="text-[var(--mist)] text-[13px] leading-relaxed">
            Ask the room host to share their 6-character code. You can also paste it directly into the boxes above.
          </p>
        </div>

        {/* Try demo */}
        <p className="text-[var(--mist)] text-[13px] mt-4 text-center">
          Try demo code:{" "}
          <button
            type="button"
            className="font-mono font-bold text-[var(--signal)] hover:underline"
            onClick={() => {
              setSlots(["D","E","M","O","0","1"]);
              setTimeout(lookupRoom, 100);
            }}
          >
            DEMO01
          </button>
        </p>
      </div>
    );
  }

  /* ── Step: preview room ── */
  if (step === "preview" && room) {
    return (
      <div className="max-w-[560px]">
        <button
          type="button"
          onClick={() => { setStep("enter"); setRoom(null); }}
          className="flex items-center gap-2 text-[var(--mist)] text-[14px] hover:text-[var(--foam)] transition-colors mb-7"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Change code
        </button>

        <h1 className="font-display font-extrabold text-[30px] tracking-tighter mb-1">
          Room Found
        </h1>
        <p className="text-[var(--mist)] text-[14px] mb-7">
          Review the details before joining.
        </p>

        {/* Room card */}
        <div
          className="rounded-[24px] border p-6 mb-5 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg,rgba(19,48,59,.7),rgba(12,34,43,.9))",
            borderColor: "rgba(53,214,192,0.35)",
            boxShadow: "0 0 0 1px rgba(53,214,192,0.08), 0 20px 60px -20px rgba(53,214,192,0.15)",
          }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, var(--signal), transparent)" }}
            aria-hidden="true"
          />

          {/* Room name + status */}
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h2 className="font-display font-bold text-[20px] tracking-tight">{room.name}</h2>
              <p className="text-[var(--mist)] text-[13px] mt-0.5">Hosted by {room.host}</p>
            </div>
            <span
              className="text-[12px] font-semibold px-3 py-1 rounded-full flex-none"
              style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
            >
              Open · {room.players}
            </span>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {[
              { label: "Mode",      value: room.mode, icon: "⚓" },
              { label: "Turn time", value: `${room.turnTime}s`, icon: "⏱" },
              { label: "Mines",     value: room.mines > 0 ? `×${room.mines}` : "None", icon: "💣" },
              { label: "Spectators",value: room.spectators ? "Allowed" : "Off", icon: "👁" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[12px] p-3 text-center"
                style={{ background: "rgba(12,34,43,0.7)", border: "1px solid var(--line)" }}
              >
                <div className="text-[18px] mb-1">{s.icon}</div>
                <div className="font-display font-bold text-[14px]">{s.value}</div>
                <div className="text-[var(--mist)] text-[11px]">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Players */}
          <div
            className="rounded-[12px] p-4 flex items-center gap-4"
            style={{ background: "rgba(12,34,43,0.5)", border: "1px solid var(--line)" }}
          >
            {/* Host */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span
                className="w-9 h-9 rounded-full flex-none"
                style={{ background: "linear-gradient(135deg,#6350dc,#3a6df0)" }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <div className="font-semibold text-[13px] truncate">{room.host}</div>
                <div className="text-[11px] text-[var(--signal)]">Ready</div>
              </div>
            </div>

            <div className="text-[var(--mist)] text-[12px] font-bold px-2">VS</div>

            {/* You */}
            <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
              <div className="min-w-0 text-right">
                <div className="font-semibold text-[13px]">You</div>
                <div className="text-[11px] text-[var(--brass)]">Joining…</div>
              </div>
              <span
                className="w-9 h-9 rounded-full flex-none"
                style={{ background: "linear-gradient(135deg,var(--brass),var(--flare))" }}
                aria-hidden="true"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={confirmJoin}
            className="flex-1 py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-px"
            style={{
              background: "var(--accent-cta)",
              color: "var(--cta-text)",
              boxShadow: "0 8px 28px -8px var(--cta-shadow)",
            }}
          >
            Join Match
          </button>
          <button
            type="button"
            onClick={() => { setStep("enter"); setRoom(null); }}
            className="px-6 py-4 rounded-[14px] font-semibold text-[15px] border transition-all hover:bg-[var(--hull)]"
            style={{ borderColor: "var(--line)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  /* ── Step: joining animation ── */
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative w-20 h-20">
        <svg className="absolute inset-0 animate-spin" width="80" height="80" viewBox="0 0 80 80" fill="none" aria-hidden="true">
          <circle cx="40" cy="40" r="34" stroke="var(--hull)" strokeWidth="4"/>
          <path d="M40 6a34 34 0 0 1 34 34" stroke="var(--signal)" strokeWidth="4" strokeLinecap="round"/>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-[28px]">⚓</div>
      </div>
      <div className="text-center">
        <h2 className="font-display font-bold text-[22px] tracking-tight mb-1">
          Joining match…
        </h2>
        <p className="text-[var(--mist)] text-[14px]">Committing your fleet to the chain</p>
      </div>
    </div>
  );
}
