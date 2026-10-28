import type { Metadata } from 'next';
import './globals.css';
import { WalletProvider } from '@/providers/WalletContext';
import { GameProvider } from '@/providers/GameContext';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Web3 Battle Arena — Cryptographic Multiplayer Battleship',
  description:
    'Real-time tactical Battleship with hidden mines, cryptographic commit-reveal, verifiable match records, on-chain achievements, and competitive leaderboards.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-arena-bg text-arena-textMain radar-grid antialiased">
        <WalletProvider>
          <GameProvider>
            <Navbar />
            <main className="flex-1 flex flex-col">{children}</main>
            <Footer />
          </GameProvider>
        </WalletProvider>
      </body>
    </html>
  );
}
