'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useWallet } from '@/providers/WalletContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Coins, ArrowUpRight, ArrowDownRight, RefreshCw, ShieldAlert } from 'lucide-react';

export default function RewardsLedgerPage() {
  const { address, isAuthenticated } = useWallet();
  const [balance, setBalance] = useState<number>(0);
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLedger = async () => {
    if (!address) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.rewards.getMyLedger();
      setBalance(data?.balance || 0);
      setHistory(data?.history || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load rewards ledger');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [address]);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              ARENA REWARDS LEDGER
            </h1>
            <Badge variant="amber" size="sm">
              SIMULATED ONCHAIN
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Audit-trailed ledger of ARENA tactical points, match performance awards, and achievement
            unlocks.
          </p>
        </div>

        {isAuthenticated && (
          <Button
            size="sm"
            variant="secondary"
            onClick={fetchLedger}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Ledger
          </Button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-arena-red/15 border border-arena-red/40 text-arena-redBright text-xs">
          {error}
        </div>
      )}

      {/* Balance Card Banner */}
      <Card className="p-6 border-arena-border relative overflow-hidden" glow="amber">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-arena-amber/20 flex items-center justify-center text-arena-amber shadow-lg shadow-arena-amber/20">
              <Coins className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-mono text-arena-textMuted uppercase tracking-wider">
                Current ARENA Balance
              </span>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono mt-0.5">
                {balance} <span className="text-arena-amber text-lg">PTS</span>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-arena-surface/80 border border-arena-border/50 text-[11px] text-arena-textMuted max-w-sm">
            <div className="flex items-center gap-1.5 text-arena-cyan font-bold mb-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Verifiable Offchain Accounting
            </div>
            Points are simulated on the authoritative game server and mapped to onchain tournament
            leaderboards.
          </div>
        </div>
      </Card>

      {/* Ledger History Table */}
      <Card className="border-arena-border overflow-hidden">
        <div className="p-4 border-b border-arena-border/60 flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
            Transaction History ({history.length} events)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-arena-panel/90 text-arena-textMuted uppercase font-mono tracking-wider border-b border-arena-border/60">
              <tr>
                <th className="py-3 px-4">Event Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-center">Reference</th>
                <th className="py-3 px-4 text-center">Timestamp</th>
                <th className="py-3 px-4 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-arena-border/40">
              {!isAuthenticated ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-arena-textMuted">
                    Connect wallet to view your personal points ledger.
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-arena-textMuted">
                    No points transactions recorded yet. Win battles to earn ARENA points!
                  </td>
                </tr>
              ) : (
                history.map((tx, idx) => {
                  const isPositive = tx.amount >= 0;
                  return (
                    <tr key={idx} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-white">
                        <span className="flex items-center gap-1.5">
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDownRight className="w-3.5 h-3.5 text-arena-redBright" />
                          )}
                          {tx.type || 'Match Reward'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-arena-textSub">
                        {tx.description || tx.reason || 'Competitive Battle Victory'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-arena-cyan">
                        {tx.matchId ? `${tx.matchId.slice(0, 8)}...` : 'System'}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono text-[11px] text-arena-textMuted">
                        {new Date(tx.createdAt || Date.now()).toLocaleDateString()}
                      </td>

                      <td
                        className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                          isPositive ? 'text-emerald-400' : 'text-arena-redBright'
                        }`}
                      >
                        {isPositive ? `+${tx.amount}` : tx.amount} PTS
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
