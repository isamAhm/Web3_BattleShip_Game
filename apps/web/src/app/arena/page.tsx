import { Suspense } from "react";
import { ArenaClient } from "@/components/game/ArenaClient";

export default function ArenaPage() {
  return (
    <Suspense fallback={<div className="p-16 text-center text-[var(--mist)] font-medium">Loading Battle Arena…</div>}>
      <ArenaClient />
    </Suspense>
  );
}
