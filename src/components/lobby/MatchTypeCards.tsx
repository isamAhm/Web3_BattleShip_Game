"use client";


interface Props {
  onQuickMatch: () => void;
  onJoin: () => void;
  onCreate: () => void;
  inQueue?: boolean;
}

export function MatchTypeCards({ onQuickMatch, onJoin, onCreate, inQueue }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      {/* ── Quick Match ── */}
      <div
        className="relative flex flex-col rounded-[20px] p-6 border transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(160deg, rgba(19,48,59,.7), rgba(12,34,43,.85))",
          borderColor: "color-mix(in srgb, var(--accent-cta) 40%, transparent)",
          boxShadow: "0 0 0 1px color-mix(in srgb, var(--cta-shadow) 20%, transparent), 0 20px 60px -20px var(--cta-shadow)",
        }}
      >
        <div
          className="w-14 h-14 rounded-[18px] grid place-items-center mb-4 text-[26px]"
          style={{
            background: "var(--accent-cta)",
            boxShadow: "0 8px 24px -8px var(--cta-shadow)",
          }}
          aria-hidden="true"
        >
          ⚡
        </div>
        <h3 className="font-display font-bold text-[18px] tracking-tight mb-1">Quick Match</h3>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Instantly matched against a real opponent. Ranked and recorded on-chain.
        </p>
        <button
          type="button"
          onClick={onQuickMatch}
          disabled={inQueue}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-[12px] font-display font-bold text-[15px] transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "var(--accent-cta)",
            color: "var(--cta-text)",
            boxShadow: "0 6px 20px -6px var(--cta-shadow)",
          }}
        >
          {inQueue ? "Searching…" : (
            <>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Play
            </>
          )}
        </button>
      </div>

      {/* ── Join Room ── */}
      <div
        className="relative flex flex-col rounded-[20px] p-6 border transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <div
          className="w-14 h-14 rounded-[18px] grid place-items-center mb-4 text-[26px]"
          style={{
            background: "rgba(53,214,192,0.1)",
            border: "1px solid rgba(53,214,192,0.2)",
          }}
          aria-hidden="true"
        >
          👥
        </div>
        <h3 className="font-display font-bold text-[18px] tracking-tight mb-1">Join Room</h3>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Enter a 6-character code to join a private match created by a friend.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="w-full py-3 rounded-[12px] font-display font-bold text-[15px] border transition-all hover:-translate-y-px hover:bg-[var(--hull)]"
          style={{ borderColor: "var(--line)" }}
        >
          Enter Code
        </button>
      </div>

      {/* ── Create Room ── */}
      <div
        className="relative flex flex-col rounded-[20px] p-6 border transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <div
          className="w-14 h-14 rounded-[18px] grid place-items-center mb-4 text-[26px]"
          style={{
            background: "rgba(235,181,74,0.1)",
            border: "1px solid rgba(235,181,74,0.2)",
          }}
          aria-hidden="true"
        >
          ➕
        </div>
        <h3 className="font-display font-bold text-[18px] tracking-tight mb-1">Create Room</h3>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Configure a custom match with your own rules and share the code with opponents.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="w-full py-3 rounded-[12px] font-display font-bold text-[15px] border transition-all hover:-translate-y-px hover:bg-[var(--hull)]"
          style={{ borderColor: "var(--line)" }}
        >
          Create
        </button>
      </div>
    </div>
  );
}
