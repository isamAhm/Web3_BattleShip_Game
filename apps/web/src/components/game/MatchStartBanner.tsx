"use client";

import { useEffect, useRef } from "react";

interface Props {
  you: string;
  opponent: string;
  onDone: () => void;
}

/** Full-screen "match began" splash with both nicknames. Dismisses itself. */
export function MatchStartBanner({ you, opponent, onDone }: Props) {
  // The parent re-renders constantly, so keep the latest callback in a ref and time out once
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => doneRef.current(), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="match-banner fixed inset-0 z-[9996] flex flex-col items-center justify-center pointer-events-none"
      style={{ background: "radial-gradient(ellipse at center,rgba(4,14,19,.88),rgba(4,14,19,.6))" }}
      role="status"
      aria-live="polite"
    >
      <div className="match-banner-title font-display font-extrabold text-[clamp(32px,7vw,68px)] tracking-tight text-[var(--brass)]">
        MATCH BEGAN
      </div>
      <div className="flex items-center gap-5 mt-6 font-display font-bold text-[clamp(18px,3.4vw,32px)]">
        <span className="match-banner-left">{you}</span>
        <span className="match-banner-vs text-[var(--flare)] text-[0.7em]">VS</span>
        <span className="match-banner-right">{opponent}</span>
      </div>
    </div>
  );
}
