const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const url = `${SERVER}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err.error?.message ?? err.error ?? err.message ?? "Request failed");
  }
  const json = await res.json();
  // Unwrap { success: true, data: ... } if formatted by server API wrapper
  if (json && typeof json === "object" && "success" in json && "data" in json) {
    return json.data as T;
  }
  return json as T;
}

export const api = {
  // Auth
  getNonce: () => apiFetch<{ nonce: string }>("/api/auth/nonce"),
  verifyAuth: (message: string, signature: string, address: string) =>
    apiFetch<{ address: string }>("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ message, signature, address }),
    }),
  me: () => apiFetch<{ address: string; player?: any }>("/api/auth/me"),
  logout: () => apiFetch("/api/auth/logout", { method: "POST" }),

  // Leaderboard
  leaderboard: async (board: "points" | "streak" | "fastest") => {
    const typeMap: Record<string, string> = {
      points: "points",
      streak: "streak",
      fastest: "accuracy",
    };
    const mapped = typeMap[board] || board;
    const res = await apiFetch<{ category?: string; entries: any[] }>(`/api/leaderboards/${mapped}`);
    return {
      board,
      entries: res?.entries ?? [],
    };
  },

  // Matches / Replays
  matches: async (player?: string, limit = 20) => {
    if (player) {
      const res = await apiFetch<any[]>(`/api/players/${player}/matches?limit=${limit}`);
      return { matches: Array.isArray(res) ? res : (res as any)?.matches ?? [] };
    }
    const res = await apiFetch<any[]>(`/api/matches?limit=${limit}`).catch(() => []);
    return { matches: Array.isArray(res) ? res : (res as any)?.matches ?? [] };
  },

  matchVerify: async (matchId: string) => {
    const data = await apiFetch<{
      matchId: string;
      resultHash: string;
      chainStatus: string;
      chainTxHash: string | null;
      canonicalRecord?: any;
      verification?: any;
    }>(`/api/matches/${matchId}/verification`);

    return {
      verified: data.chainStatus === "verified" || data.chainStatus === "submitted" || !!data.resultHash,
      computed: data.resultHash ?? "",
      stored: data.resultHash ?? "",
      chainTx: data.chainTxHash ?? null,
      chainStatus: data.chainStatus ?? "unverified",
      match: data,
    };
  },

  // Rewards Ledger
  rewards: {
    getMyLedger: () =>
      apiFetch<{ balance: number; history: any[] }>("/api/rewards/me"),
  },

  // Tournaments
  tournaments: {
    list: (status?: string) =>
      apiFetch<any[]>(`/api/tournaments${status ? `?status=${status}` : ""}`),
    get: (id: string) =>
      apiFetch<any>(`/api/tournaments/${id}`),
    create: (data: any) =>
      apiFetch<any>("/api/tournaments", { method: "POST", body: JSON.stringify(data) }),
  },

  // Players
  player: (address: string) =>
    apiFetch<{ player: any; ranks?: any }>(`/api/players/${address}`),
  playerBadges: (address: string) =>
    apiFetch<{ badges: any[] }>(`/api/players/${address}/badges`),
  allBadges: () =>
    apiFetch<{ badges: any[] }>("/api/badges"),

  // Health
  health: () => apiFetch<{ status: string }>("/health"),
};
