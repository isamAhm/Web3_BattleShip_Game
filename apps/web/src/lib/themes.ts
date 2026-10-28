export type ThemeId = "ocean" | "abyss";

export interface Theme {
  id: ThemeId;
  name: string;
  description: string;
  /** CSS variable overrides applied via data-theme attribute */
  vars: Record<string, string>;
  /** Body background gradient */
  background: string;
  /** Accent used in preview swatch */
  accent: string;
  accentSecondary: string;
}

export const THEMES: Theme[] = [
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep-sea teal — the original battle station aesthetic.",
    accent: "#35d6c0",
    accentSecondary: "#ebb54a",
    background:
      "radial-gradient(1200px 600px at 70% -10%, #0f3a44 0%, transparent 60%), " +
      "radial-gradient(900px 500px at -10% 40%, #0a2a33 0%, transparent 55%), " +
      "#06141a",
    vars: {
      "--abyss": "#06141a",
      "--deck": "#0c222b",
      "--hull": "#13303b",
      "--line": "rgba(160,225,215,0.12)",
      "--foam": "#e9f5f2",
      "--mist": "#8fb0ad",
      "--signal": "#35d6c0",
      "--flare": "#ff6a4d",
      "--brass": "#ebb54a",
      "--accent-primary": "#35d6c0",
      "--accent-cta": "#35d6c0",
      "--cta-text": "#06141a",
      "--cta-shadow": "rgba(53,214,192,0.55)",
      "--hero-glow": "rgba(15,58,68,0.6)",
    },
  },
  {
    id: "abyss",
    name: "Abyss",
    description: "Deep-space indigo — the landing page command-deck look.",
    accent: "#6350dc",
    accentSecondary: "#35d6c0",
    background:
      "radial-gradient(1200px 700px at 65% -5%, #1a1040 0%, transparent 60%), " +
      "radial-gradient(800px 600px at -10% 50%, #0d0820 0%, transparent 55%), " +
      "#07050f",
    vars: {
      "--abyss": "#07050f",
      "--deck": "#100d1f",
      "--hull": "#1a1535",
      "--line": "rgba(150,130,255,0.12)",
      "--foam": "#ede9ff",
      "--mist": "#9490b8",
      "--signal": "#8b7ff0",
      "--flare": "#ff6a4d",
      "--brass": "#c9a84c",
      "--accent-primary": "#6350dc",
      "--accent-cta": "#6350dc",
      "--cta-text": "#ffffff",
      "--cta-shadow": "rgba(99,80,220,0.6)",
      "--hero-glow": "rgba(99,80,220,0.2)",
    },
  },
];

export const DEFAULT_THEME: ThemeId = "ocean";
export const THEME_STORAGE_KEY = "ba-theme";
