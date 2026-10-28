"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";

type Step = "enter" | "joining";

export function JoinRoomPage() {
  const router = useRouter();
  const { address, login } = useAuthCtx();
  const [step, setStep]         = useState<Step>("enter");
  const [slots, setSlots]       = useState(["", "", "", "", "", ""]);
  const [error, setError]       = useState("");
  const inputRefs               = useRef<(HTMLInputElement | null)[]>([]);

  const code = slots.join("");

  const { joinRoom } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      console.log(`[JoinRoomPage] Paired vs ${opponent} in match ${matchId}`);
      router.push(`/arena?match=${matchId}`);
    },
    onError: (err) => {
      setError(err);
      setStep("enter");
    },
  });

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
    text.split("").forEach((c, idx) => { next[idx] = c; });
    setSlots(next);
    inputRefs.current[Math.min(text.length, 5)]?.focus();
  };

  const confirmJoin = async () => {
    if (code.length < 6) {
      setError("Please enter all 6 characters of the room code.");
      return;
    }
    setError("");
    setStep("joining");

    try {
      if (!address) {
        await login(false);
      }
      const res = await joinRoom(code);
      if (!res.ok) {
        setError(res.error || "Room not found or game already in progress.");
        setStep("enter");
        return;
      }
      if (res.matchId) {
        console.log(`[JoinRoomPage] Successfully joined room, routing to match ${res.matchId}`);
        router.push(`/arena?match=${res.matchId}`);
      }
    } catch (err: any) {
      setError(err.message || "Connection error");
      setStep("enter");
    }
  };

  if (step === "joining") {
    return (
      <div className="max-w-[480px] text-center py-12">
        <div className="w-16 h-16 rounded-full border border-[var(--signal)] bg-[rgba(53,214,192,0.1)] flex items-center justify-center mx-auto mb-6">
          <span className="w-6 h-6 rounded-full bg-[var(--signal)] animate-ping" />
        </div>
        <h2 className="font-display font-extrabold text-[24px] tracking-tight mb-2">
          Connecting to Sector {code}…
        </h2>
        <p className="text-[var(--mist)] text-[14px]">
          Synchronizing grid coordinates with host fleet. Entering arena now.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-[520px]">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[30px] tracking-tighter mb-1">
          Join a Room
        </h1>
        <p className="text-[var(--mist)] text-[14px]">
          Enter the 6-character room code provided by your opponent to deploy fleet.
        </p>
      </div>

      <div className="rounded-[20px] border p-6 bg-[rgba(19,48,59,.55)]" style={{ borderColor: "var(--line)" }}>
        <p className="text-[12px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-4 text-center">
          Sector Access Code
        </p>

        <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
          {slots.map((s, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              value={s}
              onChange={(e) => handleSlot(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              maxLength={1}
              className="w-13 h-16 rounded-[14px] border text-center font-display font-extrabold text-[26px] tracking-wider transition-all focus:outline-none"
              style={{
                background: s ? "rgba(53,214,192,0.08)" : "var(--hull)",
                borderColor: s ? "var(--signal)" : "var(--line)",
                color: "var(--signal)",
              }}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-[10px] bg-red-500/15 border border-red-500/30 text-red-300 text-xs text-center font-mono font-medium">
            ⚠️ {error}
          </div>
        )}

        <button
          type="button"
          onClick={confirmJoin}
          disabled={code.length < 6}
          className="w-full py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--accent-cta)",
            color: "var(--cta-text)",
            boxShadow: "0 8px 28px -8px var(--cta-shadow)",
          }}
        >
          Join Match →
        </button>
      </div>
    </div>
  );
}
