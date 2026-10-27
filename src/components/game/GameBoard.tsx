"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { shipSVG } from "@/lib/shipSvg";
import type { BoardCells, Ship } from "@/types/game";

const LETTERS = "ABCDEFGHIJ";

interface GameBoardProps {
  cells: BoardCells;
  ships?: Ship[];
  isEnemy?: boolean;
  onCellClick?: (cell: string, key: string) => void;
  aimCell?: string | null;
  id: string;
}

function getCellClass(state: string, isEnemy: boolean): string {
  const base =
    "relative border-0 p-0 aspect-square rounded-[6px] transition-all";

  if (state === "hit") {
    return cn(
      base,
      "bg-gradient-to-b from-[#ff8466] to-[#d94a30]",
      "shadow-[0_0_14px_rgba(255,106,77,0.45)]"
    );
  }
  if (state === "miss") {
    return cn(base, "bg-[rgba(53,214,192,0.06)] shadow-[inset_0_0_0_1px_rgba(160,225,215,0.07)]");
  }
  if (state === "sunk") {
    return cn(base, "bg-transparent z-[2]");
  }
  if (state === "mine") {
    return cn(
      base,
      "bg-[rgba(235,181,74,0.14)] shadow-[inset_0_0_0_1.5px_rgba(235,181,74,0.55)]"
    );
  }
  if (state === "boom") {
    return cn(
      base,
      "bg-gradient-to-b from-[#f6c85a] to-[#e9892c]",
      "shadow-[0_0_16px_rgba(235,181,74,0.6)]"
    );
  }
  if (state === "aim") {
    return cn(
      base,
      "bg-[rgba(53,214,192,0.3)]",
      "shadow-[inset_0_0_0_2px_var(--signal),0_0_22px_rgba(53,214,192,0.5)]"
    );
  }
  // empty / default
  if (isEnemy) {
    return cn(
      base,
      "bg-[rgba(53,214,192,0.06)] shadow-[inset_0_0_0_1px_rgba(160,225,215,0.07)]",
      "cursor-crosshair hover:bg-[rgba(53,214,192,0.28)] hover:shadow-[inset_0_0_0_1.5px_var(--signal),0_0_18px_rgba(53,214,192,0.35)]"
    );
  }
  return cn(base, "bg-[rgba(53,214,192,0.06)] shadow-[inset_0_0_0_1px_rgba(160,225,215,0.07)]");
}

function CellOverlay({ state }: { state: string }) {
  if (state === "hit") {
    return (
      <span className="absolute inset-[30%] rounded-full bg-[#ffe3d9] opacity-90 pointer-events-none" />
    );
  }
  if (state === "miss") {
    return (
      <span className="absolute inset-[36%] rounded-full bg-[var(--mist)] opacity-55 pointer-events-none" />
    );
  }
  if (state === "sunk") {
    return (
      <span
        className="absolute left-[24%] right-[24%] pointer-events-none"
        style={{
          top: "calc(50% - 1px)",
          height: "2px",
          background: "var(--flare)",
          transform: "rotate(45deg)",
        }}
      />
    );
  }
  if (state === "mine") {
    return (
      <span
        className="absolute inset-[34%] bg-[var(--brass)] pointer-events-none"
        style={{ transform: "rotate(45deg)", borderRadius: "2px" }}
      />
    );
  }
  if (state === "boom") {
    return (
      <span
        className="absolute inset-[26%] bg-[#fff3cf] pointer-events-none"
        style={{
          clipPath:
            "polygon(50% 0,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0 50%,38% 36%)",
        }}
      />
    );
  }
  return null;
}

export function GameBoard({
  cells,
  ships = [],
  isEnemy = false,
  onCellClick,
  aimCell,
  id,
}: GameBoardProps) {
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onCellClick) return;
      const btn = (e.target as Element).closest<HTMLButtonElement>("button[data-key]");
      if (!btn) return;
      const key = btn.dataset.key!;
      const label = btn.getAttribute("aria-label")!;
      const state = cells[key] || "empty";
      if (state === "hit" || state === "miss" || state === "sunk" || state === "boom") return;
      onCellClick(label, key);
    },
    [onCellClick, cells]
  );

  return (
    <div
      id={id}
      onClick={handleClick}
      className={cn(
        "grid gap-1 p-3.5 pl-2.5 rounded-[20px] border relative overflow-hidden",
        isEnemy
          ? "border-[rgba(53,214,192,0.3)] shadow-[0_0_0_1px_rgba(53,214,192,0.08),0_30px_80px_-30px_rgba(53,214,192,0.35)] radar-sweep"
          : "border-[var(--line)]"
      )}
      style={{
        gridTemplateColumns: "20px repeat(10, minmax(0, 1fr))",
        background: isEnemy
          ? "radial-gradient(circle at 50% 50%,#0f3640 0%,var(--deck) 75%)"
          : "var(--deck)",
      }}
    >
      {/* Top-left corner blank */}
      <span style={{ gridRow: 1, gridColumn: 1 }} />
      {/* Column headers */}
      {Array.from({ length: 10 }, (_, i) => (
        <span
          key={`col-${i}`}
          className="grid place-items-center font-display font-semibold text-[12px] text-[var(--mist)]"
          style={{ gridRow: 1, gridColumn: i + 2 }}
        >
          {i + 1}
        </span>
      ))}

      {/* Rows */}
      {Array.from({ length: 10 }, (_, r) => (
        <>
          <span
            key={`row-label-${r}`}
            className="grid place-items-center font-display font-semibold text-[12px] text-[var(--mist)]"
            style={{ gridRow: r + 2, gridColumn: 1 }}
          >
            {LETTERS[r]}
          </span>
          {Array.from({ length: 10 }, (_, c) => {
            const key = `${r},${c}`;
            const state = key === aimCell ? "aim" : cells[key] || "empty";
            return (
              <button
                key={`cell-${r}-${c}`}
                data-key={key}
                aria-label={`${LETTERS[r]}${c + 1}`}
                className={getCellClass(state, isEnemy && state === "empty")}
                style={{ gridRow: r + 2, gridColumn: c + 2 }}
                type="button"
              >
                <CellOverlay state={state} />
              </button>
            );
          })}
        </>
      ))}

      {/* Ship overlays */}
      {ships.map((ship, idx) => (
        <div
          key={idx}
          className={cn(
            "vessel pointer-events-none z-[1] p-0.5",
            ship.wreck ? "wreck" : ""
          )}
          style={{
            gridRow: ship.vertical
              ? `${ship.row + 2} / span ${ship.size}`
              : `${ship.row + 2}`,
            gridColumn: ship.vertical
              ? `${ship.col + 2}`
              : `${ship.col + 2} / span ${ship.size}`,
            filter: ship.wreck
              ? "drop-shadow(0 3px 4px rgba(0,0,0,.5)) saturate(.7) brightness(.85)"
              : "drop-shadow(0 3px 4px rgba(0,0,0,.5))",
          }}
          dangerouslySetInnerHTML={{
            __html: shipSVG(ship.type, ship.size, ship.vertical ?? false),
          }}
        />
      ))}
    </div>
  );
}
