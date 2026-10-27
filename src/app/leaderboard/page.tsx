import type { Metadata } from "next";
import { LeaderboardLive } from "@/components/leaderboard/LeaderboardLive";

export const metadata: Metadata = { title: "Leaderboard · Web3 Battle Arena" };

export default function LeaderboardPage() {
  return (
    <main className="max-w-[900px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Leaderboard
        </h1>
        <p className="text-[var(--mist)] mt-1">
          Live rankings from on-chain match records on Base Sepolia.
        </p>
      </div>
      <LeaderboardLive />
    </main>
  );
}
