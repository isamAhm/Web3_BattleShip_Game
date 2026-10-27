const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="8" height="8" rx="2" fill="rgba(53,214,192,0.3)" stroke="var(--signal)" strokeWidth="1.5" />
        <rect x="12" y="2" width="8" height="8" rx="2" fill="rgba(53,214,192,0.1)" stroke="rgba(53,214,192,0.4)" strokeWidth="1.5" />
        <rect x="2" y="12" width="8" height="8" rx="2" fill="rgba(53,214,192,0.1)" stroke="rgba(53,214,192,0.4)" strokeWidth="1.5" />
        <rect x="12" y="12" width="8" height="8" rx="2" fill="rgba(53,214,192,0.3)" stroke="var(--signal)" strokeWidth="1.5" />
      </svg>
    ),
    title: "Play & Earn",
    description: "Win matches, earn rewards",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <circle cx="11" cy="11" r="8" stroke="var(--signal)" strokeWidth="1.5" fill="rgba(53,214,192,0.08)" />
        <circle cx="11" cy="11" r="3" fill="var(--signal)" opacity="0.7" />
        <line x1="11" y1="3" x2="11" y2="6" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="11" y1="16" x2="11" y2="19" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="3" y1="11" x2="6" y2="11" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="11" x2="19" y2="11" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    title: "Own Your Stats",
    description: "Onchain profile & achievements",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <path d="M11 2 L13.5 8H20L15 12L17 18L11 14.5L5 18L7 12L2 8H8.5Z" fill="rgba(53,214,192,0.15)" stroke="var(--signal)" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
    title: "Compete Globally",
    description: "Tournaments & leaderboards",
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
        <rect x="3" y="8" width="16" height="11" rx="3" stroke="var(--signal)" strokeWidth="1.5" fill="rgba(53,214,192,0.08)" />
        <path d="M7 8V6a4 4 0 0 1 8 0v2" stroke="var(--signal)" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="11" cy="14" r="2" fill="var(--signal)" opacity="0.7" />
      </svg>
    ),
    title: "Provably Fair",
    description: "Fleet commitment hash on Base",
  },
];

export function FeatureStrip() {
  return (
    <div
      className="border-t"
      style={{
        background: "rgba(6,20,26,0.75)",
        backdropFilter: "blur(12px)",
        borderColor: "var(--line)",
      }}
    >
      <div className="max-w-[1280px] mx-auto px-8 py-5 grid grid-cols-2 md:grid-cols-4 gap-6">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex items-center gap-3">
            <span
              className="w-10 h-10 rounded-[10px] flex-none grid place-items-center"
              style={{
                background: "rgba(53,214,192,0.08)",
                border: "1px solid rgba(53,214,192,0.15)",
              }}
            >
              {f.icon}
            </span>
            <div>
              <div className="font-display font-bold text-[14px] text-[var(--foam)]">
                {f.title}
              </div>
              <div className="text-[var(--mist)] text-[12px]">{f.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
