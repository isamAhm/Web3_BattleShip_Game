"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { useAuthCtx } from "@/lib/AuthContext";
import type { Badge } from "@/types/game";

const badgeGradients: Record<string, string> = {
  gold: "linear-gradient(150deg,var(--brass),#b5762a)",
  red: "linear-gradient(150deg,var(--flare),#a8321f)",
  teal: "linear-gradient(150deg,var(--signal),#1c7f8f)",
};

const BADGE_COLOR_MAP: Record<string, string> = {
  FIRST_WIN: "gold",
  HOT_STREAK: "red",
  PERFECT_GAME: "gold",
  MINE_DODGER: "teal",
  ADMIRAL: "gold",
};

export function BadgesPanel({
  badges: propBadges,
  collected: propCollected,
  total: propTotal,
}: {
  badges?: Badge[];
  collected?: number;
  total?: number;
}) {
  const { address } = useAuthCtx();
  const [badgeList, setBadgeList] = useState<Array<{ id: string; name: string; description: string; color: string; locked: boolean }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadBadges = async () => {
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
          if (allDefs.length > 0) {
            const mapped = allDefs.map((def: any) => ({
              id: def.id,
              name: def.name,
              description: def.description,
              color: BADGE_COLOR_MAP[def.id] || "teal",
              locked: !earnedIds.has(def.id),
            }));
            setBadgeList(mapped);
          } else if (propBadges && propBadges.length > 0) {
            setBadgeList(
              propBadges.map((b) => ({
                id: b.name,
                name: b.name,
                description: "Arena Combat Achievement",
                color: b.color || "gold",
                locked: b.locked ?? false,
              }))
            );
          }
        }
      } catch (err) {
        console.warn("[BadgesPanel] Failed to fetch badges:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadBadges();
    return () => {
      cancelled = true;
    };
  }, [address, propBadges]);

  const total = badgeList.length || propTotal || 5;
  const collected = badgeList.filter((b) => !b.locked).length;

  return (
    <section
      className="rounded-[20px] p-5 border flex flex-col justify-between"
      style={{
        background:
          "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
        borderColor: "var(--line)",
      }}
    >
      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-[17px] tracking-tight">
            Your Badges
          </h2>
          <span className="text-[11px] font-mono font-semibold text-[var(--signal)]">
            ERC-1155 NFT
          </span>
        </div>
        <p className="text-[var(--mist)] text-[14px] mt-0.5">
          {collected} of {total} collected
        </p>

        {loading ? (
          <div className="py-8 text-center text-[var(--mist)] font-mono text-[13px] animate-pulse">
            Scanning commander commendations…
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {badgeList.slice(0, 3).map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  "text-center text-[12px] font-medium transition-all group relative",
                  badge.locked && "opacity-40 grayscale"
                )}
                title={`${badge.name}: ${badge.description}`}
              >
                <span
                  className="block aspect-square rounded-[18px] mb-2 relative transition-transform group-hover:scale-105"
                  style={{
                    background: badgeGradients[badge.color] || badgeGradients.gold,
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
                  {!badge.locked && (
                    <span className="absolute bottom-1 right-1 text-[10px]">✨</span>
                  )}
                </span>
                <span className="truncate block font-semibold">{badge.name}</span>
                <span className="text-[10px] text-[var(--mist)] block mt-0.5">
                  {badge.locked ? "Locked" : "Unlocked"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 pt-2.5 border-t border-[var(--line)] flex justify-between items-center text-[11px] text-[var(--mist)]">
        <span>Minted directly to commander wallet</span>
        <a href="/badges" className="text-[var(--signal)] hover:underline">
          View All →
        </a>
      </div>
    </section>
  );
}
