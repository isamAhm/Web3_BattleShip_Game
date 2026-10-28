"use client";

import { createContext, useContext, useEffect, ReactNode, useCallback } from "react";
import { useAuth, AuthState } from "./useAuth";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { signWithInjectedWallet } from "./wallet/siwe";

interface AuthContextValue extends AuthState {
  login: (preferInjected?: boolean) => Promise<string>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    auth.checkSession();
  }, []);

  const login = useCallback(async (preferInjected = false): Promise<string> => {
    const chainId = 84532; // Base Sepolia

    // 1. Try injected wallet (e.g. MetaMask) if requested or available
    if (preferInjected && typeof window !== "undefined" && (window as any).ethereum) {
      try {
        const ethereum = (window as any).ethereum;
        const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
        if (accounts && accounts[0]) {
          const walletAddress = accounts[0];
          const nonce = await auth.getNonce();
          const message = auth.buildMessage(walletAddress, nonce, chainId);
          const signature = await signWithInjectedWallet(walletAddress, message);
          return await auth.verify(message, signature);
        }
      } catch (err) {
        console.warn("[Auth] Injected wallet connection failed, falling back to test wallet:", err);
      }
    }

    // 2. Real cryptographic dev test wallet (saved in localStorage for persistence)
    let pk = typeof window !== "undefined" ? localStorage.getItem("wba_dev_pk") : null;
    if (!pk || !pk.startsWith("0x")) {
      pk = generatePrivateKey();
      if (typeof window !== "undefined") {
        localStorage.setItem("wba_dev_pk", pk);
      }
    }

    const account = privateKeyToAccount(pk as `0x${string}`);
    const nonce = await auth.getNonce();
    const message = auth.buildMessage(account.address, nonce, chainId);
    const signature = await account.signMessage({ message });

    return await auth.verify(message, signature);
  }, [auth]);

  return (
    <AuthContext.Provider
      value={{
        address: auth.address,
        loading: auth.loading,
        error: auth.error,
        login,
        logout: auth.logout,
        checkSession: auth.checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthCtx(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthCtx must be used within an AuthProvider");
  return ctx;
}
