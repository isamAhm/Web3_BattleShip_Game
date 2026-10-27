import type { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Badges · Web3 Battle Arena",
};

const ALL_BADGES = [
  {
    name: "First Win",
    description: "Win your very first match.",
    color: "gold",
    unlocked: true,
    rarity: "Common",
  },
  {
    name: "Hot Streak",
    description: "Hit 5 shots in a row without missing.",
    color: "red",
    unlocked: true,
    rarity: "Uncommon",
  },
  {
    name: "Mine Dodger",
    description: "Survive a match without hitting a mine.",
    color: "teal",
    unlocked: true,
    rarity: "Uncommon",
  },
  {
    name: "Perfect Game",
    description: "Win without any of your ships getting hit.",
    color: "gold",
    unlocked: false,
    rarity: "Rare",
  },
  {
    name: "Admiral",
    description: "Reach 30 total wins.",
    color: "gold",
    unlocked: false,
    rarity: "Epic",
  },
  {
    name: "Speedster",
    description: "Win a match in under 5 minutes.",
    color: "teal",
    unlocked: false,
    rarity: "Rare",
  },
];

const gradients: Record<string, string> = {
  gold: "linear-gradient(150deg,var(--brass),#b5762a)",
  red: "linear-gradient(150deg,var(--flare),#a8321f)",
  teal: "linear-gradient(150deg,var(--signal),#1c7f8f)",
};

const rarityColors: Record<string, string> = {
  Common: "text-[var(--mist)]",
  Uncommon: "text-[var(--signal)]",
  Rare: "text-[var(--brass)]",
  Epic: "text-[var(--flare)]",
};

export default function BadgesPage() {
  const unlocked = ALL_BADGES.filter((b) => b.unlocked).length;

  return (
    <main className="max-w-[900px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Your Badges
        </h1>
        <p className="text-[var(--mist)] mt-1">
          {unlocked} of {ALL_BADGES.length} unlocked — keep playing to earn more.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {ALL_BADGES.map((badge) => (
          <div
            key={badge.name}
            className={cn(
              "rounded-[20px] p-5 border transition-all",
              !badge.unlocked && "opacity-40 grayscale"
            )}
            style={{
              background:
                "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
              borderColor: "var(--line)",
            }}
          >
            {/* Badge icon */}
            <span
              className="block w-[64px] h-[64px] rounded-[18px] mb-4 relative mx-auto"
              style={{
                background: gradients[badge.color],
                boxShadow: badge.unlocked
                  ? "0 10px 24px -10px rgba(235,181,74,0.4)"
                  : undefined,
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

            <div className="text-center">
              <h3 className="font-display font-bold text-[15px] tracking-tight mb-1">
                {badge.name}
              </h3>
              <p className="text-[var(--mist)] text-[13px] mb-2">
                {badge.description}
              </p>
              <span
                className={cn(
                  "text-[12px] font-semibold",
                  rarityColors[badge.rarity]
                )}
              >
                {badge.rarity}
              </span>
              {!badge.unlocked && (
                <span className="block text-[12px] text-[var(--mist)] mt-1">
                  🔒 Locked
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
