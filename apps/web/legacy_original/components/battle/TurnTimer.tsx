'use client';

import React from 'react';
import { Clock, ShieldAlert, Zap } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';

interface TurnTimerProps {
  isMyTurn: boolean;
  secondsRemaining: number;
}

export function TurnTimer({ isMyTurn, secondsRemaining }: TurnTimerProps) {
  const isUrgent = secondsRemaining <= 5;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 20) * 100));

  return (
    <div className="w-full bg-arena-panel border border-arena-border rounded-xl p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isMyTurn ? (
            <div className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-arena-cyanBright">
              <Zap className="w-4 h-4 animate-bounce text-arena-cyanBright" />
              <span>Your Turn — Select Target Cell</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-arena-textMuted">
              <ShieldAlert className="w-4 h-4 text-arena-amber" />
              <span>Opponent&apos;s Turn — Stand By</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={isUrgent ? 'red' : isMyTurn ? 'cyan' : 'neutral'}
            size="sm"
            className={`font-mono text-xs font-bold ${isUrgent ? 'animate-pulse' : ''}`}
          >
            <Clock className="w-3 h-3" />
            {secondsRemaining}s
          </Badge>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-arena-bg rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            isUrgent
              ? 'bg-arena-red'
              : isMyTurn
                ? 'bg-gradient-to-r from-arena-cyan to-arena-violet'
                : 'bg-arena-border'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
