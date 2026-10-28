'use client';

import React from 'react';
import { type Ship, type Coord } from '@wba/engine';
import { Button } from '@/components/shared/Button';
import { Card } from '@/components/shared/Card';
import {
  RotateCw,
  Sparkles,
  Trash2,
  CheckCircle2,
  Lock,
  Bomb,
  Ship as ShipIcon,
} from 'lucide-react';

interface ShipInventoryProps {
  ships: Ship[];
  mines: Coord[];
  selectedShipLength: number | null;
  placingMine: boolean;
  orientation: 'H' | 'V';
  onSelectShipLength: (len: number | null) => void;
  onSelectPlacingMine: (placing: boolean) => void;
  onToggleOrientation: () => void;
  onAutoPlace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isSubmitted: boolean;
}

export function ShipInventory({
  ships,
  mines,
  selectedShipLength,
  placingMine,
  orientation,
  onSelectShipLength,
  onSelectPlacingMine,
  onToggleOrientation,
  onAutoPlace,
  onClear,
  onSubmit,
  isSubmitting,
  isSubmitted,
}: ShipInventoryProps) {
  const FLEET_TYPES = [
    { name: 'Carrier', length: 5 },
    { name: 'Battleship', length: 4 },
    { name: 'Cruiser', length: 3 },
    { name: 'Submarine', length: 3 },
    { name: 'Destroyer', length: 2 },
  ];

  // Count placed ships by length (need 2 length-3 ships: Cruiser & Submarine)
  const length3Count = ships.filter((s) => s.length === 3).length;
  const isShipPlaced = (name: string, len: number) => {
    if (len === 3) {
      if (name === 'Cruiser') return length3Count >= 1;
      if (name === 'Submarine') return length3Count >= 2;
    }
    return ships.some((s) => s.length === len);
  };

  const allShipsPlaced = ships.length === 5;
  const allMinesPlaced = mines.length === 3;
  const isReadyToLock = allShipsPlaced && allMinesPlaced;

  return (
    <Card className="p-5 flex flex-col gap-5 border-arena-border">
      {/* Header & Controls */}
      <div className="flex items-center justify-between pb-3 border-b border-arena-border/60">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <ShipIcon className="w-4 h-4 text-arena-cyan" />
            Fleet Armory
          </h3>
          <p className="text-[11px] text-arena-textMuted mt-0.5">
            5 Tactical Warships + 3 Hidden Mines
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onToggleOrientation}
            title="Toggle Orientation"
            disabled={isSubmitted}
            className="text-xs px-2.5"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="font-mono font-bold text-arena-cyan">
              {orientation === 'H' ? 'HORIZ' : 'VERT'}
            </span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={onAutoPlace}
            disabled={isSubmitted}
            className="text-xs px-2.5 text-arena-amber"
            title="Auto-Deploy Fleet"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={onClear}
            disabled={isSubmitted}
            className="text-xs px-2 text-arena-red hover:bg-arena-red/10"
            title="Reset Board"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Ships List */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase font-mono tracking-widest text-arena-textMuted">
          Warship Inventory ({ships.length}/5)
        </span>
        <div className="grid grid-cols-1 gap-2">
          {FLEET_TYPES.map((f, idx) => {
            const placed = isShipPlaced(f.name, f.length);
            const isSelected = selectedShipLength === f.length && !placingMine;

            return (
              <button
                key={`${f.name}-${idx}`}
                disabled={isSubmitted || placed}
                onClick={() => {
                  onSelectPlacingMine(false);
                  onSelectShipLength(isSelected ? null : f.length);
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                  placed
                    ? 'bg-arena-surface/40 border-arena-border/30 opacity-60'
                    : isSelected
                      ? 'bg-arena-cyan/15 border-arena-cyan shadow-md shadow-arena-cyan/20'
                      : 'bg-arena-panel border-arena-border hover:border-arena-borderHover'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex gap-0.5">
                    {Array.from({ length: f.length }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-3.5 rounded-sm ${
                          placed
                            ? 'bg-arena-cyan/50'
                            : isSelected
                              ? 'bg-arena-cyan'
                              : 'bg-arena-border'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-arena-textMain">{f.name}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-arena-textMuted">{f.length}c</span>
                  {placed && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mine Placement */}
      <div className="space-y-2 pt-2 border-t border-arena-border/40">
        <span className="text-[10px] uppercase font-mono tracking-widest text-arena-textMuted">
          Hidden Mines ({mines.length}/3)
        </span>
        <button
          disabled={isSubmitted || allMinesPlaced}
          onClick={() => {
            onSelectShipLength(null);
            onSelectPlacingMine(!placingMine);
          }}
          className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
            allMinesPlaced
              ? 'bg-arena-surface/40 border-arena-border/30 opacity-60'
              : placingMine
                ? 'bg-arena-amber/15 border-arena-amber shadow-md shadow-arena-amber/20'
                : 'bg-arena-panel border-arena-border hover:border-arena-borderHover'
          }`}
        >
          <div className="flex items-center gap-2">
            <Bomb
              className={`w-4 h-4 ${
                placingMine ? 'text-arena-amberBright animate-pulse' : 'text-arena-amber'
              }`}
            />
            <span className="text-xs font-semibold text-arena-textMain">Deploy Mines</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {[0, 1, 2].map((idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full ${
                    idx < mines.length ? 'bg-arena-amber' : 'bg-arena-border'
                  }`}
                />
              ))}
            </div>
            {allMinesPlaced && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
        </button>
      </div>

      {/* Lock & Commit Button */}
      <div className="pt-3 border-t border-arena-border/60">
        {isSubmitted ? (
          <div className="p-3 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              Fleet Locked & Committed
            </div>
            <p className="text-[11px] text-arena-textMuted mt-1">
              Keccak-256 commitment validated. Awaiting opponent...
            </p>
          </div>
        ) : (
          <Button
            variant="cyan"
            size="lg"
            className="w-full"
            disabled={!isReadyToLock || isSubmitting}
            isLoading={isSubmitting}
            onClick={onSubmit}
          >
            <Lock className="w-4 h-4" />
            Lock Fleet & Commit Hash
          </Button>
        )}
      </div>
    </Card>
  );
}
