import { PlayerPanel } from "@/components/game/PlayerPanel";
import { OpponentPanel } from "@/components/game/OpponentPanel";
import { ShotLog } from "@/components/game/ShotLog";
import { MatchChat } from "@/components/game/MatchChat";
import { LeaderboardPanel } from "@/components/game/LeaderboardPanel";
import { BadgesPanel } from "@/components/game/BadgesPanel";
import { MatchRecord } from "@/components/game/MatchRecord";
import { ArenaClient } from "@/components/game/ArenaClient";
import {
  YOU,
  OPPONENT,
  YOUR_FLEET,
  MY_SHIPS,
  FOE_SHIPS,
  MY_BOARD_CELLS,
  FOE_BOARD_CELLS,
  SHOT_LOG,
  CHAT_MESSAGES,
  LEADERBOARD,
  BADGES,
  MATCH_STEPS,
} from "@/lib/gameData";

export default function ArenaPage() {
  return (
    <main className="max-w-[1440px] mx-auto px-8 py-7 pb-14">
      {/* 3-column arena layout */}
      <div
        className="arena-grid grid gap-5 items-start"
        style={{ gridTemplateColumns: "272px minmax(0,1fr) 316px" }}
      >
        {/* Left: Your player panel */}
        <PlayerPanel player={YOU} fleet={YOUR_FLEET} />

        {/* Center: Boards + controls */}
        <section className="arena-center">
          <ArenaClient
            myBoardCells={MY_BOARD_CELLS}
            foeBoardCells={FOE_BOARD_CELLS}
            myShips={MY_SHIPS}
            foeShips={FOE_SHIPS}
          />
        </section>

        {/* Right: Opponent + Log + Chat */}
        <aside className="grid gap-5">
          <OpponentPanel player={OPPONENT} shipsLeft={4} totalShips={5} />
          <ShotLog entries={SHOT_LOG} />
          <MatchChat initial={CHAT_MESSAGES} />
        </aside>
      </div>

      {/* Lower row */}
      <div
        className="lower-grid grid gap-5 mt-5"
        style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}
      >
        <LeaderboardPanel entries={LEADERBOARD} />
        <BadgesPanel badges={BADGES} collected={3} total={5} />
        <MatchRecord steps={MATCH_STEPS} hash="0x4be1…9d07" />
      </div>
    </main>
  );
}
