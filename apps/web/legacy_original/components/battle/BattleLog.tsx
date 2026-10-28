'use client';

import React, { useRef, useEffect } from 'react';
import { type ShotResultEvent } from '@/providers/GameContext';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Crosshair, AlertTriangle, Flame } from 'lucide-react';

interface BattleLogProps {
  shots: ShotResultEvent[];
  myAddress: string | null;
}

export function BattleLog({ shots, myAddress }: BattleLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const normAddress = myAddress?.toLowerCase();

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [shots]);

  return (
    <Card className="p-3 flex flex-col h-56 border-arena-border">
      <div className="flex items-center justify-between pb-2 border-b border-arena-border/50 mb-2">
        <span className="text-xs font-bold text-arena-textSub uppercase tracking-wider flex items-center gap-1.5">
          <Crosshair className="w-3.5 h-3.5 text-arena-cyan" />
          Tactical Battle Feed
        </span>
        <span className="text-[10px] font-mono text-arena-textMuted">{shots.length} events</span>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {shots.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-arena-textMuted">
            Awaiting first salvo...
          </div>
        ) : (
          shots.map((shot, idx) => {
            const isMe = normAddress ? shot.shooter.toLowerCase() === normAddress : false;
            const coordStr = `${columns[shot.coordinate.x]}${shot.coordinate.y + 1}`;

            let badgeVariant: 'red' | 'amber' | 'cyan' | 'neutral' = 'neutral';
            let icon = null;

            if (shot.outcome === 'sunk') {
              badgeVariant = 'red';
              icon = <Flame className="w-3 h-3 text-arena-redBright" />;
            } else if (shot.outcome === 'hit') {
              badgeVariant = 'red';
              icon = <Flame className="w-3 h-3 text-arena-redBright" />;
            } else if (shot.outcome === 'mine') {
              badgeVariant = 'amber';
              icon = <AlertTriangle className="w-3 h-3 text-arena-amberBright" />;
            }

            return (
              <div
                key={idx}
                className="flex items-center justify-between text-xs p-1.5 rounded bg-arena-surface/60 border border-arena-border/30"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold text-[11px] ${
                      isMe ? 'text-arena-cyan' : 'text-arena-redBright'
                    }`}
                  >
                    {isMe ? 'YOU' : 'OPPONENT'}
                  </span>
                  <span className="font-mono text-white text-[11px]">[{coordStr}]</span>
                  <Badge variant={badgeVariant} size="sm" className="gap-1 uppercase text-[10px]">
                    {icon}
                    {shot.outcome}
                  </Badge>
                </div>

                <div className="text-[11px] font-mono font-bold text-arena-amber">
                  {shot.pointsAwarded > 0 ? `+${shot.pointsAwarded}` : shot.pointsAwarded} PTS
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
