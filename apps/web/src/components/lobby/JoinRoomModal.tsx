"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";

export function JoinRoomModal({
  onClose,
  initialCode = "",
}: {
  onClose: () => void;
  initialCode?: string;
}) {
  const router = useRouter();
  const { address, login } = useAuthCtx();
  const [slots, setSlots] = useState(() => {
    const chars = (initialCode || "")
      .toUpperCase()
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 6)
      .split("");
    while (chars.length < 6) chars.push("");
    return chars;
  });
  const [error, setError]     = useState("");
  const [joining, setJoining] = useState(false);
  const inputRefs             = useRef<(HTMLInputElement | null)[]>([]);
  const code = slots.join("");

  useEffect(() => {
    if (initialCode) {
      const chars = initialCode
        .toUpperCase()
        .replace(/[^A-Za-z0-9]/g, "")
        .slice(0, 6)
        .split("");
      while (chars.length < 6) chars.push("");
      setSlots(chars);
    }
  }, [initialCode]);

  const { joinRoom } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      console.log(`[JoinRoom] Joined match ${matchId} vs ${opponent}!`);
      router.push(`/arena?match=${matchId}`);
    },
    onError: (msg) => {
      setError(msg);
      setJoining(false);
    },
  });

  useEffect(() => {
    const fn = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", fn);
    inputRefs.current[0]?.focus();
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  const handleSlot = (i: number, val: string) => {
    const char = val.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(-1);
    const next = [...slots];
    next[i] = char;
    setSlots(next);
    setError("");
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

  const handleJoin = async () => {
    if (code.length < 6) {
      setError("Please enter the complete 6-character room code.");
      return;
    }
    setError("");
    setJoining(true);

    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
      if (!address || !token) {
        await login(false);
      }
      let res = await joinRoom(code);
      if (!res.ok) {
        const errLower = (res.error || "").toLowerCase();
        if (errLower.includes("unauthorized") || errLower.includes("session") || errLower.includes("connect")) {
          console.log("[JoinRoomModal] Session stale or disconnected, acquiring fresh session...");
          await login(false);
          res = await joinRoom(code);
        }
      }

      if (!res.ok) {
        setError(res.error || "Room not found or already in battle.");
        setJoining(false);
        return;
      }
      if (res.matchId) {
        console.log(`[JoinRoomModal] Successfully joined room, routing to match ${res.matchId}`);
        router.push(`/arena?match=${res.matchId}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to join room");
      setJoining(false);
    }
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
              Join a Room
            </h2>
            <p className="text-[var(--mist)] text-[13px] mt-0.5">
              Enter the 6-character room code to challenge your rival.
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
                    value={s}
                    onChange={(e) => handleSlot(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    maxLength={1}
                    className="w-12 h-14 rounded-[12px] border text-center font-display font-extrabold text-[22px] tracking-wider transition-all"
                    style={{
                      background: s ? "rgba(53,214,192,0.08)" : "var(--hull)",
                      borderColor: s ? "var(--signal)" : "var(--line)",
                      color: "var(--signal)",
                    }}
                  />
                ))}
              </div>

              {error && (
                <p className="text-red-400 text-[12px] text-center mt-3 font-mono font-medium">
                  ⚠️ {error}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleJoin}
              disabled={code.length < 6 || joining}
              className="w-full py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: "var(--accent-cta)",
                color: "var(--cta-text)",
                boxShadow: "0 6px 24px -6px var(--cta-shadow)",
              }}
            >
              {joining ? "Connecting to Sector…" : "Join Match →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
