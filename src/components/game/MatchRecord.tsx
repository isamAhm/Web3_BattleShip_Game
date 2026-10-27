import { cn } from "@/lib/utils";
import type { MatchStep } from "@/types/game";

export function MatchRecord({
  steps,
  hash,
}: {
  steps: MatchStep[];
  hash: string;
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
        Match record
      </h2>

      <div className="grid gap-3.5 mt-4">
        {steps.map((step) => (
          <div key={step.label} className="flex gap-3 items-start text-sm">
            <span
              className={cn(
                "w-[22px] h-[22px] rounded-full flex-none border-2 mt-0.5",
                step.status === "done" &&
                  "bg-[var(--signal)] border-[var(--signal)]",
                step.status === "active" &&
                  "border-[var(--brass)] shadow-[0_0_0_4px_rgba(235,181,74,.15)]",
                step.status === "pending" && "border-[var(--line)] bg-transparent"
              )}
              aria-label={step.status}
            />
            <div>
              <span className="font-medium">{step.label}</span>
              <small className="block text-[var(--mist)] text-[13px]">
                {step.description}
              </small>
            </div>
          </div>
        ))}
      </div>

      <div
        className="mt-4 p-3 rounded-[10px] text-[var(--mist)] text-[13px] break-all"
        style={{ background: "var(--abyss)" }}
      >
        {hash} · result hash
      </div>
    </section>
  );
}
