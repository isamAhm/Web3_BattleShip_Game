"use client";

import { useEffect, useState } from "react";

interface MatchTimerProps {
  initialSeconds?: number;
  totalSeconds?: number;
}

export function MatchTimer({
  initialSeconds = 14,
  totalSeconds = 20,
}: MatchTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((s) => (s > 0 ? s - 1 : totalSeconds));
    }, 1000);
    return () => clearInterval(interval);
  }, [totalSeconds]);

  const pct = `${Math.round((seconds / totalSeconds) * 100)}%`;

  return (
    <div
      className="ml-auto flex items-center gap-3.5 px-[18px] pl-2.5 py-2.5 rounded-full border"
      style={{ background: "var(--deck)", borderColor: "var(--line)" }}
    >
      {/* Ring */}
      <div
        className="relative w-[52px] h-[52px] rounded-full grid place-items-center"
        style={{
          background: `conic-gradient(var(--signal) ${pct}, rgba(255,255,255,.08) 0)`,
        }}
        aria-hidden="true"
      >
        <span
          className="absolute inset-[5px] rounded-full"
          style={{ background: "var(--deck)" }}
        />
        <b className="relative font-display font-extrabold text-[19px]">
          {seconds}
        </b>
      </div>
      <div>
        <strong className="block font-display font-bold text-[15px]">
          Your turn
        </strong>
        <span className="text-[var(--mist)] text-sm">seconds left</span>
      </div>
    </div>
  );
}
