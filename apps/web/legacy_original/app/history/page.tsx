'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { useWallet } from '@/providers/WalletContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { History, Film, ShieldCheck, RefreshCw } from 'lucide-react';

export default function MatchHistoryPage() {
  const { address, isAuthenticated } = useWallet();
  const [matches, setMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.players.getMatches(address, 25, 0);
      setMatches(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load match history');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [address]);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              COMBAT LOG ARCHIVE
            </h1>
            <Badge variant="cyan" size="sm">
              VERIFIABLE MATCHES
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Complete cryptographic records and canonical replay logs for all historical engagements.
          </p>
        </div>

        {isAuthenticated && (
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchHistory}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh Archive
          </Button>
        )}
      </div>

      {!isAuthenticated ? (
        <Card className="mt-8 p-12 text-center border-arena-border">
          <History className="w-12 h-12 text-arena-cyan mx-auto mb-3 opacity-60" />
          <h3 className="text-base font-bold text-white uppercase">Authentication Required</h3>
          <p className="text-xs text-arena-textMuted mt-1 max-w-sm mx-auto">
            Connect your Ethereum wallet to inspect your personal verified combat logs and replays.
          </p>
        </Card>
      ) : error ? (
        <div className="mt-6 p-4 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-redBright text-xs">
          {error}
        </div>
      ) : (
        <Card className="mt-6 border-arena-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-arena-panel/90 text-arena-textMuted uppercase font-mono tracking-wider border-b border-arena-border/60">
                <tr>
                  <th className="py-3 px-4">Match ID</th>
                  <th className="py-3 px-4">Opponent</th>
                  <th className="py-3 px-4 text-center">Outcome</th>
                  <th className="py-3 px-4 text-center">Score</th>
                  <th className="py-3 px-4 text-center">Salvos</th>
                  <th className="py-3 px-4 text-center">Verification</th>
                  <th className="py-3 px-4 text-center">Date</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-arena-border/40">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-4">
                        <div className="h-4 w-20 bg-arena-surface rounded" />
                      </td>
                      <td className="py-4 px-4">
                        <div className="h-4 w-28 bg-arena-surface rounded" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-4 w-16 bg-arena-surface mx-auto rounded" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-4 w-10 bg-arena-surface mx-auto rounded" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-4 w-10 bg-arena-surface mx-auto rounded" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-4 w-20 bg-arena-surface mx-auto rounded" />
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="h-4 w-24 bg-arena-surface mx-auto rounded" />
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="h-4 w-16 bg-arena-surface ml-auto rounded" />
                      </td>
                    </tr>
                  ))
                ) : matches.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-arena-textMuted">
                      No combat logs found in archive. Enter the lobby to play your first match!
                    </td>
                  </tr>
                ) : (
                  matches.map((m) => {
                    const norm = address ? address.toLowerCase() : '';
                    const isWinner = norm && m.winner?.toLowerCase() === norm;
                    const p1 = m.players?.[0];
                    const p2 = m.players?.[1];
                    const opponent = p1?.toLowerCase() === norm ? p2 : p1;
                    const myScore = norm && m.scores ? m.scores[norm] || 0 : 0;

                    return (
                      <tr key={m.matchId} className="hover:bg-white/5 transition-colors">
                        {/* Match ID */}
                        <td className="py-3.5 px-4 font-mono font-bold text-arena-cyan">
                          {m.matchId.slice(0, 8)}...
                        </td>

                        {/* Opponent */}
                        <td className="py-3.5 px-4 font-mono text-arena-textSub">
                          {opponent
                            ? `${opponent.slice(0, 6)}...${opponent.slice(-4)}`
                            : 'Hostile Fleet'}
                        </td>

                        {/* Outcome */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant={isWinner ? 'amber' : 'red'}
                            size="sm"
                            className="uppercase font-bold"
                          >
                            {isWinner ? 'VICTORY' : 'DEFEAT'}
                          </Badge>
                        </td>

                        {/* Score */}
                        <td className="py-3.5 px-4 text-center font-mono font-bold text-white">
                          {myScore}
                        </td>

                        {/* Salvos */}
                        <td className="py-3.5 px-4 text-center font-mono text-arena-textMuted">
                          {m.totalShots || '—'}
                        </td>

                        {/* Verification */}
                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant={m.verification?.isValid ? 'success' : 'neutral'}
                            size="sm"
                            className="gap-1 text-[10px]"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {m.verification?.isValid ? 'VERIFIED' : 'PENDING'}
                          </Badge>
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-center font-mono text-[11px] text-arena-textMuted">
                          {new Date(m.createdAt || Date.now()).toLocaleDateString()}
                        </td>

                        {/* Action */}
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/history/${m.matchId}`}>
                            <Button size="sm" variant="secondary" className="text-xs gap-1">
                              <Film className="w-3 h-3 text-arena-cyan" />
                              Replay
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
