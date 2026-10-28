"use client";

import { useState } from "react";
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

export type LobbyView = "play" | "create" | "join";

export function LobbyClient() {
  const router = useRouter();
  const { address } = useAuthCtx();
  const [view, setView] = useState<LobbyView>("play");
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [inQueue, setInQueue] = useState(false);
  const [queueMsg, setQueueMsg] = useState("");

  const { joinQueue, leaveQueue } = useGameSocket({
    onMatchFound: (matchId) => {
      setInQueue(false);
      router.push(`/arena?match=${matchId}`);
    },
    onError: (msg) => setQueueMsg(`Error: ${msg}`),
  });

  const handleQuickMatch = () => {
    if (!address) {
      setQueueMsg("Connect your wallet first");
      return;
    }
    joinQueue();
    setInQueue(true);
    setQueueMsg("Searching for an opponent…");
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
        {/* Queue status banner */}
        {queueMsg && (
          <div
            className="mb-5 px-5 py-3 rounded-[14px] border flex items-center gap-3"
            style={{
              background: "rgba(235,181,74,0.08)",
              borderColor: "rgba(235,181,74,0.3)",
            }}
          >
            {inQueue && (
              <span className="w-2.5 h-2.5 rounded-full animate-pulse flex-none" style={{ background: "var(--brass)" }} />
            )}
            <span className="text-[14px] font-medium">{queueMsg}</span>
            {inQueue && (
              <button
                type="button"
                onClick={handleCancelQueue}
                className="ml-auto text-[13px] font-semibold text-[var(--mist)] hover:text-[var(--flare)] transition-colors"
              >
                Cancel
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
                {address ? "Jump into a game or create your own room." : "Connect your wallet to start playing."}
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
        {view === "join"   && <JoinRoomPage />}
      </main>

      {joinOpen   && <JoinRoomModal   onClose={() => setJoinOpen(false)} />}
      {createOpen && <CreateRoomModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
