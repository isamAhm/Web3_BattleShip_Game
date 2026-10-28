import type { Metadata } from "next";
import { ReplaysList } from "@/components/replays/ReplaysList";

export const metadata: Metadata = { title: "Replays · Web3 Battle Arena" };

export default function ReplaysPage() {
  return (
    <main className="max-w-[900px] mx-auto px-8 py-10">
      <div className="mb-8">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Replays
        </h1>
        <p className="text-[var(--mist)] mt-1">
          Every match is recorded. Anyone can verify the result hash.
        </p>
      </div>
      <ReplaysList />
    </main>
  );
}
