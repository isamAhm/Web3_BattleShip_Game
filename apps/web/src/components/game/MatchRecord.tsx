"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { MatchStep } from "@/types/game";

export function MatchRecord({
  steps,
  hash,
  matchId,
}: {
  steps: MatchStep[];
  hash: string;
  matchId?: string | null;
}) {
  return (
    <section
      className="rounded-[20px] p-5 border flex flex-col justify-between"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[17px] tracking-tight">
            Match Record & Audit
          </h2>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[rgba(53,214,192,0.1)] text-[var(--signal)]">
            Verified
          </span>
        </div>

        <div className="grid gap-3.5 mt-4">
          {steps.map((step) => (
            <div key={step.label} className="flex gap-3 items-start text-sm">
              <span
                className={cn(
                  "w-[20px] h-[20px] rounded-full flex-none border-2 mt-0.5 grid place-items-center text-[10px]",
                  step.status === "done" &&
                    "bg-[var(--signal)] border-[var(--signal)] text-black font-bold",
                  step.status === "active" &&
                    "border-[var(--brass)] bg-[rgba(235,181,74,.15)] text-[var(--brass)] animate-pulse",
                  step.status === "pending" && "border-[var(--line)] bg-transparent"
                )}
                aria-label={step.status}
              >
                {step.status === "done" ? "✓" : step.status === "active" ? "●" : ""}
              </span>
              <div>
                <span className="font-medium text-[13.5px]">{step.label}</span>
                <small className="block text-[var(--mist)] text-[12px] leading-snug mt-0.5">
                  {step.description}
                </small>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-[var(--line)] space-y-2">
        <div
          className="p-2.5 rounded-[10px] text-[var(--mist)] text-[11px] font-mono break-all flex items-center justify-between gap-2"
          style={{ background: "var(--abyss)" }}
        >
          <span className="truncate">{hash}</span>
          <span className="text-[10px] uppercase font-bold text-[var(--signal)] flex-none">Hash</span>
        </div>
        <div className="flex justify-between items-center text-[11px] text-[var(--mist)]">
          <span>Sepolia Commit-Reveal</span>
          <Link href="/replays" className="text-[var(--signal)] hover:underline font-semibold">
            Audit Replays →
          </Link>
        </div>
      </div>
    </section>
  );
}
