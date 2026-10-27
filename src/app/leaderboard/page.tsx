import type { Metadata } from "next";
import { LEADERBOARD } from "@/lib/gameData";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leaderboard · Web3 Battle Arena",
};

const FULL_LEADERBOARD = [
  ...LEADERBOARD,
  { rank: 5, name: "Phantom", wins: 5, points: 980 },
  { rank: 6, name: "SilverHull", wins: 4, points: 820 },
  { rank: 7, name: "Corsair", wins: 3, points: 650 },
  { rank: 8, name: "Vortex", wins: 2, points: 510 },
];

export default function LeaderboardPage() {
  return (
    <main className="max-w-[900px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Leaderboard
        </h1>
        <p className="text-[var(--mist)] mt-1">
          All-time rankings across Battle Arena matches on Base Sepolia.
        </p>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total matches", value: "1,284" },
          { label: "Active players", value: "312" },
          { label: "Shots fired today", value: "48,901" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-[20px] p-5 border"
            style={{
              background:
                "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
              borderColor: "var(--line)",
            }}
          >
            <div className="font-display font-extrabold text-[34px] tracking-tighter">
              {stat.value}
            </div>
            <div className="text-[var(--mist)] text-sm mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="rounded-[20px] border overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr
              className="border-b"
              style={{ borderColor: "var(--line)" }}
            >
              <th className="text-left font-medium text-[var(--mist)] text-[13px] py-4 px-5 w-[50px]">
                #
              </th>
              <th className="text-left font-medium text-[var(--mist)] text-[13px] py-4">
                Player
              </th>
              <th className="text-left font-medium text-[var(--mist)] text-[13px] py-4">
                Wins
              </th>
              <th className="text-left font-medium text-[var(--mist)] text-[13px] py-4">
                Losses
              </th>
              <th className="text-right font-medium text-[var(--mist)] text-[13px] py-4 pr-5">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {FULL_LEADERBOARD.map((entry) => (
              <tr
                key={entry.rank}
                className={cn(
                  "border-b transition-colors",
                  entry.isYou
                    ? "bg-[rgba(235,181,74,0.05)]"
                    : "hover:bg-[rgba(53,214,192,0.03)]"
                )}
                style={{ borderColor: "var(--line)" }}
              >
                <td
                  className="py-4 px-5 font-display font-extrabold text-[16px]"
                  style={{ color: entry.isYou ? "var(--brass)" : "var(--mist)" }}
                >
                  {entry.rank}
                </td>
                <td
                  className="py-4 font-medium"
                  style={{ color: entry.isYou ? "var(--brass)" : undefined }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-8 h-8 rounded-full flex-none"
                      style={{
                        background: entry.isYou
                          ? "linear-gradient(135deg,var(--brass),var(--flare))"
                          : "linear-gradient(135deg,var(--signal),#3a6df0)",
                      }}
                      aria-hidden="true"
                    />
                    {entry.name}
                  </div>
                </td>
                <td className="py-4" style={{ color: entry.isYou ? "var(--brass)" : undefined }}>
                  {entry.wins}
                </td>
                <td className="py-4 text-[var(--mist)]">
                  {Math.max(1, Math.floor(entry.wins * 0.4))}
                </td>
                <td
                  className="py-4 pr-5 text-right font-display font-bold"
                  style={{ color: entry.isYou ? "var(--brass)" : undefined }}
                >
                  {entry.points.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
