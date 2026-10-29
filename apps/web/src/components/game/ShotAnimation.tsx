"use client";

import { useEffect, useRef, useState } from "react";

interface ShotAnimationProps {
  /** The target board container ref */
  boardRef: React.RefObject<HTMLDivElement | null>;
  /** The key of the cell being targeted e.g. "3,5" */
  targetCell: string | null;
  /** outcome once the shot resolves */
  outcome: "hit" | "miss" | "sunk" | "mine" | "boom" | null;
  /** call when the full animation is done */
  onDone: () => void;
}

interface Projectile {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  outcome: "hit" | "miss" | "sunk" | "mine" | "boom";
}

let _id = 0;

export function ShotAnimation({ boardRef, targetCell, outcome, onDone }: ShotAnimationProps) {
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [impacts, setImpacts] = useState<{ id: number; x: number; y: number; outcome: string }[]>([]);
  const prevCell = useRef<string | null>(null);
  const prevOutcome = useRef<string | null>(null);

  useEffect(() => {
    // Only fire when outcome just resolved for a cell
    if (!targetCell || !outcome || !boardRef.current) return;
    if (targetCell === prevCell.current && outcome === prevOutcome.current) return;
    prevCell.current = targetCell;
    prevOutcome.current = outcome;

    const board = boardRef.current;
    const boardRect = board.getBoundingClientRect();

    // Find the target cell button inside the board
    const cellBtn = board.querySelector<HTMLButtonElement>(`button[data-key="${targetCell}"]`);
    if (!cellBtn) return;

    const cellRect = cellBtn.getBoundingClientRect();
    const endX = cellRect.left + cellRect.width / 2;
    const endY = cellRect.top + cellRect.height / 2;

    // Start from bottom-left of the board (your side)
    const startX = boardRect.left - 80;
    const startY = boardRect.bottom - 40;

    const id = ++_id;

    setProjectiles((prev) => [...prev, { id, startX, startY, endX, endY, outcome }]);

    // Remove projectile and show impact after travel time (600ms)
    setTimeout(() => {
      setProjectiles((prev) => prev.filter((p) => p.id !== id));
      setImpacts((prev) => [...prev, { id, x: endX, y: endY, outcome }]);

      // Remove impact ring after it expands (800ms)
      setTimeout(() => {
        setImpacts((prev) => prev.filter((i) => i.id !== id));
        onDone();
      }, 800);
    }, 600);
  }, [targetCell, outcome]);

  if (projectiles.length === 0 && impacts.length === 0) return null;

  return (
    <>
      {projectiles.map((p) => (
        <Projectile key={p.id} {...p} />
      ))}
      {impacts.map((imp) => (
        <ImpactRing key={imp.id} x={imp.x} y={imp.y} outcome={imp.outcome} />
      ))}
    </>
  );
}

function Projectile({ startX, startY, endX, endY, outcome }: Omit<Projectile, "id">) {
  const color = outcome === "miss" ? "#8fb0ad" : outcome === "mine" ? "#ebb54a" : "#ff6a4d";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        left: startX,
        top: startY,
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 12px 4px ${color}`,
        zIndex: 9999,
        pointerEvents: "none",
        animation: "shot-travel 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards",
        // CSS custom props for the keyframe
        ["--dx" as any]: `${endX - startX}px`,
        ["--dy" as any]: `${endY - startY}px`,
      }}
    />
  );
}

function ImpactRing({ x, y, outcome }: { x: number; y: number; outcome: string }) {
  const isHit = outcome === "hit" || outcome === "sunk";
  const isMine = outcome === "mine" || outcome === "boom";
  const color = isMine ? "#ebb54a" : isHit ? "#ff6a4d" : "#35d6c0";

  return (
    <>
      {/* Expanding ring */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: x,
          top: y,
          width: 0,
          height: 0,
          borderRadius: "50%",
          border: `3px solid ${color}`,
          boxShadow: `0 0 20px ${color}`,
          zIndex: 9999,
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          animation: "impact-ring 0.7s ease-out forwards",
        }}
      />
      {/* Center flash */}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          left: x,
          top: y,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: color,
          zIndex: 9999,
          pointerEvents: "none",
          transform: "translate(-50%, -50%)",
          animation: "impact-flash 0.4s ease-out forwards",
        }}
      />
      {/* Sparks */}
      {isHit && [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <div
          key={angle}
          aria-hidden="true"
          style={{
            position: "fixed",
            left: x,
            top: y,
            width: 4,
            height: 4,
            borderRadius: "50%",
            background: color,
            zIndex: 9999,
            pointerEvents: "none",
            transform: "translate(-50%, -50%)",
            animation: `spark 0.6s ease-out forwards`,
            ["--angle" as any]: `${angle}deg`,
          }}
        />
      ))}
    </>
  );
}
