"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const MODES = [
  {
    id: "classic",
    label: "Classic",
    description: "Standard 10×10 battleship layout",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M4 18 L14 10 L20 13 L24 18 L24 22 L4 22Z" fill="rgba(53,214,192,0.15)" stroke="var(--signal)" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M10 10 L10 7 L14 7 L14 10" stroke="var(--signal)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <line x1="8" y1="22" x2="8" y2="18" stroke="var(--signal)" strokeWidth="1.2" opacity="0.5" />
        <line x1="14" y1="22" x2="14" y2="16" stroke="var(--signal)" strokeWidth="1.2" opacity="0.5" />
        <line x1="20" y1="22" x2="20" y2="18" stroke="var(--signal)" strokeWidth="1.2" opacity="0.5" />
      </svg>
    ),
    color: "var(--signal)",
    tag: "Ranked",
    tagColor: "rgba(53,214,192,0.15)",
    tagText: "var(--signal)",
  },
  {
    id: "tournament",
    label: "Tournament",
    description: "Compete for on-chain rewards",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M9 4h10v8a5 5 0 0 1-10 0V4z" fill="rgba(235,181,74,0.12)" stroke="var(--brass)" strokeWidth="1.6" />
        <path d="M4 7H9M19 7h5" stroke="var(--brass)" strokeWidth="1.6" strokeLinecap="round" />
        <rect x="12" y="17" width="4" height="5" rx="1" fill="none" stroke="var(--brass)" strokeWidth="1.4" />
        <rect x="8" y="22" width="12" height="2.5" rx="1" fill="var(--brass)" opacity="0.5" />
      </svg>
    ),
    color: "var(--brass)",
    tag: "10K Pool",
    tagColor: "rgba(235,181,74,0.12)",
    tagText: "var(--brass)",
  },
  {
    id: "private",
    label: "Private Room",
    description: "Direct PvP code challenge",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="6" y="13" width="16" height="12" rx="3" fill="rgba(143,176,173,0.08)" stroke="var(--mist)" strokeWidth="1.6" />
        <path d="M9 13V9a5 5 0 0 1 10 0v4" stroke="var(--mist)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <circle cx="14" cy="19" r="2" fill="var(--mist)" opacity="0.6" />
        <line x1="14" y1="21" x2="14" y2="23" stroke="var(--mist)" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
    color: "var(--mist)",
    tag: "Custom Code",
    tagColor: "rgba(143,176,173,0.1)",
    tagText: "var(--mist)",
  },
  {
    id: "blitz",
    label: "Blitz Combat",
    description: "30-second rapid fire turns",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="9" stroke="var(--flare)" strokeWidth="1.6" fill="rgba(255,106,77,0.08)" />
        <path d="M14 8v7l4 3" stroke="var(--flare)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    ),
    color: "var(--flare)",
    tag: "Rapid",
    tagColor: "rgba(255,106,77,0.12)",
    tagText: "var(--flare)",
  },
];

export function GameModes() {
  const router = useRouter();
  const [selected, setSelected] = useState("classic");

  const handleSelect = (id: string) => {
    setSelected(id);
    if (id === "tournament") {
      router.push("/tournaments");
    }
  };

  return (
    <section className="mb-8">
      <h2 className="font-display font-bold text-[20px] tracking-tight mb-4">
        Game Modes
      </h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {MODES.map((mode) => {
          const active = selected === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => handleSelect(mode.id)}
              className={cn(
                "relative flex flex-col items-center text-center p-5 rounded-[18px] border transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2"
              )}
              style={{
                background: active
                  ? `color-mix(in srgb, ${mode.color} 10%, var(--deck))`
                  : "linear-gradient(180deg,rgba(19,48,59,.5),rgba(12,34,43,.7))",
                borderColor: active
                  ? `color-mix(in srgb, ${mode.color} 50%, transparent)`
                  : "var(--line)",
                boxShadow: active
                  ? `0 0 0 1px color-mix(in srgb, ${mode.color} 20%, transparent), 0 8px 32px -12px ${mode.color}`
                  : undefined,
              }}
              aria-pressed={active}
            >
              {/* Tag */}
              <span
                className="absolute top-3 right-3 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: mode.tagColor,
                  color: mode.tagText,
                }}
              >
                {mode.tag}
              </span>

              {/* Icon */}
              <span
                className="w-14 h-14 rounded-[16px] grid place-items-center mb-3"
                style={{
                  background: `color-mix(in srgb, ${mode.color} 12%, var(--hull))`,
                  border: `1px solid color-mix(in srgb, ${mode.color} 25%, transparent)`,
                }}
              >
                {mode.icon}
              </span>

              <span className="font-display font-bold text-[15px] tracking-tight block mb-1">
                {mode.label}
              </span>
              <span className="text-[var(--mist)] text-[12px] leading-snug">
                {mode.description}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
