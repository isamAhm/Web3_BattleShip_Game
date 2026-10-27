"use client";

import { useTheme } from "@/components/layout/ThemeProvider";
import { THEMES } from "@/lib/themes";
import { cn } from "@/lib/utils";

export function ThemeSettings() {
  const { themeId, setTheme } = useTheme();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {THEMES.map((theme) => {
        const active = themeId === theme.id;
        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => setTheme(theme.id)}
            className={cn(
              "relative text-left rounded-[18px] border overflow-hidden transition-all focus-visible:ring-2",
              active
                ? "ring-2"
                : "hover:border-[var(--signal)] hover:-translate-y-0.5"
            )}
            style={{
              borderColor: active ? theme.accent : "var(--line)",
              // @ts-expect-error CSS custom property
              "--tw-ring-color": theme.accent,
            }}
            aria-pressed={active}
            aria-label={`Select ${theme.name} theme`}
          >
            {/* ── Preview window ── */}
            <ThemePreview theme={theme} />

            {/* ── Info row ── */}
            <div
              className="px-4 py-4 flex items-start justify-between gap-3"
              style={{ borderTop: "1px solid var(--line)" }}
            >
              <div>
                <div className="font-display font-bold text-[15px] tracking-tight flex items-center gap-2">
                  {theme.name}
                  {active && (
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${theme.accent}20`,
                        color: theme.accent,
                        border: `1px solid ${theme.accent}40`,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[var(--mist)] text-[13px] mt-0.5">
                  {theme.description}
                </p>
              </div>

              {/* Radio indicator */}
              <span
                className="mt-0.5 w-5 h-5 rounded-full flex-none border-2 grid place-items-center"
                style={{
                  borderColor: active ? theme.accent : "var(--mist)",
                  background: active ? theme.accent : "transparent",
                }}
                aria-hidden="true"
              >
                {active && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: theme.id === "ocean" ? "#06141a" : "#ffffff" }}
                  />
                )}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ── Miniature page preview ─────────────────────────────── */
function ThemePreview({ theme }: { theme: (typeof THEMES)[number] }) {
  const isAbyss = theme.id === "abyss";

  const bg = isAbyss
    ? "linear-gradient(135deg, #0d0820 0%, #1a1040 100%)"
    : "linear-gradient(135deg, #06141a 0%, #0f3a44 100%)";

  const deck = isAbyss ? "#100d1f" : "#0c222b";
  const hull = isAbyss ? "#1a1535" : "#13303b";
  const accent = theme.accent;
  const accentB = theme.accentSecondary;
  const line = isAbyss ? "rgba(150,130,255,0.15)" : "rgba(160,225,215,0.12)";
  const mist = isAbyss ? "#9490b8" : "#8fb0ad";
  const foam = isAbyss ? "#ede9ff" : "#e9f5f2";

  return (
    <div
      className="relative w-full overflow-hidden select-none pointer-events-none"
      style={{ background: bg, aspectRatio: "16/9" }}
      aria-hidden="true"
    >
      {/* Background glow */}
      <div
        className="absolute inset-0"
        style={{
          background: isAbyss
            ? "radial-gradient(ellipse 80% 60% at 60% 30%, rgba(99,80,220,0.2) 0%, transparent 70%)"
            : "radial-gradient(ellipse 80% 60% at 60% 30%, rgba(53,214,192,0.1) 0%, transparent 70%)",
        }}
      />

      {/* Mini nav bar */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center gap-1.5 px-3 py-2"
        style={{ background: `${deck}cc`, borderBottom: `1px solid ${line}` }}
      >
        {/* Logo dot */}
        <span
          className="w-3 h-3 rounded-[3px]"
          style={{
            background: `conic-gradient(from 200deg, ${accent}, ${deck}, ${accent})`,
          }}
        />
        <span className="w-6 h-1.5 rounded-full" style={{ background: foam, opacity: 0.8 }} />
        {/* Nav items */}
        {[16, 12, 20, 14].map((w, i) => (
          <span
            key={i}
            className="rounded-full"
            style={{
              width: w,
              height: 4,
              background: i === 0 ? accent : mist,
              opacity: i === 0 ? 0.9 : 0.4,
              marginLeft: i === 0 ? 6 : 3,
            }}
          />
        ))}
        {/* CTA button */}
        <span
          className="ml-auto rounded-[4px] px-2 py-0.5 text-[6px] font-bold"
          style={{ background: accent, color: isAbyss ? "#fff" : deck }}
        >
          ▶
        </span>
      </div>

      {/* Mini hero content */}
      <div className="absolute top-[28px] left-3 right-[38%] bottom-[28px] flex flex-col justify-center gap-1.5">
        <span
          className="rounded-full"
          style={{ width: 40, height: 3, background: accent, opacity: 0.7 }}
        />
        <span
          className="rounded"
          style={{ width: "75%", height: 8, background: foam, opacity: 0.9 }}
        />
        <span
          className="rounded"
          style={{ width: "60%", height: 7, background: accent, opacity: 0.85 }}
        />
        <span
          className="rounded"
          style={{ width: "55%", height: 3, background: mist, opacity: 0.6, marginTop: 2 }}
        />
        {/* CTA buttons */}
        <div className="flex gap-1.5 mt-1">
          <span
            className="rounded-[4px]"
            style={{ width: 28, height: 7, background: accent, opacity: 0.9 }}
          />
          <span
            className="rounded-[4px]"
            style={{ width: 24, height: 7, background: hull, border: `1px solid ${line}` }}
          />
        </div>
      </div>

      {/* Mini ship silhouette */}
      <div className="absolute right-0 bottom-[20px] w-[42%] opacity-60">
        <svg viewBox="0 0 200 100" fill="none">
          <path d="M20 70 L160 55 L185 65 L185 78 L18 80Z" fill={hull} stroke={line} strokeWidth="0.5" />
          <rect x="80" y="42" width="50" height="16" rx="2" fill={deck} />
          <rect x="100" y="32" width="24" height="12" rx="2" fill={hull} />
          <line x1="112" y1="14" x2="112" y2="32" stroke={mist} strokeWidth="1" opacity="0.5" />
          <ellipse cx="48" cy="68" rx="14" ry="5" fill={deck} />
          <ellipse cx="130" cy="62" rx="14" ry="5" fill={deck} />
          {/* Glow line */}
          <path d="M22 77 Q100 72 183 75" stroke={`${accent}60`} strokeWidth="1.5" fill="none" />
        </svg>
      </div>

      {/* Mini feature strip */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-3 py-1.5"
        style={{ background: `${deck}e0`, borderTop: `1px solid ${line}` }}
      >
        {[
          { label: "Play & Earn", color: accent },
          { label: "Own Stats", color: accentB },
          { label: "Compete", color: accent },
        ].map((f) => (
          <div key={f.label} className="flex items-center gap-1">
            <span
              className="rounded-[2px]"
              style={{ width: 6, height: 6, background: f.color, opacity: 0.8 }}
            />
            <span style={{ fontSize: 5, color: mist, fontFamily: "sans-serif" }}>
              {f.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
