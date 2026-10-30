"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { commitPlacement, generateSalt, DEFAULT_CONFIG } from "@wba/engine";
import { GameBoard } from "./GameBoard";
import { PlayerPanel } from "./PlayerPanel";
import { OpponentPanel } from "./OpponentPanel";
import { ShotLog } from "./ShotLog";
import { LeaderboardPanel } from "./LeaderboardPanel";
import { BadgesPanel } from "./BadgesPanel";
import { MatchRecord } from "./MatchRecord";
import { ShotAnimation, SHOT_FLIGHT_MS } from "./ShotAnimation";
import { WreckEffects, type Wreck } from "./WreckEffects";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { MatchStartBanner } from "./MatchStartBanner";
import { SpectatorArena } from "./SpectatorArena";
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

/** Pending "player left the arena" forfeits, keyed by matchId (cancelled if the arena remounts). */
const pendingLeaveForfeits = new Map<string, ReturnType<typeof setTimeout>>();

function PlayerArena() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const matchIdParam = searchParams.get("match");
  const { address, nickname } = useAuthCtx();
  const [matchBanner, setMatchBanner] = useState<{ you: string; opponent: string } | null>(null);

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
  const TURN_SECONDS = matchIdParam ? DEFAULT_CONFIG.turnSeconds : 30;
  const [timerSecs, setTimerSecs] = useState(TURN_SECONDS);
  // When the server's turn clock runs out (epoch ms), multiplayer only
  const turnDeadlineRef = useRef<number | null>(null);
  // When the missile of the latest shot lands: state that depends on it waits until then
  const shotImpactAtRef = useRef(0);
  const [inQueue, setInQueue] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>(
    matchIdParam
      ? [{ sender: "Command", text: "Secure channel open. Chat with your opponent here." }]
      : [
          { sender: "Command", text: "Fleet positioned. Ready weapons systems." },
          { sender: "AI Opponent", text: "Tactical grid active. Good luck, Commander." },
        ]
  );
  const [chatInput, setChatInput] = useState("");
  const [showForfeitConfirm, setShowForfeitConfirm] = useState(false);
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victoryModalData, setVictoryModalData] = useState<{ title: string; message: string; type: "win" | "lose" } | null>(null);

  // Turn Countdown
  useEffect(() => {
    if (phase !== "battle") return;
    if (matchIdParam) {
      // Multiplayer: show what the server's clock says, so the countdown never drifts
      const t = setInterval(() => {
        const deadline = turnDeadlineRef.current;
        if (deadline) setTimerSecs(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
      }, 250);
      return () => clearInterval(t);
    }
    const t = setInterval(() => setTimerSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [phase, isMyTurn, matchIdParam]);

  const [opponentName, setOpponentName] = useState(matchIdParam ? "Opponent" : "AI Tactical Bot");
  const [opponentAddr, setOpponentAddr] = useState(matchIdParam ? "" : "0x90F8…c9C1");
  // Real win counts in multiplayer (AI practice keeps its demo numbers)
  const [myWins, setMyWins] = useState<number | null>(null);
  const [opponentWins, setOpponentWins] = useState<number | null>(null);
  const [enemySunkCount, setEnemySunkCount] = useState(0);
  const revealStateRef = useRef<{ salt: `0x${string}`; ships: any[]; mines: any[] } | null>(null);
  // Shot animation state
  const enemyBoardRef = useRef<HTMLDivElement | null>(null);
  const myBoardRef = useRef<HTMLDivElement | null>(null);
  // Incoming (opponent) shot animation on my own board
  const [incomingTarget, setIncomingTarget] = useState<string | null>(null);
  const [incomingOutcome, setIncomingOutcome] = useState<"hit" | "miss" | "sunk" | "mine" | "boom" | null>(null);
  const [myBoardShake, setMyBoardShake] = useState(false);
  const [myWrecks, setMyWrecks] = useState<Wreck[]>([]);
  // Enemy ships revealed by sinking them (multiplayer: the server tells us their cells)
  const [revealedEnemyShips, setRevealedEnemyShips] = useState<PlacedShip[]>([]);
  // When the last missile lands, so the end-of-match screen does not cut the animation short
  const lastShotLandRef = useRef(0);
  const [animTarget, setAnimTarget] = useState<string | null>(null);
  const [animOutcome, setAnimOutcome] = useState<"hit" | "miss" | "sunk" | "mine" | "boom" | null>(null);
  const [enemyBoardShake, setEnemyBoardShake] = useState(false);
  const [enemyWrecks, setEnemyWrecks] = useState<Wreck[]>([]);
  // A sunk ship burns, then keeps smoking as a wreck (drawn by WreckEffects)
  const addWreck = (set: React.Dispatch<React.SetStateAction<Wreck[]>>, cells: string[]) =>
    set((prev) => [...prev, { id: `${cells.join("|")}@${Date.now()}`, cells, t0: Date.now() }]);

  /**
   * Rebuilds the arena from the server's snapshot of the match: the real opponent, scores, both
   * boards and whose turn it is. Used on arrival and after a reconnect / page reload.
   */
  const hydrateFromView = (view: any) => {
    if (!view?.players || view.you === null || view.you === undefined) return;
    const you: 0 | 1 = view.you;
    const me = view.players[you];
    const opp = view.players[you === 0 ? 1 : 0];

    setOpponentAddr(opp.address);
    setOpponentName(`Commander ${opp.address.slice(0, 6)}`);
    api.player(opp.address).then((pl: any) => {
      if (pl?.username) setOpponentName(pl.username);
      setOpponentWins(pl?.stats?.wins ?? 0);
    }).catch(() => {});
    api.player(me.address).then((pl: any) => setMyWins(pl?.stats?.wins ?? 0)).catch(() => {});

    // Still placing: nothing else to restore unless the fleet is already locked in
    if (view.phase === "placement" && !me.placed) return;

    setPlayerScore(me.score);
    setPlayerStreak(me.streak);
    setEnemyScore(opp.score);
    setEnemyStreak(opp.streak);

    const mine: BoardCells = {};
    const foe: BoardCells = {};
    for (const sh of view.shots ?? []) {
      if (sh.outcome === "timeout") continue;
      const key = `${sh.y},${sh.x}`;
      const state = (sh.outcome === "mine" ? "boom" : sh.outcome) as any;
      if (sh.player === you) foe[key] = state;
      else mine[key] = state;
    }

    if (view.ownBoard) {
      const used = new Set<string>();
      const placed: PlacedShip[] = view.ownBoard.ships.map((sh: any) => {
        const cells = Array.from({ length: sh.length }, (_, i) =>
          sh.orientation === "H" ? `${sh.y},${sh.x + i}` : `${sh.y + i},${sh.x}`
        );
        const def =
          SHIP_DEFS.find((d) => d.size === sh.length && !used.has(d.type)) ??
          SHIP_DEFS.find((d) => d.size === sh.length)!;
        used.add(def.type);
        const hits = cells.filter((k) => mine[k] === "hit" || mine[k] === "sunk").length;
        if (hits >= sh.length) cells.forEach((k) => (mine[k] = "sunk"));
        return {
          type: def.type,
          name: def.name,
          size: sh.length,
          row: sh.y,
          col: sh.x,
          vertical: sh.orientation === "V",
          cells,
          hits,
          wreck: hits >= sh.length,
        };
      });
      setPlayerShips(placed);
      setPlayerMines(view.ownBoard.mines.map((m: any) => `${m.y},${m.x}`));
    }
    setShotLog(
      (view.shots ?? [])
        .filter((sh: any) => sh.outcome !== "timeout")
        .map((sh: any) => ({
          cell: `${LETTERS[sh.y] ?? "A"}${sh.x + 1}`,
          actor: sh.player === you ? "you" : "opponent",
          result: sh.outcome,
        }))
        .reverse()
    );
    setMyBoardCells(mine);
    setFoeCells(foe);
    setEnemySunkCount((view.sunkShips?.[you === 0 ? 1 : 0] ?? []).length);

    if (view.phase === "placement") {
      setPlacementReady(false);
      setStatusMsg("Fleet locked in. Waiting for the opponent to deploy…");
    } else if (view.phase === "battle") {
      setPhase("battle");
      const myTurn = view.turn === you;
      setIsMyTurn(myTurn);
      setStatusMsg(myTurn ? "Reconnected. Your turn to fire." : "Reconnected. Opponent is taking aim…");
    } else if (view.phase === "finished") {
      setPhase("ended");
    }
  };

  // First arrival (and reload): ask the server who the opponent is and what the match looks like
  useEffect(() => {
    if (!matchIdParam) return;
    let cancelled = false;
    api
      .matchView(matchIdParam)
      .then((view) => {
        if (!cancelled) hydrateFromView(view);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchIdParam]);

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
      const named = (state?.players ?? []) as { address: string; username: string }[];
      const mine = named.find((p) => address && p.address.toLowerCase() === address.toLowerCase());
      const theirs = named.find((p) => p !== mine);
      if (mine && theirs) {
        setOpponentName(theirs.username);
        setMatchBanner({ you: mine.username, opponent: theirs.username });
      }
      const currentTurn = state?.currentTurn;
      const isMe = currentTurn && address ? currentTurn.toLowerCase() === address.toLowerCase() : true;
      setIsMyTurn(isMe);
      const deadline = typeof state?.turnDeadline === "number" ? state.turnDeadline : null;
      turnDeadlineRef.current = deadline;
      setTimerSecs(deadline ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : TURN_SECONDS);
      setStatusMsg(isMe ? "⚔️ Battle started! Commander, your turn to fire." : "⚔️ Battle started! Opponent fires first.");
    },
    onShotResult: (result) => {
      const key = `${result.row},${result.col}`;
      const isMe = result.shooter && address ? result.shooter.toLowerCase() === address.toLowerCase() : false;
      // Same labelling as the board: row letter + column number
      const targetLabel = `${LETTERS[result.row] ?? "A"}${result.col + 1}`;
      // The board draws a tripped mine as "boom"
      const cellOutcome = (result.outcome === "mine" ? "boom" : result.outcome) as "hit" | "miss" | "sunk" | "boom";
      const sunkKeys = result.sunkShip ? result.sunkShip.cells.map((c) => `${c.y},${c.x}`) : [];

      // 1. Launch the missile now; everything visible on the boards changes when it lands
      shotImpactAtRef.current = Date.now() + SHOT_FLIGHT_MS;
      lastShotLandRef.current = Date.now() + SHOT_FLIGHT_MS + 1500;
      if (isMe) {
        setAnimTarget(key);
        setAnimOutcome(cellOutcome);
      } else {
        setIncomingTarget(key);
        setIncomingOutcome(cellOutcome);
      }

      const land = () => {
        if (isMe) {
          setFoeCells((prev) => {
            const next = { ...prev, [key]: cellOutcome };
            sunkKeys.forEach((k) => (next[k] = "sunk"));
            return next;
          });
          if (cellOutcome !== "miss") {
            setEnemyBoardShake(true);
            setTimeout(() => setEnemyBoardShake(false), 450);
          }
          if (result.sunkShip && sunkKeys.length > 0) {
            // Whole ship burns, then turns into a smoking wreck
            addWreck(setEnemyWrecks, sunkKeys);
            setRevealedEnemyShips((prev) => {
              const used = new Set(prev.map((s) => s.type));
              const def =
                SHIP_DEFS.find((d) => d.size === result.sunkShip!.length && !used.has(d.type)) ??
                SHIP_DEFS.find((d) => d.size === result.sunkShip!.length)!;
              const rows = result.sunkShip!.cells.map((c) => c.y);
              const cols = result.sunkShip!.cells.map((c) => c.x);
              return [
                ...prev,
                {
                  type: def.type,
                  name: def.name,
                  size: def.size,
                  row: Math.min(...rows),
                  col: Math.min(...cols),
                  vertical: result.sunkShip!.orientation === "V",
                  cells: sunkKeys,
                  hits: def.size,
                  wreck: true,
                },
              ];
            });
          }
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
              detail: result.sunkShipType ? `${result.sunkShipType} sunk` : result.outcome === "mine" ? "Mine tripped" : undefined,
            },
            ...prev,
          ]);
        } else {
          // Opponent fired at player
          setMyBoardCells((prev) => {
            const next = { ...prev, [key]: cellOutcome };
            sunkKeys.forEach((k) => (next[k] = "sunk"));
            return next;
          });
          if (cellOutcome !== "miss") {
            setMyBoardShake(true);
            setTimeout(() => setMyBoardShake(false), 450);
          }
          setEnemyScore((s) => s + result.points);
          if (result.outcome === "hit" || result.outcome === "sunk") {
            setEnemyStreak((st) => st + 1);
            setPlayerShips((prev) =>
              prev.map((s) => {
                if (!s.cells.includes(key)) return s;
                const hits = s.hits + 1;
                return { ...s, hits, wreck: hits >= s.size ? true : s.wreck };
              })
            );
            setBannerAlert({
              type: "hit",
              text: result.outcome === "sunk" ? `💥 Commander, we lost a vessel at ${targetLabel}!` : `⚠️ Commander, enemy scored a hit at ${targetLabel}!`,
            });
          } else {
            setEnemyStreak(0);
          }
          if (result.sunkShip && sunkKeys.length > 0) {
            addWreck(setMyWrecks, sunkKeys);
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
          setStatusMsg(isNowMyTurn ? `Your turn! Select target coordinates.` : `Opponent's turn to fire...`);
        }
      };
      setTimeout(land, SHOT_FLIGHT_MS);
    },
    onMatchEnd: (payload) => {
      const run = () => {
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
          // Show victory modal for opponent forfeit
          setVictoryModalData({
            title: "🏆 Victory by Forfeit!",
            message: "Your opponent has surrendered the match. Victory is yours, Commander!",
            type: "win"
          });
          setShowVictoryModal(true);
        }
      } else {
        bannerText = won
          ? "🏆 VICTORY! ENEMY FLEET ANNIHILATED!"
          : "💥 DEFEAT! ALL FRIENDLY VESSELS SUNK!";
        if (won) {
          setVictoryModalData({
            title: "🏆 Victory!",
            message: `You sank ${opponentName}'s entire fleet. Well fought, Commander!`,
            type: "win",
          });
          setShowVictoryModal(true);
        }
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
      };
      // Let the final missile land before the result screen appears
      const wait = Math.max(0, lastShotLandRef.current - Date.now());
      if (wait > 0) setTimeout(run, wait);
      else run();
    },
    onChatMessage: (sender, text, _ts, username) => {
      const mine = address ? sender.toLowerCase() === address.toLowerCase() : false;
      setChatMessages((prev) => [
        ...prev,
        { sender: mine ? "You" : (username ?? sender.slice(0, 8) + "…"), text },
      ]);
    },
    onTurnTimer: (currentTurn, seconds, deadline) => {
      // The server restarted the turn clock (after a shot, or after a turn timed out)
      const apply = () => {
        const mine = address ? currentTurn.toLowerCase() === address.toLowerCase() : false;
        turnDeadlineRef.current = deadline ?? Date.now() + seconds * 1000;
        setTimerSecs(seconds);
        setIsMyTurn(mine);
        setStatusMsg(mine ? "Your turn! Select target coordinates." : "Opponent's turn to fire...");
      };
      const wait = Math.max(0, shotImpactAtRef.current - Date.now());
      if (wait > 0) setTimeout(apply, wait);
      else apply();
    },
    onMatchRestore: (view) => hydrateFromView(view),
    onMatchUpdate: (view) => {
      // A turn timed out: the server skipped it and the turn passes (turn:timer follows)
      const last = view?.shots?.[view.shots.length - 1];
      if (last?.outcome === "timeout") {
        const mine = view.you !== null && view.you !== undefined ? last.player === view.you : false;
        setStatusMsg(mine ? "You ran out of time. Turn skipped." : "Opponent ran out of time. Turn skipped.");
      }
    },
    onForfeitNotice: (message) => setStatusMsg(message),
    onError: (msg) => setStatusMsg(`Error: ${msg}`),
  });

  // Leaving the arena by any route (router push, unmounting page) must not leave the opponent
  // waiting on a match nobody is playing. The delay keeps React StrictMode / fast-refresh
  // remounts from forfeiting; a remount for the same match cancels the pending forfeit.
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const forfeitMatchRef = useRef(forfeitMatch);
  forfeitMatchRef.current = forfeitMatch;
  // Remember the match for the lifetime of this component: the URL param can briefly vanish
  // (history changes), which must not be mistaken for the player leaving.
  const joinedMatchRef = useRef<string | null>(matchIdParam);
  if (matchIdParam) joinedMatchRef.current = matchIdParam;
  useEffect(() => {
    const matchId = joinedMatchRef.current;
    if (matchId) {
      const pending = pendingLeaveForfeits.get(matchId);
      if (pending) {
        clearTimeout(pending);
        pendingLeaveForfeits.delete(matchId);
      }
    }
    return () => {
      const id = joinedMatchRef.current;
      if (!id || phaseRef.current === "ended") return;
      const timer = setTimeout(() => {
        pendingLeaveForfeits.delete(id);
        forfeitMatchRef.current(id);
        clearActiveMatch();
      }, 1500);
      pendingLeaveForfeits.set(id, timer);
    };
  }, []);

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
    if (matchIdParam) return Math.max(0, 5 - Math.max(revealedEnemyShips.length, enemySunkCount));
    return enemyShips.filter((s) => s.hits < s.size).length;
  }, [enemyShips, revealedEnemyShips, enemySunkCount, matchIdParam]);

  const playerShipsLeft = useMemo(() => {
    return playerShips.filter((s) => s.hits < s.size).length;
  }, [playerShips]);

  // Player object for PlayerPanel
  const playerObj: Player = useMemo(() => {
    const pips = [false, false, false, false, false].map((_, i) => i < playerStreak);
    const mult = playerStreak >= 4 ? "×2.5" : playerStreak >= 2 ? "×1.75" : "×1.0";
    return {
      name: nickname ?? "Commander",
      address: address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "0xDev…Test",
      score: playerScore,
      wins: matchIdParam ? (myWins ?? 0) : 14,
      streak: playerStreak,
      streakMultiplier: mult,
      streakPips: pips,
    };
  }, [address, nickname, playerScore, playerStreak, matchIdParam, myWins]);

  // Opponent object for OpponentPanel
  const opponentObj: Player = useMemo(() => {
    const pips = [false, false, false, false, false].map((_, i) => i < enemyStreak);
    const mult = enemyStreak >= 2 ? "×1.5" : "×1.0";
    return {
      name: opponentName,
      address: opponentAddr
        ? `${opponentAddr.slice(0, 6)}…${opponentAddr.slice(-4)}`
        : matchIdParam
          ? "—"
          : "0x90F8…c9C1",
      score: enemyScore,
      wins: matchIdParam ? (opponentWins ?? 0) : 11,
      streak: enemyStreak,
      streakMultiplier: mult,
      streakPips: pips,
    };
  }, [opponentName, opponentAddr, enemyScore, enemyStreak, matchIdParam, opponentWins]);

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
    // Multiplayer: only ships the server revealed by sinking them. AI practice: sunk local ships.
    const source = matchIdParam ? revealedEnemyShips : enemyShips;
    return source
      .filter((s) => s.hits >= s.size)
      .map((s) => ({
        type: s.type,
        size: s.size,
        row: s.row,
        col: s.col,
        vertical: s.vertical,
        wreck: true,
      }));
  }, [enemyShips, revealedEnemyShips, matchIdParam]);

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
      // Engine coordinates: x = column, y = row (H ships extend along x, V along y)
      const engineShips = playerShips.map((s) => ({
        x: s.col,
        y: s.row,
        length: s.size,
        orientation: s.vertical ? ("V" as const) : ("H" as const),
      }));
      const engineMines = playerMines.map((m) => {
        const [r, c] = m.split(",").map(Number);
        return { x: c, y: r };
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
    setEnemyWrecks([]);
    setMyWrecks([]);
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

    // Determine outcome first
    let outcome: "hit" | "miss" | "sunk" | "mine" | "boom" = "miss";
    if (hitShip) {
      const hitsAfter = hitShip.hits + 1;
      outcome = hitsAfter >= hitShip.size ? "sunk" : "hit";
    } else if (isMine) {
      outcome = "boom";
    }

    // Trigger shot animation
    setAnimTarget(targetKey);
    setAnimOutcome(outcome);
    setAimCell(null);
    setAimLabel("Pick a cell");
    setIsMyTurn(false);

    // Delay board updates until animation lands (600ms)
    setTimeout(() => {
      // Shake on hit/sunk
      if (outcome === "hit" || outcome === "sunk" || outcome === "boom") {
        setEnemyBoardShake(true);
        setTimeout(() => setEnemyBoardShake(false), 400);
      }

      if (hitShip) {
        const updatedEnemyShips = enemyShips.map((s) => {
          if (s.type === hitShip!.type) return { ...s, hits: s.hits + 1 };
          return s;
        });
        setEnemyShips(updatedEnemyShips);

        const shipNow = updatedEnemyShips.find((s) => s.type === hitShip!.type)!;
        const isSunk = shipNow.hits >= shipNow.size;

        const pts = 100 * (playerStreak >= 4 ? 2.5 : playerStreak >= 2 ? 1.75 : 1);
        setPlayerScore((s) => s + pts);
        setPlayerStreak((s) => s + 1);

        if (isSunk) {
          setFoeCells((prev) => {
            const next = { ...prev };
            shipNow.cells.forEach((k) => (next[k] = "sunk"));
            return next;
          });
          addWreck(setEnemyWrecks, shipNow.cells);
          setBannerAlert({ type: "sunk", text: `💥 ENEMY ${shipNow.name.toUpperCase()} SUNK!` });
          setShotLog((prev) => [
            { cell: targetLabel, actor: "you", result: "sunk", detail: `${shipNow.name} sunk` },
            ...prev,
          ]);
          setStatusMsg(`Direct Hit! You sunk the enemy ${shipNow.name}!`);

          const remaining = updatedEnemyShips.filter((s) => s.hits < s.size).length;
          if (remaining === 0) {
            setPhase("ended");
            setBannerAlert({ type: "win", text: "🏆 VICTORY! ALL ENEMY SHIPS DESTROYED!" });
            setStatusMsg("🏆 VICTORY! Commander, you annihilated the enemy fleet!");
            // Let the last ship burn for a moment before the result pops up
            setTimeout(() => {
              setVictoryModalData({
                title: "🏆 Victory!",
                message: "You destroyed the AI's entire fleet. Well fought, Commander!",
                type: "win",
              });
              setShowVictoryModal(true);
            }, 1500);
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
        setFoeCells((prev) => ({ ...prev, [targetKey]: "miss" }));
        setPlayerStreak(0);
        setBannerAlert(null);
        setShotLog((prev) => [
          { cell: targetLabel, actor: "you", result: "miss" },
          ...prev,
        ]);
        setStatusMsg(`Water splash at ${targetLabel}. Missed.`);
      }

      // AI Retaliation after animation
      setTimeout(() => { handleAiTurn(); }, 400);
    }, SHOT_FLIGHT_MS);
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

    // Launch the AI's missile; the board only changes once it lands
    const aiShipAtTarget = playerShips.find((sh) => sh.cells.includes(targetKey));
    const aiOutcome: "hit" | "miss" | "sunk" | "boom" = aiShipAtTarget
      ? aiShipAtTarget.hits + 1 >= aiShipAtTarget.size
        ? "sunk"
        : "hit"
      : playerMines.includes(targetKey)
        ? "boom"
        : "miss";
    setIncomingTarget(targetKey);
    setIncomingOutcome(aiOutcome);

    setTimeout(() => {
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
        setMyBoardShake(true);
        setTimeout(() => setMyBoardShake(false), 450);
        setEnemyScore((s) => s + 100);
        setEnemyStreak((s) => s + 1);
        aiRecentHits.push(targetKey);
        setAiRecentHits([...aiRecentHits]);

        const hitShipNow = updatedPlayerShips.find((s) => s.type === playerHitShip!.type)!;
        if (hitShipNow.hits >= hitShipNow.size) {
          // Player ship sunk: the whole ship burns, then smokes as a wreck
          setMyBoardCells((prev) => {
            const next = { ...prev };
            hitShipNow.cells.forEach((k) => (next[k] = "sunk"));
            return next;
          });
          addWreck(setMyWrecks, hitShipNow.cells);
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
        setMyBoardShake(true);
        setTimeout(() => setMyBoardShake(false), 450);
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
    }, SHOT_FLIGHT_MS);
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
    const text = chatInput.trim();
    if (!text) return;
    if (matchIdParam) {
      // Multiplayer: the server broadcasts it back to the room, which is what we display
      sendChat(matchIdParam, text);
    } else {
      setChatMessages((prev) => [...prev, { sender: "You", text }]);
    }
    setChatInput("");
  };

  const handleForfeit = async () => {
    setShowForfeitConfirm(false);
    if (matchIdParam && forfeitMatch) {
      const ack = await forfeitMatch(matchIdParam);
      if (!ack.ok && ack.error === "timeout") {
        setStatusMsg("Could not reach the server to forfeit. Check your connection and try again.");
        return;
      }
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

  const pct = `${Math.round((timerSecs / TURN_SECONDS) * 100)}%`;

  return (
    <main className="max-w-[1440px] mx-auto px-8 py-7 pb-14">
      {matchBanner && (
        <MatchStartBanner you={matchBanner.you} opponent={matchBanner.opponent} onDone={() => setMatchBanner(null)} />
      )}
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
                <div className="flex items-center gap-2">
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (matchIdParam) {
                            // A multiplayer match is over: start a new one from the lobby
                            clearActiveMatch();
                            router.push("/play");
                            return;
                          }
                          handleRandomizePlacement();
                          setPhase("placement");
                        }}
                        className="px-4 py-1.5 rounded-[10px] text-[13px] font-bold uppercase transition-transform hover:scale-105"
                        style={{ background: "var(--signal)", color: "var(--abyss)" }}
                      >
                        🔄 Play Again
                      </button>
                      <button
                        type="button"
                        onClick={() => router.push("/play")}
                        className="px-4 py-1.5 rounded-[10px] text-[13px] font-bold uppercase transition-transform hover:scale-105 border border-[var(--line)]"
                        style={{ background: "rgba(19,48,59,.8)", color: "var(--foam)" }}
                      >
                        Return to Lobby →
                      </button>
                    </>
                </div>
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
                  : matchIdParam
                    ? `Engaged vs ${opponentName} · ${isMyTurn ? "Your turn to strike" : "Opponent is taking aim"}`
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
            <div className="min-w-0" ref={myBoardRef}>
              <h2 className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight">
                Your Fleet
                <span className="font-body font-medium text-[13px] text-[var(--mist)]">
                  {playerShipsLeft} of 5 vessels afloat
                </span>
              </h2>
              <div className={myBoardShake ? "board-shake" : ""}>
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
            </div>

            {/* Enemy Board */}
            <div className="min-w-0" ref={enemyBoardRef}>
              <h2 className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight">
                Enemy Waters
                <span className="font-body font-medium text-[13px] text-[var(--signal)]">
                  {opponentShipsLeft} of 5 hostile vessels
                </span>
              </h2>
              <div className={enemyBoardShake ? "board-shake" : ""}>
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

      {/* Shot animation overlay */}
      <ShotAnimation
        boardRef={enemyBoardRef}
        sourceRef={myBoardRef}
        targetCell={animTarget}
        outcome={animOutcome}
        onDone={() => { setAnimTarget(null); setAnimOutcome(null); }}
      />
      {/* Fire, then lingering smoke, over sunk ships */}
      <WreckEffects boardRef={enemyBoardRef} wrecks={enemyWrecks} />
      <WreckEffects boardRef={myBoardRef} wrecks={myWrecks} />
      {/* Opponent's missiles landing on my board */}
      <ShotAnimation
        boardRef={myBoardRef}
        sourceRef={enemyBoardRef}
        targetCell={incomingTarget}
        outcome={incomingOutcome}
        onDone={() => { setIncomingTarget(null); setIncomingOutcome(null); }}
      />

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

      {/* Victory/Defeat Modal */}
      {showVictoryModal && victoryModalData && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setShowVictoryModal(false)}
        >
          <div
            className="max-w-md w-full rounded-[20px] border p-8 text-center"
            style={{
              background: "linear-gradient(180deg, rgba(19,48,59,0.98), rgba(12,34,43,1))",
              borderColor: victoryModalData.type === "win" ? "rgba(53,214,192,0.5)" : "rgba(255,106,77,0.5)",
              boxShadow: victoryModalData.type === "win"
                ? "0 0 40px rgba(53,214,192,0.2)"
                : "0 0 40px rgba(255,106,77,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center text-4xl"
              style={{
                background: victoryModalData.type === "win"
                  ? "linear-gradient(135deg, rgba(53,214,192,0.2), rgba(53,214,192,0.1))"
                  : "linear-gradient(135deg, rgba(255,106,77,0.2), rgba(255,106,77,0.1))",
                border: victoryModalData.type === "win"
                  ? "3px solid var(--signal)"
                  : "3px solid var(--flare)",
              }}
            >
              {victoryModalData.type === "win" ? "🏆" : "💥"}
            </div>

            <h3
              className="font-display font-extrabold text-[26px] mb-3"
              style={{
                color: victoryModalData.type === "win" ? "var(--signal)" : "var(--flare)"
              }}
            >
              {victoryModalData.title}
            </h3>

            <p className="text-[15px] text-[var(--foam)] mb-6 leading-relaxed">
              {victoryModalData.message}
            </p>

            <button
              type="button"
              onClick={() => {
                setShowVictoryModal(false);
                router.push("/play");
              }}
              className="w-full px-6 py-3.5 rounded-[14px] font-bold text-[15px] transition-all hover:-translate-y-px hover:scale-105"
              style={{
                background: victoryModalData.type === "win"
                  ? "linear-gradient(135deg, var(--signal), color-mix(in srgb, var(--signal) 80%, black))"
                  : "linear-gradient(135deg, var(--flare), color-mix(in srgb, var(--flare) 80%, black))",
                color: "var(--abyss)",
                boxShadow: victoryModalData.type === "win"
                  ? "0 4px 20px rgba(53,214,192,0.3)"
                  : "0 4px 20px rgba(255,106,77,0.3)",
              }}
            >
              Return to Lobby →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

/** `/arena?match=<id>&spectate=true` is the watch-only view; everything else is the player arena. */
export function ArenaClient() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("match");
  if (matchId && searchParams.get("spectate") === "true") return <SpectatorArena matchId={matchId} />;
  return <PlayerArena />;
}
