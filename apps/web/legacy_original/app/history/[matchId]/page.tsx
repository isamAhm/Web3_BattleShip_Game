'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api/client';
import { Card } from '@/components/shared/Card';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import {
  Film,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  ShieldCheck,
  ArrowLeft,
  Flame,
  Bomb,
} from 'lucide-react';

export default function MatchReplayPage() {
  const params = useParams();
  const matchId = params.matchId as string;

  const [replayData, setReplayData] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchId) return;
    setIsLoading(true);
    setError(null);
    api.matches
      .getReplay(matchId)
      .then((data) => {
        setReplayData(data);
        setCurrentStep(data?.moves?.length || 0); // start at end
      })
      .catch((err: any) => {
        setError(err.message || 'Failed to load match replay record');
      })
      .finally(() => setIsLoading(false));
  }, [matchId]);

  // Auto-play timer
  useEffect(() => {
    if (!isPlaying || !replayData?.moves) return;

    if (currentStep >= replayData.moves.length) {
      setIsPlaying(false);
      return;
    }

    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, 800);

    return () => clearTimeout(timer);
  }, [isPlaying, currentStep, replayData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12">
        <Film className="w-10 h-10 text-arena-cyan animate-spin mb-3" />
        <span className="text-xs font-mono text-arena-textMuted uppercase tracking-wider">
          Reconstructing Authoritative Combat Timeline...
        </span>
      </div>
    );
  }

  if (error || !replayData) {
    return (
      <div className="flex-1 max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="p-4 rounded-xl bg-arena-red/15 border border-arena-red/40 text-arena-redBright text-sm">
          {error || 'Replay data unavailable.'}
        </div>
        <Link href="/history">
          <Button variant="secondary" size="md">
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to History
          </Button>
        </Link>
      </div>
    );
  }

  const moves = replayData.moves || [];
  const currentMove = currentStep > 0 ? moves[currentStep - 1] : null;

  const player1 = replayData.players?.[0] || 'Player 1';
  const player2 = replayData.players?.[1] || 'Player 2';

  // Slices of moves up to currentStep
  const movesUpToNow = moves.slice(0, currentStep);

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Helper to render a player's grid reconstructed up to currentStep
  const renderReplayGrid = (targetPlayer: string, playerName: string) => {
    // Shots fired AT targetPlayer
    const shotsAgainst = movesUpToNow.filter(
      (m: any) => m.target?.toLowerCase() === targetPlayer.toLowerCase(),
    );
    const shotMap = new Map<string, any>();
    shotsAgainst.forEach((s: any) => {
      const coord = s.coordinate || s.coord;
      if (coord) shotMap.set(`${coord.x},${coord.y}`, s);
    });

    return (
      <div className="flex flex-col items-center p-4 bg-arena-surface/85 rounded-xl border border-arena-border">
        <div className="text-xs font-mono font-bold text-white mb-2 flex items-center justify-between w-full px-2">
          <span>{playerName.slice(0, 10)}... Fleet</span>
          <span className="text-arena-textMuted text-[10px]">
            Hits taken:{' '}
            {shotsAgainst.filter((s: any) => s.outcome === 'hit' || s.outcome === 'sunk').length}
          </span>
        </div>

        {/* Labels */}
        <div className="flex ml-6 mb-1 gap-1">
          {columns.map((c) => (
            <div
              key={c}
              className="w-7 text-center text-[10px] font-mono text-arena-cyan font-bold"
            >
              {c}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div className="flex flex-col gap-1">
          {rows.map((rowNum, y) => (
            <div key={rowNum} className="flex items-center gap-1">
              <div className="w-5 text-right pr-1 text-[10px] font-mono text-arena-cyan font-bold">
                {rowNum}
              </div>
              {columns.map((_, x) => {
                const key = `${x},${y}`;
                const shot = shotMap.get(key);

                let cellBg = 'bg-arena-panel/60 border-arena-border/40';
                if (shot?.outcome === 'sunk' || shot?.outcome === 'hit') {
                  cellBg = 'bg-arena-red/40 border-arena-red text-arena-redBright';
                } else if (shot?.outcome === 'mine') {
                  cellBg = 'bg-arena-amber/40 border-arena-amber text-arena-amberBright';
                } else if (shot?.outcome === 'miss') {
                  cellBg = 'bg-white/10 border-white/20 text-white/40';
                }

                return (
                  <div
                    key={key}
                    className={`w-7 h-7 rounded border flex items-center justify-center text-xs ${cellBg}`}
                  >
                    {shot?.outcome === 'sunk' && <Flame className="w-3.5 h-3.5" />}
                    {shot?.outcome === 'hit' && <Flame className="w-3.5 h-3.5" />}
                    {shot?.outcome === 'mine' && <Bomb className="w-3.5 h-3.5" />}
                    {shot?.outcome === 'miss' && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 border-b border-arena-border/50 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/history">
              <Button size="sm" variant="ghost" className="p-1.5">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wider">
              MATCH REPLAY: {matchId.slice(0, 10)}...
            </h1>
            <Badge variant="cyan" size="sm">
              CANONICAL
            </Badge>
          </div>
          <p className="text-xs text-arena-textSub mt-0.5">
            Step through authoritative turns and inspect cryptographic verification hashes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={replayData.verification?.isValid ? 'success' : 'neutral'}
            size="md"
            className="gap-1 font-mono text-xs"
          >
            <ShieldCheck className="w-4 h-4" />
            {replayData.verification?.isValid ? 'CRYPTOGRAPHICALLY VERIFIED' : 'PENDING PROOF'}
          </Badge>
        </div>
      </div>

      {/* Replay Control Bar */}
      <Card className="p-4 border-arena-border flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep(0);
            }}
            title="Restart"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={currentStep === 0}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((p) => Math.max(0, p - 1));
            }}
            title="Step Backward"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant={isPlaying ? 'danger' : 'cyan'}
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-20"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 mr-1" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 mr-1" /> Play
              </>
            )}
          </Button>

          <Button
            size="sm"
            variant="secondary"
            disabled={currentStep >= moves.length}
            onClick={() => {
              setIsPlaying(false);
              setCurrentStep((p) => Math.min(moves.length, p + 1));
            }}
            title="Step Forward"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Step Slider */}
        <div className="flex-1 w-full max-w-md flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-arena-cyan w-24 text-right">
            Move {currentStep} / {moves.length}
          </span>
          <input
            type="range"
            min={0}
            max={moves.length}
            value={currentStep}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentStep(parseInt(e.target.value));
            }}
            className="flex-1 accent-arena-cyan cursor-pointer"
          />
        </div>

        {/* Current move description */}
        <div className="text-xs font-mono text-arena-textSub">
          {currentMove ? (
            <span className="flex items-center gap-1.5">
              <span className="text-white font-bold">{currentMove.shooter?.slice(0, 6)}...</span>
              <span>fired at</span>
              <span className="text-arena-cyan font-bold">
                [{columns[currentMove.coordinate?.x ?? currentMove.coord?.x]}
                {(currentMove.coordinate?.y ?? currentMove.coord?.y) + 1}]
              </span>
              <Badge
                variant={
                  currentMove.outcome === 'sunk' || currentMove.outcome === 'hit'
                    ? 'red'
                    : currentMove.outcome === 'mine'
                      ? 'amber'
                      : 'neutral'
                }
                size="sm"
                className="uppercase text-[10px]"
              >
                {currentMove.outcome}
              </Badge>
            </span>
          ) : (
            <span className="text-arena-textMuted">Match Start — Ready to Replay</span>
          )}
        </div>
      </Card>

      {/* Dual Grids at Current Move */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {renderReplayGrid(player1, player1)}
        {renderReplayGrid(player2, player2)}
      </div>

      {/* Verification & Result Hash Footer */}
      {replayData.resultHash && (
        <Card className="p-4 border-arena-border flex items-center justify-between text-xs font-mono">
          <span className="text-arena-textMuted">Result Hash (Keccak-256):</span>
          <span className="text-arena-cyan font-bold break-all">{replayData.resultHash}</span>
        </Card>
      )}
    </div>
  );
}
