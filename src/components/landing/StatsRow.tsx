const STATS = [
  { value: "12,480+", label: "Matches Played" },
  { value: "3,200+", label: "Active Captains" },
  { value: "98,000+", label: "Shots Fired Onchain" },
  { value: "$0", label: "Gas to Play" },
];

export function StatsRow() {
  return (
    <section
      className="border-y py-14"
      style={{ borderColor: "var(--line)" }}
    >
      <div className="max-w-[1280px] mx-auto px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((stat, i) => (
            <div key={i}>
              <div
                className="font-display font-extrabold text-[40px] tracking-tighter mb-1"
                style={{
                  background:
                    "linear-gradient(135deg, var(--foam) 0%, var(--signal) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {stat.value}
              </div>
              <div className="text-[var(--mist)] text-[14px]">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
