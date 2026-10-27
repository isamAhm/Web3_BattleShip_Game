import type { Player, FleetShip } from "@/types/game";

interface PlayerPanelProps {
  player: Player;
  fleet: FleetShip[];
}

export function PlayerPanel({ player, fleet }: PlayerPanelProps) {
  return (
    <aside
      className="rounded-[20px] p-5 border"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      {/* Who */}
      <div className="flex gap-3 items-center mb-[18px]">
        <span
          className="w-[46px] h-[46px] rounded-full flex-none"
          style={{ background: "linear-gradient(135deg,var(--brass),var(--flare))" }}
          aria-hidden="true"
        />
        <div>
          <strong className="block font-display font-bold text-[17px] tracking-tight">
            {player.name}
          </strong>
          <span className="text-[var(--mist)]">
            {player.wins} wins · best streak 7
          </span>
        </div>
      </div>

      {/* Score */}
      <div className="font-display font-extrabold text-[52px] leading-none tracking-tighter mb-[18px]">
        {player.score}
        <small className="font-body font-medium text-sm text-[var(--mist)] tracking-normal ml-1.5">
          points this match
        </small>
      </div>

      {/* Streak */}
      <div
        className="p-3.5 rounded-[14px] mb-[18px]"
        style={{
          background: "rgba(235,181,74,.08)",
          border: "1px solid rgba(235,181,74,.25)",
        }}
      >
        <div className="flex justify-between items-baseline">
          <span>Hit streak</span>
          <strong className="font-display font-extrabold text-[26px] text-[var(--brass)]">
            {player.streakMultiplier}
          </strong>
        </div>
        <div className="flex gap-[5px] mt-2.5">
          {player.streakPips.map((on, i) => (
            <span
              key={i}
              className="flex-1 h-1.5 rounded-full"
              style={{
                background: on ? "var(--brass)" : "rgba(255,255,255,.1)",
                boxShadow: on ? "0 0 10px rgba(235,181,74,.6)" : undefined,
              }}
            />
          ))}
        </div>
      </div>

      {/* Fleet */}
      <h2 className="font-display font-bold text-[17px] tracking-tight mb-3">
        Your fleet
      </h2>
      <div className="grid gap-3">
        {fleet.map((ship) => (
          <div
            key={ship.name}
            className="flex justify-between items-center font-medium"
            style={{ color: ship.sunk ? "var(--mist)" : undefined }}
          >
            <span style={{ textDecoration: ship.sunk ? "line-through" : undefined }}>
              {ship.name}
            </span>
            <span className="flex gap-[3px]">
              {Array.from({ length: ship.size }, (_, i) => (
                <span
                  key={i}
                  className="w-3.5 h-3.5 rounded-[4px]"
                  style={{
                    background: i < ship.hits ? "var(--flare)" : "var(--signal)",
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </div>

      {/* Commit note */}
      <div
        className="mt-[18px] pt-4 border-t text-[13px] text-[var(--mist)]"
        style={{ borderColor: "var(--line)" }}
      >
        <strong
          className="flex items-center gap-2 text-[var(--signal)] text-[14px] mb-0.5"
        >
          <span
            className="w-4 h-4 rounded-full grid place-items-center text-[var(--abyss)] text-[10px]"
            style={{ background: "var(--signal)" }}
            aria-hidden="true"
          >
            ✓
          </span>
          Fleet committed
        </strong>
        Your board is locked with a hash. It is checked again when the match ends.
      </div>
    </aside>
  );
}
