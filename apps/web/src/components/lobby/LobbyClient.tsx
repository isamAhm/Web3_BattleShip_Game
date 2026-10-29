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
  const { address, login } = useAuthCtx();
  const [view, setView] = useState<LobbyView>("play");
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [prefilledCode, setPrefilledCode] = useState("");
  const [inQueue, setInQueue] = useState(false);
  const [queueMsg, setQueueMsg] = useState("");

  const { joinQueue, leaveQueue } = useGameSocket({
    onMatchFound: (matchId, opponent) => {
      setInQueue(false);
      setQueueMsg(`⚔️ Opponent found (${opponent.slice(0, 8)}…)! Launching Arena…`);
      setTimeout(() => {
        router.push(`/arena?match=${matchId}`);
      }, 500);
    },
    onError: (msg) => {
      setQueueMsg(`Error: ${msg}`);
      setInQueue(false);
    },
  });

  const handleQuickMatch = async () => {
    try {
      if (!address) {
        setQueueMsg("Connecting tactical identity…");
        await login(false);
      }
      joinQueue();
      setInQueue(true);
      setQueueMsg("Searching for an opponent… (Battle Net Active)");
    } catch (err: any) {
      setQueueMsg(`Authentication error: ${err.message}`);
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
              onJoin={() => {
                setPrefilledCode("");
                setJoinOpen(true);
              }}
              onCreate={() => setCreateOpen(true)}
              inQueue={inQueue}
            />
            <GameModes />
            <ActiveRooms
              onJoinRoom={(code) => {
                setPrefilledCode(code);
                setJoinOpen(true);
              }}
            />
          </>
        )}

        {view === "create" && <CreateRoomPage />}
        {view === "join"   && <JoinRoomPage />}
      </main>

      {joinOpen && (
        <JoinRoomModal
          onClose={() => {
            setJoinOpen(false);
            setPrefilledCode("");
          }}
          initialCode={prefilledCode}
        />
      )}
      {createOpen && <CreateRoomModal onClose={() => setCreateOpen(false)} />}
    </div>
  );
}
