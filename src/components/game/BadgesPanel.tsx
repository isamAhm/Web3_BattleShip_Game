import { cn } from "@/lib/utils";
import type { Badge } from "@/types/game";

const badgeGradients: Record<string, string> = {
  gold: "linear-gradient(150deg,var(--brass),#b5762a)",
  red: "linear-gradient(150deg,var(--flare),#a8321f)",
  teal: "linear-gradient(150deg,var(--signal),#1c7f8f)",
};

export function BadgesPanel({
  badges,
  collected,
  total,
}: {
  badges: Badge[];
  collected: number;
  total: number;
}) {
  return (
    <section
      className="rounded-[20px] p-5 border"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <h2 className="font-display font-bold text-[17px] tracking-tight">
        Your badges
      </h2>
      <p className="text-[var(--mist)] text-[14px] mt-0.5">
        {collected} of {total} collected
      </p>

      <div className="grid grid-cols-3 gap-3 mt-4">
        {badges.map((badge) => (
          <div
            key={badge.name}
            className={cn(
              "text-center text-[13px] font-medium",
              badge.locked && "opacity-40 grayscale"
            )}
          >
            <span
              className="block aspect-square rounded-[18px] mb-2 relative"
              style={{
                background: badgeGradients[badge.color],
                boxShadow: badge.locked
                  ? undefined
                  : `0 10px 24px -10px rgba(235,181,74,0.6)`,
              }}
              aria-hidden="true"
            >
              <span
                className="absolute inset-[28%]"
                style={{
                  background: "var(--abyss)",
                  opacity: 0.85,
                  clipPath:
                    "polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)",
                }}
              />
            </span>
            {badge.name}
          </div>
        ))}
      </div>
    </section>
  );
}
