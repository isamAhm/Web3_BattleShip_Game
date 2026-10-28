'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api/client';
import { useWallet } from '@/providers/WalletContext';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { User, Copy, Check, Edit2, Save } from 'lucide-react';

export default function ProfilePage() {
  const { address, player, refreshProfile, isAuthenticated } = useWallet();
  const [username, setUsername] = useState(player?.username || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (player?.username) {
      setUsername(player.username);
    }
  }, [player]);

  const handleCopyAddress = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;
    setIsSaving(true);
    setError(null);
    setSaveSuccess(false);
    try {
      await api.players.updateProfile({ username: username.trim() });
      await refreshProfile();
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update username');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isAuthenticated || !address) {
    return (
      <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <User className="w-12 h-12 text-arena-cyan mx-auto opacity-60" />
        <h2 className="text-xl font-bold text-white uppercase">Authentication Required</h2>
        <p className="text-xs text-arena-textMuted">
          Connect your Ethereum wallet to inspect and manage your tactical commander dossier.
        </p>
      </div>
    );
  }

  const stats = player?.stats || {
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    totalPoints: 0,
    bestStreak: 0,
    fastestWinShots: null,
  };

  const winRate =
    stats.matchesPlayed > 0 ? Math.round((stats.wins / stats.matchesPlayed) * 100) : 0;

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Profile Header Card */}
      <Card className="p-6 border-arena-border relative overflow-hidden" glow="cyan">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-arena-violet to-arena-cyan flex items-center justify-center text-xl font-extrabold text-white shadow-xl shadow-arena-cyan/20">
              {username ? username.slice(0, 2).toUpperCase() : address.slice(2, 4)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <form onSubmit={handleSaveProfile} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      maxLength={20}
                      className="bg-arena-bg border border-arena-cyan rounded px-2.5 py-1 text-sm font-bold text-white focus:outline-none"
                    />
                    <Button size="sm" variant="cyan" type="submit" isLoading={isSaving}>
                      <Save className="w-3.5 h-3.5" />
                    </Button>
                  </form>
                ) : (
                  <>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white">
                      {player?.username || 'Commander'}
                    </h1>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-arena-textMuted hover:text-white p-1"
                      title="Edit Username"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>

              {/* Wallet Address with copy */}
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono text-xs text-arena-cyan">{address}</span>
                <button
                  onClick={handleCopyAddress}
                  className="text-arena-textMuted hover:text-white"
                  title="Copy Address"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <Badge variant="cyan" size="md" className="font-mono text-xs font-bold">
            LEVEL 1 COMMANDER
          </Badge>
        </div>

        {saveSuccess && (
          <div className="mt-4 p-2 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs text-center">
            Commander username successfully updated!
          </div>
        )}
        {error && (
          <div className="mt-4 p-2 rounded bg-arena-red/15 border border-arena-red/30 text-arena-redBright text-xs text-center">
            {error}
          </div>
        )}
      </Card>

      {/* Career Dossier Statistics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="p-4 border-arena-border text-center">
          <span className="text-[10px] font-mono uppercase text-arena-textMuted">Arena Points</span>
          <div className="text-xl font-bold font-mono text-arena-amber mt-1">
            {stats.totalPoints}
          </div>
        </Card>

        <Card className="p-4 border-arena-border text-center">
          <span className="text-[10px] font-mono uppercase text-arena-textMuted">Matches</span>
          <div className="text-xl font-bold font-mono text-white mt-1">{stats.matchesPlayed}</div>
        </Card>

        <Card className="p-4 border-arena-border text-center">
          <span className="text-[10px] font-mono uppercase text-arena-textMuted">Victories</span>
          <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{stats.wins}</div>
        </Card>

        <Card className="p-4 border-arena-border text-center">
          <span className="text-[10px] font-mono uppercase text-arena-textMuted">Win Rate</span>
          <div className="text-xl font-bold font-mono text-arena-cyan mt-1">{winRate}%</div>
        </Card>

        <Card className="p-4 border-arena-border text-center">
          <span className="text-[10px] font-mono uppercase text-arena-textMuted">Best Streak</span>
          <div className="text-xl font-bold font-mono text-arena-amber mt-1">
            {stats.bestStreak} Hits
          </div>
        </Card>

        <Card className="p-4 border-arena-border text-center">
          <span className="text-[10px] font-mono uppercase text-arena-textMuted">Fastest Win</span>
          <div className="text-xl font-bold font-mono text-arena-violet mt-1">
            {stats.fastestWinShots ? `${stats.fastestWinShots}s` : '—'}
          </div>
        </Card>
      </div>
    </div>
  );
}
