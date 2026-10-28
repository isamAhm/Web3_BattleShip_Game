'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Trophy, Clock } from 'lucide-react';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.tournaments
      .list()
      .then((data) => setTournaments(data || []))
      .catch(() => setTournaments([]))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              TACTICAL TOURNAMENT SECTORS
            </h1>
            <Badge variant="cyan" size="sm">
              ONCHAIN VERIFIED
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Scheduled competitive windows with verified match points and prize pool distributions.
          </p>
        </div>
      </div>

      {/* Tournaments Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-6 border-arena-border animate-pulse space-y-4">
              <div className="h-6 w-32 bg-arena-surface rounded" />
              <div className="h-16 bg-arena-surface rounded" />
            </Card>
          ))
        ) : tournaments.length === 0 ? (
          <div className="col-span-full">
            <Card className="p-12 text-center border-arena-border">
              <Trophy className="w-12 h-12 text-arena-amber mx-auto mb-3 opacity-60" />
              <h3 className="text-base font-bold text-white uppercase">Season 1 Open Qualifier</h3>
              <p className="text-xs text-arena-textMuted mt-1 max-w-md mx-auto leading-relaxed">
                Matches played in ranked matchmaking automatically count towards Season 1 global
                standings. Next championship bracket window commences shortly.
              </p>
              <div className="mt-4">
                <Badge variant="amber" size="md">
                  Active Ranked Season Ongoing
                </Badge>
              </div>
            </Card>
          </div>
        ) : (
          tournaments.map((t) => (
            <Card
              key={t.id}
              className="p-6 border-arena-border flex flex-col justify-between"
              glow="cyan"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant={t.status === 'open' ? 'success' : 'neutral'} size="sm">
                    {t.status === 'open' ? 'REGISTRATION OPEN' : 'CONCLUDED'}
                  </Badge>
                  <span className="text-[10px] font-mono text-arena-textMuted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(t.startTime).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white">{t.title}</h3>
                <p className="text-xs text-arena-textSub mt-2 leading-relaxed">
                  {t.description ||
                    'Standard tactical Battleship rules with verified commit-reveal.'}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-arena-border/50 flex items-center justify-between">
                <span className="text-xs font-mono text-arena-cyan font-bold">
                  {t.participants?.length || 0} Commanders Joined
                </span>
                <Button size="sm" variant="cyan">
                  View Sector
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
