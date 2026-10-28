'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Swords,
  Lock,
  Copy,
  Check,
  Flame,
  Zap,
  Shield,
  Radio,
  PlusCircle,
  LogIn,
} from 'lucide-react';
import { useWallet } from '@/providers/WalletContext';
import { useGame } from '@/providers/GameContext';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import { Badge } from '@/components/shared/Badge';

export default function LobbyPage() {
  const { address, player, isAuthenticated } = useWallet();
  const { inQueue, joinQueue, leaveQueue, createPrivateRoom, joinPrivateRoom, roomCode } =
    useGame();

  const [mode, setMode] = useState<'ranked' | 'casual'>('ranked');
  const [inputCode, setInputCode] = useState('');
  const [createdCode, setCreatedCode] = useState<string | null>(roomCode);
  const [copied, setCopied] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateRoom = async () => {
    setActionError(null);
    setIsCreatingRoom(true);
    try {
      const code = await createPrivateRoom();
      setCreatedCode(code);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create room');
    } finally {
      setIsCreatingRoom(false);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setActionError(null);
    setIsJoiningRoom(true);
    try {
      await joinPrivateRoom(inputCode.trim().toUpperCase());
    } catch (err: any) {
      setActionError(err.message || 'Failed to join room');
    } finally {
      setIsJoiningRoom(false);
    }
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Top Welcome & Authentication Check */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-arena-border/50">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white uppercase tracking-wider">
              COMMAND LOBBY
            </h1>
            <Badge variant="cyan" size="sm">
              SECTOR 1
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-1">
            Engage in competitive ranked matchmaking or create private tactical skirmishes.
          </p>
        </div>

        {!isAuthenticated && (
          <div className="p-3 rounded-lg bg-arena-amber/10 border border-arena-amber/30 text-arena-amberBright text-xs flex items-center gap-2">
            <Lock className="w-4 h-4" />
            <span>Connect wallet to participate in live matchmaking and earn points.</span>
          </div>
        )}
      </div>

      {actionError && (
        <div className="mt-4 p-3 rounded-lg bg-arena-red/15 border border-arena-red/40 text-arena-redBright text-xs">
          {actionError}
        </div>
      )}

      {/* Main Grid: Modes on Left, Player Snapshot on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
        {/* Left 2 Columns: Matchmaking & Custom Rooms */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Match Card */}
          <Card className="p-6 border-arena-border relative overflow-hidden" glow="cyan">
            <div className="flex items-center justify-between pb-4 border-b border-arena-border/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-arena-cyan/15 flex items-center justify-center text-arena-cyan">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white uppercase tracking-wider">
                    Quick Matchmaking
                  </h2>
                  <p className="text-xs text-arena-textMuted">
                    Automatic matchmaking against an available opponent
                  </p>
                </div>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1 bg-arena-bg p-1 rounded-lg border border-arena-border">
                <button
                  onClick={() => setMode('ranked')}
                  disabled={inQueue}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    mode === 'ranked'
                      ? 'bg-arena-cyan text-arena-bg shadow'
                      : 'text-arena-textMuted hover:text-white'
                  }`}
                >
                  Ranked
                </button>
                <button
                  onClick={() => setMode('casual')}
                  disabled={inQueue}
                  className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                    mode === 'casual'
                      ? 'bg-arena-cyan text-arena-bg shadow'
                      : 'text-arena-textMuted hover:text-white'
                  }`}
                >
                  Casual
                </button>
              </div>
            </div>

            {/* Queue State or Queue Action */}
            <div className="pt-6">
              {inQueue ? (
                <div className="flex flex-col items-center justify-center py-6 text-center space-y-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-arena-cyan/30 border-t-arena-cyan animate-spin" />
                    <Radio className="w-6 h-6 text-arena-cyan absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>

                  <div>
                    <div className="text-sm font-bold text-white uppercase tracking-wider">
                      SEARCHING FOR HOSTILE FLEET...
                    </div>
                    <p className="text-xs text-arena-textMuted mt-1">
                      Targeting active commanders in {mode} queue
                    </p>
                  </div>

                  <Button variant="danger" size="md" onClick={leaveQueue}>
                    Cancel Search
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs text-arena-textSub">
                      <Shield className="w-3.5 h-3.5 text-arena-cyan" />
                      <span>20-second turn timer · 60-second fleet setup</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-arena-textSub">
                      <Flame className="w-3.5 h-3.5 text-arena-amber" />
                      <span>Consecutive hit streaks earn up to x2.0 multipliers</span>
                    </div>
                  </div>

                  <Button
                    variant="cyan"
                    size="lg"
                    disabled={!isAuthenticated}
                    onClick={() => joinQueue(mode)}
                    className="w-full sm:w-auto"
                  >
                    <Swords className="w-4 h-4 mr-1.5" />
                    Enter Battle Queue
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Private Skirmish Rooms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Create Room */}
            <Card className="p-5 border-arena-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <PlusCircle className="w-4 h-4 text-arena-violet" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Create Private Room
                  </h3>
                </div>
                <p className="text-xs text-arena-textSub leading-relaxed">
                  Generate a private room code to challenge a friend or squadmate directly.
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-arena-border/50">
                {createdCode ? (
                  <div className="space-y-2">
                    <span className="text-[10px] font-mono uppercase text-arena-textMuted">
                      Share Room Code
                    </span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono font-extrabold text-lg tracking-widest text-arena-cyan bg-arena-bg px-3 py-1.5 rounded-lg border border-arena-cyan/40 text-center">
                        {createdCode}
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleCopyCode(createdCode)}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-[11px] text-arena-textMuted text-center">
                      Waiting for opponent to connect...
                    </p>
                  </div>
                ) : (
                  <Button
                    variant="secondary"
                    size="md"
                    className="w-full"
                    disabled={!isAuthenticated || isCreatingRoom}
                    isLoading={isCreatingRoom}
                    onClick={handleCreateRoom}
                  >
                    Generate Room Code
                  </Button>
                )}
              </div>
            </Card>

            {/* Join Room */}
            <Card className="p-5 border-arena-border flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <LogIn className="w-4 h-4 text-arena-cyan" />
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Join Private Room
                  </h3>
                </div>
                <p className="text-xs text-arena-textSub leading-relaxed">
                  Enter a 6-character skirmish code received from another commander.
                </p>
              </div>

              <form
                onSubmit={handleJoinRoom}
                className="mt-4 pt-3 border-t border-arena-border/50 space-y-2"
              >
                <input
                  type="text"
                  placeholder="ROOM CODE (E.G. A1B2C3)"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                  maxLength={10}
                  className="w-full bg-arena-bg border border-arena-border rounded-lg px-3 py-2 text-xs font-mono font-bold text-center text-white placeholder-arena-textMuted focus:outline-none focus:ring-1 focus:ring-arena-cyan uppercase tracking-wider"
                />
                <Button
                  variant="primary"
                  size="md"
                  type="submit"
                  className="w-full"
                  disabled={!isAuthenticated || !inputCode.trim() || isJoiningRoom}
                  isLoading={isJoiningRoom}
                >
                  Join Skirmish
                </Button>
              </form>
            </Card>
          </div>
        </div>

        {/* Right Column: Commander Dossier & Stats */}
        <div className="space-y-6">
          <Card className="p-5 border-arena-border" glow="none">
            <div className="flex items-center gap-3 pb-4 border-b border-arena-border/60">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-arena-violet to-arena-cyan flex items-center justify-center text-sm font-extrabold text-white">
                {player?.username ? player.username.slice(0, 2).toUpperCase() : 'CM'}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">
                  {player?.username || 'Commander'}
                </span>
                <span className="text-xs font-mono text-arena-cyan">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Disconnected'}
                </span>
              </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <div className="p-3 rounded-lg bg-arena-surface/80 border border-arena-border/50">
                <div className="text-[10px] font-mono text-arena-textMuted uppercase">
                  Arena Points
                </div>
                <div className="text-lg font-bold text-arena-amber font-mono mt-0.5">
                  {player?.stats?.totalPoints || 0}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-arena-surface/80 border border-arena-border/50">
                <div className="text-[10px] font-mono text-arena-textMuted uppercase">
                  Total Matches
                </div>
                <div className="text-lg font-bold text-white font-mono mt-0.5">
                  {player?.stats?.matchesPlayed || 0}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-arena-surface/80 border border-arena-border/50">
                <div className="text-[10px] font-mono text-arena-textMuted uppercase">
                  Victories
                </div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-0.5">
                  {player?.stats?.wins || 0}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-arena-surface/80 border border-arena-border/50">
                <div className="text-[10px] font-mono text-arena-textMuted uppercase">
                  Best Streak
                </div>
                <div className="text-lg font-bold text-arena-cyan font-mono mt-0.5">
                  {player?.stats?.bestStreak || 0} Hits
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3 border-t border-arena-border/50">
              <Link href="/profile">
                <Button variant="ghost" size="sm" className="w-full text-xs text-arena-textSub">
                  View Full Career Dossier →
                </Button>
              </Link>
            </div>
          </Card>

          {/* Tactical Briefing */}
          <Card className="p-4 border-arena-border text-xs text-arena-textSub space-y-2">
            <div className="font-bold text-white uppercase text-[11px] tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-arena-amber" />
              Combat Protocol
            </div>
            <ul className="list-disc list-inside space-y-1 text-arena-textMuted">
              <li>Deploy 5 warships (17 total hull cells)</li>
              <li>Position 3 hidden defensive naval mines</li>
              <li>Salvos are resolved authoritatively on the server</li>
              <li>Zero opponent board leaks until post-match reveal</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
