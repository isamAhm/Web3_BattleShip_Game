"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthCtx } from "@/lib/AuthContext";

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

const BADGE_META: Record<string, { color: string; rarity: string }> = {
  FIRST_WIN: { color: "gold", rarity: "Common" },
  HOT_STREAK: { color: "red", rarity: "Uncommon" },
  PERFECT_GAME: { color: "gold", rarity: "Rare" },
  MINE_DODGER: { color: "teal", rarity: "Uncommon" },
  ADMIRAL: { color: "gold", rarity: "Epic" },
};

export default function BadgesPage() {
  const { address } = useAuthCtx();
  const [badges, setBadges] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchBadges = async () => {
      setLoading(true);
      try {
        const allRes = await api.allBadges().catch(() => ({ badges: [] }));
        const allDefs: any[] = Array.isArray(allRes) ? allRes : allRes?.badges ?? [];

        let earnedIds = new Set<string>();
        if (address) {
          const userRes = await api.playerBadges(address).catch(() => ({ badges: [] }));
          const userBadges: any[] = Array.isArray(userRes) ? userRes : (userRes as any)?.badges ?? [];
          userBadges.forEach((b: any) => earnedIds.add(b.badgeId || b.id));
        }

        if (!cancelled) {
          const mapped = allDefs.map((def: any) => {
            const meta = BADGE_META[def.id] || { color: "teal", rarity: "Uncommon" };
            return {
              id: def.id,
              name: def.name,
              description: def.description,
              color: meta.color,
              rarity: meta.rarity,
              unlocked: earnedIds.has(def.id),
            };
          });
          setBadges(mapped);
        }
      } catch (err) {
        console.warn("[BadgesPage] Failed to fetch badges:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchBadges();
    return () => {
      cancelled = true;
    };
  }, [address]);

  const unlocked = badges.filter((b) => b.unlocked).length;

  return (
    <main className="max-w-[900px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Your Badges
        </h1>
        <p className="text-[var(--mist)] mt-1">
          {address ? `Commander ${address.slice(0, 6)}…${address.slice(-4)} · ` : ""}
          {unlocked} of {badges.length} unlocked — keep playing in the arena to earn on-chain ERC-1155 commendations.
        </p>
      </div>

      {loading ? (
        <div className="py-16 text-center text-[var(--mist)] font-mono animate-pulse">
          Loading commander commendations from chain…
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {badges.map((badge) => (
            <div
              key={badge.id}
              className={cn(
                "rounded-[20px] p-5 border transition-all",
                !badge.unlocked && "opacity-40 grayscale"
              )}
              style={{
                background:
                  "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
                borderColor: badge.unlocked ? "var(--signal)" : "var(--line)",
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
                {badge.unlocked && (
                  <span className="block text-[12px] text-[var(--signal)] font-bold mt-1">
                    ✓ Unlocked
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
