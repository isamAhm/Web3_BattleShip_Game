import { PlayerPanel } from "@/components/game/PlayerPanel";
import { OpponentPanel } from "@/components/game/OpponentPanel";
import { ShotLog } from "@/components/game/ShotLog";
import { LeaderboardPanel } from "@/components/game/LeaderboardPanel";
import { BadgesPanel } from "@/components/game/BadgesPanel";
import { MatchRecord } from "@/components/game/MatchRecord";
import { ArenaClient } from "@/components/game/ArenaClient";
import {
  YOU, OPPONENT, YOUR_FLEET, SHOT_LOG, LEADERBOARD, BADGES, MATCH_STEPS,
} from "@/lib/gameData";

export default function ArenaPage() {
  return (
    <main className="max-w-[1440px] mx-auto px-8 py-7 pb-14">
      <div
        className="arena-grid grid gap-5 items-start"
        style={{ gridTemplateColumns: "272px minmax(0,1fr) 316px" }}
      >
        {/* Left */}
        <PlayerPanel player={YOU} fleet={YOUR_FLEET} />

        {/* Center — fully live */}
        <section className="arena-center">
          <ArenaClient />
        </section>

        {/* Right */}
        <aside className="grid gap-5">
          <OpponentPanel player={OPPONENT} shipsLeft={4} totalShips={5} />
          <ShotLog entries={SHOT_LOG} />
        </aside>
      </div>

      <div
        className="lower-grid grid gap-5 mt-5"
        style={{ gridTemplateColumns: "1.3fr 1fr 1fr" }}
      >
        <LeaderboardPanel entries={LEADERBOARD} />
        <BadgesPanel badges={BADGES} collected={3} total={5} />
        <MatchRecord steps={MATCH_STEPS} hash="pending…" />
      </div>
    </main>
  );
}
