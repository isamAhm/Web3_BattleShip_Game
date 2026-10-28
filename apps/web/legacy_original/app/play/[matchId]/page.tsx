'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useWallet } from '@/providers/WalletContext';
import { useGame } from '@/providers/GameContext';
import { PlacementGrid } from '@/components/placement/PlacementGrid';
import { ShipInventory } from '@/components/placement/ShipInventory';
import { BattleGrid } from '@/components/battle/BattleGrid';
import { TurnTimer } from '@/components/battle/TurnTimer';
import { ScoreBoard } from '@/components/battle/ScoreBoard';
import { BattleLog } from '@/components/battle/BattleLog';
import { ChatBox } from '@/components/battle/ChatBox';
import { ResultCard } from '@/components/results/ResultCard';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { api } from '@/lib/api/client';
import { ShieldAlert, ArrowLeft, Clock } from 'lucide-react';
import { type Coord } from '@wba/engine';

export default function MatchPlayPage() {
  const params = useParams();
  const router = useRouter();
  const matchIdFromUrl = params.matchId as string;

  const { address } = useWallet();
  const {
    phase,
    matchId,
    turnSecondsRemaining,
    ships,
    mines,
    orientation,
    isPlacementSubmitted,
    toggleOrientation,
    setShips,
    setMines,
    autoPlaceFleet,
    clearFleet,
    submitFleet,
    shots,
    myScore,
    opponentScore,
    streak,
    winner,
    forfeit,
    isMyTurn,
    fireShot,
    messages,
    sendChat,
    verification,
    resultHash,
    submitReveal,
    resetGame,
    joinQueue,
  } = useGame();

  // Placement state
  const [selectedShipLength, setSelectedShipLength] = useState<number | null>(null);
  const [placingMine, setPlacingMine] = useState<boolean>(false);
  const [isSubmittingFleet, setIsSubmittingFleet] = useState(false);
  const [placementError, setPlacementError] = useState<string | null>(null);

  // Fallback match data if restored from URL
  const [remoteMatch, setRemoteMatch] = useState<any>(null);

  useEffect(() => {
    if (!matchId && matchIdFromUrl) {
      api.matches
        .getMatch(matchIdFromUrl)
        .then((data) => setRemoteMatch(data))
        .catch(() => {});
    }
  }, [matchId, matchIdFromUrl]);

  // Handle cell click on placement grid
  const handlePlacementCellClick = (x: number, y: number) => {
    if (isPlacementSubmitted) return;
    setPlacementError(null);

    if (placingMine) {
      // Placing mine
      if (mines.length >= 3) {
        setPlacementError('Maximum of 3 mines allowed.');
        return;
      }
      // Check collision with ships or other mines
      const shipOccupied = ships.some((s) => {
        for (let i = 0; i < s.length; i++) {
          const cx = s.orientation === 'H' ? s.x + i : s.x;
          const cy = s.orientation === 'V' ? s.y + i : s.y;
          if (cx === x && cy === y) return true;
        }
        return false;
      });

      if (shipOccupied) {
        setPlacementError('Mines cannot overlap warships.');
        return;
      }

      if (mines.some((m) => m.x === x && m.y === y)) {
        // Remove mine if already placed here
        setMines(mines.filter((m) => !(m.x === x && m.y === y)));
        return;
      }

      setMines([...mines, { x, y }]);
    } else if (selectedShipLength) {
      // Placing selected ship
      const maxX = orientation === 'H' ? 10 - selectedShipLength : 9;
      const maxY = orientation === 'V' ? 10 - selectedShipLength : 9;

      if (x > maxX || y > maxY) {
        setPlacementError('Ship extends beyond the 10x10 tactical grid boundary.');
        return;
      }

      // Check collision
      const newShipCells: Coord[] = [];
      for (let i = 0; i < selectedShipLength; i++) {
        newShipCells.push({
          x: orientation === 'H' ? x + i : x,
          y: orientation === 'V' ? y + i : y,
        });
      }

      const mineCollision = newShipCells.some((c) => mines.some((m) => m.x === c.x && m.y === c.y));
      if (mineCollision) {
        setPlacementError('Ship collides with an already deployed naval mine.');
        return;
      }

      const shipCollision = newShipCells.some((c) =>
        ships.some((s) => {
          for (let i = 0; i < s.length; i++) {
            const sx = s.orientation === 'H' ? s.x + i : s.x;
            const sy = s.orientation === 'V' ? s.y + i : s.y;
            if (sx === c.x && sy === c.y) return true;
          }
          return false;
        }),
      );

      if (shipCollision) {
        setPlacementError('Ship collides with an existing warship.');
        return;
      }

      setShips([...ships, { x, y, length: selectedShipLength, orientation }]);
      setSelectedShipLength(null);
    }
  };

  const handleSubmitFleet = async () => {
    setIsSubmittingFleet(true);
    setPlacementError(null);
    try {
      await submitFleet();
    } catch (err: any) {
      setPlacementError(err.message || 'Failed to submit commitment');
    } finally {
      setIsSubmittingFleet(false);
    }
  };

  // Compute sunk ships count
  const myHitsAgainstOpponent = shots.filter(
    (s) => address && s.shooter.toLowerCase() === address.toLowerCase() && s.outcome === 'sunk',
  ).length;

  const opponentHitsAgainstMe = shots.filter(
    (s) => address && s.target.toLowerCase() === address.toLowerCase() && s.outcome === 'sunk',
  ).length;

  const isWinner = Boolean(address && winner && winner.toLowerCase() === address.toLowerCase());

  // If match was fetched remotely and is already finished
  if (!matchId && remoteMatch && remoteMatch.status === 'completed') {
    return (
      <div className="flex-1 max-w-5xl mx-auto px-4 py-12 w-full">
        <ResultCard
          matchId={remoteMatch.matchId || matchIdFromUrl}
          isWinner={remoteMatch.winner?.toLowerCase() === address?.toLowerCase()}
          forfeit={remoteMatch.forfeit}
          myScore={
            address && remoteMatch.scores ? remoteMatch.scores[address.toLowerCase()] || 0 : 0
          }
          opponentScore={0}
          streak={0}
          totalShots={remoteMatch.totalShots || 0}
          verification={remoteMatch.verification}
          resultHash={remoteMatch.resultHash}
          onSubmitReveal={submitReveal}
          onPlayAgain={() => {
            resetGame();
            joinQueue();
            router.push('/lobby');
          }}
        />
      </div>
    );
  }

  // Active in-game views
  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full flex flex-col">
      {/* Placement Phase View */}
      {phase === 'placement' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-arena-border/60 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-extrabold text-white uppercase tracking-wider">
                  TACTICAL FLEET DEPLOYMENT
                </h1>
                <Badge variant="cyan" size="sm">
                  PHASE 1: COMMITMENT
                </Badge>
              </div>
              <p className="text-xs text-arena-textSub mt-0.5">
                Position your 5 warships and 3 hidden naval mines. Hash is cryptographically sealed
                before battle.
              </p>
            </div>

            <Badge variant="amber" size="md" className="font-mono text-xs font-bold gap-1.5">
              <Clock className="w-4 h-4" />
              DEPLOYMENT TIMEOUT: 60s
            </Badge>
          </div>

          {placementError && (
            <div className="p-3 rounded-lg bg-arena-red/15 border border-arena-red/40 text-arena-redBright text-xs">
              {placementError}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Center: 10x10 Placement Grid */}
            <div className="lg:col-span-2 flex justify-center p-6 bg-arena-surface/80 rounded-2xl border border-arena-border shadow-xl">
              <PlacementGrid
                ships={ships}
                mines={mines}
                selectedShipLength={selectedShipLength}
                orientation={orientation}
                placingMine={placingMine}
                onCellClick={handlePlacementCellClick}
                disabled={isPlacementSubmitted}
              />
            </div>

            {/* Right: Armory & Submission Controls */}
            <div>
              <ShipInventory
                ships={ships}
                mines={mines}
                selectedShipLength={selectedShipLength}
                placingMine={placingMine}
                orientation={orientation}
                onSelectShipLength={setSelectedShipLength}
                onSelectPlacingMine={setPlacingMine}
                onToggleOrientation={toggleOrientation}
                onAutoPlace={autoPlaceFleet}
                onClear={clearFleet}
                onSubmit={handleSubmitFleet}
                isSubmitting={isSubmittingFleet}
                isSubmitted={isPlacementSubmitted}
              />
            </div>
          </div>
        </div>
      )}

      {/* Battle Phase View */}
      {phase === 'battle' && (
        <div className="space-y-6">
          {/* Top Status & Timers */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
            <div className="lg:col-span-2">
              <TurnTimer isMyTurn={isMyTurn} secondsRemaining={turnSecondsRemaining} />
            </div>
            <div>
              <ScoreBoard
                myScore={myScore}
                opponentScore={opponentScore}
                streak={streak}
                myShipsSunk={opponentHitsAgainstMe}
                opponentShipsSunk={myHitsAgainstOpponent}
              />
            </div>
          </div>

          {/* Dual Tactical Boards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left: Defensive Board */}
            <div className="flex flex-col items-center p-5 bg-arena-surface/80 rounded-2xl border border-arena-border shadow-xl">
              <BattleGrid
                isTargetBoard={false}
                myAddress={address}
                ships={ships}
                mines={mines}
                shots={shots}
                isMyTurn={isMyTurn}
              />
            </div>

            {/* Right: Enemy Targeting Board */}
            <div className="flex flex-col items-center p-5 bg-arena-surface/80 rounded-2xl border border-arena-border shadow-xl">
              <BattleGrid
                isTargetBoard={true}
                myAddress={address}
                shots={shots}
                isMyTurn={isMyTurn}
                onFireShot={fireShot}
              />
            </div>
          </div>

          {/* Bottom Feeds: Battle Log & Chat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <BattleLog shots={shots} myAddress={address} />
            <ChatBox messages={messages} myAddress={address} onSend={sendChat} />
          </div>
        </div>
      )}

      {/* Match Ended View */}
      {phase === 'ended' && (
        <div className="py-8">
          <ResultCard
            matchId={matchId || matchIdFromUrl}
            isWinner={isWinner}
            forfeit={forfeit}
            myScore={myScore}
            opponentScore={opponentScore}
            streak={streak}
            totalShots={
              shots.filter((s) => s.shooter.toLowerCase() === address?.toLowerCase()).length
            }
            verification={verification}
            resultHash={resultHash}
            onSubmitReveal={submitReveal}
            onPlayAgain={() => {
              resetGame();
              joinQueue();
              router.push('/lobby');
            }}
          />
        </div>
      )}

      {/* Idle / Disconnected fallback */}
      {phase === 'idle' && !remoteMatch && (
        <div className="flex flex-col items-center justify-center py-24 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-arena-amber animate-pulse" />
          <h2 className="text-xl font-bold text-white uppercase tracking-wider">
            No Active Combat Session Detected
          </h2>
          <p className="text-xs text-arena-textMuted max-w-md">
            You are not currently in an active deployment or battle room. Enter the lobby to join
            matchmaking.
          </p>
          <Link href="/lobby">
            <Button variant="cyan" size="md">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Return to Command Lobby
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
