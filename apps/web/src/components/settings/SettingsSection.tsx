export function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-[20px] border overflow-hidden"
      style={{
        background: "linear-gradient(180deg,rgba(19,48,59,.45),rgba(12,34,43,.65))",
        borderColor: "var(--line)",
      }}
    >
      {/* Section header */}
      <div
        className="px-6 py-5 border-b"
        style={{ borderColor: "var(--line)" }}
      >
        <h2 className="font-display font-bold text-[18px] tracking-tight">
          {title}
        </h2>
        <p className="text-[var(--mist)] text-[13px] mt-0.5">{description}</p>
      </div>

      {/* Content */}
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}
