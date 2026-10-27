"use client";

import { useEffect, useRef, useCallback } from "react";
import { connectSocket, getSocket } from "./socket";
import type { Board } from "@/types/game";

export interface ShotResult {
  shooter: string;
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

    socket.on("match:found",    ({ matchId, opponent }) =>
      cbRef.current.onMatchFound?.(matchId, opponent));
    socket.on("match:start",    ({ matchId, state }) =>
      cbRef.current.onMatchStart?.(matchId, state));
    socket.on("match:rejoin",   ({ matchId, state }) =>
      cbRef.current.onMatchRejoin?.(matchId, state));
    socket.on("shot:result",    (result: ShotResult) =>
      cbRef.current.onShotResult?.(result));
    socket.on("turn:timer",     ({ player, seconds }) =>
      cbRef.current.onTurnTimer?.(player, seconds));
    socket.on("turn:timeout",   ({ player }) =>
      cbRef.current.onTurnTimeout?.(player));
    socket.on("match:end",      (payload: MatchEndPayload) =>
      cbRef.current.onMatchEnd?.(payload));
    socket.on("match:verified", ({ resultHash }) =>
      cbRef.current.onMatchVerified?.(resultHash));
    socket.on("chat:message",   ({ sender, text, ts }) =>
      cbRef.current.onChatMessage?.(sender, text, ts));
    socket.on("invite:received",({ from }) =>
      cbRef.current.onInvite?.(from));
    socket.on("error",          ({ msg }) =>
      cbRef.current.onError?.(msg));

    return () => {
      socket.off("match:found");
      socket.off("match:start");
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
    getSocket().emit("queue:join");
  }, []);

  const leaveQueue = useCallback(() => {
    getSocket().emit("queue:leave");
  }, []);

  const submitPlacement = useCallback(
    (matchId: string, board: Board, salt: string) => {
      getSocket().emit("placement:submit", { matchId, board, salt });
    }, []
  );

  const fireShot = useCallback(
    (matchId: string, row: number, col: number) => {
      getSocket().emit("shot:fire", { matchId, row, col });
    }, []
  );

  const submitReveal = useCallback(
    (matchId: string, board: Board, salt: string) => {
      getSocket().emit("reveal:submit", { matchId, board, salt });
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
