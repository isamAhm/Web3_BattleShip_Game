"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { shipSVG } from "@/lib/shipSvg";
import type { BoardCells, Ship } from "@/types/game";

const LETTERS = "ABCDEFGHIJ";

interface GameBoardProps {
  cells: BoardCells;
  ships?: Ship[];
  isEnemy?: boolean;
  onCellClick?: (cell: string, key: string) => void;
  onShipDrop?: (shipType: string, key: string) => void;
  onShipRotate?: (shipType: string) => void;
  onShipDragStart?: (shipType: string) => void;
  aimCell?: string | null;
  id: string;
  isPlacement?: boolean;
  /** cells of ships that just sank — triggers fire animation */
  newlySunkCells?: string[];
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
      <>
        <span className="absolute inset-[30%] rounded-full bg-[#ffe3d9] opacity-90 pointer-events-none" />
        <SmokeParticles />
      </>
    );
  }
  if (state === "miss") {
    return (
      <span className="absolute inset-[36%] rounded-full bg-[var(--mist)] opacity-55 pointer-events-none" />
    );
  }
  if (state === "sunk") {
    return (
      <>
        <span
          className="absolute left-[24%] right-[24%] pointer-events-none"
          style={{
            top: "calc(50% - 1px)",
            height: "2px",
            background: "var(--flare)",
            transform: "rotate(45deg)",
          }}
        />
        {/* Heavier smoke on sunk */}
        <SmokeParticles dense />
      </>
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
      <>
        <span
          className="absolute inset-[26%] bg-[#fff3cf] pointer-events-none"
          style={{
            clipPath:
              "polygon(50% 0,62% 36%,100% 50%,62% 64%,50% 100%,38% 64%,0 50%,38% 36%)",
          }}
        />
        <SmokeParticles dense color="rgba(235,181,74,0.5)" />
      </>
    );
  }
  return null;
}

/* ── Fire overlay (shown when a ship first sinks) ───── */
function FireOverlay() {
  return (
    <>
      {/* Base fire glow */}
      <span
        className="absolute inset-0 rounded-[6px] pointer-events-none z-[5]"
        style={{
          background: "radial-gradient(ellipse at 50% 90%, rgba(255,120,30,0.85) 0%, rgba(255,60,0,0.4) 50%, transparent 75%)",
          animation: "fire-glow 0.4s ease-in-out infinite alternate",
        }}
      />
      {/* Flame tongues */}
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="absolute bottom-0 pointer-events-none z-[6]"
          style={{
            left: `${18 + i * 22}%`,
            width: "22%",
            height: "90%",
            background: `linear-gradient(to top, rgba(255,${80 + i * 30},0,0.95), rgba(255,200,50,0.7) 50%, transparent)`,
            borderRadius: "50% 50% 20% 20%",
            transformOrigin: "bottom center",
            animation: `flame-flicker ${0.5 + i * 0.15}s ease-in-out ${i * 0.1}s infinite alternate`,
            filter: "blur(1px)",
          }}
        />
      ))}
      {/* Bright core */}
      <span
        className="absolute bottom-[5%] left-[25%] right-[25%] h-[30%] pointer-events-none z-[6]"
        style={{
          background: "radial-gradient(ellipse, rgba(255,240,100,0.95) 0%, rgba(255,140,0,0.6) 60%, transparent 100%)",
          borderRadius: "50%",
          animation: "fire-core 0.3s ease-in-out infinite alternate",
          filter: "blur(1px)",
        }}
      />
      {/* Embers rising */}
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute pointer-events-none z-[7]"
          style={{
            left: `${10 + i * 22}%`,
            bottom: "10%",
            width: 3,
            height: 3,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#ff8c00" : "#ffcc00",
            animation: `ember-rise ${1 + i * 0.25}s ease-out ${i * 0.3}s infinite`,
          }}
        />
      ))}
    </>
  );
}

/* ── Smoke particles ─────────────────────────────────── */
function SmokeParticles({
  dense = false,
  color = "rgba(180,140,120,0.55)",
}: {
  dense?: boolean;
  color?: string;
}) {
  const count = dense ? 5 : 3;
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="smoke-puff"
          style={{
            // stagger each puff
            animationDelay: `${i * 0.6}s`,
            animationDuration: `${1.8 + i * 0.3}s`,
            left: `${20 + i * 14}%`,
            background: color,
          }}
        />
      ))}
    </>
  );
}

export function GameBoard({
  cells,
  ships = [],
  isEnemy = false,
  onCellClick,
  onShipDrop,
  onShipRotate,
  onShipDragStart,
  aimCell,
  id,
  isPlacement = false,
  newlySunkCells = [],
}: GameBoardProps) {
  // Track which cells are currently showing fire (key → true while burning)
  const [firingCells, setFiringCells] = useState<Set<string>>(new Set());
  const prevSunkRef = useRef<string[]>([]);

  useEffect(() => {
    if (!newlySunkCells || newlySunkCells.length === 0) return;
    // Only trigger for genuinely new sunk cells
    const fresh = newlySunkCells.filter((c) => !prevSunkRef.current.includes(c));
    if (fresh.length === 0) return;
    prevSunkRef.current = [...prevSunkRef.current, ...fresh];

    setFiringCells((prev) => {
      const next = new Set(prev);
      fresh.forEach((c) => next.add(c));
      return next;
    });

    // Fire burns for 3.5s then clears
    setTimeout(() => {
      setFiringCells((prev) => {
        const next = new Set(prev);
        fresh.forEach((c) => next.delete(c));
        return next;
      });
    }, 3500);
  }, [newlySunkCells]);
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

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!onShipDrop) return;
      const btn = (e.target as Element).closest<HTMLButtonElement>("button[data-key]");
      if (!btn) return;
      const key = btn.dataset.key!;
      onShipDrop(e.dataTransfer.getData("text/plain"), key);
    },
    [onShipDrop]
  );

  return (
    <div
      id={id}
      onClick={handleClick}
      onDragOver={isPlacement ? handleDragOver : undefined}
      onDrop={isPlacement ? handleDrop : undefined}
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
        <React.Fragment key={`row-${r}`}>
          <span
            className="grid place-items-center font-display font-semibold text-[12px] text-[var(--mist)]"
            style={{ gridRow: r + 2, gridColumn: 1 }}
          >
            {LETTERS[r]}
          </span>
          {Array.from({ length: 10 }, (_, c) => {
            const key = `${r},${c}`;
            const state = key === aimCell ? "aim" : cells[key] || "empty";
            const isBurning = firingCells.has(key);
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
                {isBurning && <FireOverlay />}
              </button>
            );
          })}
        </React.Fragment>
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

      {/* Interactive ship hit layer during placement (draggable + rotate on right-click) */}
      {isPlacement && ships.map((ship, idx) => (
        <div
          key={`interactive-${idx}`}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", ship.type);
            e.dataTransfer.effectAllowed = "move";
            onShipDragStart?.(ship.type);
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            onShipRotate?.(ship.type);
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            onShipRotate?.(ship.type);
          }}
          title="Drag to move · Right-click or double-click to rotate"
          className="z-[3] cursor-grab active:cursor-grabbing rounded-[4px] hover:ring-2 hover:ring-[var(--signal)] hover:ring-offset-1 hover:ring-offset-[var(--deck)] transition-all"
          style={{
            gridRow: ship.vertical
              ? `${ship.row + 2} / span ${ship.size}`
              : `${ship.row + 2}`,
            gridColumn: ship.vertical
              ? `${ship.col + 2}`
              : `${ship.col + 2} / span ${ship.size}`,
            pointerEvents: "auto",
          }}
        />
      ))}
    </div>
  );
}
