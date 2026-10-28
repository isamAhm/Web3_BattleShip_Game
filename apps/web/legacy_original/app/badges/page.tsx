'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useWallet } from '@/providers/WalletContext';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';
import { Award, Flame, Target, Shield, Trophy, CheckCircle2, Lock } from 'lucide-react';

export default function BadgesPage() {
  const { address } = useWallet();
  const [playerBadges, setPlayerBadges] = useState<any[]>([]);

  useEffect(() => {
    if (address) {
      api.rewards
        .getPlayerBadges(address)
        .then((data) => setPlayerBadges(data || []))
        .catch(() => {});
    }
  }, [address]);

  // Standard documented achievements fallback if catalog empty
  const defaultBadges = [
    {
      badgeId: 1,
      name: 'First Win',
      description: 'Achieve victory in your first competitive engagement.',
      icon: Trophy,
      criteria: '1 Win',
    },
    {
      badgeId: 2,
      name: 'Hot Streak',
      description: 'Maintain a devastating 5-hit salvo streak without missing.',
      icon: Flame,
      criteria: '5 Consecutive Hits',
    },
    {
      badgeId: 3,
      name: 'Perfect Game',
      description: 'Obliterate the entire enemy fleet with flawless 17-shot precision.',
      icon: Target,
      criteria: 'Win in 17 Shots',
    },
    {
      badgeId: 4,
      name: 'Mine Dodger',
      description:
        'Navigate enemy waters and achieve victory without detonating a single naval mine.',
      icon: Shield,
      criteria: 'Zero Mines Triggered',
    },
    {
      badgeId: 5,
      name: 'Admiral',
      description: 'Establish naval supremacy with 10 competitive victories.',
      icon: Award,
      criteria: '10 Wins',
    },
  ];

  const earnedBadgeIds = new Set(playerBadges.map((b: any) => b.badgeId || b.id));

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              ACHIEVEMENT BADGES
            </h1>
            <Badge variant="amber" size="sm">
              ONCHAIN / ERC-1155
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Unlock distinguished combat milestones recorded on the AchievementBadges contract.
          </p>
        </div>

        <div className="text-xs font-mono text-arena-textMuted">
          Unlocked: <span className="text-arena-amber font-bold">{playerBadges.length}</span> /{' '}
          {defaultBadges.length}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {defaultBadges.map((b) => {
          const isEarned = earnedBadgeIds.has(b.badgeId);
          const Icon = b.icon;

          return (
            <Card
              key={b.badgeId}
              className={`p-6 border transition-all relative overflow-hidden ${
                isEarned
                  ? 'border-arena-amber/60 bg-arena-surface/90 shadow-lg shadow-arena-amber/10'
                  : 'border-arena-border/50 bg-arena-surface/50 opacity-70'
              }`}
              glow={isEarned ? 'amber' : 'none'}
            >
              <div className="flex items-start justify-between">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                    isEarned
                      ? 'bg-gradient-to-tr from-arena-amber to-amber-200 text-arena-bg shadow-lg shadow-arena-amber/30'
                      : 'bg-arena-panel border border-arena-border text-arena-textMuted'
                  }`}
                >
                  <Icon className="w-7 h-7" />
                </div>

                <Badge variant={isEarned ? 'amber' : 'neutral'} size="sm" className="gap-1">
                  {isEarned ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-arena-amber" />
                      UNLOCKED
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3" />
                      LOCKED
                    </>
                  )}
                </Badge>
              </div>

              <div className="mt-4">
                <h3 className="text-base font-bold text-white tracking-wide">{b.name}</h3>
                <p className="text-xs text-arena-textSub mt-1.5 leading-relaxed">{b.description}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-arena-border/50 flex items-center justify-between text-[11px] font-mono">
                <span className="text-arena-textMuted">Requirement:</span>
                <span className="text-arena-cyan font-bold">{b.criteria}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
