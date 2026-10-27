import { cn } from "@/lib/utils";
import type { LobbyView } from "./LobbyClient";

const ITEMS: { id: LobbyView; label: string; icon: React.ReactNode }[] = [
  {
    id: "play",
    label: "Play",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="2" width="14" height="14" rx="3.5" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.06)" />
        <circle cx="6" cy="7" r="1.5" fill="currentColor" opacity="0.7" />
        <circle cx="12" cy="7" r="1.5" fill="currentColor" opacity="0.7" />
        <path d="M5 12c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "create",
    label: "Create Room",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <rect x="2" y="4" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.06)" />
        <path d="M6 4V3a3 3 0 0 1 6 0v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M9 8v4M7 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "join",
    label: "Join Room",
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
        <circle cx="7" cy="6" r="3" stroke="currentColor" strokeWidth="1.5" fill="rgba(255,255,255,0.06)" />
        <path d="M2 16c0-3.3 2.2-6 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <path d="M13 10v6M10 13h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

interface Props {
  active: LobbyView;
  onChange: (v: LobbyView) => void;
}

export function LobbySidebar({ active, onChange }: Props) {
  return (
    <aside
      className="hidden md:flex flex-col w-[220px] flex-none border-r py-8 px-4 gap-1"
      style={{ borderColor: "var(--line)" }}
    >
      <p className="text-[11px] font-semibold tracking-widest uppercase text-[var(--mist)] px-3 mb-3">
        Lobby
      </p>
      {ITEMS.map(({ id, label, icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={cn(
              "flex items-center gap-3 px-3 py-3 rounded-[12px] font-medium text-[15px] text-left transition-all",
              isActive
                ? "text-[var(--foam)]"
                : "text-[var(--mist)] hover:text-[var(--foam)] hover:bg-[var(--hull)]"
            )}
            style={
              isActive
                ? {
                    background:
                      "linear-gradient(135deg, var(--accent-cta) 0%, color-mix(in srgb, var(--accent-cta) 60%, var(--hull)) 100%)",
                    color: "var(--cta-text)",
                  }
                : undefined
            }
            aria-current={isActive ? "page" : undefined}
          >
            <span className="flex-none">{icon}</span>
            {label}
          </button>
        );
      })}

      {/* Divider */}
      <div className="my-4 border-t" style={{ borderColor: "var(--line)" }} />

      {/* Quick stats */}
      <div className="px-3 grid gap-3">
        <StatLine label="Online now" value="312" />
        <StatLine label="Active rooms" value="48" />
        <StatLine label="In queue" value="7" />
      </div>
    </aside>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-[13px]">
      <span className="text-[var(--mist)]">{label}</span>
      <span className="font-display font-bold text-[var(--foam)]">{value}</span>
    </div>
  );
}
