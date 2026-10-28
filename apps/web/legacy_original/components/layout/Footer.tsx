'use client';

import React from 'react';
import { ShieldCheck, Cpu, Database } from 'lucide-react';
import { Badge } from '@/components/shared/Badge';

export function Footer() {
  return (
    <footer className="w-full border-t border-arena-border/50 bg-arena-bg py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-arena-textSub tracking-wider">
            WEB3 BATTLE ARENA
          </span>
          <span className="text-arena-border">|</span>
          <span className="text-xs text-arena-textMuted font-mono">
            Cryptographic Battleship v1.0
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="cyan" size="sm" className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Keccak-256 Commit-Reveal
          </Badge>
          <Badge variant="violet" size="sm" className="flex items-center gap-1">
            <Cpu className="w-3 h-3" /> Arbitrum Sepolia / Simulated
          </Badge>
          <Badge variant="neutral" size="sm" className="flex items-center gap-1">
            <Database className="w-3 h-3" /> Verifiable Replays
          </Badge>
        </div>

        <div className="text-[11px] text-arena-textMuted font-mono">
          © {new Date().getFullYear()} Web3 Battle Arena. Authoritative Server Engine.
        </div>
      </div>
    </footer>
  );
}
