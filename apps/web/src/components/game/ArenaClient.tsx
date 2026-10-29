"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { commitPlacement, generateSalt } from "@wba/engine";
import { GameBoard } from "./GameBoard";
import { PlayerPanel } from "./PlayerPanel";
import { OpponentPanel } from "./OpponentPanel";
import { ShotLog } from "./ShotLog";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { BadgesPanel } from "./BadgesPanel";
import { MatchRecord } from "./MatchRecord";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";
import { useNavigationGuard, clearActiveMatch } from "@/lib/useNavigationGuard";
import type {
  BoardCells,
  Ship,
  FleetShip,
  ShotLogEntry,
  Player,
  ShipType,
} from "@/types/game";
import { LEADERBOARD, BADGES, MATCH_STEPS } from "@/lib/gameData";

const LETTERS = "ABCDEFGHIJ";

interface ShipDef {
  type: ShipType;
  name: string;
  size: number;
  icon: string;
}

const SHIP_DEFS: ShipDef[] = [
  { type: "carrier", name: "Carrier", size: 5, icon: "✈️" },
  { type: "battleship", name: "Battleship", size: 4, icon: "⚓" },
  { type: "cruiser", name: "Cruiser", size: 3, icon: "🛡️" },
  { type: "submarine", name: "Submarine", size: 3, icon: "🌊" },
  { type: "destroyer", name: "Destroyer", size: 2, icon: "⚡" },
];

interface PlacedShip {
  type: ShipType;
  name: string;
  size: number;
  row: number;
  col: number;
  vertical: boolean;
  cells: string[];
  hits: number;
  wreck?: boolean;
}

function generateRandomFleet(): { ships: PlacedShip[]; mines: string[] } {
  const occupied = new Set<string>();
  const ships: PlacedShip[] = [];

  for (const def of SHIP_DEFS) {
    let placed = false;
    let attempts = 0;
    while (!placed && attempts < 300) {
      attempts++;
      const vertical = Math.random() > 0.5;
      const maxR = vertical ? 10 - def.size : 9;
      const maxC = vertical ? 9 : 10 - def.size;
      const r = Math.floor(Math.random() * (maxR + 1));
      const c = Math.floor(Math.random() * (maxC + 1));
      const cells: string[] = [];
      let collision = false;

      for (let i = 0; i < def.size; i++) {
        const cr = vertical ? r + i : r;
        const cc = vertical ? c : c + i;
        const key = `${cr},${cc}`;
        if (occupied.has(key)) {
          collision = true;
          break;
        }
        cells.push(key);
      }

      if (!collision) {
        cells.forEach((k) => occupied.add(k));
        ships.push({
          type: def.type,
          name: def.name,
          size: def.size,
          row: r,
          col: c,
          vertical,
          cells,
          hits: 0,
        });
        placed = true;
      }
    }
  }

  const mines: string[] = [];
  while (mines.length < 3) {
    const r = Math.floor(Math.random() * 10);
    const c = Math.floor(Math.random() * 10);
    const key = `${r},${c}`;
    if (!occupied.has(key) && !mines.includes(key)) {
      mines.push(key);
    }
  }

  return { ships, mines };
}

export function ArenaClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchIdParam = searchParams.get("match");
  const { address } = useAuthCtx();

  // Phase: placement -> battle -> ended
  const [phase, setPhase] = useState<"placement" | "battle" | "ended">("placement");

  // Player Placement State
  const [playerShips, setPlayerShips] = useState<PlacedShip[]>([]);
  const [playerMines, setPlayerMines] = useState<string[]>([]);
  const [selectedShipType, setSelectedShipType] = useState<ShipType>("carrier");
  const [isVertical, setIsVertical] = useState(false);
  const [placementReady, setPlacementReady] = useState(false);
  const [placementMode, setPlacementMode] = useState<"ships" | "mines">("ships");

  // Hidden Enemy Fleet (AI or Opponent)
  const [enemyShips, setEnemyShips] = useState<PlacedShip[]>(() => generateRandomFleet().ships);
  const [enemyMines, setEnemyMines] = useState<string[]>(() => generateRandomFleet().mines);

  // Board Cells State
  const [myBoardCells, setMyBoardCells] = useState<BoardCells>({});
  const [foeCells, setFoeCells] = useState<BoardCells>({});
  const [aimCell, setAimCell] = useState<string | null>(null);
  const [aimLabel, setAimLabel] = useState("Pick a cell");

  // Build mine indicators for player board during placement
  const myBoardCellsWithMines = useMemo(() => {
    if (phase !== "placement") return myBoardCells;
    const cells = { ...myBoardCells };
    playerMines.forEach((mineKey) => {
      cells[mineKey] = "mine";
    });
    return cells;
  }, [myBoardCells, playerMines, phase]);

  // Scores and Streaks
  const [playerScore, setPlayerScore] = useState(0);
  const [playerStreak, setPlayerStreak] = useState(0);
  const [enemyScore, setEnemyScore] = useState(0);
  const [enemyStreak, setEnemyStreak] = useState(0);

  // AI hunter memory for retaliation
  const [aiFiredKeys, setAiFiredKeys] = useState<Set<string>>(new Set());
  const [aiRecentHits, setAiRecentHits] = useState<string[]>([]);

  // Logs & Notifications
  const [shotLog, setShotLog] = useState<ShotLogEntry[]>([]);
  const [statusMsg, setStatusMsg] = useState("Place your fleet: Click a cell to position, or hit Randomize.");
  const [bannerAlert, setBannerAlert] = useState<{ type: "hit" | "sunk" | "win" | "lose"; text: string } | null>(null);

  // Match State
  const [isMyTurn, setIsMyTurn] = useState(true);
  const [timerSecs, setTimerSecs] = useState(30);
  const [inQueue, setInQueue] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([
    { sender: "Command", text: "Fleet positioned. Ready weapons systems." },
    { sender: "AI Opponent", text: "Tactical grid active. Good luck, Commander." },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);

  // Turn Countdown
  useEffect(() => {
    if (phase !== "battle") return;
    const t = setInterval(() => setTimerSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, isMyTurn]);

  const [opponentName, setOpponentName] = useState("AI Tactical Bot");
  const [opponentAddr, setOpponentAddr] = useState("0x90F8…c9C1");
  const revealStateRef = useRef<{ salt: `0x${string}`; ships: any[]; mines: any[] } | null>(null);

  // Live Socket Hooks (for Multiplayer Match)
  const { joinQueue, leaveQueue, fireShot, submitPlacement, submitReveal, sendChat, forfeitMatch } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      setInQueue(false);
      setOpponentName(`Commander ${opponent.slice(0, 6)}`);
      setOpponentAddr(opponent);
      setStatusMsg(`Matched vs ${opponent.slice(0, 8)}… Deploy your fleet!`);
    },
    onMatchStart: (_matchId, state: any) => {
      setPhase("battle");
      const currentTurn = state?.currentTurn;
      const isMe = currentTurn && address ? currentTurn.toLowerCase() === address.toLowerCase() : true;
      setIsMyTurn(isMe);
      setTimerSecs(30);
      setStatusMsg(isMe ? "⚔️ Battle started! Commander, your turn to fire." : "⚔️ Battle started! Opponent fires first.");
    },
    onShotResult: (result) => {
      const key = `${result.row},${result.col}`;
      const isMe = result.shooter && address ? result.shooter.toLowerCase() === address.toLowerCase() : false;
      const colLetter = LETTERS[result.col] ?? "A";
      const targetLabel = `${colLetter}${result.row + 1}`;

      if (isMe) {
        setFoeCells((prev) => ({ ...prev, [key]: result.outcome as any }));
        setPlayerScore((s) => s + result.points);
        if (result.outcome === "hit" || result.outcome === "sunk") {
          setPlayerStreak((st) => st + 1);
          setBannerAlert({
            type: result.outcome === "sunk" ? "sunk" : "hit",
            text: result.outcome === "sunk" ? `💥 ENEMY VESSEL SUNK!` : `🎯 DIRECT HIT AT ${targetLabel}!`,
          });
        } else {
          setPlayerStreak(0);
        }
        setShotLog((prev) => [
          {
            cell: targetLabel,
            actor: "you",
            result: result.outcome,
            detail: result.sunkShipType ? `${result.sunkShipType} sunk` : result.outcome === "mine" ? "Mine tripped (-30)" : undefined,
          },
          ...prev,
        ]);
      } else {
        // Opponent fired at player
        setMyBoardCells((prev) => ({ ...prev, [key]: result.outcome as any }));
        setEnemyScore((s) => s + result.points);
        if (result.outcome === "hit" || result.outcome === "sunk") {
          setEnemyStreak((st) => st + 1);
          setPlayerShips((prev) =>
            prev.map((s) => (s.cells.includes(key) ? { ...s, hits: s.hits + 1 } : s))
          );
          setBannerAlert({
            type: "hit",
            text: `⚠️ Commander, enemy scored a hit at ${targetLabel}!`,
          });
        } else {
          setEnemyStreak(0);
        }
        setShotLog((prev) => [
          {
            cell: targetLabel,
            actor: "opponent",
            result: result.outcome,
            detail: result.sunkShipType ? `${result.sunkShipType} sunk` : undefined,
          },
          ...prev,
        ]);
      }

      if (result.nextTurn) {
        const isNowMyTurn = address ? result.nextTurn.toLowerCase() === address.toLowerCase() : false;
        setIsMyTurn(isNowMyTurn);
        setTimerSecs(30);
        setStatusMsg(isNowMyTurn ? `Your turn! Select target coordinates.` : `Opponent's turn to fire...`);
      }
    },
    onMatchEnd: (payload) => {
      setPhase("ended");
      clearActiveMatch(); // Clear active match from storage
      const won = payload.winner && address ? payload.winner.toLowerCase() === address.toLowerCase() : false;

      // Check if match ended by forfeit
      const wasForfeit = payload.forfeit || payload.forfeitedBy;
      const iForfeited = payload.forfeitedBy && address
        ? payload.forfeitedBy.toLowerCase() === address.toLowerCase()
        : false;

      let bannerText = "";
      if (wasForfeit) {
        if (iForfeited) {
          bannerText = "🏳️ MATCH CONCEDED · SURRENDER RECORDED";
        } else {
          bannerText = "🏆 VICTORY BY FORFEIT! OPPONENT SURRENDERED!";
        }
      } else {
        bannerText = won
          ? "🏆 VICTORY! ENEMY FLEET ANNIHILATED!"
          : "💥 DEFEAT! ALL FRIENDLY VESSELS SUNK!";
      }

      setBannerAlert({
        type: won ? "win" : "lose",
        text: bannerText,
      });

      const statusText = wasForfeit
        ? (iForfeited
          ? "Commander conceded the sector. Opponent awarded victory."
          : "Opponent forfeited. Victory awarded to you!")
        : (won ? "Match ended: Victory awarded!" : "Match ended: Defeat.");

      setStatusMsg(statusText);

      if (matchIdParam && revealStateRef.current) {
        submitReveal({
          matchId: matchIdParam,
          salt: revealStateRef.current.salt,
          ships: revealStateRef.current.ships,
          mines: revealStateRef.current.mines,
        });
      }
    },
    onChatMessage: (sender, text) => {
      setChatMessages((prev) => [...prev, { sender: sender.slice(0, 8) + "…", text }]);
    },
    onError: (msg) => setStatusMsg(`Error: ${msg}`),
  });

  // Calculate live player fleet for PlayerPanel
  const playerFleet: FleetShip[] = useMemo(() => {
    return SHIP_DEFS.map((def) => {
      const placed = playerShips.find((s) => s.type === def.type);
      const hits = placed?.hits ?? 0;
      return {
        name: def.name,
        type: def.type,
        size: def.size,
        hits,
        sunk: placed ? hits >= def.size : false,
      };
    });
  }, [playerShips]);

  // Calculate opponent fleet counts
  const opponentShipsLeft = useMemo(() => {
    return enemyShips.filter((s) => s.hits < s.size).length;
  }, [enemyShips]);

  const playerShipsLeft = useMemo(() => {
    return playerShips.filter((s) => s.hits < s.size).length;
  }, [playerShips]);

  // Player object for PlayerPanel
  const playerObj: Player = useMemo(() => {
    const pips = [false, false, false, false, false].map((_, i) => i < playerStreak);
    const mult = playerStreak >= 4 ? "×2.5" : playerStreak >= 2 ? "×1.75" : "×1.0";
    return {
      name: "Commander",
      address: address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "0xDev…Test",
      score: playerScore,
      wins: 14,
      streak: playerStreak,
      streakMultiplier: mult,
      streakPips: pips,
    };
  }, [address, playerScore, playerStreak]);

  // Opponent object for OpponentPanel
  const opponentObj: Player = useMemo(() => {
    const pips = [false, false, false, false, false].map((_, i) => i < enemyStreak);
    const mult = enemyStreak >= 2 ? "×1.5" : "×1.0";
    return {
      name: opponentName,
      address: opponentAddr ? `${opponentAddr.slice(0, 6)}…${opponentAddr.slice(-4)}` : "0x90F8…c9C1",
      score: enemyScore,
      wins: 11,
      streak: enemyStreak,
      streakMultiplier: mult,
      streakPips: pips,
    };
  }, [opponentName, opponentAddr, enemyScore, enemyStreak]);

  // Ships formatted for GameBoard component
  const playerBoardShips: Ship[] = useMemo(() => {
    return playerShips.map((s) => ({
      type: s.type,
      size: s.size,
      row: s.row,
      col: s.col,
      vertical: s.vertical,
      wreck: s.wreck,
    }));
  }, [playerShips]);

  // Only revealed/sunk enemy ships appear on enemy board
  const enemyBoardShips: Ship[] = useMemo(() => {
    return enemyShips
      .filter((s) => s.hits >= s.size)
      .map((s) => ({
        type: s.type,
        size: s.size,
        row: s.row,
        col: s.col,
        vertical: s.vertical,
        wreck: true,
      }));
  }, [enemyShips]);

  // ── Placement Actions ────────────────────────────────────────────────────────

  // Handle ship dropped onto a grid cell (from palette or repositioning)
  const handleShipDrop = (shipType: string, key: string) => {
    if (phase !== "placement" || placementMode !== "ships") return;
    const [r, c] = key.split(",").map(Number);
    const def = SHIP_DEFS.find((d) => d.type === shipType)!;
    const existingShip = playerShips.find((s) => s.type === shipType);
    // Use existing ship's orientation, or current isVertical for new ships
    const vertical = existingShip ? existingShip.vertical : isVertical;

    // Check bounds
    if (vertical && r + def.size > 10) {
      setStatusMsg(`Cannot place ${def.name} vertically at ${key} (exceeds grid boundary).`);
      return;
    }
    if (!vertical && c + def.size > 10) {
      setStatusMsg(`Cannot place ${def.name} horizontally at ${key} (exceeds grid boundary).`);
      return;
    }

    // Check collision with other ships
    const occupied = new Set<string>();
    playerShips
      .filter((s) => s.type !== shipType)
      .forEach((s) => s.cells.forEach((cell => occupied.add(cell))));

    const cells: string[] = [];
    for (let i = 0; i < def.size; i++) {
      const cr = vertical ? r + i : r;
      const cc = vertical ? c : c + i;
      const ck = `${cr},${cc}`;
      if (occupied.has(ck)) {
        setStatusMsg(`Cannot place ${def.name} there (overlaps another ship).`);
        return;
      }
      cells.push(ck);
    }

    // Remove mines that overlap
    const minesToRemove = cells.filter((cell) => playerMines.includes(cell));
    if (minesToRemove.length > 0) {
      setPlayerMines((prev) => prev.filter((m) => !minesToRemove.includes(m)));
    }

    // Place or relocate ship
    const updated = playerShips.filter((s) => s.type !== shipType);
    updated.push({
      type: def.type,
      name: def.name,
      size: def.size,
      row: r,
      col: c,
      vertical,
      cells,
      hits: 0,
    });
    setPlayerShips(updated);
    setSelectedShipType(def.type);
    setStatusMsg(`Placed ${def.name}. Drag to reposition, right-click to rotate.`);

    // Check readiness
    const allPlaced = updated.length === 5;
    setPlacementReady(allPlaced && playerMines.length - minesToRemove.length === 3);
  };

  // Rotate a placed ship (right-click or double-click)
  const handleShipRotate = (shipType: string) => {
    if (phase !== "placement" || placementMode !== "ships") return;
    const ship = playerShips.find((s) => s.type === shipType);
    if (!ship) return;

    const newVertical = !ship.vertical;
    // Check bounds with new orientation
    if (newVertical && ship.row + ship.size > 10) {
      setStatusMsg(`Cannot rotate ${ship.name} to vertical here (exceeds grid). Move it first.`);
      return;
    }
    if (!newVertical && ship.col + ship.size > 10) {
      setStatusMsg(`Cannot rotate ${ship.name} to horizontal here (exceeds grid). Move it first.`);
      return;
    }

    // Recalculate cells
    const cells: string[] = [];
    for (let i = 0; i < ship.size; i++) {
      const cr = newVertical ? ship.row + i : ship.row;
      const cc = newVertical ? ship.col : ship.col + i;
      cells.push(`${cr},${cc}`);
    }

    // Check collision with other ships
    const occupied = new Set<string>();
    playerShips
      .filter((s) => s.type !== shipType)
      .forEach((s) => s.cells.forEach((cell) => occupied.add(cell)));

    for (const ck of cells) {
      if (occupied.has(ck)) {
        setStatusMsg(`Cannot rotate ${ship.name} here (overlaps another ship).`);
        return;
      }
    }

    // Remove mines that overlap
    const minesToRemove = cells.filter((cell) => playerMines.includes(cell));
    if (minesToRemove.length > 0) {
      setPlayerMines((prev) => prev.filter((m) => !minesToRemove.includes(m)));
    }

    const updated = playerShips.map((s) =>
      s.type === shipType ? { ...s, vertical: newVertical, cells } : s
    );
    setPlayerShips(updated);
    setStatusMsg(`${ship.name} rotated to ${newVertical ? "vertical" : "horizontal"}.`);
    setPlacementReady(updated.length === 5 && playerMines.length - minesToRemove.length === 3);
  };

  const handleShipDragStart = (shipType: string) => {
    setSelectedShipType(shipType as ShipType);
  };

  const handleRandomizePlacement = () => {
    const fresh = generateRandomFleet();
    setPlayerShips(fresh.ships);
    setPlayerMines(fresh.mines);
    setPlacementReady(true);
    setStatusMsg("Fleet tactically randomized across the grid. Ready to deploy!");
  };

  const handleClearBoard = () => {
    setPlayerShips([]);
    setPlayerMines([]);
    setPlacementReady(false);
    setStatusMsg("Board cleared. Select a ship from the palette and click on the grid.");
  };

  const handlePlayerBoardClick = (label: string, key: string) => {
    if (phase !== "placement") return;
    const [r, c] = key.split(",").map(Number);

    // Handle mine placement
    if (placementMode === "mines") {
      // Check if cell is occupied by a ship
      const occupied = new Set<string>();
      playerShips.forEach((s) => s.cells.forEach((cell) => occupied.add(cell)));

      if (occupied.has(key)) {
        setStatusMsg(`Cannot place mine at ${label} (overlaps with ship).`);
        return;
      }

      // Toggle mine placement
      if (playerMines.includes(key)) {
        // Remove mine
        setPlayerMines((prev) => prev.filter((m) => m !== key));
        setStatusMsg(`Removed mine from ${label}.`);
      } else {
        // Add mine (max 3)
        if (playerMines.length >= 3) {
          setStatusMsg(`Maximum 3 mines allowed. Click an existing mine to remove it first.`);
          return;
        }
        setPlayerMines((prev) => [...prev, key]);
        setStatusMsg(`Placed mine at ${label}. ${3 - playerMines.length - 1} remaining.`);
      }

      setPlacementReady(playerShips.length === 5 && playerMines.length + (playerMines.includes(key) ? 0 : 1) === 3);
      return;
    }

    // Handle ship placement
    const def = SHIP_DEFS.find((d) => d.type === selectedShipType)!;

    // Check bounds
    if (isVertical && r + def.size > 10) {
      setStatusMsg(`Cannot place ${def.name} vertically at ${label} (exceeds grid boundary).`);
      return;
    }
    if (!isVertical && c + def.size > 10) {
      setStatusMsg(`Cannot place ${def.name} horizontally at ${label} (exceeds grid boundary).`);
      return;
    }

    // Check collision with other ships
    const occupied = new Set<string>();
    playerShips
      .filter((s) => s.type !== selectedShipType)
      .forEach((s) => s.cells.forEach((cell) => occupied.add(cell)));

    const cells: string[] = [];
    for (let i = 0; i < def.size; i++) {
      const cr = isVertical ? r + i : r;
      const cc = isVertical ? c : c + i;
      const ck = `${cr},${cc}`;
      if (occupied.has(ck)) {
        setStatusMsg(`Cannot place ${def.name} at ${label} (overlaps another ship).`);
        return;
      }
      cells.push(ck);
    }

    // Check collision with mines
    const minesToRemove = cells.filter((cell) => playerMines.includes(cell));
    if (minesToRemove.length > 0) {
      setPlayerMines((prev) => prev.filter((m) => !minesToRemove.includes(m)));
      setStatusMsg(`Placed ${def.name} at ${label}. Removed ${minesToRemove.length} mine(s) from occupied cells.`);
    }

    // Place or relocate ship
    const updated = playerShips.filter((s) => s.type !== selectedShipType);
    updated.push({
      type: def.type,
      name: def.name,
      size: def.size,
      row: r,
      col: c,
      vertical: isVertical,
      cells,
      hits: 0,
    });
    setPlayerShips(updated);
    if (minesToRemove.length === 0) {
      setStatusMsg(`Placed ${def.name} at ${label}.`);
    }

    // Check if all ships are placed
    const allPlaced = updated.length === 5;
    setPlacementReady(allPlaced && playerMines.length - minesToRemove.length === 3);

    // Auto-advance to next unplaced ship
    const placedTypes = new Set(updated.map((s) => s.type));
    const nextUnplaced = SHIP_DEFS.find((d) => !placedTypes.has(d.type));
    if (nextUnplaced) {
      setSelectedShipType(nextUnplaced.type);
    } else if (playerMines.length - minesToRemove.length < 3) {
      // All ships placed, switch to mine mode
      setPlacementMode("mines");
      setStatusMsg(`All ships placed! Now place your 3 tactical mines.`);
    }
  };

  const handleDeployFleet = () => {
    if (playerShips.length < 5) {
      setStatusMsg(`Please place all 5 ships first (${playerShips.length} of 5 placed).`);
      return;
    }

    if (playerMines.length < 3) {
      setStatusMsg(`Please place all 3 mines (${playerMines.length} of 3 placed).`);
      return;
    }

    if (matchIdParam) {
      const engineShips = playerShips.map((s) => ({
        x: s.row,
        y: s.col,
        length: s.size,
        orientation: s.vertical ? ("V" as const) : ("H" as const),
      }));
      const engineMines = playerMines.map((m) => {
        const [r, c] = m.split(",").map(Number);
        return { x: r, y: c };
      });
      const salt = generateSalt();
      const commitment = commitPlacement({ ships: engineShips, mines: engineMines }, salt);
      revealStateRef.current = { salt, ships: engineShips, mines: engineMines };

      submitPlacement({
        matchId: matchIdParam,
        commitment,
        ships: engineShips,
        mines: engineMines,
      });

      setStatusMsg("Fleet deployed to battle net! Waiting for opponent confirmation...");
      setPlacementReady(false);
      return;
    }

    // Setup fresh AI opponent
    const freshEnemy = generateRandomFleet();
    setEnemyShips(freshEnemy.ships);
    setEnemyMines(freshEnemy.mines);

    // Reset combat boards
    setMyBoardCells({});
    setFoeCells({});
    setShotLog([]);
    setPlayerScore(0);
    setEnemyScore(0);
    setPlayerStreak(0);
    setEnemyStreak(0);
    setAiFiredKeys(new Set());
    setAiRecentHits([]);
    setBannerAlert(null);

    setPhase("battle");
    setIsMyTurn(true);
    setTimerSecs(30);
    setStatusMsg("⚔️ Battle commenced! Select target coordinates on Enemy Waters and Fire!");
  };

  // ── Battle Actions ──────────────────────────────────────────────────────────

  const handleEnemyCellClick = (label: string, key: string) => {
    if (phase !== "battle" || !isMyTurn) return;
    setAimCell(key);
    setAimLabel(label);
  };

  const handleFire = () => {
    if (!aimCell || phase !== "battle" || !isMyTurn) return;
    const targetKey = aimCell;
    const targetLabel = aimLabel;
    const [row, col] = targetKey.split(",").map(Number);

    // Check if cell already fired
    if (foeCells[targetKey]) {
      setStatusMsg(`Already targeted ${targetLabel}! Choose an unfired coordinate.`);
      return;
    }

    if (matchIdParam) {
      setIsMyTurn(false);
      fireShot(matchIdParam, row, col);
      setAimCell(null);
      setStatusMsg(`Firing on ${targetLabel}...`);
      return;
    }

    // 1. Evaluate hit on enemy ships
    let hitShip: PlacedShip | null = null;
    for (const ship of enemyShips) {
      if (ship.cells.includes(targetKey)) {
        hitShip = ship;
        break;
      }
    }

    // 2. Evaluate hit on enemy mines
    const isMine = enemyMines.includes(targetKey);

    if (hitShip) {
      // Register Hit
      const updatedEnemyShips = enemyShips.map((s) => {
        if (s.type === hitShip!.type) {
          return { ...s, hits: s.hits + 1 };
        }
        return s;
      });
      setEnemyShips(updatedEnemyShips);

      const shipNow = updatedEnemyShips.find((s) => s.type === hitShip!.type)!;
      const isSunk = shipNow.hits >= shipNow.size;

      const pts = 100 * (playerStreak >= 4 ? 2.5 : playerStreak >= 2 ? 1.75 : 1);
      setPlayerScore((s) => s + pts);
      setPlayerStreak((s) => s + 1);

      if (isSunk) {
        // Mark all segments as sunk
        setFoeCells((prev) => {
          const next = { ...prev };
          shipNow.cells.forEach((k) => (next[k] = "sunk"));
          return next;
        });

        setBannerAlert({
          type: "sunk",
          text: `💥 ENEMY ${shipNow.name.toUpperCase()} SUNK!`,
        });

        setShotLog((prev) => [
          { cell: targetLabel, actor: "you", result: "sunk", detail: `${shipNow.name} sunk` },
          ...prev,
        ]);

        setStatusMsg(`Direct Hit! You sunk the enemy ${shipNow.name}!`);

        // Check Victory
        const remaining = updatedEnemyShips.filter((s) => s.hits < s.size).length;
        if (remaining === 0) {
          setPhase("ended");
          setBannerAlert({ type: "win", text: "🏆 VICTORY! ALL ENEMY SHIPS DESTROYED!" });
          setStatusMsg("🏆 VICTORY! Commander, you annihilated the enemy fleet!");
          setAimCell(null);
          return;
        }
      } else {
        setFoeCells((prev) => ({ ...prev, [targetKey]: "hit" }));
        setBannerAlert({ type: "hit", text: `🎯 DIRECT HIT AT ${targetLabel}!` });
        setShotLog((prev) => [
          { cell: targetLabel, actor: "you", result: "hit", multiplier: playerStreak >= 2 ? "×1.75" : "×1.0" },
          ...prev,
        ]);
        setStatusMsg(`Direct hit at ${targetLabel}! Opponent vessel taking damage.`);
      }
    } else if (isMine) {
      setFoeCells((prev) => ({ ...prev, [targetKey]: "boom" }));
      setPlayerScore((s) => Math.max(0, s - 30));
      setPlayerStreak(0);
      setBannerAlert({ type: "hit", text: `⚠️ MINE DETONATED AT ${targetLabel}! (-30 pts)` });
      setShotLog((prev) => [
        { cell: targetLabel, actor: "you", result: "mine", detail: "Mine −30" },
        ...prev,
      ]);
      setStatusMsg(`Tactical mine detonated at ${targetLabel}!`);
    } else {
      // Miss
      setFoeCells((prev) => ({ ...prev, [targetKey]: "miss" }));
      setPlayerStreak(0);
      setBannerAlert(null);
      setShotLog((prev) => [
        { cell: targetLabel, actor: "you", result: "miss" },
        ...prev,
      ]);
      setStatusMsg(`Water splash at ${targetLabel}. Missed.`);
    }

    setAimCell(null);
    setAimLabel("Pick a cell");
    setIsMyTurn(false);

    // AI Retaliation after 800ms
    setTimeout(() => {
      handleAiTurn();
    }, 800);
  };

  const handleAiTurn = () => {
    if (phase !== "battle") return;

    // Pick AI target
    let targetRow = 0;
    let targetCol = 0;
    let targetKey = "";

    // Hunt mode: check neighbors of recent hits
    if (aiRecentHits.length > 0) {
      const lastHit = aiRecentHits[aiRecentHits.length - 1];
      const [hr, hc] = lastHit.split(",").map(Number);
      const candidates = [
        [hr - 1, hc],
        [hr + 1, hc],
        [hr, hc - 1],
        [hr, hc + 1],
      ].filter(([r, c]) => r >= 0 && r < 10 && c >= 0 && c < 10);

      const unfired = candidates.filter(([r, c]) => !aiFiredKeys.has(`${r},${c}`));
      if (unfired.length > 0) {
        const pick = unfired[Math.floor(Math.random() * unfired.length)];
        targetRow = pick[0];
        targetCol = pick[1];
        targetKey = `${targetRow},${targetCol}`;
      }
    }

    // Fallback to random unfired
    if (!targetKey) {
      const available: [number, number][] = [];
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const k = `${r},${c}`;
          if (!aiFiredKeys.has(k)) available.push([r, c]);
        }
      }
      if (available.length > 0) {
        const pick = available[Math.floor(Math.random() * available.length)];
        targetRow = pick[0];
        targetCol = pick[1];
        targetKey = `${targetRow},${targetCol}`;
      } else {
        setIsMyTurn(true);
        return;
      }
    }

    aiFiredKeys.add(targetKey);
    setAiFiredKeys(new Set(aiFiredKeys));

    const aiLabel = `${LETTERS[targetRow]}${targetCol + 1}`;

    // Check if AI hit player ship
    let playerHitShip: PlacedShip | null = null;
    for (const ship of playerShips) {
      if (ship.cells.includes(targetKey)) {
        playerHitShip = ship;
        break;
      }
    }

    const isPlayerMine = playerMines.includes(targetKey);

    if (playerHitShip) {
      const updatedPlayerShips = playerShips.map((s) => {
        if (s.type === playerHitShip!.type) {
          const nextHits = s.hits + 1;
          return {
            ...s,
            hits: nextHits,
            wreck: nextHits >= s.size ? true : s.wreck,
          };
        }
        return s;
      });
      setPlayerShips(updatedPlayerShips);
      setMyBoardCells((prev) => ({ ...prev, [targetKey]: "hit" }));
      setEnemyScore((s) => s + 100);
      setEnemyStreak((s) => s + 1);
      aiRecentHits.push(targetKey);
      setAiRecentHits([...aiRecentHits]);

      const hitShipNow = updatedPlayerShips.find((s) => s.type === playerHitShip!.type)!;
      if (hitShipNow.hits >= hitShipNow.size) {
        // Player Ship Sunk!
        setShotLog((prev) => [
          { cell: aiLabel, actor: "opponent", result: "sunk", detail: `Our ${hitShipNow.name} destroyed` },
          ...prev,
        ]);
        setBannerAlert({
          type: "sunk",
          text: `⚠️ ALERT: Commander, our ${hitShipNow.name} has been destroyed!`,
        });
        setStatusMsg(`Warning: AI struck and destroyed our ${hitShipNow.name}!`);

        // Check Defeat
        const remaining = updatedPlayerShips.filter((s) => s.hits < s.size).length;
        if (remaining === 0) {
          setPhase("ended");
          setBannerAlert({ type: "lose", text: "💀 DEFEAT! Fleet annihilated by AI." });
          setStatusMsg("💀 DEFEAT! All your vessels have been destroyed.");
          return;
        }
      } else {
        setShotLog((prev) => [
          { cell: aiLabel, actor: "opponent", result: "hit" },
          ...prev,
        ]);
        setStatusMsg(`Incoming fire! Enemy struck our vessel at ${aiLabel}.`);
      }
    } else if (isPlayerMine) {
      setMyBoardCells((prev) => ({ ...prev, [targetKey]: "boom" }));
      setEnemyScore((s) => Math.max(0, s - 30));
      setEnemyStreak(0);
      setShotLog((prev) => [
        { cell: aiLabel, actor: "opponent", result: "mine", detail: "Mine detonated" },
        ...prev,
      ]);
      setStatusMsg(`Enemy triggered your tactical mine at ${aiLabel}!`);
    } else {
      setMyBoardCells((prev) => ({ ...prev, [targetKey]: "miss" }));
      setEnemyStreak(0);
      setShotLog((prev) => [
        { cell: aiLabel, actor: "opponent", result: "miss" },
        ...prev,
      ]);
      setStatusMsg(`Enemy shot splashed into the ocean at ${aiLabel}. Your turn!`);
    }

    setIsMyTurn(true);
    setTimerSecs(30);
  };

  const handleAutoFire = () => {
    if (phase !== "battle" || !isMyTurn) return;
    const available: string[] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        const k = `${r},${c}`;
        if (!foeCells[k]) available.push(k);
      }
    }
    if (!available.length) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    const [r, c] = pick.split(",").map(Number);
    setAimCell(pick);
    setAimLabel(`${LETTERS[r]}${c + 1}`);
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages((prev) => [...prev, { sender: "You", text: chatInput.trim() }]);
    setChatInput("");
  };

  const handleForfeit = async () => {
    setShowForfeitConfirm(false);
    if (matchIdParam && forfeitMatch) {
      await forfeitMatch(matchIdParam);
      setPhase("ended");
      clearActiveMatch(); // Clear active match from storage
      setBannerAlert({ type: "lose", text: "🏳️ MATCH CONCEDED · SURRENDER RECORDED" });
      setStatusMsg("Commander conceded the sector. Opponent awarded victory.");
    } else {
      // AI match - just end it
      router.push("/play");
    }
  };

  // Navigation guard: prevent leaving during active multiplayer match
  const shouldBlockNavigation = useMemo(() => {
    // Block navigation if:
    // 1. Player is in a multiplayer match (has matchIdParam)
    // 2. Match is not ended yet
    const shouldBlock = Boolean(matchIdParam && phase !== "ended");
    console.log("[Arena] Navigation guard state:", {
      matchIdParam,
      phase,
      shouldBlock
    });
    return shouldBlock;
  }, [matchIdParam, phase]);

  useNavigationGuard({
    shouldBlock: shouldBlockNavigation,
    matchId: matchIdParam,
    message: "You are currently in an active match. Leaving will forfeit the game and award victory to your opponent. Are you sure you want to leave?",
    onNavigateAway: async () => {
      // Forfeit the match when navigating away
      if (matchIdParam && phase !== "ended") {
        try {
          console.log("[Arena] Forfeiting match:", matchIdParam);
          await forfeitMatch(matchIdParam);
          console.log("[Arena] Match forfeited successfully");
        } catch (error) {
          console.error("[Arena] Failed to forfeit match:", error);
        }
      }
    },
  });

  const pct = `${Math.round((timerSecs / 30) * 100)}%`;

  return (
    <main className="max-w-[1440px] mx-auto px-8 py-7 pb-14">
      {/* 3-Column Arena Layout */}
      <div
        className="arena-grid grid gap-5 items-start"
        style={{ gridTemplateColumns: "272px minmax(0,1fr) 316px" }}
      >
        {/* Left Column: Player Panel with live reactive score & fleet status */}
        <PlayerPanel player={playerObj} fleet={playerFleet} />

        {/* Center Column: Game Arena */}
        <section className="arena-center">
          {/* Banner Alert */}
          {bannerAlert && (
            <div
              className="mb-4 px-5 py-3.5 rounded-[14px] border flex items-center justify-between text-[15px] font-bold shadow-lg animate-pulse"
              style={{
                background:
                  bannerAlert.type === "win"
                    ? "rgba(53,214,192,0.15)"
                    : bannerAlert.type === "lose"
                      ? "rgba(255,106,77,0.15)"
                      : "rgba(235,181,74,0.15)",
                borderColor:
                  bannerAlert.type === "win"
                    ? "var(--signal)"
                    : bannerAlert.type === "lose"
                      ? "var(--flare)"
                      : "var(--brass)",
                color:
                  bannerAlert.type === "win"
                    ? "var(--signal)"
                    : bannerAlert.type === "lose"
                      ? "var(--flare)"
                      : "var(--brass)",
              }}
            >
              <span>{bannerAlert.text}</span>
              {phase === "ended" && (
                <button
                  type="button"
                  onClick={() => {
                    handleRandomizePlacement();
                    setPhase("placement");
                  }}
                  className="px-4 py-1.5 rounded-[10px] text-[13px] font-bold uppercase transition-transform hover:scale-105"
                  style={{ background: "var(--signal)", color: "var(--abyss)" }}
                >
                  Play Again
                </button>
              )}
            </div>
          )}

          {/* Status Bar */}
          <div
            className="mb-5 px-5 py-3 rounded-[14px] border flex items-center gap-3 text-[14px]"
            style={{
              background: "rgba(19,48,59,.55)",
              borderColor: "var(--line)",
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full flex-none animate-pulse"
              style={{ background: isMyTurn ? "var(--signal)" : "var(--brass)" }}
            />
            <span className="font-medium text-[var(--foam)]">{statusMsg}</span>
          </div>

          {/* Header Bar */}
          <div className="flex items-center gap-4 mb-5 flex-wrap">
            <div>
              <h1 className="font-display font-extrabold text-[28px] tracking-tight">
                {phase === "placement" ? "Fleet Deployment" : "Naval Battle Arena"}
              </h1>
              <p className="text-[var(--mist)] text-[14px] mt-0.5">
                {phase === "placement"
                  ? "Position your 5 vessels and tactical mines before engaging the hostile fleet."
                  : `Engaged vs AI Opponent · ${isMyTurn ? "Your turn to strike" : "AI calculating counter-fire"}`}
              </p>
            </div>

            {/* Timer */}
            {phase === "battle" && (
              <>
                <div
                  className="ml-auto flex items-center gap-3 px-4 py-2 rounded-full border"
                  style={{ background: "var(--deck)", borderColor: "var(--line)" }}
                >
                  <div
                    className="relative w-10 h-10 rounded-full grid place-items-center"
                    style={{ background: `conic-gradient(var(--signal) ${pct}, rgba(255,255,255,.08) 0)` }}
                  >
                    <span className="absolute inset-[3px] rounded-full" style={{ background: "var(--deck)" }} />
                    <b className="relative font-display font-bold text-[14px]">{timerSecs}</b>
                  </div>
                  <div>
                    <strong className="block text-[13px] font-bold">
                      {isMyTurn ? "Your Turn" : "Enemy Turn"}
                    </strong>
                    <span className="text-[var(--mist)] text-[11px]">sec remaining</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowForfeitConfirm(true)}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-bold border transition-all hover:-translate-y-px hover:border-[var(--flare)]"
                  style={{
                    background: "rgba(255,106,77,0.08)",
                    borderColor: "rgba(255,106,77,0.3)",
                    color: "var(--flare)",
                  }}
                >
                  End Game
                </button>
              </>
            )}
          </div>

          {/* ── PLACEMENT CONTROLS ── */}
          {phase === "placement" && (
            <div
              className="mb-6 p-5 rounded-[18px] border"
              style={{
                background: "linear-gradient(180deg,rgba(19,48,59,.7),rgba(12,34,43,.85))",
                borderColor: "rgba(53,214,192,0.3)",
              }}
            >
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <span className="font-display font-bold text-[16px] text-[var(--signal)]">
                  {placementMode === "ships"
                    ? `1. Select a Vessel to Place (${playerShips.length}/5 Placed)`
                    : `2. Place Tactical Mines (${playerMines.length}/3 Placed)`
                  }
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPlacementMode(placementMode === "ships" ? "mines" : "ships")}
                    className="px-3.5 py-2 rounded-[10px] text-[13px] font-bold border transition-all hover:-translate-y-px"
                    style={{
                      background: placementMode === "mines" ? "rgba(235,181,74,0.12)" : "var(--hull)",
                      borderColor: placementMode === "mines" ? "rgba(235,181,74,0.3)" : "var(--line)",
                      color: placementMode === "mines" ? "var(--brass)" : "var(--foam)",
                    }}
                  >
                    Mode: {placementMode === "ships" ? "⚓ Ships" : "💣 Mines"}
                  </button>
                  {placementMode === "ships" && (
                    <button
                      type="button"
                      onClick={() => setIsVertical((v) => !v)}
                      className="px-3.5 py-2 rounded-[10px] text-[13px] font-bold border transition-all hover:-translate-y-px"
                      style={{
                        background: "var(--hull)",
                        borderColor: "var(--line)",
                        color: "var(--foam)",
                      }}
                    >
                      Orientation: {isVertical ? "Vertical ⬍" : "Horizontal ⬌"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleRandomizePlacement}
                    className="px-3.5 py-2 rounded-[10px] text-[13px] font-bold border transition-all hover:-translate-y-px"
                    style={{
                      background: "rgba(235,181,74,0.12)",
                      borderColor: "rgba(235,181,74,0.3)",
                      color: "var(--brass)",
                    }}
                  >
                    🎲 Randomize
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBoard}
                    className="px-3 py-2 rounded-[10px] text-[13px] font-semibold text-[var(--mist)] hover:text-[var(--flare)] transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Ship Selector Palette */}
              {placementMode === "ships" && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mb-5">
                  {SHIP_DEFS.map((def) => {
                    const placed = playerShips.find((s) => s.type === def.type);
                    const active = selectedShipType === def.type;
                    return (
                      <button
                        key={def.type}
                        type="button"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", def.type);
                          e.dataTransfer.effectAllowed = "move";
                          setSelectedShipType(def.type);
                        }}
                        onClick={() => setSelectedShipType(def.type)}
                        className="p-3 rounded-[12px] border flex flex-col items-center text-center transition-all hover:-translate-y-0.5 active:cursor-grabbing"
                        style={{
                          background: active
                            ? "rgba(53,214,192,0.15)"
                            : placed
                              ? "rgba(19,48,59,0.5)"
                              : "rgba(6,20,26,0.6)",
                          borderColor: active
                            ? "var(--signal)"
                            : placed
                              ? "rgba(53,214,192,0.4)"
                              : "var(--line)",
                        }}
                      >
                        <span className="text-[20px] mb-1">{def.icon}</span>
                        <strong className="text-[13px] font-bold block">{def.name}</strong>
                        <span className="text-[11px] text-[var(--mist)] mt-0.5">
                          {def.size} cells {placed ? "✓ Placed" : "· Drag to grid"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mine Placement Info */}
              {placementMode === "mines" && (
                <div className="mb-5 p-4 rounded-[12px] border" style={{
                  background: "rgba(235,181,74,0.08)",
                  borderColor: "rgba(235,181,74,0.2)",
                }}>
                  <div className="flex items-center gap-3">
                    <span className="text-[32px]">💣</span>
                    <div>
                      <strong className="block text-[14px] font-bold text-[var(--brass)]">
                        Tactical Mines · Click grid cells to place or remove
                      </strong>
                      <p className="text-[12px] text-[var(--mist)] mt-1">
                        Mines deal damage to opponents but cannot overlap with your ships.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[var(--line)] flex-wrap gap-3">
                <span className="text-[13px] text-[var(--mist)]">
                  {placementMode === "ships"
                    ? "Drag vessels from above onto the grid. Drag placed ships to reposition, right-click to rotate."
                    : "Click on empty grid cells to place mines (max 3). Click placed mines to remove."
                  }
                </span>
                <button
                  type="button"
                  disabled={!placementReady}
                  onClick={handleDeployFleet}
                  className="px-6 py-3 rounded-[12px] font-display font-extrabold text-[15px] uppercase tracking-wide transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{
                    background: placementReady
                      ? "var(--accent-cta)"
                      : "var(--hull)",
                    color: placementReady ? "var(--cta-text)" : "var(--mist)",
                    boxShadow: placementReady
                      ? "0 6px 24px -4px var(--cta-shadow)"
                      : "none",
                  }}
                >
                  Deploy Fleet & Start Battle ⚔️
                </button>
              </div>
            </div>
          )}

          {/* ── BOARDS ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
            {/* Player Board */}
            <div className="min-w-0">
              <h2 className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight">
                Your Fleet
                <span className="font-body font-medium text-[13px] text-[var(--mist)]">
                  {playerShipsLeft} of 5 vessels afloat
                </span>
              </h2>
              <GameBoard
                id="mine"
                cells={myBoardCellsWithMines}
                ships={playerBoardShips}
                isPlacement={phase === "placement"}
                onCellClick={phase === "placement" ? handlePlayerBoardClick : undefined}
                onShipDrop={phase === "placement" ? handleShipDrop : undefined}
                onShipRotate={phase === "placement" ? handleShipRotate : undefined}
                onShipDragStart={phase === "placement" ? handleShipDragStart : undefined}
              />
            </div>

            {/* Enemy Board */}
            <div className="min-w-0">
              <h2 className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight">
                Enemy Waters
                <span className="font-body font-medium text-[13px] text-[var(--signal)]">
                  {opponentShipsLeft} of 5 hostile vessels
                </span>
              </h2>
              <GameBoard
                id="foe"
                cells={foeCells}
                ships={enemyBoardShips}
                isEnemy
                onCellClick={phase === "battle" && isMyTurn ? handleEnemyCellClick : undefined}
                aimCell={aimCell}
              />
            </div>
          </div>

          {/* ── FIRE CONTROLS ── */}
          {phase === "battle" && (
            <div
              className="flex items-center gap-4 mt-5 p-4 pl-5 rounded-[16px] border flex-wrap"
              style={{ background: "var(--deck)", borderColor: "var(--line)" }}
            >
              <div className="mr-auto">
                <span className="text-[var(--mist)] text-[12px] uppercase tracking-wider block font-semibold">
                  Aimed Coordinate
                </span>
                <strong className="font-display font-extrabold text-[24px] text-[var(--signal)]">
                  {aimLabel}
                </strong>
              </div>
              <button
                type="button"
                className="px-4 py-2.5 rounded-[12px] font-bold text-[14px] transition-all hover:-translate-y-px"
                style={{ background: "var(--hull)", color: "var(--foam)" }}
                onClick={handleAutoFire}
              >
                Auto-Aim Target
              </button>
              <button
                type="button"
                disabled={!aimCell || !isMyTurn}
                className="px-7 py-3 rounded-[12px] font-display font-extrabold text-[15px] transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_-6px_rgba(53,214,192,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: "var(--signal)", color: "var(--abyss)" }}
                onClick={handleFire}
              >
                Fire Strike 🚀
              </button>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-[var(--mist)] text-[13px] px-1">
            {[
              { label: "Friendly Ship", style: { background: "#7aa6b2", width: 18, height: 8, borderRadius: 2 } },
              { label: "Direct Hit", style: { background: "var(--flare)" } },
              { label: "Splash Miss", style: { background: "var(--mist)", opacity: 0.6 } },
              { label: "Sunken Vessel", style: { background: "transparent", border: "1.5px solid var(--flare)" } },
              { label: "Tactical Mine", style: { background: "var(--brass)", transform: "rotate(45deg) scale(0.8)" } },
            ].map(({ label, style }) => (
              <span key={label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-[3px] block flex-none" style={style as any} />
                {label}
              </span>
            ))}
          </div>

          {/* Chat */}
          <div
            className="mt-6 rounded-[20px] border p-5"
            style={{
              background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
              borderColor: "var(--line)",
            }}
          >
            <h3 className="font-display font-bold text-[15px] tracking-tight mb-3">Tactical Comms</h3>
            <div className="grid gap-2 mb-3 max-h-[120px] overflow-auto custom-scroll text-[14px]">
              {chatMessages.map((m, i) => (
                <p key={i}>
                  <span
                    className="font-semibold mr-2"
                    style={{ color: m.sender === "You" ? "var(--brass)" : "var(--signal)" }}
                  >
                    [{m.sender}]
                  </span>
                  {m.text}
                </p>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="input-base flex-1 text-[14px] py-2"
                placeholder="Radio message to fleet…"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
              />
              <button
                type="button"
                onClick={handleSendChat}
                className="px-4 py-2 rounded-[10px] font-semibold text-[13px] transition-all hover:-translate-y-px"
                style={{ background: "var(--signal)", color: "var(--abyss)" }}
              >
                Transmit
              </button>
            </div>
          </div>
        </section>

        {/* Right Column: Opponent Panel + Shot Log */}
        <aside className="grid gap-5">
          <OpponentPanel player={opponentObj} shipsLeft={opponentShipsLeft} totalShips={5} />
          <ShotLog entries={shotLog} />
        </aside>
      </div>

      {/* Lower Row: Leaderboard, Badges, Match Record */}
      <div
        className="lower-grid grid gap-5 mt-6"
        style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}
      >
        <LeaderboardPanel entries={LEADERBOARD} />
        <BadgesPanel badges={BADGES} collected={3} total={5} />
        <MatchRecord steps={MATCH_STEPS} hash={matchIdParam ?? "solo-ai-combat"} />
      </div>

      {/* Forfeit Confirmation Modal */}
      {showForfeitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setShowForfeitConfirm(false)}
        >
          <div
            className="max-w-md w-full rounded-[20px] border p-6"
            style={{
              background: "linear-gradient(180deg, rgba(19,48,59,0.95), rgba(12,34,43,0.98))",
              borderColor: "rgba(255,106,77,0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display font-extrabold text-[22px] mb-2 text-[var(--flare)]">
              ⚠️ Forfeit Match?
            </h3>
            <p className="text-[14px] text-[var(--mist)] mb-6">
              Ending the game now will count as a forfeit and award the match to your opponent. Are you sure you want to surrender?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowForfeitConfirm(false)}
                className="flex-1 px-4 py-3 rounded-[12px] font-bold text-[14px] transition-all hover:-translate-y-px"
                style={{
                  background: "var(--hull)",
                  color: "var(--foam)",
                  borderColor: "var(--line)",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleForfeit}
                className="flex-1 px-4 py-3 rounded-[12px] font-bold text-[14px] transition-all hover:-translate-y-px"
                style={{
                  background: "var(--flare)",
                  color: "white",
                }}
              >
                End Game & Forfeit
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
