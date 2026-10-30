"use client";

import { useState, useCallback } from "react";
import { connectSocket, disconnectSocket } from "./socket";
import { buildSiweMessage } from "./wallet/siwe";

const SERVER =
  process.env.NEXT_PUBLIC_SERVER_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_SOCKET_URL ??
  "http://localhost:4000";

export interface AuthState {
  address: string | null;
  loading: boolean;
  error: string | null;
}

/**
 * SIWE login flow.
 * In the real app this hooks into wagmi/viem to sign the message.
 * Here we expose the raw steps so any wallet library can call them.
 */
export function useAuth() {
  const [state, setState] = useState<AuthState>({
    address: null,
    loading: false,
    error: null,
  });

  /** Step 1 — Fetch a one-time nonce from the server */
  const getNonce = useCallback(async (): Promise<string> => {
    const res = await fetch(`${SERVER}/api/auth/nonce`, { credentials: "include" });
    const json = await res.json();
    return json.data?.nonce ?? json.nonce;
  }, []);

  /**
   * Step 2 — Build the EIP-4361 message string.
   * Pass this to your wallet's signMessage.
   */
  const buildMessage = useCallback(
    (address: string, nonce: string, chainId: number): string =>
      buildSiweMessage({
        domain: window.location.host,
        uri: window.location.origin,
        address,
        nonce,
        chainId,
      }),
    []
  );

  /**
   * Step 3 — Send the signed message to the server.
   * Returns the verified address on success.
   */
  const verify = useCallback(
    async (message: string, signature: string, source: "wallet" | "dev" = "wallet"): Promise<string> => {
      setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await fetch(`${SERVER}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message, signature }),
        });
        if (!res.ok) {
          const json = await res.json().catch(() => ({}));
          throw new Error(json.error?.message ?? json.error ?? "Verification failed");
        }
        const json = await res.json();
        const address = json.data?.user?.address ?? json.data?.address ?? json.address;
        const sessionToken = json.data?.sessionToken;
        if (typeof window !== "undefined") {
          localStorage.setItem("wba_auth_source", source);
          if (sessionToken) localStorage.setItem("wba_session_token", sessionToken);
          if (address) localStorage.setItem("wba_current_addr", address);
        }
        setState({ address, loading: false, error: null });
        // Connect socket after login with the authenticated session token
        connectSocket(sessionToken);
        return address;
      } catch (err: any) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
    try {
      await fetch(`${SERVER}/api/auth/logout`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
    } catch {
      // Offline: still drop the local session below
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem("wba_session_token");
        localStorage.removeItem("wba_current_addr");
        localStorage.removeItem("wba_auth_source");
      }
      disconnectSocket(); // the socket must not stay authenticated as the old user
      setState({ address: null, loading: false, error: null });
    }
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
      if (!token) return;
      const res = await fetch(`${SERVER}/api/auth/me`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        const address = json.data?.user?.address ?? json.data?.address ?? json.address;
        if (address) {
          if (typeof window !== "undefined") {
            localStorage.setItem("wba_current_addr", address);
          }
          setState({ address, loading: false, error: null });
          connectSocket(token || undefined);
        }
      } else if (res.status === 401) {
        if (typeof window !== "undefined") {
          localStorage.removeItem("wba_session_token");
        }
        setState({ address: null, loading: false, error: null });
      }
    } catch (_) {}
  }, []);

  return { ...state, getNonce, buildMessage, verify, logout, checkSession };
}
