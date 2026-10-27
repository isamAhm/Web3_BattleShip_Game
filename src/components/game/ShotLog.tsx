import { cn } from "@/lib/utils";
import type { ShotLogEntry } from "@/types/game";

const tagStyles: Record<string, string> = {
  hit: "bg-[rgba(255,106,77,.15)] text-[#ff9a84]",
  miss: "bg-[rgba(143,176,173,.15)] text-[var(--mist)]",
  sunk: "bg-[rgba(255,106,77,.28)] text-[#ffb4a4]",
  mine: "bg-[rgba(235,181,74,.18)] text-[var(--brass)]",
};

function tagLabel(entry: ShotLogEntry): string {
  if (entry.result === "sunk" && entry.detail) return entry.detail;
  if (entry.result === "mine" && entry.detail) return entry.detail;
  if (entry.result === "hit" && entry.multiplier) return `Hit ${entry.multiplier}`;
  return entry.result.charAt(0).toUpperCase() + entry.result.slice(1);
}

export function ShotLog({ entries }: { entries: ShotLogEntry[] }) {
  return (
    <div
      className="rounded-[20px] p-5 border"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <h2 className="font-display font-bold text-[17px] tracking-tight mb-3.5">
        Shot log
      </h2>
      <ul
        className="list-none p-0 grid gap-2.5 max-h-[230px] overflow-auto custom-scroll"
        aria-label="Shot history"
      >
        {entries.map((entry, i) => (
          <li key={i} className="flex gap-2.5 items-baseline text-sm">
            <b className="font-display font-bold text-[13px] min-w-[30px]">
              {entry.cell}
            </b>
            <span className="text-[var(--mist)]">
              {entry.actor === "you" ? "You fired" : `${entry.cell === "H3" ? "Kestrel" : "Kestrel"} fired`}
            </span>
            <span
              className={cn(
                "ml-auto text-[12px] font-semibold px-[9px] py-0.5 rounded-full whitespace-nowrap",
                tagStyles[entry.result]
              )}
            >
              {tagLabel(entry)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
