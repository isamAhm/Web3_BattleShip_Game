'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '@/lib/api/client';
import { createSiweMessage, signWithInjectedWallet, generateDevAccount } from '@/lib/wallet/siwe';
import { disconnectSocket } from '@/lib/socket/client';

interface PlayerProfile {
  address: string;
  username: string;
  avatar?: string;
  stats: {
    matchesPlayed: number;
    wins: number;
    losses: number;
    totalPoints: number;
    bestStreak: number;
    fastestWinShots: number | null;
  };
}

interface WalletContextType {
  address: string | null;
  player: PlayerProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  connectInjected: () => Promise<void>;
  connectDevWallet: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [player, setPlayer] = useState<PlayerProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshProfile = async () => {
    try {
      const data = await api.auth.getMe();
      if (data && data.user) {
        setAddress(data.user.address);
        setPlayer(data.player);
        setIsAuthenticated(true);
      }
    } catch {
      setAddress(null);
      setPlayer(null);
      setIsAuthenticated(false);
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('wba_session_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();
  }, []);

  const connectInjected = async () => {
    setIsLoading(true);
    try {
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        throw new Error(
          'No Ethereum wallet extension found. Please install MetaMask or use a Test Wallet.',
        );
      }

      const ethereum = (window as any).ethereum;
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No account returned from wallet.');
      }

      const walletAddress = accounts[0].toLowerCase();

      // 1. Fetch nonce from backend
      const { nonce } = await api.auth.getNonce();

      // 2. Prepare SIWE message
      const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
      const domain = window.location.host;
      const uri = window.location.origin;
      const statement = 'Sign in to Web3 Battle Arena';
      const issuedAt = new Date().toISOString();

      const message = createSiweMessage({
        domain,
        address: walletAddress,
        statement,
        uri,
        version: '1',
        chainId,
        nonce,
        issuedAt,
      });

      // 3. Prompt user signature in wallet
      const signature = await signWithInjectedWallet(walletAddress, message);

      // 4. Verify with backend
      const res = await api.auth.verifySiwe(message, signature);

      if (res && res.sessionToken) {
        sessionStorage.setItem('wba_session_token', res.sessionToken);
      }

      setAddress(res.user.address);
      setPlayer(res.player);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const connectDevWallet = async () => {
    setIsLoading(true);
    try {
      const dev = generateDevAccount();
      const { nonce } = await api.auth.getNonce();

      const chainId = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '11155111');
      const domain = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
      const uri = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const statement = 'Sign in to Web3 Battle Arena';
      const issuedAt = new Date().toISOString();

      const message = createSiweMessage({
        domain,
        address: dev.address,
        statement,
        uri,
        version: '1',
        chainId,
        nonce,
        issuedAt,
      });

      const signature = await dev.signMessage(message);
      const res = await api.auth.verifySiwe(message, signature);

      if (res && res.sessionToken) {
        sessionStorage.setItem('wba_session_token', res.sessionToken);
      }

      setAddress(res.user.address);
      setPlayer(res.player);
      setIsAuthenticated(true);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // ignore
    } finally {
      disconnectSocket();
      sessionStorage.removeItem('wba_session_token');
      setAddress(null);
      setPlayer(null);
      setIsAuthenticated(false);
    }
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        player,
        isAuthenticated,
        isLoading,
        connectInjected,
        connectDevWallet,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
