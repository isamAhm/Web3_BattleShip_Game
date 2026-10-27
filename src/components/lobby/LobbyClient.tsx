"use client";

import { useState } from "react";
import { LobbySidebar } from "./LobbySidebar";
import { MatchTypeCards } from "./MatchTypeCards";
import { GameModes } from "./GameModes";
import { ActiveRooms } from "./ActiveRooms";
import { JoinRoomModal } from "./JoinRoomModal";
import { CreateRoomModal } from "./CreateRoomModal";
import { CreateRoomPage } from "./CreateRoomPage";
import { JoinRoomPage } from "./JoinRoomPage";

export type LobbyView = "play" | "create" | "join";

export function LobbyClient() {
  const [view, setView] = useState<LobbyView>("play");
  const [joinOpen, setJoinOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <div className="flex min-h-[calc(100vh-65px)] w-full">
      <LobbySidebar active={view} onChange={setView} />

      <main className="flex-1 min-w-0 px-8 py-8 overflow-x-hidden">
        {view === "play" && (
          <>
            <div className="mb-7">
              <h1 className="font-display font-extrabold text-[30px] tracking-tighter">
                Choose Your Match
              </h1>
              <p className="text-[var(--mist)] mt-1 text-[14px]">
                Jump into a game or create your own room.
              </p>
            </div>
            <MatchTypeCards
              onJoin={() => setJoinOpen(true)}
              onCreate={() => setCreateOpen(true)}
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
