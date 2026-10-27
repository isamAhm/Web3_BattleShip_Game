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
    const res = await fetch(`${SERVER}/auth/nonce`, { credentials: "include" });
    const { nonce } = await res.json();
    return nonce;
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
        const res = await fetch(`${SERVER}/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ message, signature }),
        });
        if (!res.ok) {
          const { error } = await res.json();
          throw new Error(error ?? "Verification failed");
        }
        const { address } = await res.json();
        setState({ address, loading: false, error: null });
        // Connect socket after login
        connectSocket();
        return address;
      } catch (err: any) {
        setState((s) => ({ ...s, loading: false, error: err.message }));
        throw err;
      }
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch(`${SERVER}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setState({ address: null, loading: false, error: null });
  }, []);

  const checkSession = useCallback(async () => {
    try {
      const res = await fetch(`${SERVER}/auth/me`, { credentials: "include" });
      if (res.ok) {
        const { address } = await res.json();
        setState({ address, loading: false, error: null });
        connectSocket();
      }
    } catch (_) {}
  }, []);

  return { ...state, getNonce, buildMessage, verify, logout, checkSession };
}
