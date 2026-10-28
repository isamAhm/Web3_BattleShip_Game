'use client';

import React, { useState } from 'react';
import { type Ship, type Coord } from '@wba/engine';
import { type ShotResultEvent } from '@/providers/GameContext';
import { Crosshair, Bomb, Shield, AlertTriangle, Flame } from 'lucide-react';

interface BattleGridProps {
  isTargetBoard: boolean;
  myAddress: string | null;
  ships?: Ship[];
  mines?: Coord[];
  shots: ShotResultEvent[];
  isMyTurn?: boolean;
  onFireShot?: (x: number, y: number) => void;
  disabled?: boolean;
}

export function BattleGrid({
  isTargetBoard,
  myAddress,
  ships = [],
  mines = [],
  shots = [],
  isMyTurn = false,
  onFireShot,
  disabled = false,
}: BattleGridProps) {
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const normAddress = myAddress?.toLowerCase();

  // If this is target board, filter shots where shooter == myAddress
  // If this is own board, filter shots where target == myAddress
  const relevantShots = shots.filter((s) => {
    if (isTargetBoard) {
      return normAddress ? s.shooter.toLowerCase() === normAddress : false;
    } else {
      return normAddress ? s.target.toLowerCase() === normAddress : false;
    }
  });

  const shotMap = new Map<string, ShotResultEvent>();
  relevantShots.forEach((s) => {
    shotMap.set(`${s.coordinate.x},${s.coordinate.y}`, s);
  });

  // For own board: map my ships and mines
  const shipCellSet = new Set<string>();
  if (!isTargetBoard) {
    ships.forEach((s) => {
      for (let i = 0; i < s.length; i++) {
        const cx = s.orientation === 'H' ? s.x + i : s.x;
        const cy = s.orientation === 'V' ? s.y + i : s.y;
        shipCellSet.add(`${cx},${cy}`);
      }
    });
  }

  const mineCellSet = new Set<string>();
  if (!isTargetBoard) {
    mines.forEach((m) => mineCellSet.add(`${m.x},${m.y}`));
  }

  return (
    <div className="flex flex-col items-center select-none">
      {/* Header Label */}
      <div className="text-xs font-mono font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 text-arena-textSub">
        {isTargetBoard ? (
          <>
            <Crosshair className="w-4 h-4 text-arena-redBright" />
            <span>Targeting Grid (Enemy Waters)</span>
          </>
        ) : (
          <>
            <Shield className="w-4 h-4 text-arena-cyan" />
            <span>Defensive Grid (Your Fleet)</span>
          </>
        )}
      </div>

      {/* Top Column Labels (A-J) */}
      <div className="flex ml-6 mb-1 gap-1">
        {columns.map((col) => (
          <div
            key={col}
            className={`w-7 sm:w-9 text-center text-xs font-mono font-bold ${
              isTargetBoard ? 'text-arena-redBright' : 'text-arena-cyan'
            }`}
          >
            {col}
          </div>
        ))}
      </div>

      {/* Grid Rows */}
      <div className="flex flex-col gap-1">
        {rows.map((rowNumber, y) => (
          <div key={rowNumber} className="flex items-center gap-1">
            {/* Left Row Label (1-10) */}
            <div
              className={`w-5 text-right pr-1 text-xs font-mono font-bold ${
                isTargetBoard ? 'text-arena-redBright' : 'text-arena-cyan'
              }`}
            >
              {rowNumber}
            </div>

            {/* Cells */}
            {columns.map((_, x) => {
              const key = `${x},${y}`;
              const shot = shotMap.get(key);
              const hasShip = shipCellSet.has(key);
              const hasMine = mineCellSet.has(key);
              const isHovered = hoverCoord?.x === x && hoverCoord?.y === y;

              const isShotAlready = Boolean(shot);
              const canClick = isTargetBoard && isMyTurn && !isShotAlready && !disabled;

              let cellStyle = 'bg-arena-surface/85 border-arena-border/50 text-arena-textMuted';

              if (!isTargetBoard) {
                // Defensive grid
                if (hasShip && shot) {
                  cellStyle = 'bg-arena-red/40 border-arena-red text-arena-redBright animate-pulse';
                } else if (hasShip) {
                  cellStyle = 'bg-arena-cyan/25 border-arena-cyan/70 text-arena-cyanBright';
                } else if (hasMine && shot) {
                  cellStyle = 'bg-arena-amber/40 border-arena-amber text-arena-amberBright';
                } else if (hasMine) {
                  cellStyle = 'bg-arena-amber/20 border-arena-amber/60 text-arena-amber';
                } else if (shot) {
                  cellStyle = 'bg-arena-panel/50 border-white/20 text-white/50';
                }
              } else {
                // Targeting grid
                if (shot?.outcome === 'hit' || shot?.outcome === 'sunk') {
                  cellStyle =
                    'bg-arena-red/35 border-arena-red text-arena-redBright shadow-lg shadow-arena-red/30';
                } else if (shot?.outcome === 'mine') {
                  cellStyle =
                    'bg-arena-amber/35 border-arena-amber text-arena-amberBright shadow-lg shadow-arena-amber/30';
                } else if (shot?.outcome === 'miss') {
                  cellStyle = 'bg-arena-panel/40 border-white/10 text-white/40';
                } else if (canClick && isHovered) {
                  cellStyle =
                    'bg-arena-red/20 border-arena-redBright text-arena-redBright ring-1 ring-arena-red';
                }
              }

              return (
                <button
                  key={key}
                  disabled={!canClick}
                  onClick={() => canClick && onFireShot && onFireShot(x, y)}
                  onMouseEnter={() => setHoverCoord({ x, y })}
                  onMouseLeave={() => setHoverCoord(null)}
                  className={`w-7 h-7 sm:w-9 sm:h-9 rounded border transition-all duration-150 flex items-center justify-center relative ${cellStyle} ${
                    canClick ? 'cursor-crosshair' : 'cursor-default'
                  }`}
                  aria-label={`Cell ${columns[x]}${rowNumber}`}
                >
                  {/* Visual Icons */}
                  {shot?.outcome === 'hit' && (
                    <Flame className="w-4 h-4 animate-bounce text-arena-redBright" />
                  )}
                  {shot?.outcome === 'sunk' && (
                    <Flame className="w-4.5 h-4.5 text-arena-redBright drop-shadow-[0_0_6px_rgba(239,68,68,0.9)]" />
                  )}
                  {shot?.outcome === 'mine' && (
                    <AlertTriangle className="w-4 h-4 text-arena-amberBright" />
                  )}
                  {shot?.outcome === 'miss' && <div className="w-2 h-2 rounded-full bg-white/40" />}
                  {!isTargetBoard && !shot && hasShip && (
                    <Shield className="w-3.5 h-3.5 opacity-60 text-arena-cyan" />
                  )}
                  {!isTargetBoard && !shot && hasMine && (
                    <Bomb className="w-3.5 h-3.5 opacity-70 text-arena-amber" />
                  )}
                  {canClick && isHovered && (
                    <Crosshair className="w-4 h-4 text-arena-redBright animate-spin" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
