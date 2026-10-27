"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { GameBoard } from "./GameBoard";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";
import type { BoardCells, Ship } from "@/types/game";

const LETTERS = "ABCDEFGHIJ";

/* ── Fallback demo state (used when no live match is active) ── */
import {
  MY_BOARD_CELLS, FOE_BOARD_CELLS, MY_SHIPS, FOE_SHIPS,
} from "@/lib/gameData";

interface LiveState {
  matchId: string;
  opponent: string;
  phase: string;
  currentTurn: string;
  scores: Record<string, number>;
  streaks: Record<string, number>;
  playerIds?: string[];
}

export function ArenaClient() {
  const router = useRouter();
  const { address } = useAuthCtx();

  // Board state
  const [myBoardCells, setMyBoardCells]   = useState<BoardCells>(MY_BOARD_CELLS);
  const [foeCells, setFoeCells]           = useState<BoardCells>(FOE_BOARD_CELLS);
  const [aimCell, setAimCell]             = useState<string | null>(null);
  const [aimLabel, setAimLabel]           = useState("Pick a cell");

  // Match state
  const [live, setLive]           = useState<LiveState | null>(null);
  const [timerSecs, setTimerSecs] = useState(20);
  const [timerTotal, setTimerTotal] = useState(20);
  const [matchResult, setMatchResult] = useState<{ winner: string; hash?: string } | null>(null);
  const [inQueue, setInQueue]     = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  // Chat
  const [chatMessages, setChatMessages] = useState<{ sender: string; text: string }[]>([
    { sender: "Kestrel", text: "nice shot, lucky streak" },
    { sender: "You", text: "aiming for the carrier next" },
  ]);
  const [chatInput, setChatInput] = useState("");

  const { joinQueue, leaveQueue, fireShot, sendChat } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      setInQueue(false);
      setStatusMsg(`Matched vs ${opponent.slice(0, 8)}…`);
      setLive({ matchId, opponent, phase: "placement", currentTurn: "", scores: {}, streaks: {} });
    },
    onMatchStart: (matchId, state: any) => {
      setLive((prev) => prev ? { ...prev, phase: "battle", currentTurn: state.currentTurn } : prev);
      setStatusMsg("Battle started!");
    },
    onMatchRejoin: (matchId, state: any) => {
      setLive({ matchId, opponent: "", phase: state.phase, currentTurn: state.currentTurn, scores: state.players ? Object.fromEntries(Object.entries(state.players).map(([k, v]: any) => [k, v.score])) : {}, streaks: {} });
      setStatusMsg("Reconnected to match");
    },
    onShotResult: (result) => {
      const key = `${result.row},${result.col}`;
      if (result.shooter === address) {
        setFoeCells((prev) => ({ ...prev, [key]: result.outcome as any }));
      } else {
        setMyBoardCells((prev) => ({ ...prev, [key]: result.outcome as any }));
      }
      setLive((prev) =>
        prev ? { ...prev, scores: result.scores, streaks: result.streaks } : prev
      );
      setAimCell(null);
      setAimLabel("Pick a cell");
    },
    onTurnTimer: (_player, seconds) => {
      setTimerSecs(seconds);
      setTimerTotal(seconds);
    },
    onTurnTimeout: (player) => {
      setStatusMsg(`${player.slice(0, 8)}… timed out`);
    },
    onMatchEnd: (payload) => {
      setMatchResult({ winner: payload.winner });
      const isWinner = payload.winner === address;
      setStatusMsg(isWinner ? "🏆 You won!" : "💀 You lost");
    },
    onMatchVerified: (hash) => {
      setMatchResult((prev) => prev ? { ...prev, hash } : prev);
    },
    onChatMessage: (sender, text) => {
      setChatMessages((prev) => [...prev, { sender: sender.slice(0, 8) + "…", text }]);
    },
    onError: (msg) => setStatusMsg(`Error: ${msg}`),
  });

  // Turn timer countdown
  useEffect(() => {
    if (!live || live.phase !== "battle") return;
    const t = setInterval(() => setTimerSecs((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [live?.phase, live?.currentTurn]);

  const isMyTurn = live ? live.currentTurn === address : false;

  const handleCellClick = useCallback((label: string, key: string) => {
    setAimCell(key);
    setAimLabel(label);
  }, []);

  const handleFire = () => {
    if (!aimCell) return;
    if (live) {
      const [row, col] = aimCell.split(",").map(Number);
      fireShot(live.matchId, row, col);
    } else {
      // Demo mode — local only
      setFoeCells((prev) => ({ ...prev, [aimCell]: "hit" }));
    }
    setAimCell(null);
    setAimLabel("Pick a cell");
  };

  const handleAutoFire = () => {
    const available: string[] = [];
    for (let r = 0; r < 10; r++)
      for (let c = 0; c < 10; c++) {
        const k = `${r},${c}`;
        if (!foeCells[k]) available.push(k);
      }
    if (!available.length) return;
    const pick = available[Math.floor(Math.random() * available.length)];
    const [r, c] = pick.split(",").map(Number);
    setAimCell(pick);
    setAimLabel(`${LETTERS[r]}${c + 1}`);
  };

  const handleJoinQueue = () => {
    joinQueue();
    setInQueue(true);
    setStatusMsg("Looking for an opponent…");
  };

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    if (live) sendChat(live.matchId, chatInput.trim());
    setChatMessages((prev) => [...prev, { sender: "You", text: chatInput.trim() }]);
    setChatInput("");
  };

  const pct = `${Math.round((timerSecs / timerTotal) * 100)}%`;

  return (
    <>
      {/* Status / queue bar */}
      {(statusMsg || inQueue || matchResult) && (
        <div
          className="mb-5 px-5 py-3.5 rounded-[14px] border flex items-center gap-3"
          style={{
            background: matchResult
              ? matchResult.winner === address ? "rgba(53,214,192,0.08)" : "rgba(255,106,77,0.08)"
              : "rgba(235,181,74,0.08)",
            borderColor: matchResult
              ? matchResult.winner === address ? "rgba(53,214,192,0.3)" : "rgba(255,106,77,0.3)"
              : "rgba(235,181,74,0.3)",
          }}
        >
          {inQueue && (
            <span className="w-3 h-3 rounded-full animate-pulse flex-none" style={{ background: "var(--brass)" }} />
          )}
          <span className="font-medium text-[14px]">{statusMsg}</span>
          {matchResult?.hash && (
            <span className="ml-auto text-[12px] font-mono text-[var(--mist)]">
              Hash: {matchResult.hash.slice(0, 20)}…
            </span>
          )}
          {inQueue && (
            <button
              type="button"
              onClick={() => { leaveQueue(); setInQueue(false); setStatusMsg(""); }}
              className="ml-auto text-[13px] font-semibold text-[var(--mist)] hover:text-[var(--flare)] transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      )}

      {/* Match bar */}
      <div className="flex items-center gap-5 mb-5 flex-wrap">
        <div>
          <h1 className="font-display font-extrabold text-[30px] leading-tight tracking-tighter">
            {live ? `Match vs ${live.opponent.slice(0, 8)}…` : "Battle Arena"}
          </h1>
          <p className="text-[var(--mist)] text-sm mt-0.5">
            {live
              ? `Phase: ${live.phase} · ${isMyTurn ? "Your turn" : "Opponent's turn"}`
              : "Demo mode — connect wallet and join queue for a live match"}
          </p>
        </div>

        {/* Timer */}
        <div
          className="ml-auto flex items-center gap-3.5 px-[18px] pl-2.5 py-2.5 rounded-full border"
          style={{ background: "var(--deck)", borderColor: "var(--line)" }}
        >
          <div
            className="relative w-[52px] h-[52px] rounded-full grid place-items-center"
            style={{ background: `conic-gradient(var(--signal) ${pct}, rgba(255,255,255,.08) 0)` }}
          >
            <span className="absolute inset-[5px] rounded-full" style={{ background: "var(--deck)" }} />
            <b className="relative font-display font-extrabold text-[19px]">{timerSecs}</b>
          </div>
          <div>
            <strong className="block font-display font-bold text-[15px]">
              {isMyTurn ? "Your turn" : "Waiting"}
            </strong>
            <span className="text-[var(--mist)] text-sm">seconds left</span>
          </div>
        </div>

        {/* Queue button (when no live match) */}
        {!live && !inQueue && address && (
          <button
            type="button"
            onClick={handleJoinQueue}
            className="px-5 py-3 rounded-[12px] font-display font-bold text-[14px] transition-all hover:-translate-y-px"
            style={{ background: "var(--accent-cta)", color: "var(--cta-text)", boxShadow: "0 6px 20px -6px var(--cta-shadow)" }}
          >
            Find Match
          </button>
        )}
      </div>

      {/* Boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
        <div className="min-w-0">
          <h2 className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight">
            Your fleet
            <span className="font-body font-medium text-[13px] text-[var(--mist)]">
              {live?.scores?.[address ?? ""] !== undefined ? `${live.scores[address!]} pts` : ""}
            </span>
          </h2>
          <GameBoard id="mine" cells={myBoardCells} ships={MY_SHIPS} />
        </div>

        <div className="min-w-0">
          <h2 className="flex justify-between items-baseline mb-3 px-1 font-display font-bold text-[17px] tracking-tight">
            Enemy waters
            <span className="font-body font-medium text-[13px] text-[var(--mist)]">
              {live?.scores?.[live.opponent] !== undefined ? `${live.scores[live.opponent]} pts` : ""}
            </span>
          </h2>
          <GameBoard
            id="foe"
            cells={foeCells}
            ships={FOE_SHIPS}
            isEnemy
            onCellClick={isMyTurn || !live ? handleCellClick : undefined}
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
          <strong className="font-display font-extrabold text-[22px]">{aimLabel}</strong>
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
          disabled={!aimCell || (!!live && !isMyTurn)}
          className="px-5 py-3 rounded-[12px] font-bold transition-all hover:-translate-y-px hover:shadow-[0_8px_24px_-6px_rgba(53,214,192,0.6)] disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: "var(--signal)", color: "var(--abyss)" }}
          onClick={handleFire}
        >
          Fire shot
        </button>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 mt-4 text-[var(--mist)] text-[13px] px-1">
        {[
          { label: "Your ship", style: { background: "#7aa6b2", clipPath: "polygon(0 0,72% 0,100% 50%,72% 100%,0 100%)", width: 22, height: 10 } },
          { label: "Hit",   style: { background: "var(--flare)" } },
          { label: "Miss",  style: { background: "var(--mist)", opacity: 0.6 } },
          { label: "Mine",  style: { background: "var(--brass)", transform: "rotate(45deg) scale(0.8)" } },
        ].map(({ label, style }) => (
          <span key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-[4px] block" style={style as any} />
            {label}
          </span>
        ))}
      </div>

      {/* Live chat */}
      {live && (
        <div
          className="mt-5 rounded-[20px] border p-5"
          style={{ background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))", borderColor: "var(--line)" }}
        >
          <h3 className="font-display font-bold text-[15px] tracking-tight mb-3">Match chat</h3>
          <div className="grid gap-2 mb-3 max-h-[120px] overflow-auto custom-scroll text-[14px]">
            {chatMessages.map((m, i) => (
              <p key={i}>
                <span className="font-semibold mr-1.5" style={{ color: m.sender === "You" ? "var(--brass)" : "var(--signal)" }}>
                  {m.sender}
                </span>
                {m.text}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              className="input-base flex-1 text-[14px] py-2"
              placeholder="Say something…"
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
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
