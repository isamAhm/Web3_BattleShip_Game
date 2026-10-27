import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Replays · Web3 Battle Arena",
};

const REPLAYS = [
  {
    id: "0x4be1…9d07",
    match: "Captain Mira vs Kestrel",
    result: "Win",
    duration: "8m 42s",
    shots: 22,
    date: "2 hours ago",
    hash: "0x4be1a3c9d07f8b2e1a4c9d07f8b2e1a4",
  },
  {
    id: "0x92fc…a13b",
    match: "Captain Mira vs Admiral Vega",
    result: "Loss",
    duration: "12m 18s",
    shots: 31,
    date: "1 day ago",
    hash: "0x92fc8d1a13b4e2f9c8d1a13b4e2f9c8d",
  },
  {
    id: "0x77ad…ee22",
    match: "Captain Mira vs Rook",
    result: "Win",
    duration: "6m 55s",
    shots: 18,
    date: "2 days ago",
    hash: "0x77ad3b9ee22f7c4a3b9ee22f7c4a3b9e",
  },
  {
    id: "0x31cd…f509",
    match: "Captain Mira vs SilverHull",
    result: "Win",
    duration: "9m 10s",
    shots: 25,
    date: "3 days ago",
    hash: "0x31cda4f5096e8b3a4f5096e8b3a4f509",
  },
];

export default function ReplaysPage() {
  return (
    <main className="max-w-[900px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Replays
        </h1>
        <p className="text-[var(--mist)] mt-1">
          Every match is recorded on-chain. Anyone can verify the result hash.
        </p>
      </div>

      <div className="grid gap-4">
        {REPLAYS.map((replay) => (
          <div
            key={replay.id}
            className="rounded-[20px] p-5 border flex flex-col gap-4 md:flex-row md:items-center"
            style={{
              background:
                "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
              borderColor: "var(--line)",
            }}
          >
            {/* Result badge */}
            <span
              className="w-16 h-16 rounded-[18px] flex-none grid place-items-center font-display font-extrabold text-[15px]"
              style={{
                background:
                  replay.result === "Win"
                    ? "rgba(53,214,192,0.12)"
                    : "rgba(255,106,77,0.12)",
                color:
                  replay.result === "Win" ? "var(--signal)" : "var(--flare)",
                border: `1px solid ${
                  replay.result === "Win"
                    ? "rgba(53,214,192,0.3)"
                    : "rgba(255,106,77,0.3)"
                }`,
              }}
            >
              {replay.result}
            </span>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-[15px] tracking-tight">
                {replay.match}
              </h3>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[var(--mist)] text-[13px]">
                <span>{replay.duration}</span>
                <span>{replay.shots} shots</span>
                <span>{replay.date}</span>
              </div>
              <div
                className="mt-2 px-2.5 py-1.5 rounded-[8px] text-[12px] text-[var(--mist)] font-mono truncate"
                style={{ background: "var(--abyss)" }}
              >
                {replay.hash}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-none">
              <button
                type="button"
                className="px-4 py-2 rounded-[10px] text-sm font-semibold transition-all hover:-translate-y-px"
                style={{ background: "var(--hull)", color: "var(--foam)" }}
              >
                Watch
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-[10px] text-sm font-semibold transition-all hover:-translate-y-px hover:shadow-[0_6px_20px_-4px_rgba(53,214,192,0.5)]"
                style={{ background: "var(--signal)", color: "var(--abyss)" }}
              >
                Verify
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
