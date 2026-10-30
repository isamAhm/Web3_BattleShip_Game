"use client";

import { createContext, useContext, useEffect, useRef, ReactNode, useCallback } from "react";
import { useAuth, AuthState } from "./useAuth";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { getAddress } from "viem";
import { signWithInjectedWallet, ensureWalletChain } from "./wallet/siwe";
import { CHAIN_ID, ALLOW_DEV_WALLET } from "./config";

interface AuthContextValue extends AuthState {
  login: () => Promise<string>;
  logout: () => Promise<void>;
  checkSession: () => Promise<void>;
  switchDevIdentity: () => Promise<string>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();

  useEffect(() => {
    auth.checkSession();
  }, []);

  /** Signs in with a throwaway key kept in the browser. Development / testing only. */
  const signInWithDevWallet = useCallback(
    async (fresh: boolean): Promise<string> => {
      if (!ALLOW_DEV_WALLET) {
        throw new Error("Test wallets are disabled in production. Connect a real wallet.");
      }
      let pk =
        !fresh && typeof window !== "undefined"
          ? sessionStorage.getItem("wba_dev_pk") || localStorage.getItem("wba_dev_pk")
          : null;
      if (!pk || !pk.startsWith("0x")) {
        pk = generatePrivateKey();
        sessionStorage.setItem("wba_dev_pk", pk);
        localStorage.setItem("wba_dev_pk", pk);
      }
      const account = privateKeyToAccount(pk as `0x${string}`);
      const nonce = await auth.getNonce();
      const message = auth.buildMessage(account.address, nonce, CHAIN_ID);
      const signature = await account.signMessage({ message });
      return auth.verify(message, signature, "dev");
    },
    [auth]
  );

  /**
   * Signs in with the user's wallet. Wallet errors (rejected request, wrong chain, ...) are
   * reported to the caller; the app never silently swaps in a different identity. A throwaway
   * test wallet is only used when no wallet is installed AND dev wallets are allowed.
   */
  const login = useCallback(async (): Promise<string> => {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    if (!ethereum) {
      if (ALLOW_DEV_WALLET) return signInWithDevWallet(false);
      throw new Error("No Ethereum wallet detected. Install MetaMask (or another wallet) to play.");
    }

    const accounts: string[] = await ethereum.request({ method: "eth_requestAccounts" });
    if (!accounts?.[0]) throw new Error("The wallet did not provide an account.");
    await ensureWalletChain(ethereum, CHAIN_ID);

    const address = getAddress(accounts[0]);
    const nonce = await auth.getNonce();
    const message = auth.buildMessage(address, nonce, CHAIN_ID);
    const signature = await signWithInjectedWallet(address, message);
    return auth.verify(message, signature, "wallet");
  }, [auth, signInWithDevWallet]);

  const switchDevIdentity = useCallback(() => signInWithDevWallet(true), [signInWithDevWallet]);

  // If the user switches or disconnects the account in their wallet, the session is no longer theirs
  const addressRef = useRef(auth.address);
  addressRef.current = auth.address;
  useEffect(() => {
    const ethereum = typeof window !== "undefined" ? (window as any).ethereum : undefined;
    if (!ethereum?.on) return;
    const onAccountsChanged = (accounts: string[]) => {
      const current = addressRef.current;
      if (!current || localStorage.getItem("wba_auth_source") !== "wallet") return;
      if (!accounts?.[0] || accounts[0].toLowerCase() !== current.toLowerCase()) {
        void auth.logout();
      }
    };
    ethereum.on("accountsChanged", onAccountsChanged);
    return () => ethereum.removeListener?.("accountsChanged", onAccountsChanged);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AuthContext.Provider
      value={{
        address: auth.address,
        loading: auth.loading,
        error: auth.error,
        login,
        logout: auth.logout,
        checkSession: auth.checkSession,
        switchDevIdentity,
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
