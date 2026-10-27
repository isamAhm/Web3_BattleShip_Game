"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "/", label: "Arena" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/badges", label: "Badges" },
  { href: "/replays", label: "Replays" },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header
      className="sticky top-0 z-50 flex items-center gap-8 px-8 py-4 border-b backdrop-blur-sm"
      style={{
        borderColor: "var(--line)",
        background: "rgba(6,20,26,0.8)",
      }}
    >
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2.5 font-display font-extrabold text-[19px] tracking-tight">
        <span
          className="w-[30px] h-[30px] rounded-[9px] grid place-items-center"
          style={{
            background: "conic-gradient(from 200deg, var(--signal), #1c7f8f, var(--signal))",
          }}
          aria-hidden="true"
        >
          <span className="w-2.5 h-2.5 rounded-full border-[2.5px] border-[var(--abyss)]" />
        </span>
        Battle Arena
      </Link>

      {/* Nav */}
      <nav aria-label="Main" className="flex gap-1 mr-auto">
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

      {/* Network indicator */}
      <div className="flex items-center gap-2 text-[var(--mist)] text-[13px]">
        <span
          className="w-2 h-2 rounded-full"
          style={{
            background: "var(--signal)",
            boxShadow: "0 0 10px var(--signal)",
          }}
          aria-hidden="true"
        />
        Base Sepolia
      </div>

      {/* Wallet */}
      <div
        className="flex items-center gap-2.5 pl-3.5 pr-2 py-1.5 rounded-full border font-semibold"
        style={{ background: "var(--deck)", borderColor: "var(--line)" }}
      >
        <span className="text-[var(--mist)] font-medium">0x7a3f…c91d</span>
        Captain Mira
        <span
          className="w-[30px] h-[30px] rounded-full"
          style={{ background: "linear-gradient(135deg, var(--brass), var(--flare))" }}
          aria-label="Avatar"
        />
      </div>
    </header>
  );
}
