"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/layout/ThemeProvider";
import { THEMES } from "@/lib/themes";
import { useAuthCtx } from "@/lib/AuthContext";
import { CHAIN_NAME, ALLOW_DEV_WALLET } from "@/lib/config";
import { useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/badges", label: "Badges" },
  { href: "/rewards", label: "Rewards" },
  { href: "/replays", label: "Replays" },
];

export function Header() {
  const pathname = usePathname();
  const isLanding = pathname === "/";
  const { themeId, setTheme } = useTheme();
  const { address, login, logout, switchDevIdentity } = useAuthCtx();
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const nextTheme = THEMES.find((t) => t.id !== themeId)!;

  const handleConnect = async () => {
    setConnecting(true);
    setConnectError(null);
    try {
      await login();
    } catch (err: any) {
      console.error("Connect failed:", err);
      setConnectError(err?.message ?? "Could not connect your wallet");
    } finally {
      setConnecting(false);
    }
  };

  const shortAddr = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : null;

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-6 px-8 py-4 border-b backdrop-blur-sm"
      style={{
        borderColor: isLanding ? "transparent" : "var(--line)",
        background: isLanding ? "rgba(6,20,26,0.5)" : "rgba(6,20,26,0.85)",
        ...(themeId === "abyss" && !isLanding ? { background: "rgba(7,5,15,0.9)" } : {}),
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 font-display font-extrabold text-[19px] tracking-tight">
        <span
          className="w-[30px] h-[30px] rounded-[9px] grid place-items-center flex-none"
          style={{ background: "conic-gradient(from 200deg, var(--signal), var(--deck), var(--signal))" }}
          aria-hidden="true"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M2 13L8 2L14 13L8 10L2 13Z" fill="var(--abyss)" stroke="var(--signal)" strokeWidth="1.2" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-[var(--foam)]">
          Web3 <span style={{ color: "var(--signal)" }}>Battle Arena</span>
        </span>
      </Link>

      {/* Nav */}
      <nav className="hidden md:flex items-center gap-1 ml-2">
        {NAV_LINKS.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3.5 py-1.5 rounded-[9px] text-[13.5px] font-semibold transition-all",
                active
                  ? "text-[var(--foam)] shadow-sm"
                  : "text-[var(--mist)] hover:text-[var(--foam)] hover:bg-[var(--hull)]"
              )}
              style={
                active
                  ? {
                      background: "rgba(53,214,192,0.1)",
                      color: "var(--signal)",
                    }
                  : undefined
              }
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-3">
        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={() => setTheme(nextTheme.id)}
          className="w-9 h-9 rounded-[10px] grid place-items-center border transition-all hover:bg-[var(--hull)] hover:-translate-y-px"
          style={{
            borderColor: "var(--line)",
            background: "rgba(12,34,43,0.5)",
          }}
          title={`Switch to ${nextTheme.name} theme`}
          aria-label={`Switch to ${nextTheme.name} theme`}
        >
          <ThemeToggleIcon themeId={themeId} />
        </button>

        {/* Settings link */}
        <Link
          href="/settings"
          className="w-9 h-9 rounded-[10px] grid place-items-center border transition-all hover:bg-[var(--hull)] hover:-translate-y-px"
          style={{
            borderColor: "var(--line)",
            background: "rgba(12,34,43,0.5)",
          }}
          title="Theme & Arena Settings"
          aria-label="Theme & Arena Settings"
        >
          <SettingsIcon />
        </Link>

        {/* Network Pill */}
        {address && (
          <div
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[12px] font-mono font-medium"
            style={{
              background: "rgba(53,214,192,0.06)",
              borderColor: "rgba(53,214,192,0.25)",
              color: "var(--signal)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "var(--signal)" }}
            />
            {CHAIN_NAME}
          </div>
        )}

        {/* Wallet & Identity Controls */}
        {address ? (
          <div className="flex items-center gap-2">
            {ALLOW_DEV_WALLET && (
            <button
              type="button"
              onClick={switchDevIdentity}
              className="text-[11px] font-mono px-2.5 py-1.5 rounded-[9px] bg-[rgba(53,214,192,0.12)] text-[var(--signal)] hover:bg-[rgba(53,214,192,0.22)] border border-[rgba(53,214,192,0.3)] transition-all font-semibold flex items-center gap-1"
              title="Spawn fresh player identity for 2-browser testing"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">New Player</span>
            </button>
            )}

            <div
              className="hidden sm:flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full border font-semibold"
              style={{ background: "var(--deck)", borderColor: "var(--line)" }}
            >
              <span className="text-[var(--mist)] font-medium text-[13px]">{shortAddr}</span>
              <span
                className="w-[28px] h-[28px] rounded-full flex-none"
                style={{ background: "linear-gradient(135deg, var(--brass), var(--flare))" }}
                aria-label="Avatar"
              />
            </div>

            <button
              type="button"
              onClick={logout}
              className="text-[12px] text-[var(--mist)] hover:text-red-400 transition-colors px-2 font-bold"
              title="Disconnect wallet"
            >
              ✕
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={connecting}
            onClick={handleConnect}
            className="flex items-center gap-2 pl-4 pr-5 py-2.5 rounded-[12px] font-bold text-[14px] transition-all hover:-translate-y-px disabled:opacity-60"
            style={{
              background: "linear-gradient(135deg, var(--accent-cta), color-mix(in srgb, var(--accent-cta) 80%, black))",
              color: "var(--cta-text)",
              boxShadow: "0 4px 20px -4px var(--cta-shadow)",
            }}
          >
            <WalletIcon />
            {connecting ? "Connecting…" : "Connect Wallet"}
          </button>
        )}
        {!address && connectError && (
          <span role="alert" className="max-w-[240px] text-[12px] text-[var(--flare)]">
            {connectError}
          </span>
        )}
      </div>
    </header>
  );
}

function ThemeToggleIcon({ themeId }: { themeId: string }) {
  if (themeId === "ocean") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M13.5 10A6 6 0 1 1 6 2.5a4.5 4.5 0 0 0 7.5 7.5z" fill="rgba(139,127,240,0.8)" stroke="rgba(139,127,240,0.9)" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2 10 Q5 7 8 10 Q11 13 14 10" stroke="rgba(53,214,192,0.9)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M2 6.5 Q5 3.5 8 6.5 Q11 9.5 14 6.5" stroke="rgba(53,214,192,0.5)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle cx="8" cy="8" r="2.5" stroke="var(--mist)" strokeWidth="1.5" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M2.93 2.93l1.41 1.41M11.66 11.66l1.41 1.41M2.93 13.07l1.41-1.41M11.66 4.34l1.41-1.41" stroke="var(--mist)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="11.5" cy="9.5" r="1" fill="currentColor" />
    </svg>
  );
}
