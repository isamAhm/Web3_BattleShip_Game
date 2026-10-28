'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useWallet } from '@/providers/WalletContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Trophy, Flame, Zap, RefreshCw } from 'lucide-react';

export default function LeaderboardPage() {
  const { address } = useWallet();
  const [category, setCategory] = useState<'points' | 'streak' | 'fastest_win'>('points');
  const [rankings, setRankings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRankings = async (cat: 'points' | 'streak' | 'fastest_win') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.leaderboards.getRankings(cat, 50, 0);
      setRankings(data?.entries || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch leaderboard rankings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRankings(category);
  }, [category]);

  const categories = [
    { id: 'points', label: 'Total Points', icon: Trophy },
    { id: 'streak', label: 'Best Streak', icon: Flame },
    { id: 'fastest_win', label: 'Fastest Win', icon: Zap },
  ] as const;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              GLOBAL LEADERBOARDS
            </h1>
            <Badge variant="amber" size="sm">
              SEASON 1
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Authoritative player rankings across competitive points, consecutive salvo streaks, and
            speed.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Category Tabs */}
          <div className="flex items-center bg-arena-surface p-1 rounded-xl border border-arena-border">
            {categories.map((c) => {
              const Icon = c.icon;
              const isActive = category === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCategory(c.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-arena-cyan text-arena-bg shadow-md'
                      : 'text-arena-textSub hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {c.label}
                </button>
              );
            })}
          </div>

          <Button
            size="sm"
            variant="secondary"
            onClick={() => fetchRankings(category)}
            disabled={isLoading}
            title="Refresh Rankings"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-arena-red/15 border border-arena-red/40 text-arena-redBright text-xs">
          {error}
        </div>
      )}

      {/* Rankings Table */}
      <Card className="mt-6 border-arena-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-arena-panel/90 text-arena-textMuted uppercase font-mono tracking-wider border-b border-arena-border/60">
              <tr>
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Commander</th>
                <th className="py-3 px-4 text-center">Matches</th>
                <th className="py-3 px-4 text-center">Wins</th>
                <th className="py-3 px-4 text-center">Win Rate</th>
                <th className="py-3 px-4 text-center">Best Streak</th>
                <th className="py-3 px-4 text-center">Fastest Win</th>
                <th className="py-3 px-4 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/40">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-6 bg-arena-surface mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4">
                      <div className="h-4 w-32 bg-arena-surface rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-10 bg-arena-surface mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-10 bg-arena-surface mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-12 bg-arena-surface mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-10 bg-arena-surface mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="h-4 w-12 bg-arena-surface mx-auto rounded" />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="h-4 w-14 bg-arena-surface ml-auto rounded" />
                    </td>
                  </tr>
                ))
              ) : rankings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-arena-textMuted">
                    No competitive ranking records in this sector yet. Complete a match to register.
                  </td>
                </tr>
              ) : (
                rankings.map((r, idx) => {
                  const rankNum = idx + 1;
                  const isMe =
                    address && r.address && r.address.toLowerCase() === address.toLowerCase();

                  const winRate =
                    r.matchesPlayed > 0 ? Math.round((r.wins / r.matchesPlayed) * 100) : 0;

                  return (
                    <tr
                      key={r.address || idx}
                      className={`transition-colors hover:bg-white/5 ${
                        isMe ? 'bg-arena-cyan/10 font-bold border-l-2 border-arena-cyan' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold">
                        {rankNum === 1 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-arena-amber text-arena-bg text-xs">
                            1
                          </span>
                        ) : rankNum === 2 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-arena-bg text-xs">
                            2
                          </span>
                        ) : rankNum === 3 ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white text-xs">
                            3
                          </span>
                        ) : (
                          <span className="text-arena-textMuted">{rankNum}</span>
                        )}
                      </td>

                      {/* Commander Name & Address */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-arena-violet to-arena-cyan flex items-center justify-center text-[10px] font-bold text-white">
                            {r.username
                              ? r.username.slice(0, 2).toUpperCase()
                              : r.address.slice(2, 4)}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {r.username || `${r.address.slice(0, 6)}...${r.address.slice(-4)}`}
                              {isMe && (
                                <Badge variant="cyan" size="sm">
                                  YOU
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-arena-textMuted">
                              {r.address.slice(0, 8)}...{r.address.slice(-6)}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Matches */}
                      <td className="py-3.5 px-4 text-center font-mono text-arena-textSub">
                        {r.matchesPlayed || 0}
                      </td>

                      {/* Wins */}
                      <td className="py-3.5 px-4 text-center font-mono text-emerald-400 font-semibold">
                        {r.wins || 0}
                      </td>

                      {/* Win Rate */}
                      <td className="py-3.5 px-4 text-center font-mono text-arena-textSub">
                        {winRate}%
                      </td>

                      {/* Best Streak */}
                      <td className="py-3.5 px-4 text-center font-mono text-arena-amber font-semibold">
                        {r.bestStreak || 0}
                      </td>

                      {/* Fastest Win */}
                      <td className="py-3.5 px-4 text-center font-mono text-arena-cyan">
                        {r.fastestWinShots ? `${r.fastestWinShots} shots` : '—'}
                      </td>

                      {/* Total Points */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-sm text-white">
                        {r.totalPoints || 0}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
