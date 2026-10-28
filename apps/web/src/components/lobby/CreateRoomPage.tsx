"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const MODES = [
  {
    id: "classic",
    label: "Classic",
    desc: "Standard 10×10, 5 ships",
    icon: "⚓",
  },
  {
    id: "blitz",
    label: "Blitz",
    desc: "60-second turns",
    icon: "⚡",
  },
  {
    id: "tournament",
    label: "Tournament",
    desc: "Compete for rewards",
    icon: "🏆",
  },
];

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export function CreateRoomPage() {
  const router = useRouter();
  const [step, setStep] = useState<"config" | "ready">("config");
  const [name, setName]       = useState("");
  const [mode, setMode]       = useState("classic");
  const [mines, setMines]     = useState(3);
  const [turnTime, setTurnTime] = useState(30);
  const [isPrivate, setIsPrivate] = useState(false);
  const [spectators, setSpectators] = useState(true);
  const [roomCode]            = useState(generateCode);
  const [copied, setCopied]   = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const selectedMode = MODES.find((m) => m.id === mode)!;

  if (step === "ready") {
    return (
      <div className="max-w-[680px]">
        {/* Back */}
        <button
          type="button"
          onClick={() => setStep("config")}
          className="flex items-center gap-2 text-[var(--mist)] text-[14px] hover:text-[var(--foam)] transition-colors mb-7"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Back to settings
        </button>

        <h1 className="font-display font-extrabold text-[30px] tracking-tighter mb-1">
          Room Created!
        </h1>
        <p className="text-[var(--mist)] text-[14px] mb-8">
          Share the code below with your opponent.
        </p>

        {/* Code card */}
        <div
          className="rounded-[24px] border p-8 mb-6 text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, rgba(19,48,59,.7), rgba(12,34,43,.9))",
            borderColor: "var(--signal)",
            boxShadow: "0 0 0 1px rgba(53,214,192,0.1), 0 20px 60px -20px rgba(53,214,192,0.2)",
          }}
        >
          {/* Glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(53,214,192,0.08) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <p className="text-[var(--mist)] text-[13px] font-semibold tracking-widest uppercase mb-4">
            Room Code
          </p>
          <div
            className="font-display font-extrabold tracking-[0.3em] mb-6 select-all"
            style={{ fontSize: "clamp(36px, 6vw, 56px)", color: "var(--signal)" }}
          >
            {roomCode}
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-[10px] font-semibold text-[14px] border transition-all hover:bg-[var(--hull)]"
            style={{ borderColor: "var(--line)", color: copied ? "var(--signal)" : "var(--foam)" }}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 7l3.5 3.5L12 3" stroke="var(--signal)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.4"/>
                  <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                </svg>
                Copy code
              </>
            )}
          </button>
        </div>

        {/* Room summary */}
        <div
          className="rounded-[18px] border p-5 mb-6 grid grid-cols-2 md:grid-cols-4 gap-5"
          style={{ borderColor: "var(--line)", background: "rgba(12,34,43,0.5)" }}
        >
          {[
            { label: "Room name", value: name || "Unnamed room" },
            { label: "Mode",      value: selectedMode.label },
            { label: "Mines",     value: mines > 0 ? `×${mines} each` : "None" },
            { label: "Turn time", value: `${turnTime}s` },
          ].map((s) => (
            <div key={s.label}>
              <div className="text-[12px] text-[var(--mist)] mb-0.5">{s.label}</div>
              <div className="font-display font-bold text-[15px]">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Waiting indicator */}
        <div
          className="rounded-[16px] border px-5 py-4 flex items-center gap-4 mb-8"
          style={{ borderColor: "rgba(53,214,192,0.25)", background: "rgba(53,214,192,0.04)" }}
        >
          <div className="flex gap-1 items-center flex-none">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: "var(--signal)",
                  animation: `pulse-glow 1.2s ${i * 0.2}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>
          <div>
            <div className="font-medium text-[14px]">Waiting for opponent…</div>
            <div className="text-[var(--mist)] text-[12px]">
              The match starts as soon as someone joins with your code.
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/arena")}
            className="flex-1 py-3.5 rounded-[14px] font-display font-bold text-[16px] transition-all hover:-translate-y-px"
            style={{
              background: "var(--accent-cta)",
              color: "var(--cta-text)",
              boxShadow: "0 6px 24px -6px var(--cta-shadow)",
            }}
          >
            Enter Arena
          </button>
          <button
            type="button"
            onClick={() => setStep("config")}
            className="px-6 py-3.5 rounded-[14px] font-display font-bold text-[15px] border transition-all hover:bg-[var(--hull)]"
            style={{ borderColor: "var(--line)" }}
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">
      {/* ── Left: form ── */}
      <div>
        <div className="mb-7">
          <h1 className="font-display font-extrabold text-[30px] tracking-tighter">
            Create a Room
          </h1>
          <p className="text-[var(--mist)] mt-1 text-[14px]">
            Configure your match, then share the code with your opponent.
          </p>
        </div>

        <div className="grid gap-5">
          {/* Room name */}
          <FormField label="Room name">
            <input
              className="input-base"
              placeholder="e.g. Captain Mira's War Room"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </FormField>

          {/* Game mode */}
          <FormField label="Game mode">
            <div className="grid grid-cols-3 gap-3">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  className="flex flex-col items-center gap-1.5 py-4 px-3 rounded-[14px] border transition-all hover:-translate-y-0.5"
                  style={{
                    background: mode === m.id ? "color-mix(in srgb, var(--accent-cta) 15%, var(--hull))" : "var(--hull)",
                    borderColor: mode === m.id ? "var(--accent-cta)" : "var(--line)",
                    boxShadow: mode === m.id ? "0 4px 20px -6px var(--cta-shadow)" : undefined,
                  }}
                  aria-pressed={mode === m.id}
                >
                  <span className="text-[22px]">{m.icon}</span>
                  <span className="font-display font-bold text-[13px]">{m.label}</span>
                  <span className="text-[var(--mist)] text-[11px]">{m.desc}</span>
                </button>
              ))}
            </div>
          </FormField>

          {/* Mines slider */}
          <FormField label={`Mines per player — ${mines === 0 ? "disabled" : `×${mines}`}`}>
            <div className="px-1">
              <input
                type="range"
                min={0}
                max={5}
                value={mines}
                onChange={(e) => setMines(Number(e.target.value))}
                className="w-full"
                style={{ accentColor: "var(--signal)" }}
              />
              <div className="flex justify-between text-[11px] text-[var(--mist)] mt-1.5">
                {[0,1,2,3,4,5].map((n) => (
                  <span key={n} style={{ color: mines === n ? "var(--signal)" : undefined, fontWeight: mines === n ? 700 : undefined }}>
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </FormField>

          {/* Turn time */}
          <FormField label={`Turn time — ${turnTime} seconds`}>
            <div className="flex gap-2 flex-wrap">
              {[15, 20, 30, 45, 60].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTurnTime(t)}
                  className="px-4 py-2 rounded-[10px] border text-[13px] font-semibold transition-all"
                  style={{
                    background: turnTime === t ? "var(--accent-cta)" : "var(--hull)",
                    color: turnTime === t ? "var(--cta-text)" : "var(--mist)",
                    borderColor: turnTime === t ? "var(--accent-cta)" : "var(--line)",
                  }}
                  aria-pressed={turnTime === t}
                >
                  {t}s
                </button>
              ))}
            </div>
          </FormField>

          {/* Toggles */}
          <FormField label="Options">
            <div
              className="rounded-[16px] border divide-y overflow-hidden"
              style={{ borderColor: "var(--line)", background: "rgba(12,34,43,0.4)" }}
            >
              <ToggleRow
                label="Private room"
                description="Only players with the code can join"
                value={isPrivate}
                onChange={setIsPrivate}
              />
              <ToggleRow
                label="Allow spectators"
                description="Others can watch but not see ship positions"
                value={spectators}
                onChange={setSpectators}
              />
            </div>
          </FormField>

          <button
            type="button"
            onClick={() => setStep("ready")}
            className="w-full py-4 rounded-[14px] font-display font-bold text-[17px] transition-all hover:-translate-y-px mt-1"
            style={{
              background: "var(--accent-cta)",
              color: "var(--cta-text)",
              boxShadow: "0 8px 28px -8px var(--cta-shadow)",
            }}
          >
            Create Room →
          </button>
        </div>
      </div>

      {/* ── Right: live preview card ── */}
      <div className="hidden md:block sticky top-24">
        <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--mist)] mb-3">
          Room preview
        </p>
        <div
          className="rounded-[20px] border p-5"
          style={{
            background: "linear-gradient(180deg,rgba(19,48,59,.6),rgba(12,34,43,.8))",
            borderColor: "var(--line)",
          }}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-5">
            <div>
              <div className="font-display font-bold text-[16px] truncate max-w-[180px]">
                {name || <span className="text-[var(--mist)] font-normal italic">Unnamed room</span>}
              </div>
              <div className="text-[var(--mist)] text-[12px] mt-0.5">Hosted by Captain Mira</div>
            </div>
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full flex-none"
              style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
            >
              Waiting
            </span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 mb-5">
            {[
              { label: "Mode",      value: selectedMode.label },
              { label: "Turn time", value: `${turnTime}s` },
              { label: "Mines",     value: mines > 0 ? `×${mines}` : "None" },
              { label: "Privacy",   value: isPrivate ? "Private" : "Public" },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-[10px] p-3 text-center"
                style={{ background: "rgba(12,34,43,0.6)", border: "1px solid var(--line)" }}
              >
                <div className="text-[11px] text-[var(--mist)] mb-0.5">{s.label}</div>
                <div className="font-display font-bold text-[13px]">{s.value}</div>
              </div>
            ))}
          </div>

          {/* Players */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <span
                className="w-8 h-8 rounded-full flex-none"
                style={{ background: "linear-gradient(135deg,var(--brass),var(--flare))" }}
                aria-hidden="true"
              />
              <div>
                <div className="text-[13px] font-semibold">Captain Mira</div>
                <div className="text-[11px] text-[var(--signal)]">Host · Ready</div>
              </div>
            </div>
            <span className="text-[var(--mist)] text-[12px]">vs</span>
            <div
              className="flex items-center gap-2 flex-1 justify-end opacity-40"
              style={{ flexDirection: "row-reverse" }}
            >
              <div
                className="w-8 h-8 rounded-full border-2 border-dashed flex-none"
                style={{ borderColor: "var(--mist)" }}
                aria-hidden="true"
              />
              <div className="text-right">
                <div className="text-[13px] font-semibold text-[var(--mist)]">Waiting…</div>
              </div>
            </div>
          </div>

          {/* Spectators badge */}
          {spectators && (
            <div
              className="text-[12px] text-[var(--mist)] flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 2C3.5 2 1.5 4 1.5 6S3.5 10 6 10 10.5 8 10.5 6 8.5 2 6 2z" stroke="var(--mist)" strokeWidth="1.2" fill="none"/>
                <circle cx="6" cy="6" r="1.5" fill="var(--mist)" opacity="0.6"/>
              </svg>
              Spectators allowed
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-2">
      <label className="text-[13px] font-semibold text-[var(--mist)] tracking-wide uppercase">
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 px-4 py-3.5 cursor-pointer"
      onClick={() => onChange(!value)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onChange(!value)}
    >
      <div>
        <div className="font-medium text-[14px]">{label}</div>
        <div className="text-[var(--mist)] text-[12px] mt-0.5">{description}</div>
      </div>
      <span
        className="relative w-11 h-6 rounded-full border flex-none transition-colors"
        style={{
          background: value ? "var(--signal)" : "var(--hull)",
          borderColor: value ? "var(--signal)" : "var(--line)",
        }}
        aria-checked={value}
        role="switch"
      >
        <span
          className="absolute top-[3px] w-[18px] h-[18px] rounded-full transition-all duration-200"
          style={{
            background: value ? "var(--abyss)" : "var(--mist)",
            left: value ? "calc(100% - 21px)" : "3px",
          }}
        />
      </span>
    </div>
  );
}
