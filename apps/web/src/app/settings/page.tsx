import type { Metadata } from "next";
import { ThemeSettings } from "@/components/settings/ThemeSettings";
import { NicknameSettings } from "@/components/settings/NicknameSettings";
import { SettingsSection } from "@/components/settings/SettingsSection";

export const metadata: Metadata = {
  title: "Settings · Web3 Battle Arena",
};

export default function SettingsPage() {
  return (
    <main className="max-w-[860px] mx-auto px-8 py-10">
      {/* Page header */}
      <div className="mb-10">
        <h1 className="font-display font-extrabold text-[36px] tracking-tighter">
          Settings
        </h1>
        <p className="text-[var(--mist)] mt-1 text-[15px]">
          Customise your Battle Arena experience.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Profile */}
        <SettingsSection
          title="Profile"
          description="Your nickname is shown to opponents in matches and on the leaderboard."
        >
          <NicknameSettings />
        </SettingsSection>

        {/* Theme */}
        <SettingsSection
          title="Appearance"
          description="Choose the visual theme applied across all pages."
        >
          <ThemeSettings />
        </SettingsSection>

        {/* Display */}
        <SettingsSection
          title="Display"
          description="Adjust visual effects and animations."
        >
          <DisplaySettings />
        </SettingsSection>

        {/* Game */}
        <SettingsSection
          title="Gameplay"
          description="Preferences for in-match behaviour."
        >
          <GameplaySettings />
        </SettingsSection>

        {/* Network */}
        <SettingsSection
          title="Network"
          description="Blockchain and wallet connection settings."
        >
          <NetworkSettings />
        </SettingsSection>
      </div>
    </main>
  );
}

/* ── Static sub-sections (no interactivity needed for hackathon) ── */

function DisplaySettings() {
  return (
    <div className="grid gap-4">
      <ToggleRow
        label="Radar sweep animation"
        description="Animated sweep over enemy waters during battle."
        defaultOn
      />
      <ToggleRow
        label="Ocean wave animation"
        description="Animated waves on the landing page."
        defaultOn
      />
      <ToggleRow
        label="Reduced motion"
        description="Disables all decorative animations. Respects OS setting."
        defaultOn={false}
      />
    </div>
  );
}

function GameplaySettings() {
  return (
    <div className="grid gap-4">
      <ToggleRow
        label="Show hit confirmation"
        description="Flash effect when a shot lands."
        defaultOn
      />
      <ToggleRow
        label="Auto-advance turn"
        description="Automatically end your turn after firing a shot."
        defaultOn={false}
      />
      <ToggleRow
        label="Sound effects"
        description="Play audio on hits, misses, and ship sinks."
        defaultOn={false}
      />
    </div>
  );
}

function NetworkSettings() {
  return (
    <div className="grid gap-4">
      <div
        className="flex items-center justify-between p-4 rounded-[14px] border"
        style={{ background: "rgba(53,214,192,0.04)", borderColor: "var(--line)" }}
      >
        <div>
          <div className="font-medium text-[15px]">Connected network</div>
          <div className="text-[var(--mist)] text-[13px] mt-0.5">Base Sepolia testnet</div>
        </div>
        <div className="flex items-center gap-2 text-[13px] font-semibold text-[var(--signal)]">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: "var(--signal)", boxShadow: "0 0 8px var(--signal)" }}
          />
          Connected
        </div>
      </div>

      <div
        className="flex items-center justify-between p-4 rounded-[14px] border"
        style={{ borderColor: "var(--line)" }}
      >
        <div>
          <div className="font-medium text-[15px]">Gas sponsorship</div>
          <div className="text-[var(--mist)] text-[13px] mt-0.5">
            Transactions are sponsored — no ETH required to play.
          </div>
        </div>
        <span
          className="text-[12px] font-semibold px-3 py-1 rounded-full"
          style={{ background: "rgba(53,214,192,0.12)", color: "var(--signal)" }}
        >
          Active
        </span>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  defaultOn,
}: {
  label: string;
  description: string;
  defaultOn: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-4 p-4 rounded-[14px] border"
      style={{ borderColor: "var(--line)" }}
    >
      <div>
        <div className="font-medium text-[15px]">{label}</div>
        <div className="text-[var(--mist)] text-[13px] mt-0.5">{description}</div>
      </div>
      {/* Static toggle visual */}
      <div
        className="relative w-11 h-6 rounded-full flex-none"
        style={{
          background: defaultOn ? "var(--signal)" : "var(--hull)",
          border: "1px solid var(--line)",
        }}
        aria-label={`${label}: ${defaultOn ? "on" : "off"}`}
        role="img"
      >
        <span
          className="absolute top-[3px] w-[18px] h-[18px] rounded-full"
          style={{
            background: defaultOn ? "var(--abyss)" : "var(--mist)",
            left: defaultOn ? "calc(100% - 21px)" : "3px",
            transition: "left 0.2s",
          }}
        />
      </div>
    </div>
  );
}
