"use client";

import { useState, useCallback } from "react";
import { connectSocket } from "./socket";

const SERVER = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4000";

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
    (address: string, nonce: string, chainId: number): string => {
      const domain = window.location.host;
      const uri    = window.location.origin;
      const now    = new Date().toISOString();
      return [
        `${domain} wants you to sign in with your Ethereum account:`,
        address,
        "",
        "Sign in to Web3 Battle Arena",
        "",
        `URI: ${uri}`,
        `Version: 1`,
        `Chain ID: ${chainId}`,
        `Nonce: ${nonce}`,
        `Issued At: ${now}`,
      ].join("\n");
    },
    []
  );

  /**
   * Step 3 — Send the signed message to the server.
   * Returns the verified address on success.
   */
  const verify = useCallback(
    async (message: string, signature: string): Promise<string> => {
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
    await fetch(`${SERVER}/api/auth/logout`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem("wba_session_token");
    }
    setState({ address: null, loading: false, error: null });
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("wba_session_token") : null;
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
      }
    } catch (_) {}
  }, []);

  return { ...state, getNonce, buildMessage, verify, logout, checkSession };
}
