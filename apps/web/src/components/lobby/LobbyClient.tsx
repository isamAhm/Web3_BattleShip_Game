"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LobbySidebar } from "./LobbySidebar";
import { MatchTypeCards } from "./MatchTypeCards";
import { GameModes } from "./GameModes";
import { ActiveRooms } from "./ActiveRooms";
import { JoinRoomModal } from "./JoinRoomModal";
import { CreateRoomModal } from "./CreateRoomModal";
import { CreateRoomPage } from "./CreateRoomPage";
import { JoinRoomPage } from "./JoinRoomPage";
import { useGameSocket } from "@/lib/useGameSocket";
import { useAuthCtx } from "@/lib/AuthContext";
import { getActiveMatch, clearActiveMatch } from "@/lib/useNavigationGuard";
import { api } from "@/lib/api";

export type LobbyView = "play" | "create" | "join";

export function LobbyClient() {
  const router = useRouter();
  const { address, login } = useAuthCtx();
  const [view, setView] = useState<LobbyView>("play");
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueMsg, setQueueMsg] = useState("");
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

  // Track the locally stored active match, dropping it if the server says it is already over
  useEffect(() => {
    const sync = () => setActiveMatchId((prev) => {
      const stored = getActiveMatch();
      return stored === prev ? prev : stored;
    });
    sync();
    const interval = setInterval(sync, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeMatchId) return;
    let cancelled = false;
    api.matchStatus(activeMatchId).then((status) => {
      if (cancelled || status === "active") return;
      clearActiveMatch();
      setActiveMatchId(null);
    });
    return () => {
      cancelled = true;
    };
  }, [activeMatchId]);

  const { joinQueue, leaveQueue, forfeitMatch } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      setInQueue(false);
      setQueueMsg(`⚔️ Opponent found (${opponent.slice(0, 8)}…)! Launching Arena…`);
      setTimeout(() => {
        router.push(`/arena?match=${matchId}`);
      }, 500);
    },
    onActiveMatch: (matchId) => {
      // The server still has an unfinished match for us: offer to continue or forfeit it
      setActiveMatchId(matchId);
      localStorage.setItem("wba_active_match", matchId);
    },
    onError: (msg) => {
      setQueueMsg(`Error: ${msg}`);
      setInQueue(false);
    },
  });

  const handleForfeitActive = async () => {
    if (!activeMatchId) return;
    await forfeitMatch(activeMatchId);
    clearActiveMatch();
    setActiveMatchId(null);
    setQueueMsg("Previous match forfeited. You can start a new game now.");
  };

  const handleContinueMatch = () => {
    if (activeMatchId) {
      router.push(`/arena?match=${activeMatchId}`);
    }
  };

  const handleQuickMatch = async () => {
    try {
      if (!address) {
        setQueueMsg("Connecting tactical identity…");
        const loggedInAddress = await login();
        if (!loggedInAddress) {
          setQueueMsg("Authentication failed. Please try again.");
          return;
        }
        // Small delay to ensure socket connects with new token
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      setInQueue(true);
      setQueueMsg("Searching for an opponent… (Battle Net Active)");
      joinQueue();
    } catch (err: any) {
      setQueueMsg(`Authentication error: ${err.message}`);
      setInQueue(false);
    }
  };

  const handleCancelQueue = () => {
    leaveQueue();
    setInQueue(false);
    setQueueMsg("");
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] w-full">
      <LobbySidebar active={view} onChange={setView} />

      <main className="flex-1 min-w-0 px-8 py-8 overflow-x-hidden">
        {/* Active match banner */}
        {activeMatchId && (
          <div
            className="mb-5 px-5 py-3.5 rounded-[14px] border flex items-center gap-3 transition-all animate-fadeIn"
            style={{
              background: "rgba(235,181,74,0.12)",
              borderColor: "rgba(235,181,74,0.35)",
            }}
          >
            <span className="w-3 h-3 rounded-full flex-none bg-[var(--brass)]" />
            <span className="text-[14px] font-semibold text-[var(--brass)]">
              ⚠️ You have an active match in progress
            </span>
            <button
              type="button"
              onClick={handleContinueMatch}
              className="ml-auto px-4 py-2 rounded-[10px] text-[13px] font-bold transition-all hover:-translate-y-px"
              style={{
                background: "var(--brass)",
                color: "var(--abyss)",
                boxShadow: "0 4px 12px -2px rgba(235,181,74,0.4)",
              }}
            >
              Continue Match →
            </button>
            <button
              type="button"
              onClick={handleForfeitActive}
              className="px-4 py-2 rounded-[10px] text-[13px] font-bold border transition-all hover:-translate-y-px"
              style={{ borderColor: "rgba(255,106,77,0.5)", color: "var(--flare)" }}
            >
              Forfeit
            </button>
          </div>
        )}

        {/* Queue status banner */}
        {queueMsg && (
          <div
            className="mb-5 px-5 py-3.5 rounded-[14px] border flex items-center gap-3 transition-all animate-fadeIn"
            style={{
              background: "rgba(53,214,192,0.08)",
              borderColor: "rgba(53,214,192,0.3)",
            }}
          >
            {inQueue && (
              <span className="w-3 h-3 rounded-full animate-ping flex-none bg-[var(--signal)]" />
            )}
            <span className="text-[14px] font-mono font-medium text-[var(--signal)]">{queueMsg}</span>
            {inQueue && (
              <button
                type="button"
                onClick={handleCancelQueue}
                className="ml-auto text-[13px] font-semibold text-[var(--mist)] hover:text-red-400 transition-colors"
              >
                Cancel Queue
              </button>
            )}
          </div>
        )}

        {view === "play" && (
          <>
            <div className="mb-7">
              <h1 className="font-display font-extrabold text-[28px] tracking-tight">
                Choose Your Match
              </h1>
              <p className="text-[var(--mist)] mt-1 text-[14px]">
                {address ? `Commander ${address.slice(0, 6)}…${address.slice(-4)} active. Jump into a game or create a room.` : "Connect your wallet or start playing as guest."}
              </p>
            </div>
            <MatchTypeCards
              onQuickMatch={handleQuickMatch}
              onAiPractice={() => router.push("/arena")}
              onJoin={() => setJoinOpen(true)}
              onCreate={() => setCreateOpen(true)}
              inQueue={inQueue}
            />
            <GameModes />
            <ActiveRooms />
          </>
        )}

        {view === "create" && <CreateRoomPage />}
        {view === "join" && <JoinRoomPage />}
      </main>

      {joinOpen && <JoinRoomModal onClose={() => setJoinOpen(false)} />}
      {createOpen && <CreateRoomModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
