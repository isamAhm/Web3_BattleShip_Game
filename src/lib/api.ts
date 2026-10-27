const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${SERVER}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...opts.headers },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

export const api = {
  // Auth
  getNonce:   () => apiFetch<{ nonce: string }>("/auth/nonce"),
  verifyAuth: (message: string, signature: string, address: string) =>
    apiFetch<{ address: string }>("/auth/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature, address }),
    }),
  me:    () => apiFetch<{ address: string; player: any }>("/auth/me"),
  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  // Leaderboard
  leaderboard: (board: "points" | "streak" | "fastest") =>
    apiFetch<{ board: string; entries: any[] }>(`/leaderboard/${board}`),

  // Matches / Replays
  matches: (player?: string, limit = 20) =>
    apiFetch<{ matches: any[] }>(`/matches?${player ? `player=${player}&` : ""}limit=${limit}`),
  matchVerify: (matchId: string) =>
    apiFetch<{ verified: boolean; computed: string; stored: string; chainTx: string | null; chainStatus: string; match: any }>(
      `/matches/${matchId}/verify`
    ),

  // Players
  player: (address: string) =>
    apiFetch<{ player: any; ranks: any }>(`/players/${address}`),
  playerBadges: (address: string) =>
    apiFetch<{ badges: any[] }>(`/players/${address}/badges`),

  // Health
  health: () => apiFetch<{ ok: boolean }>("/health"),
};
