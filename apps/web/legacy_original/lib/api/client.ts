const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  // Get session token from sessionStorage if present (for Bearer auth fallback)
  if (typeof window !== 'undefined') {
    const storedToken = sessionStorage.getItem('wba_session_token');
    if (storedToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${storedToken}`);
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // sends HTTP-only wba_session cookie
  });

  const json: ApiResponse<T> = await res.json().catch(() => ({
    success: false,
    error: { code: 'NETWORK_ERROR', message: 'Failed to parse response' },
  }));

  if (!res.ok || !json.success) {
    const errorMsg = json.error?.message || `HTTP ${res.status}: ${res.statusText}`;
    const err = new Error(errorMsg);
    (err as any).code = json.error?.code || 'API_ERROR';
    (err as any).status = res.status;
    (err as any).details = json.error?.details;
    throw err;
  }

  return json.data as T;
}

export const api = {
  // Auth
  auth: {
    getNonce: () => request<{ nonce: string; expiresAt: number }>('/api/auth/nonce'),
    verifySiwe: (message: string, signature: string) =>
      request<{ user: any; player: any; sessionToken: string }>('/api/auth/verify', {
        method: 'POST',
        body: JSON.stringify({ message, signature }),
      }),
    getMe: () => request<{ user: any; player: any }>('/api/auth/me'),
    logout: () => request<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  },

  // Players
  players: {
    getProfile: (address: string) => request<any>(`/api/players/${address}`),
    updateProfile: (data: { username?: string; avatar?: string }) =>
      request<any>('/api/players/me', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    getMatches: (address: string, limit = 20, offset = 0) =>
      request<any[]>(`/api/players/${address}/matches?limit=${limit}&offset=${offset}`),
  },

  // Matches
  matches: {
    getMatch: (id: string) => request<any>(`/api/matches/${id}`),
    getReplay: (id: string) => request<any>(`/api/matches/${id}/replay`),
    getVerification: (id: string) => request<any>(`/api/matches/${id}/verification`),
    submitReveal: (id: string, payload: { salt: string; ships: any[]; mines: any[] }) =>
      request<{ message: string }>(`/api/matches/${id}/reveal`, {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },

  // Leaderboards
  leaderboards: {
    getRankings: (type: 'points' | 'streak' | 'fastest_win', limit = 50, offset = 0) =>
      request<{ category: string; limit: number; offset: number; entries: any[] }>(
        `/api/leaderboards/${type}?limit=${limit}&offset=${offset}`,
      ),
  },

  // Social (Friends & Invites)
  social: {
    getFriends: () => request<{ friends: any[]; pending: any[] }>('/api/friends'),
    sendFriendRequest: (targetAddress: string) =>
      request<any>('/api/friends', {
        method: 'POST',
        body: JSON.stringify({ targetAddress }),
      }),
    respondFriendRequest: (id: string, action: 'accept' | 'reject') =>
      request<any>(`/api/friends/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
    removeFriend: (address: string) =>
      request<{ removed: boolean }>(`/api/friends/${address}`, {
        method: 'DELETE',
      }),
    getInvites: () => request<any[]>('/api/invites'),
    sendInvite: (recipientAddress: string, roomCode: string) =>
      request<any>('/api/invites', {
        method: 'POST',
        body: JSON.stringify({ recipientAddress, roomCode }),
      }),
    respondInvite: (id: string, action: 'accept' | 'declined') =>
      request<any>(`/api/invites/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ action }),
      }),
  },

  // Notifications
  notifications: {
    getNotifications: (limit = 50) => request<any[]>(`/api/notifications?limit=${limit}`),
    markAsRead: (id: string, read = true) =>
      request<any>(`/api/notifications/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ read }),
      }),
  },

  // Rewards & Badges
  rewards: {
    getMyLedger: () => request<{ balance: number; history: any[] }>('/api/rewards/me'),
    getBadgeCatalog: () => request<any[]>('/api/badges'),
    getPlayerBadges: (address: string) => request<any[]>(`/api/players/${address}/badges`),
  },

  // Tournaments
  tournaments: {
    list: (status?: 'open' | 'closed') =>
      request<any[]>(`/api/tournaments${status ? `?status=${status}` : ''}`),
    getById: (id: string) => request<any>(`/api/tournaments/${id}`),
    create: (data: { title: string; description?: string; startTime: string; endTime: string }) =>
      request<any>('/api/tournaments', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },
};
