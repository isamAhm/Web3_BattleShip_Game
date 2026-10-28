'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Trophy, ShieldCheck, RotateCcw, Film, Home } from 'lucide-react';

interface ResultCardProps {
  matchId: string;
  isWinner: boolean;
  forfeit: boolean;
  myScore: number;
  opponentScore: number;
  streak: number;
  totalShots: number;
  verification: any;
  resultHash: string | null;
  onSubmitReveal: () => Promise<void>;
  onPlayAgain: () => void;
}

export function ResultCard({
  matchId,
  isWinner,
  forfeit,
  myScore,
  opponentScore: _opponentScore,
  streak,
  totalShots,
  verification,
  resultHash,
  onSubmitReveal,
  onPlayAgain,
}: ResultCardProps) {
  const [isSubmittingReveal, setIsSubmittingReveal] = useState(false);
  const [revealSuccess, setRevealSuccess] = useState(false);
  const [revealError, setRevealError] = useState<string | null>(null);

  const handleReveal = async () => {
    setIsSubmittingReveal(true);
    setRevealError(null);
    try {
      await onSubmitReveal();
      setRevealSuccess(true);
    } catch (err: any) {
      setRevealError(err.message || 'Failed to submit reveal');
    } finally {
      setIsSubmittingReveal(false);
    }
  };

  // Speed bonus formula from engine: max(0, 100 - 5 * (shots - 17))
  const speedBonus = isWinner ? Math.max(0, 100 - 5 * Math.max(0, totalShots - 17)) : 0;

  return (
    <Card
      className="max-w-xl mx-auto p-6 text-center border-arena-border relative overflow-hidden"
      glow={isWinner ? 'amber' : 'red'}
    >
      {/* Background Glow Banner */}
      <div
        className={`absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isWinner ? 'bg-arena-amber' : 'bg-arena-red'
        }`}
      />

      {/* Outcome Title */}
      <div className="relative z-10 flex flex-col items-center">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-xl ${
            isWinner
              ? 'bg-gradient-to-tr from-arena-amber to-amber-200 text-arena-bg shadow-arena-amber/30'
              : 'bg-arena-panel border border-arena-red text-arena-redBright shadow-arena-red/30'
          }`}
        >
          <Trophy className="w-8 h-8" />
        </div>

        <h2 className="text-3xl font-extrabold tracking-wider text-white uppercase font-sans">
          {isWinner ? (
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-arena-amber to-amber-200">
              VICTORY ACHIEVED
            </span>
          ) : (
            <span className="text-arena-redBright">DEFEAT SUFFERED</span>
          )}
        </h2>

        <p className="text-xs text-arena-textMuted mt-1">
          {forfeit
            ? 'Match concluded by surrender / disconnection'
            : isWinner
              ? 'Enemy fleet neutralized. Sector secured.'
              : 'Defensive fleet overwhelmed by hostile forces.'}
        </p>
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 text-center relative z-10">
        <div className="p-3 rounded-xl bg-arena-surface/80 border border-arena-border/50">
          <span className="text-[10px] font-mono text-arena-textMuted uppercase">Final Score</span>
          <div className="text-xl font-extrabold text-white font-mono mt-0.5">{myScore}</div>
        </div>

        <div className="p-3 rounded-xl bg-arena-surface/80 border border-arena-border/50">
          <span className="text-[10px] font-mono text-arena-textMuted uppercase">Best Streak</span>
          <div className="text-xl font-extrabold text-arena-amber font-mono mt-0.5">
            {streak} Hits
          </div>
        </div>

        <div className="p-3 rounded-xl bg-arena-surface/80 border border-arena-border/50">
          <span className="text-[10px] font-mono text-arena-textMuted uppercase">Total Salvos</span>
          <div className="text-xl font-extrabold text-arena-cyan font-mono mt-0.5">
            {totalShots} Shots
          </div>
        </div>

        <div className="p-3 rounded-xl bg-arena-surface/80 border border-arena-border/50">
          <span className="text-[10px] font-mono text-arena-textMuted uppercase">Speed Bonus</span>
          <div className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
            +{speedBonus} PTS
          </div>
        </div>
      </div>

      {/* Cryptographic Reveal & Proof Section */}
      <div className="p-4 rounded-xl bg-arena-panel/90 border border-arena-border/70 my-5 text-left relative z-10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-arena-cyan" />
            <span className="text-xs font-bold uppercase tracking-wider text-white">
              Commit-Reveal Verification
            </span>
          </div>

          <Badge variant={verification?.isValid || revealSuccess ? 'success' : 'amber'} size="sm">
            {verification?.isValid || revealSuccess ? 'VERIFIED' : 'PENDING REVEAL'}
          </Badge>
        </div>

        <p className="text-[11px] text-arena-textSub leading-relaxed">
          Matches on Web3 Battle Arena are cryptographically verifiable. Submit your secret salt to
          prove fleet commitment integrity against the authoritative replay log.
        </p>

        {revealError && (
          <div className="p-2.5 rounded bg-arena-red/10 border border-arena-red/30 text-arena-redBright text-xs">
            {revealError}
          </div>
        )}

        {resultHash && (
          <div className="p-2 rounded bg-arena-bg font-mono text-[10px] text-arena-cyan break-all border border-arena-border/40">
            Hash: {resultHash}
          </div>
        )}

        {!(verification?.isValid || revealSuccess) && (
          <Button
            size="sm"
            variant="cyan"
            className="w-full mt-2"
            isLoading={isSubmittingReveal}
            onClick={handleReveal}
          >
            <ShieldCheck className="w-3.5 h-3.5 mr-1" />
            Submit Fleet Reveal & Finalize Proof
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10 pt-2">
        <Button variant="primary" size="md" onClick={onPlayAgain} className="w-full sm:w-auto">
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Play Again
        </Button>

        <Link href={`/history/${matchId}`} className="w-full sm:w-auto">
          <Button variant="secondary" size="md" className="w-full">
            <Film className="w-4 h-4 mr-1.5" />
            Watch Replay
          </Button>
        </Link>

        <Link href="/lobby" className="w-full sm:w-auto">
          <Button variant="ghost" size="md" className="w-full">
            <Home className="w-4 h-4 mr-1.5" />
            Lobby
          </Button>
        </Link>
      </div>
    </Card>
  );
}
