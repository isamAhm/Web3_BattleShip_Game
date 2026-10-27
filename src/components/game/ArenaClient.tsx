"use client";

import { useState } from "react";
import { GameBoard } from "./GameBoard";
import { MatchTimer } from "./MatchTimer";
import type { BoardCells, Ship } from "@/types/game";

interface ArenaClientProps {
  myBoardCells: BoardCells;
  foeBoardCells: BoardCells;
  myShips: Ship[];
  foeShips: Ship[];
}

export function ArenaClient({
  myBoardCells,
  foeBoardCells,
  myShips,
  foeShips,
}: ArenaClientProps) {
  const [foeCells, setFoeCells] = useState<BoardCells>(foeBoardCells);
  const [aimCell, setAimCell] = useState<string | null>(null);
  const [aimLabel, setAimLabel] = useState<string>("Pick a cell");

  const handleCellClick = (label: string, key: string) => {
    setAimCell(key);
    setAimLabel(label);
  };

  const handleFire = () => {
    if (!aimCell) return;
    setFoeCells((prev) => ({ ...prev, [aimCell]: "hit" }));
    setAimCell(null);
    setAimLabel("Pick a cell");
  };

  const handleAutoFire = () => {
    const available: string[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const key = `${r},${c}`;
        const state = foeCells[key] || "empty";
        if (state === "empty") available.push(key);
      }
    }
    if (!available.length) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    const [r, c] = pick.split(",").map(Number);
    const label = `${"ABCDEFGHIJ"[r]}${c + 1}`;
    setAimCell(pick);
    setAimLabel(label);
  };

  return (
    <>
      {/* Match bar */}
      <div className="flex items-center gap-5 mb-5 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-[30px] leading-tight tracking-tighter">
            Match vs Kestrel
          </h1>
          <p className="text-[var(--mist)] text-sm mt-0.5">
            Battleship · 3 mines each · 14 spectators watching
          </p>
        </div>
        <MatchTimer initialSeconds={14} totalSeconds={20} />
      </div>

      {/* Boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        {/* Your board */}
        <div className="min-w-0">
          <h2
            className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight"
          >
            Your fleet
            <span className="font-body font-medium text-[13px] text-[var(--mist)]">
              Kestrel has fired 8 shots
            </span>
          </h2>
          <GameBoard
            id="mine"
            cells={myBoardCells}
            ships={myShips}
          />
        </div>

        {/* Enemy board */}
        <div className="min-w-0">
          <h2
            className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight"
          >
            Enemy waters
            <span className="font-body font-medium text-[13px] text-[var(--mist)]">
              9 shots fired, 3 hits in a row
            </span>
          </h2>
          <GameBoard
            id="foe"
            cells={foeCells}
            ships={foeShips}
            isEnemy
            onCellClick={handleCellClick}
            aimCell={aimCell}
          />
        </div>
      </div>

      {/* Fire controls */}
      <div
        className="flex items-center gap-4 mt-4 p-4 pl-5 rounded-[16px] border flex-wrap"
        style={{ background: "var(--deck)", borderColor: "var(--line)" }}
      >
        <p className="mr-auto">
          <span className="text-[var(--mist)] text-sm block">Target</span>
          <strong
            id="target"
            className="font-display font-extrabold text-[22px]"
          >
            {aimLabel}
          </strong>
        </p>
        <button
          type="button"
          className="px-5 py-3 rounded-[12px] font-bold transition-all hover:-translate-y-px"
          style={{ background: "var(--hull)", color: "var(--foam)" }}
          onClick={handleAutoFire}
        >
          Auto-fire
        </button>
        <button
          type="button"
          disabled={!aimCell}
          className="px-5 py-3 rounded-[12px] font-bold transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_-6px_rgba(53,214,192,0.6)] disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
          style={{ background: "var(--signal)", color: "var(--abyss)" }}
          onClick={handleFire}
        >
          Fire shot
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 mt-4 text-[var(--mist)] text-[13px] px-1">
        <span className="flex items-center gap-1.5">
          <span
            className="w-[22px] h-[10px] rounded-sm"
            style={{
              background: "#7aa6b2",
              clipPath: "polygon(0 0,72% 0,100% 50%,72% 100%,0 100%)",
            }}
          />
          Your ship
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[4px] block" style={{ background: "var(--flare)" }} />
          Hit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[4px] block opacity-60" style={{ background: "var(--mist)" }} />
          Miss
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-[4px] block"
            style={{ background: "var(--brass)", transform: "rotate(45deg) scale(0.8)" }}
          />
          Mine
        </span>
      </div>
    </>
  );
}
