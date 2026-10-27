"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import { THEMES } from "@/lib/themes";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/replays", label: "Replays" },
];

export function Header() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { themeId, setTheme, theme } = useTheme();

  const nextTheme = THEMES.find((t) => t.id !== themeId)!;

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-6 px-8 py-4 border-b backdrop-blur-sm"
      style={{
        borderColor: isLanding ? "transparent" : "var(--line)",
        background: isLanding ? "rgba(6,20,26,0.5)" : "rgba(6,20,26,0.85)",
        // Override background with theme abyss value when needed
        ...(themeId === "abyss" && !isLanding
          ? { background: "rgba(7,5,15,0.9)" }
          : {}),
      }}
    >
      {/* Logo */}
      <Link
        href="/"
        className="flex items-center gap-2.5 font-display font-extrabold text-[19px] tracking-tight"
      >
        <span
          className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-none"
          style={{
            background: `conic-gradient(from 200deg, var(--signal), var(--deck), var(--signal))`,
          }}
          aria-hidden="true"
        >
          <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-[var(--abyss)]" />
        </span>
        Battle Arena
      </Link>

      {/* Nav */}
      <nav aria-label="Main" className="hidden md:flex gap-1 mr-auto">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "px-3.5 py-2 rounded-[10px] font-medium transition-colors text-[var(--mist)] hover:text-[var(--foam)]",
                active && "bg-[var(--hull)] text-[var(--foam)]"
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto md:ml-0 flex items-center gap-2">
        {/* Quick theme toggle */}
        <button
          type="button"
          onClick={() => setTheme(nextTheme.id)}
          title={`Switch to ${nextTheme.name} theme`}
          className="w-9 h-9 rounded-[10px] grid place-items-center border transition-all hover:-translate-y-px hover:shadow-sm"
          style={{ background: "var(--hull)", borderColor: "var(--line)" }}
          aria-label={`Switch to ${nextTheme.name} theme`}
        >
          <ThemeToggleIcon themeId={themeId} />
        </button>

        {/* Settings link */}
        <Link
          href="/settings"
          title="Settings"
          className={cn(
            "w-9 h-9 rounded-[10px] grid place-items-center border transition-all hover:-translate-y-px",
            pathname === "/settings" && "bg-[var(--hull)]"
          )}
          style={{ borderColor: "var(--line)" }}
          aria-label="Settings"
        >
          <SettingsIcon />
        </Link>

        {/* Network pill — hide on landing */}
        {!isLanding && (
          <div className="hidden lg:flex items-center gap-2 text-[var(--mist)] text-[13px] ml-1">
            <span
              className="w-2 h-2 rounded-full flex-none"
              style={{
                background: "var(--signal)",
                boxShadow: "0 0 10px var(--signal)",
              }}
              aria-hidden="true"
            />
            Base Sepolia
          </div>
        )}

        {/* Wallet / Connect button */}
        {isLanding ? (
          <button
            type="button"
            className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-[12px] font-bold text-[14px] transition-all hover:-translate-y-px"
            style={{
              background: `linear-gradient(135deg, var(--accent-cta), color-mix(in srgb, var(--accent-cta) 80%, black))`,
              color: "var(--cta-text)",
              boxShadow: "0 4px 20px -4px var(--cta-shadow)",
            }}
          >
            <WalletIcon />
            Connect Wallet
          </button>
        ) : (
          <div
            className="hidden sm:flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full border font-semibold ml-1"
            style={{ background: "var(--deck)", borderColor: "var(--line)" }}
          >
            <span className="text-[var(--mist)] font-medium">0x7a3f…c91d</span>
            Captain Mira
            <span
              className="w-[30px] h-[30px] rounded-full flex-none"
              style={{
                background: "linear-gradient(135deg, var(--brass), var(--flare))",
              }}
              aria-label="Avatar"
            />
          </div>
        )}
      </div>
    </header>
  );
}

/* ── Icons ───────────────────────────────────────────── */

function ThemeToggleIcon({ themeId }: { themeId: string }) {
  if (themeId === "ocean") {
    // Show "switch to abyss" — purple moon icon
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M13.5 10A6 6 0 1 1 6 2.5a4.5 4.5 0 0 0 7.5 7.5z"
          fill="rgba(139,127,240,0.8)"
          stroke="rgba(139,127,240,0.9)"
          strokeWidth="1"
        />
      </svg>
    );
  }
  // Show "switch to ocean" — teal wave icon
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M2 10 Q5 7 8 10 Q11 13 14 10"
        stroke="rgba(53,214,192,0.9)"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 6.5 Q5 3.5 8 6.5 Q11 9.5 14 6.5"
        stroke="rgba(53,214,192,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="var(--mist)" strokeWidth="1.5" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41"
        stroke="var(--mist)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="1" y="4" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.1)" />
      <path d="M4 4V3a4 4 0 0 1 8 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      <circle cx="11" cy="9" r="1.5" fill="currentColor" />
    </svg>
  );
}
