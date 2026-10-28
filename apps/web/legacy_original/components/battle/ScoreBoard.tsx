'use client';

import React from 'react';
import { Flame, Target } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';
import { Card } from '@/components/shared/Card';

interface ScoreBoardProps {
  myScore: number;
  opponentScore: number;
  streak: number;
  myShipsSunk: number;
  opponentShipsSunk: number;
}

export function ScoreBoard({
  myScore,
  opponentScore,
  streak,
  myShipsSunk,
  opponentShipsSunk,
}: ScoreBoardProps) {
  // Streak multiplier formula from engine: 1.0 + 0.25 * consecutiveHits capped at 2.0
  const multiplier = Math.min(2.0, 1.0 + Math.max(0, streak - 1) * 0.25).toFixed(2);

  return (
    <Card className="p-4 grid grid-cols-3 items-center divide-x divide-arena-border/50 border-arena-border">
      {/* Your Score */}
      <div className="flex flex-col items-center text-center pr-2">
        <span className="text-[10px] font-mono uppercase text-arena-cyan font-bold tracking-wider">
          Commander (You)
        </span>
        <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-0.5">
          {myScore}
        </span>
        <div className="flex items-center gap-1 mt-1 text-[11px] text-arena-textMuted">
          <Target className="w-3 h-3 text-emerald-400" />
          <span>Sunk: {opponentShipsSunk}/5</span>
        </div>
      </div>

      {/* Streak Multiplier */}
      <div className="flex flex-col items-center justify-center text-center px-2">
        <div className="flex items-center gap-1 text-arena-amber font-mono text-xs font-bold uppercase">
          <Flame className="w-3.5 h-3.5 text-arena-amber animate-pulse" />
          <span>Streak: {streak}</span>
        </div>
        <Badge
          variant={streak > 1 ? 'amber' : 'neutral'}
          size="sm"
          className="mt-1 font-bold text-xs"
        >
          x{multiplier} MULTIPLIER
        </Badge>
        <span className="text-[9px] text-arena-textMuted mt-1 font-mono">Hit +10 · Sink +40</span>
      </div>

      {/* Opponent Score */}
      <div className="flex flex-col items-center text-center pl-2">
        <span className="text-[10px] font-mono uppercase text-arena-redBright font-bold tracking-wider">
          Enemy Fleet
        </span>
        <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono mt-0.5">
          {opponentScore}
        </span>
        <div className="flex items-center gap-1 mt-1 text-[11px] text-arena-textMuted">
          <Target className="w-3 h-3 text-arena-redBright" />
          <span>Lost: {myShipsSunk}/5</span>
        </div>
      </div>
    </Card>
  );
}
