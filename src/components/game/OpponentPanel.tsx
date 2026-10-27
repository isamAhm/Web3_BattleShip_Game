import type { Player } from "@/types/game";

interface OpponentPanelProps {
  player: Player;
  shipsLeft: number;
  totalShips: number;
}

export function OpponentPanel({ player, shipsLeft, totalShips }: OpponentPanelProps) {
  return (
    <div
      className="rounded-[20px] p-5 border"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      {/* Who */}
      <div className="flex gap-3 items-center mb-4">
        <span
          className="w-[46px] h-[46px] rounded-full flex-none"
          style={{ background: "linear-gradient(135deg,var(--signal),#3a6df0)" }}
          aria-hidden="true"
        />
        <div>
          <strong className="block font-display font-bold text-[17px] tracking-tight">
            {player.name}
          </strong>
          <span className="text-[var(--mist)] text-sm">
            {player.address} · {player.wins} wins
          </span>
        </div>
      </div>

      <div className="flex justify-between mb-2">
        <span className="text-[var(--mist)]">Score</span>
        <strong>{player.score}</strong>
      </div>
      <div className="flex justify-between">
        <span className="text-[var(--mist)]">Ships left</span>
        <strong>
          {shipsLeft} of {totalShips}
        </strong>
      </div>

      {/* Live spectator note */}
      <div className="flex items-center gap-2 text-[13px] text-[var(--mist)] mt-3.5">
        <span
          className="w-[7px] h-[7px] rounded-full flex-none"
          style={{ background: "var(--flare)" }}
          aria-hidden="true"
        />
        Live now · spectators see shots, never ships
      </div>
    </div>
  );
}
