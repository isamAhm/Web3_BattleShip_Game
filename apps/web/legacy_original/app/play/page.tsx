'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/providers/GameContext';

export default function PlayIndexPage() {
  const router = useRouter();
  const { matchId, phase } = useGame();

  useEffect(() => {
    if (matchId && (phase === 'placement' || phase === 'battle' || phase === 'ended')) {
      router.replace(`/play/${matchId}`);
    } else {
      router.replace('/lobby');
    }
  }, [matchId, phase, router]);

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-xs font-mono text-arena-cyan animate-pulse">
        CONNECTING TO TACTICAL THEATER...
      </div>
    </div>
  );
}
