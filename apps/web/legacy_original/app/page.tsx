'use client';

import React from 'react';
import Link from 'next/link';
import { Swords, ShieldCheck, Award, ChevronRight, Flame, Bomb, Radio, Lock } from 'lucide-react';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Card } from '@/components/shared/Card';

export default function LandingPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Decorative Tactical Ambient Gradients */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-arena-violet/20 via-arena-cyan/15 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 right-10 w-96 h-96 bg-arena-amber/10 blur-3xl pointer-events-none" />

      {/* Hero Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center flex flex-col items-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-arena-surface/90 border border-arena-cyan/30 text-arena-cyanBright text-xs font-mono font-bold tracking-widest uppercase mb-6 shadow-md shadow-arena-cyan/10">
          <Radio className="w-3.5 h-3.5 text-arena-cyan animate-pulse" />
          <span>STRATEGY · SKILL · ONCHAIN</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-white uppercase font-sans leading-none">
          WEB3 BATTLE{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-arena-cyan to-arena-violet">
            ARENA
          </span>
        </h1>

        {/* Supporting text */}
        <p className="mt-6 text-base sm:text-xl text-arena-textSub max-w-2xl font-normal leading-relaxed">
          Classic Battleship. Real players. Verifiable victories. Deploy tactical fleets, place
          hidden mines, and compete onchain with cryptographic commit-reveal proofs.
        </p>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <Link href="/lobby" className="w-full sm:w-auto">
            <Button size="lg" variant="cyan" className="w-full sm:w-auto gap-2 group">
              <Swords className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              Play Now
            </Button>
          </Link>

          <Link href="/leaderboard" className="w-full sm:w-auto">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto gap-2">
              Explore the Arena
              <ChevronRight className="w-4 h-4 text-arena-cyan" />
            </Button>
          </Link>
        </div>

        {/* Tactical Teaser Grid Visual */}
        <div className="mt-14 w-full max-w-4xl p-1 rounded-2xl bg-gradient-to-b from-arena-border via-arena-border/30 to-transparent shadow-2xl">
          <div className="rounded-[15px] bg-arena-panel/90 p-6 border border-arena-border/50 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between pb-4 border-b border-arena-border/60 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-mono font-bold text-white tracking-widest uppercase">
                  ACTIVE SECTOR · COMBAT LIVE SIMULATION
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="cyan" size="sm">
                  10x10 Tactical Grid
                </Badge>
                <Badge variant="amber" size="sm">
                  3 Hidden Mines
                </Badge>
                <Badge variant="violet" size="sm">
                  Keccak-256 Hash
                </Badge>
              </div>
            </div>

            {/* Quick Demo Visual Mockup */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-left">
              <div className="p-4 rounded-xl bg-arena-surface/80 border border-arena-border/50">
                <div className="flex items-center justify-between text-xs text-arena-textMuted font-mono">
                  <span>COMMAND SALVO</span>
                  <Flame className="w-3.5 h-3.5 text-arena-redBright" />
                </div>
                <div className="text-lg font-bold text-white mt-1">Streak Multiplier x2.0</div>
                <p className="text-xs text-arena-textSub mt-1">
                  Consecutive hits ramp up scoring multiplier up to 200%.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-arena-surface/80 border border-arena-border/50">
                <div className="flex items-center justify-between text-xs text-arena-textMuted font-mono">
                  <span>TACTICAL HAZARDS</span>
                  <Bomb className="w-3.5 h-3.5 text-arena-amber" />
                </div>
                <div className="text-lg font-bold text-white mt-1">Hidden Naval Mines</div>
                <p className="text-xs text-arena-textSub mt-1">
                  Striking a mine deducts 20 points and resets your streak multiplier.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-arena-surface/80 border border-arena-border/50">
                <div className="flex items-center justify-between text-xs text-arena-textMuted font-mono">
                  <span>CRYPTOGRAPHIC PROOF</span>
                  <Lock className="w-3.5 h-3.5 text-arena-cyan" />
                </div>
                <div className="text-lg font-bold text-white mt-1">Commit-Reveal Hashing</div>
                <p className="text-xs text-arena-textSub mt-1">
                  Zero cheating: secret salts and canonical replays verify every match outcome.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three Feature Highlights (Compete, Prove, Collect) */}
      <section className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-arena-border/40">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Compete */}
          <Card
            className="p-6 border-arena-border hover:border-arena-cyan/50 transition-all group"
            glow="none"
          >
            <div className="w-12 h-12 rounded-xl bg-arena-cyan/15 flex items-center justify-center text-arena-cyan group-hover:scale-110 transition-transform mb-4">
              <Swords className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-arena-cyan transition-colors">
              Compete
            </h3>
            <p className="text-xs text-arena-textSub mt-2 leading-relaxed">
              Real-time multiplayer Battleship with authoritatively enforced 20-second turn timers,
              tactical hidden mines, and streak multipliers.
            </p>
          </Card>

          {/* 2. Prove */}
          <Card
            className="p-6 border-arena-border hover:border-arena-violet/50 transition-all group"
            glow="none"
          >
            <div className="w-12 h-12 rounded-xl bg-arena-violet/15 flex items-center justify-center text-arena-violet group-hover:scale-110 transition-transform mb-4">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-arena-violet transition-colors">
              Prove
            </h3>
            <p className="text-xs text-arena-textSub mt-2 leading-relaxed">
              Cryptographically verified match outcomes. Commitments are salted with Keccak-256,
              guaranteeing zero tampering before the post-game reveal.
            </p>
          </Card>

          {/* 3. Collect */}
          <Card
            className="p-6 border-arena-border hover:border-arena-amber/50 transition-all group"
            glow="none"
          >
            <div className="w-12 h-12 rounded-xl bg-arena-amber/15 flex items-center justify-center text-arena-amber group-hover:scale-110 transition-transform mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-arena-amber transition-colors">
              Collect
            </h3>
            <p className="text-xs text-arena-textSub mt-2 leading-relaxed">
              Unlock prestigious achievement badges, climb the global competitive leaderboard, and
              accrue ARENA points on the verifiable ledger.
            </p>
          </Card>
        </div>
      </section>
    </div>
  );
}
