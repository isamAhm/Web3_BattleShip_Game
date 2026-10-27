"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api } from "./api";
import { connectSocket, disconnectSocket } from "./socket";

interface AuthCtx {
  address: string | null;
  loading: boolean;
  login:  (address: string, signature: string, message: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({
  address: null, loading: true,
  login: async () => {}, logout: async () => {},
});

export function useAuthCtx() { return useContext(AuthContext); }

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    api.me()
      .then(({ address }) => {
        setAddress(address);
        connectSocket();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (addr: string, signature: string, message: string) => {
    const { address: verified } = await api.verifyAuth(message, signature, addr);
    setAddress(verified);
    connectSocket();
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setAddress(null);
    disconnectSocket();
  }, []);

  return (
    <AuthContext.Provider value={{ address, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
