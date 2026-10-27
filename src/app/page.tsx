import type { Metadata } from "next";
import Link from "next/link";
import { ShipIllustration } from "@/components/landing/ShipIllustration";
import { FeatureStrip } from "@/components/landing/FeatureStrip";
import { StatsRow } from "@/components/landing/StatsRow";
import { HowItWorks } from "@/components/landing/HowItWorks";

export const metadata: Metadata = {
  title: "Web3 Battle Arena — Classic Battleship, Onchain",
  description:
    "Classic battleship. Real players. Onchain rewards. Commit your fleet, fire shots, earn glory on Base Sepolia.",
};

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <section
        className="relative min-h-[calc(100vh-65px)] flex flex-col justify-center overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 60% 40%, rgba(53,100,214,0.18) 0%, transparent 65%), " +
            "radial-gradient(ellipse 60% 50% at 80% 60%, rgba(53,214,192,0.08) 0%, transparent 60%)",
        }}
      >
        {/* Animated ocean waves */}
        <OceanWaves />

        {/* Grid lines overlay */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(53,214,192,0.03) 1px, transparent 1px), " +
              "linear-gradient(90deg, rgba(53,214,192,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
          aria-hidden="true"
        />

        {/* Ship illustration — right side */}
        <div className="absolute right-0 bottom-0 w-[55%] max-w-[820px] pointer-events-none select-none">
          <ShipIllustration />
        </div>

        {/* Purple glow behind ship */}
        <div
          className="absolute right-[10%] top-[30%] w-[500px] h-[400px] rounded-full pointer-events-none animate-pulse-glow"
          style={{
            background:
              "radial-gradient(circle, rgba(99,80,220,0.25) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
          aria-hidden="true"
        />

        {/* Hero content */}
        <div className="relative z-10 max-w-[1280px] mx-auto px-8 py-20 w-full">
          <div className="max-w-[560px]">
            {/* Eyebrow */}
            <p className="animate-fade-up flex items-center gap-2 text-[13px] font-semibold tracking-[0.15em] uppercase text-[var(--signal)] mb-5">
              <span className="w-4 h-px bg-[var(--signal)]" />
              Strategy · Skill · Onchain
              <span className="w-4 h-px bg-[var(--signal)]" />
            </p>

            {/* Headline */}
            <h1
              className="animate-fade-up-2 font-display font-extrabold leading-[0.95] tracking-[-0.03em] mb-6"
              style={{ fontSize: "clamp(52px, 7vw, 96px)" }}
            >
              <span className="text-[var(--foam)]">WEB3</span>
              <br />
              <span
                style={{
                  background:
                    "linear-gradient(135deg, var(--signal) 0%, #6350dc 60%, #3a6df0 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                BATTLE ARENA
              </span>
            </h1>

            {/* Sub */}
            <p className="animate-fade-up-3 text-[var(--mist)] text-[18px] leading-relaxed mb-10 max-w-[420px]">
              Classic battleship. Real players. Onchain rewards.
            </p>

            {/* CTAs */}
            <div className="animate-fade-up-4 flex flex-wrap gap-4">
              <Link
                href="/play"
                className="inline-flex items-center gap-2.5 px-8 py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_rgba(99,80,220,0.7)]"
                style={{
                  background:
                    "linear-gradient(135deg, #6350dc, #4a3ab8)",
                  color: "#fff",
                }}
              >
                <PlayIcon />
                Play Now
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-8 py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-1"
                style={{
                  background: "rgba(19,48,59,0.8)",
                  border: "1px solid var(--line)",
                  color: "var(--foam)",
                  backdropFilter: "blur(8px)",
                }}
              >
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Feature strip at bottom of hero */}
        <div className="relative z-10 w-full">
          <FeatureStrip />
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────── */}
      <StatsRow />

      {/* ── How it works ────────────────────────────────────────── */}
      <HowItWorks />

      {/* ── CTA Banner ──────────────────────────────────────────── */}
      <section className="max-w-[1280px] mx-auto px-8 py-20">
        <div
          className="relative rounded-[28px] overflow-hidden p-12 text-center"
          style={{
            background:
              "linear-gradient(135deg, rgba(99,80,220,0.25) 0%, rgba(53,214,192,0.1) 100%)",
            border: "1px solid rgba(99,80,220,0.3)",
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(99,80,220,0.15) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <div className="relative z-10">
            <p className="text-[var(--signal)] font-semibold text-[13px] tracking-widest uppercase mb-3">
              Ready to fight?
            </p>
            <h2 className="font-display font-extrabold text-[42px] tracking-tight mb-4">
              Enter the Arena
            </h2>
            <p className="text-[var(--mist)] text-[16px] mb-8 max-w-[440px] mx-auto">
              Commit your fleet, fire your shots, and earn on-chain glory. No gas needed to play.
            </p>
            <Link
              href="/play"
              className="inline-flex items-center gap-2.5 px-10 py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-1 hover:shadow-[0_12px_40px_-8px_rgba(99,80,220,0.7)]"
              style={{
                background: "linear-gradient(135deg, #6350dc, #4a3ab8)",
                color: "#fff",
              }}
            >
              <PlayIcon />
              Launch Battle Arena
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="border-t px-8 py-8"
        style={{ borderColor: "var(--line)" }}
      >
        <div className="max-w-[1280px] mx-auto flex flex-wrap items-center justify-between gap-4 text-[var(--mist)] text-[13px]">
          <div className="flex items-center gap-2.5 font-display font-extrabold text-[16px] text-[var(--foam)]">
            <span
              className="w-6 h-6 rounded-[6px] grid place-items-center"
              style={{
                background:
                  "conic-gradient(from 200deg, var(--signal), #1c7f8f, var(--signal))",
              }}
              aria-hidden="true"
            >
              <span className="w-2 h-2 rounded-full border-[2px] border-[var(--abyss)]" />
            </span>
            Battle Arena
          </div>
          <span>Built for Base Sepolia · Hackathon 2026</span>
          <div className="flex gap-5">
            <Link href="/arena" className="hover:text-[var(--foam)] transition-colors">Play</Link>
            <Link href="/leaderboard" className="hover:text-[var(--foam)] transition-colors">Leaderboard</Link>
            <Link href="/replays" className="hover:text-[var(--foam)] transition-colors">Replays</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M6 3.5l9 5.5-9 5.5V3.5z" fill="currentColor" />
    </svg>
  );
}

function OceanWaves() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 h-[180px] pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Wave layer 1 */}
      <div
        className="absolute bottom-0 animate-wave"
        style={{
          width: "200%",
          height: "80px",
          background:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 80'%3E%3Cpath fill='rgba(53,214,192,0.06)' d='M0 40 C360 80 720 0 1080 40 C1260 60 1350 50 1440 40 L1440 80 L0 80Z'/%3E%3C/svg%3E\") repeat-x bottom",
          backgroundSize: "720px 80px",
          animationDuration: "14s",
        }}
      />
      {/* Wave layer 2 */}
      <div
        className="absolute bottom-0 animate-wave"
        style={{
          width: "200%",
          height: "60px",
          background:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 60'%3E%3Cpath fill='rgba(53,214,192,0.04)' d='M0 30 C480 60 960 0 1440 30 L1440 60 L0 60Z'/%3E%3C/svg%3E\") repeat-x bottom",
          backgroundSize: "720px 60px",
          animationDuration: "20s",
          animationDirection: "reverse",
        }}
      />
    </div>
  );
}
