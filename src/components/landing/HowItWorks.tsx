import Link from "next/link";

const STEPS = [
  {
    number: "01",
    title: "Connect Wallet",
    description:
      "Link your wallet to Base Sepolia. No gas required — we sponsor transactions so you can focus on strategy.",
    color: "var(--signal)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="9" width="22" height="16" rx="4" stroke="currentColor" strokeWidth="1.8" fill="rgba(53,214,192,0.08)" />
        <path d="M8 9V7a6 6 0 0 1 12 0v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
        <circle cx="14" cy="17" r="2.5" fill="currentColor" opacity="0.7" />
      </svg>
    ),
  },
  {
    number: "02",
    title: "Deploy Your Fleet",
    description:
      "Place your 5 ships on a 10×10 grid. Your layout is hashed and committed on-chain before the match starts.",
    color: "#6350dc",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <rect x="3" y="12" width="22" height="10" rx="3" stroke="currentColor" strokeWidth="1.8" fill="rgba(99,80,220,0.1)" />
        <rect x="7" y="8" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none" />
        <circle cx="20" cy="12" r="2" fill="currentColor" opacity="0.6" />
        <line x1="14" y1="5" x2="14" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "03",
    title: "Fire & Strategize",
    description:
      "Take turns firing shots. Hit streaks boost your multiplier. Mine placements add tactical depth.",
    color: "var(--brass)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <circle cx="14" cy="14" r="10" stroke="currentColor" strokeWidth="1.8" fill="rgba(235,181,74,0.08)" strokeDasharray="3 2" />
        <circle cx="14" cy="14" r="4" fill="currentColor" opacity="0.5" />
        <line x1="14" y1="4" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="14" y1="20" x2="14" y2="24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="4" y1="14" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="20" y1="14" x2="24" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    number: "04",
    title: "Collect Rewards",
    description:
      "Win matches to earn points and badges. Results are verified on-chain — anyone can audit the replay hash.",
    color: "var(--flare)",
    icon: (
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
        <path d="M14 3 L17 10H24L19 15L21 22L14 18L7 22L9 15L4 10H11Z" fill="rgba(255,106,77,0.12)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-8">
      <div className="max-w-[1280px] mx-auto">
        {/* Section header */}
        <div className="text-center mb-14">
          <p className="text-[var(--signal)] font-semibold text-[13px] tracking-[0.15em] uppercase mb-3">
            How it works
          </p>
          <h2 className="font-display font-extrabold text-[42px] tracking-tight mb-4">
            From wallet to winner
          </h2>
          <p className="text-[var(--mist)] text-[16px] max-w-[480px] mx-auto">
            Four simple steps to get into a ranked match and start earning on Base Sepolia.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <div
              key={step.number}
              className="relative rounded-[20px] p-6 border transition-all hover:-translate-y-1"
              style={{
                background:
                  "linear-gradient(180deg,rgba(19,48,59,.55),rgba(12,34,43,.7))",
                borderColor: "var(--line)",
              }}
            >
              {/* Connector line (not last) */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden lg:block absolute top-[42px] -right-[12px] w-6 h-px z-10"
                  style={{ background: "var(--line)" }}
                  aria-hidden="true"
                />
              )}

              {/* Step number */}
              <span
                className="font-display font-extrabold text-[48px] leading-none tracking-tighter opacity-10 absolute top-4 right-5 pointer-events-none select-none"
                style={{ color: step.color }}
                aria-hidden="true"
              >
                {step.number}
              </span>

              {/* Icon */}
              <span
                className="w-12 h-12 rounded-[14px] grid place-items-center mb-5"
                style={{
                  background: `${step.color}15`,
                  border: `1px solid ${step.color}30`,
                  color: step.color,
                }}
              >
                {step.icon}
              </span>

              <h3 className="font-display font-bold text-[17px] tracking-tight mb-2">
                {step.title}
              </h3>
              <p className="text-[var(--mist)] text-[14px] leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/arena"
            className="inline-flex items-center gap-2 text-[var(--signal)] font-semibold text-[15px] hover:gap-3 transition-all"
          >
            Start playing now
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
