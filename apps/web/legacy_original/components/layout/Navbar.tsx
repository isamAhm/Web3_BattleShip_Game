'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldAlert,
  Wallet,
  Trophy,
  History,
  Award,
  Users,
  Coins,
  LogOut,
  Bell,
  Swords,
  ChevronDown,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';
import { useWallet } from '@/providers/WalletContext';
import { useGame } from '@/providers/GameContext';
import { Button } from '@/components/shared/Button';
import { Badge } from '@/components/shared/Badge';
import { Modal } from '@/components/shared/Modal';
import { api } from '@/lib/api/client';

export function Navbar() {
  const pathname = usePathname();
  const { address, player, isAuthenticated, isLoading, connectInjected, connectDevWallet, logout } =
    useWallet();
  const { phase, matchId } = useGame();

  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      api.notifications
        .getNotifications(10)
        .then((data) => setNotifications(data || []))
        .catch(() => {});
    }
  }, [isAuthenticated]);

  const handleConnectInjected = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      await connectInjected();
      setIsWalletModalOpen(false);
    } catch (err: any) {
      setConnectError(err.message || 'Failed to connect MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectDev = async () => {
    setIsConnecting(true);
    setConnectError(null);
    try {
      await connectDevWallet();
      setIsWalletModalOpen(false);
    } catch (err: any) {
      setConnectError(err.message || 'Failed to create test wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const navLinks = [
    { label: 'Home', href: '/' },
    { label: 'Lobby', href: '/lobby', icon: Swords },
    { label: 'Leaderboard', href: '/leaderboard', icon: Trophy },
    { label: 'History', href: '/history', icon: History },
    { label: 'Badges', href: '/badges', icon: Award },
    { label: 'Ledger', href: '/rewards', icon: Coins },
    { label: 'Social', href: '/friends', icon: Users },
  ];

  const unreadNotifications = notifications.filter((n) => !n.read).length;

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-arena-border/70 bg-arena-bg/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-arena-violet to-arena-cyan flex items-center justify-center p-0.5 shadow-md shadow-arena-cyan/20 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-arena-bg rounded-[7px] flex items-center justify-center">
                <Swords className="w-5 h-5 text-arena-cyan group-hover:text-arena-cyanBright transition-colors" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-base text-white leading-none">
                WEB3 BATTLE <span className="text-arena-cyan">ARENA</span>
              </span>
              <span className="text-[10px] text-arena-textMuted tracking-widest uppercase font-mono">
                TACTICAL BATTLESHIP
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? 'text-arena-cyanBright bg-arena-cyan/10 border border-arena-cyan/30'
                      : 'text-arena-textSub hover:text-white hover:bg-arena-surface'
                  }`}
                >
                  {link.icon && <link.icon className="w-3.5 h-3.5" />}
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Active Match, Notifications, Wallet */}
          <div className="flex items-center gap-3">
            {/* Active Match Banner Button if in game */}
            {matchId && (phase === 'placement' || phase === 'battle') && (
              <Link href={`/play/${matchId}`}>
                <Button
                  size="sm"
                  variant="cyan"
                  className="animate-pulse shadow-arena-cyan/30 flex items-center gap-1"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Active Match</span>
                </Button>
              </Link>
            )}

            {/* Notifications Menu */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg text-arena-textSub hover:text-white hover:bg-arena-surface transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifications > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-arena-cyan animate-ping" />
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-arena-panel border border-arena-border rounded-xl shadow-2xl p-4 z-50">
                    <div className="flex items-center justify-between pb-2 border-b border-arena-border/50 mb-2">
                      <span className="text-xs font-bold text-arena-textMain uppercase tracking-wider">
                        Tactical Alerts
                      </span>
                      <span className="text-[10px] text-arena-textMuted font-mono">
                        {notifications.length} events
                      </span>
                    </div>
                    {notifications.length === 0 ? (
                      <p className="text-xs text-arena-textMuted py-4 text-center">
                        No tactical notifications
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {notifications.map((n, i) => (
                          <div
                            key={i}
                            className="text-xs p-2 rounded bg-arena-surface/60 border border-arena-border/30 hover:border-arena-border"
                          >
                            <div className="font-semibold text-arena-cyan">
                              {n.title || 'Match Update'}
                            </div>
                            <div className="text-arena-textSub mt-0.5">{n.message}</div>
                            <div className="text-[10px] text-arena-textMuted mt-1">
                              {new Date(n.createdAt || Date.now()).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Wallet Button */}
            {isLoading ? (
              <div className="h-9 w-28 bg-arena-surface animate-pulse rounded-lg border border-arena-border" />
            ) : isAuthenticated && address ? (
              <div className="flex items-center gap-2">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-arena-surface border border-arena-border hover:border-arena-cyan/50 transition-colors"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-arena-violet to-arena-cyan flex items-center justify-center text-[10px] font-bold text-white uppercase">
                    {player?.username ? player.username.slice(0, 2) : address.slice(2, 4)}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold text-arena-textMain">
                      {player?.username || `${address.slice(0, 6)}...${address.slice(-4)}`}
                    </span>
                    <span className="text-[10px] font-mono text-arena-amber">
                      {player?.stats?.totalPoints || 0} PTS
                    </span>
                  </div>
                </Link>
                <button
                  onClick={logout}
                  className="p-2 text-arena-textMuted hover:text-arena-red transition-colors rounded-lg hover:bg-arena-surface"
                  title="Disconnect"
                  aria-label="Disconnect wallet"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsWalletModalOpen(true)}
                className="gap-2"
              >
                <Wallet className="w-4 h-4" />
                Connect Wallet
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-arena-textSub hover:text-white hover:bg-arena-surface"
              aria-label="Toggle navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-arena-border/60 bg-arena-bg px-4 py-3 space-y-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-arena-textSub hover:text-white hover:bg-arena-surface"
              >
                {link.icon && <link.icon className="w-4 h-4 text-arena-cyan" />}
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </header>

      {/* Wallet Connection Modal */}
      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title="Connect & Sign In with Ethereum"
      >
        <div className="space-y-4">
          <p className="text-xs text-arena-textSub leading-relaxed">
            Connect an Ethereum wallet and sign a secure EIP-4361 authentication challenge to enter
            the arena.
          </p>

          {connectError && (
            <div className="p-3 rounded-lg bg-arena-red/10 border border-arena-red/40 text-arena-redBright text-xs">
              {connectError}
            </div>
          )}

          <div className="space-y-2 pt-2">
            <button
              onClick={handleConnectInjected}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-arena-panel border border-arena-border hover:border-arena-cyan/60 hover:bg-arena-card transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-arena-cyan/15 flex items-center justify-center text-arena-cyan group-hover:scale-105 transition-transform">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-arena-cyan transition-colors">
                    Browser Wallet / MetaMask
                  </div>
                  <div className="text-[11px] text-arena-textMuted">Injected Ethereum Provider</div>
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-arena-textMuted -rotate-90 group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={handleConnectDev}
              disabled={isConnecting}
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-arena-panel border border-arena-border hover:border-arena-amber/60 hover:bg-arena-card transition-all text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-arena-amber/15 flex items-center justify-center text-arena-amber group-hover:scale-105 transition-transform">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white group-hover:text-arena-amber transition-colors">
                    1-Click Instant Test Wallet
                  </div>
                  <div className="text-[11px] text-arena-textMuted">
                    Ephemeral Dev Identity & SIWE Sign
                  </div>
                </div>
              </div>
              <Badge variant="amber" size="sm">
                Fast Dev
              </Badge>
            </button>
          </div>

          <div className="pt-2 text-[11px] text-arena-textMuted text-center font-mono">
            Chain ID: {process.env.NEXT_PUBLIC_CHAIN_ID || '11155111'} · Nonce Protected
          </div>
        </div>
      </Modal>
    </>
  );
}
