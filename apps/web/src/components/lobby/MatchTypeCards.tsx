"use client";

interface Props {
  onQuickMatch: () => void;
  onJoin: () => void;
  onCreate: () => void;
  onAiPractice?: () => void;
  inQueue?: boolean;
}

export function MatchTypeCards({ onQuickMatch, onJoin, onCreate, onAiPractice, inQueue }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* ── Quick Match ── */}
      <div
        className="rounded-[20px] p-6 border flex flex-col transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-10 h-10 rounded-[12px] grid place-items-center flex-none"
            style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M11 2L3 12h7l-1 6 8-10h-7l1-6z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="font-display font-extrabold text-[20px]">Quick Match</span>
        </div>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Instantly matched against an opponent or AI partner. Ranked and recorded on-chain.
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

      {/* ── Practice vs AI ── */}
      <div
        className="rounded-[20px] p-6 border flex flex-col transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-10 h-10 rounded-[12px] grid place-items-center flex-none"
            style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="12" cy="5" r="2" />
              <path d="M12 7v4" />
              <line x1="8" y1="16" x2="8" y2="16" strokeWidth="2.5" />
              <line x1="16" y1="16" x2="16" y2="16" strokeWidth="2.5" />
            </svg>
          </span>
          <span className="font-display font-extrabold text-[20px]">Practice vs AI</span>
        </div>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Train your fleet tactics solo against tactical AI bots. No matchmaking wait.
        </p>
        <button
          type="button"
          onClick={onAiPractice}
          className="w-full py-3 rounded-[12px] font-display font-bold text-[15px] border transition-all hover:-translate-y-px"
          style={{ background: "rgba(53,214,192,0.12)", borderColor: "rgba(53,214,192,0.3)", color: "var(--signal)" }}
        >
          Train Solo
        </button>
      </div>

      {/* ── Join Room ── */}
      <div
        className="rounded-[20px] p-6 border flex flex-col transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-10 h-10 rounded-[12px] grid place-items-center flex-none"
            style={{ background: "rgba(235,181,74,0.12)", color: "var(--brass)" }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M13 7l5 5m0 0l-5 5m5-5H6a4 4 0 0 0-4 4v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="font-display font-extrabold text-[20px]">Join Room</span>
        </div>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Have a 6-character room code from a friend? Enter it and deploy immediately.
        </p>
        <button
          type="button"
          onClick={onJoin}
          className="w-full py-3 rounded-[12px] font-display font-bold text-[15px] border transition-all hover:-translate-y-px"
          style={{ background: "var(--hull)", borderColor: "var(--line)" }}
        >
          Enter Code
        </button>
      </div>

      {/* ── Create Room ── */}
      <div
        className="rounded-[20px] p-6 border flex flex-col transition-all hover:-translate-y-0.5"
        style={{
          background: "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
          borderColor: "var(--line)",
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="w-10 h-10 rounded-[12px] grid place-items-center flex-none"
            style={{ background: "rgba(139,127,240,0.12)", color: "#8b7ff0" }}
            aria-hidden="true"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </span>
          <span className="font-display font-extrabold text-[20px]">Create Room</span>
        </div>
        <p className="text-[var(--mist)] text-[13px] mb-6 leading-relaxed flex-1">
          Configure turn timer, wager, and visibility. Share a code to challenge anyone.
        </p>
        <button
          type="button"
          onClick={onCreate}
          className="w-full py-3 rounded-[12px] font-display font-bold text-[15px] border transition-all hover:-translate-y-px"
          style={{ background: "var(--hull)", borderColor: "var(--line)" }}
        >
          New Game
        </button>
      </div>
    </div>
  );
}
