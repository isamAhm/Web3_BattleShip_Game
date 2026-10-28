'use client';

import React, { useState } from 'react';
import { type Ship, type Coord } from '@wba/engine';
import { Crosshair, Bomb, Shield } from 'lucide-react';

interface PlacementGridProps {
  ships: Ship[];
  mines: Coord[];
  selectedShipLength: number | null;
  orientation: 'H' | 'V';
  placingMine: boolean;
  onCellClick: (x: number, y: number) => void;
  disabled?: boolean;
}

export function PlacementGrid({
  ships,
  mines,
  selectedShipLength,
  orientation,
  placingMine,
  onCellClick,
  disabled = false,
}: PlacementGridProps) {
  const [hoverCoord, setHoverCoord] = useState<{ x: number; y: number } | null>(null);

  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Map ship cells
  const shipCellMap = new Map<string, { ship: Ship; isBow: boolean }>();
  ships.forEach((s) => {
    for (let i = 0; i < s.length; i++) {
      const cx = s.orientation === 'H' ? s.x + i : s.x;
      const cy = s.orientation === 'V' ? s.y + i : s.y;
      shipCellMap.set(`${cx},${cy}`, { ship: s, isBow: i === 0 });
    }
  });

  // Map mine cells
  const mineCellSet = new Set<string>();
  mines.forEach((m) => mineCellSet.add(`${m.x},${m.y}`));

  // Compute preview cells when hovering with a selected ship or mine
  const previewCells = new Map<string, boolean>(); // key -> isValid
  if (hoverCoord && !disabled) {
    if (placingMine) {
      const key = `${hoverCoord.x},${hoverCoord.y}`;
      const hasShip = shipCellMap.has(key);
      const hasMine = mineCellSet.has(key);
      previewCells.set(key, !hasShip && !hasMine);
    } else if (selectedShipLength) {
      let valid = true;
      const tempCells: string[] = [];
      for (let i = 0; i < selectedShipLength; i++) {
        const cx = orientation === 'H' ? hoverCoord.x + i : hoverCoord.x;
        const cy = orientation === 'V' ? hoverCoord.y + i : hoverCoord.y;
        if (cx < 0 || cx > 9 || cy < 0 || cy > 9) {
          valid = false;
          break;
        }
        const key = `${cx},${cy}`;
        if (shipCellMap.has(key) || mineCellSet.has(key)) {
          valid = false;
        }
        tempCells.push(key);
      }
      tempCells.forEach((c) => previewCells.set(c, valid));
    }
  }

  return (
    <div className="flex flex-col items-center select-none">
      {/* Top Column Labels (A-J) */}
      <div className="flex ml-7 mb-1 gap-1">
        {columns.map((col) => (
          <div
            key={col}
            className="w-8 sm:w-10 text-center text-xs font-mono font-bold text-arena-cyan"
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
            <div className="w-6 text-right pr-1 text-xs font-mono font-bold text-arena-cyan">
              {rowNumber}
            </div>

            {/* Cells for this row */}
            {columns.map((_, x) => {
              const key = `${x},${y}`;
              const shipInfo = shipCellMap.get(key);
              const hasMine = mineCellSet.has(key);
              const isHovered = previewCells.has(key);
              const isHoverValid = previewCells.get(key);

              let cellBg = 'bg-arena-surface/80 border-arena-border/50 hover:border-arena-cyan/70';

              if (shipInfo) {
                cellBg = 'bg-arena-cyan/25 border-arena-cyan/80 text-arena-cyanBright';
              } else if (hasMine) {
                cellBg = 'bg-arena-amber/25 border-arena-amber/80 text-arena-amberBright';
              }

              if (isHovered) {
                cellBg = isHoverValid
                  ? 'bg-emerald-500/30 border-emerald-400'
                  : 'bg-arena-red/30 border-arena-red';
              }

              return (
                <button
                  key={key}
                  disabled={disabled}
                  onClick={() => onCellClick(x, y)}
                  onMouseEnter={() => setHoverCoord({ x, y })}
                  onMouseLeave={() => setHoverCoord(null)}
                  className={`w-8 h-8 sm:w-10 sm:h-10 rounded border transition-all duration-150 flex items-center justify-center relative ${cellBg} focus:outline-none focus:ring-1 focus:ring-arena-cyan`}
                  aria-label={`Cell ${columns[x]}${rowNumber}`}
                >
                  {shipInfo && (
                    <Shield className="w-4 h-4 opacity-75 drop-shadow-[0_0_4px_rgba(6,182,212,0.8)]" />
                  )}
                  {hasMine && (
                    <Bomb className="w-4 h-4 opacity-90 drop-shadow-[0_0_4px_rgba(245,158,11,0.8)]" />
                  )}
                  {isHovered && !shipInfo && !hasMine && (
                    <Crosshair className="w-3.5 h-3.5 text-arena-textSub opacity-60" />
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
