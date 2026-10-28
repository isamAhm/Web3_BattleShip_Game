"use client";

import { useEffect, useRef, useCallback } from "react";
import { connectSocket, getSocket } from "./socket";
import type { Board } from "@/types/game";

export interface ShotResult {
  shooter: string;
  target?: string;
  nextTurn?: string | null;
  row: number;
  col: number;
  outcome: "miss" | "hit" | "sunk" | "mine";
  sunkShipType: string | null;
  points: number;
  multiplier: number;
  scores: Record<string, number>;
  streaks: Record<string, number>;
}

export interface MatchEndPayload {
  winner: string;
  forfeitedBy: string | null;
  scores: Record<string, number>;
}

export interface GameSocketCallbacks {
  onMatchFound?:   (matchId: string, opponent: string) => void;
  onMatchStart?:   (matchId: string, state: unknown) => void;
  onMatchRejoin?:  (matchId: string, state: unknown) => void;
  onShotResult?:   (result: ShotResult) => void;
  onTurnTimer?:    (player: string, seconds: number) => void;
  onTurnTimeout?:  (player: string) => void;
  onMatchEnd?:     (payload: MatchEndPayload) => void;
  onMatchVerified?:(resultHash: string) => void;
  onChatMessage?:  (sender: string, text: string, ts: number) => void;
  onInvite?:       (from: string) => void;
  onError?:        (msg: string) => void;
}

export function useGameSocket(callbacks: GameSocketCallbacks) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    const socket = connectSocket();

    socket.on("match:found", (data: any) => {
      const matchId = data?.matchId;
      const players = data?.players || [];
      const myAddr = typeof window !== "undefined" ? localStorage.getItem("wba_current_addr") : "";
      const opponent =
        data?.opponent ||
        players.find((p: string) => p.toLowerCase() !== myAddr?.toLowerCase()) ||
        players[1] ||
        "Opponent";
      cbRef.current.onMatchFound?.(matchId, opponent);
    });

    socket.on("match:start", ({ matchId, state }: any) =>
      cbRef.current.onMatchStart?.(matchId, state));

    socket.on("match:restore", (view: any) => {
      cbRef.current.onMatchStart?.(view?.matchId, view);
    });

    socket.on("match:rejoin", ({ matchId, state }: any) =>
      cbRef.current.onMatchRejoin?.(matchId, state));

    socket.on("shot:result", (raw: any) => {
      const row = raw?.coordinate?.x ?? raw?.row ?? 0;
      const col = raw?.coordinate?.y ?? raw?.col ?? 0;
      const result: ShotResult = {
        shooter: raw.shooter,
        target: raw.target,
        nextTurn: raw.nextTurn,
        row,
        col,
        outcome: raw.outcome,
        sunkShipType: raw.sunkShipType ?? null,
        points: raw.pointsAwarded ?? raw.points ?? 0,
        multiplier: 1,
        scores: { [raw.shooter]: raw.shooterScore ?? 0 },
        streaks: { [raw.shooter]: raw.shooterStreak ?? 0 },
      };
      cbRef.current.onShotResult?.(result);

      if (raw.gameOver && raw.winner) {
        cbRef.current.onMatchEnd?.({
          winner: raw.winner,
          forfeitedBy: raw.forfeit ? raw.target : null,
          scores: { [raw.shooter]: raw.shooterScore ?? 0 },
        });
      }
    });

    socket.on("turn:timer", ({ player, seconds }) =>
      cbRef.current.onTurnTimer?.(player, seconds));

    socket.on("turn:timeout", ({ player }) =>
      cbRef.current.onTurnTimeout?.(player));

    socket.on("match:end", (payload: MatchEndPayload) =>
      cbRef.current.onMatchEnd?.(payload));

    socket.on("match:verified", ({ resultHash }) =>
      cbRef.current.onMatchVerified?.(resultHash));

    socket.on("chat:message", ({ sender, text, ts }) =>
      cbRef.current.onChatMessage?.(sender, text, ts));

    socket.on("invite:received", ({ from }) =>
      cbRef.current.onInvite?.(from));

    socket.on("error", (err: any) =>
      cbRef.current.onError?.(err?.message ?? err?.msg ?? String(err)));

    return () => {
      socket.off("match:found");
      socket.off("match:start");
      socket.off("match:restore");
      socket.off("match:rejoin");
      socket.off("shot:result");
      socket.off("turn:timer");
      socket.off("turn:timeout");
      socket.off("match:end");
      socket.off("match:verified");
      socket.off("chat:message");
      socket.off("invite:received");
      socket.off("error");
    };
  }, []);

  // ── Actions ─────────────────────────────────────────────────────────────────

  const joinQueue = useCallback(() => {
    connectSocket().emit("queue:join");
  }, []);

  const leaveQueue = useCallback(() => {
    getSocket().emit("queue:leave");
  }, []);

  const submitPlacement = useCallback(
    (payload: any) => {
      // Supports both raw board and placementPayloadSchema ({ matchId, commitment, ships, mines })
      getSocket().emit("placement:submit", payload);
    }, []
  );

  const fireShot = useCallback(
    (matchId: string, row: number, col: number) => {
      getSocket().emit("shot:fire", { matchId, coordinate: { x: row, y: col } });
    }, []
  );

  const submitReveal = useCallback(
    (payload: any) => {
      getSocket().emit("reveal:submit", payload);
    }, []
  );

  const sendChat = useCallback(
    (matchId: string, text: string) => {
      getSocket().emit("chat:send", { matchId, text });
    }, []
  );

  const spectate = useCallback(
    (matchId: string) => {
      getSocket().emit("spectate:join", { matchId });
    }, []
  );

  const sendInvite = useCallback(
    (to: string) => {
      getSocket().emit("invite:send", { to });
    }, []
  );

  return {
    joinQueue,
    leaveQueue,
    submitPlacement,
    fireShot,
    submitReveal,
    sendChat,
    spectate,
    sendInvite,
  };
}
