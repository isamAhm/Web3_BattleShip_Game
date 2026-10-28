'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket/client';
import { useWallet } from './WalletContext';
import {
  type Ship,
  type Coord,
  type Hex,
  commitPlacement,
  generateSalt,
  validatePlacement,
  DEFAULT_CONFIG,
} from '@wba/engine';
import { api } from '@/lib/api/client';

export type GamePhase = 'idle' | 'searching' | 'placement' | 'battle' | 'ended';

export interface ChatMessage {
  sender: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface ShotResultEvent {
  matchId: string;
  shooter: string;
  target: string;
  coordinate: { x: number; y: number };
  outcome: 'miss' | 'hit' | 'sunk' | 'mine';
  pointsAwarded: number;
  shooterStreak: number;
  shooterScore: number;
  nextTurn: string | null;
  gameOver: boolean;
  winner: string | null;
  forfeit?: boolean;
}

interface GameContextType {
  phase: GamePhase;
  matchId: string | null;
  roomCode: string | null;
  players: [string, string] | null;
  currentTurn: string | null;
  turnSecondsRemaining: number;
  turnDeadline: number | null;
  // Placement state
  ships: Ship[];
  mines: Coord[];
  orientation: 'H' | 'V';
  salt: Hex | null;
  commitment: Hex | null;
  isPlacementSubmitted: boolean;
  setOrientation: (o: 'H' | 'V') => void;
  toggleOrientation: () => void;
  setShips: (ships: Ship[]) => void;
  setMines: (mines: Coord[]) => void;
  autoPlaceFleet: () => void;
  clearFleet: () => void;
  submitFleet: () => Promise<void>;
  // Battle state
  shots: ShotResultEvent[];
  myScore: number;
  opponentScore: number;
  streak: number;
  winner: string | null;
  forfeit: boolean;
  isMyTurn: boolean;
  fireShot: (x: number, y: number) => Promise<void>;
  // Chat
  messages: ChatMessage[];
  sendChat: (text: string) => void;
  // Queue & Room
  inQueue: boolean;
  joinQueue: (mode?: 'ranked' | 'casual') => void;
  leaveQueue: () => void;
  createPrivateRoom: (code?: string) => Promise<string>;
  joinPrivateRoom: (code: string) => Promise<void>;
  // Reveal & Verification
  verification: any;
  resultHash: string | null;
  submitReveal: () => Promise<void>;
  resetGame: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export function GameProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { address, isAuthenticated } = useWallet();

  const [phase, setPhase] = useState<GamePhase>('idle');
  const [matchId, setMatchId] = useState<string | null>(null);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [players, setPlayers] = useState<[string, string] | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [turnSecondsRemaining, setTurnSecondsRemaining] = useState<number>(20);
  const [turnDeadline, setTurnDeadline] = useState<number | null>(null);

  // Placement state
  const [ships, setShips] = useState<Ship[]>([]);
  const [mines, setMines] = useState<Coord[]>([]);
  const [orientation, setOrientation] = useState<'H' | 'V'>('H');
  const [salt, setSalt] = useState<Hex | null>(null);
  const [commitment, setCommitment] = useState<Hex | null>(null);
  const [isPlacementSubmitted, setIsPlacementSubmitted] = useState<boolean>(false);

  // Battle state
  const [shots, setShots] = useState<ShotResultEvent[]>([]);
  const [myScore, setMyScore] = useState<number>(0);
  const [opponentScore, setOpponentScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [winner, setWinner] = useState<string | null>(null);
  const [forfeit, setForfeit] = useState<boolean>(false);

  // Chat & Verification
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [verification, setVerification] = useState<any>(null);
  const [resultHash, setResultHash] = useState<string | null>(null);
  const [inQueue, setInQueue] = useState<boolean>(false);

  const isMyTurn = Boolean(
    address && currentTurn && currentTurn.toLowerCase() === address.toLowerCase(),
  );

  const toggleOrientation = () => {
    setOrientation((prev) => (prev === 'H' ? 'V' : 'H'));
  };

  // Helper: auto-generate standard legal placement
  const autoPlaceFleet = useCallback(() => {
    const fleetLengths = [5, 4, 3, 3, 2];
    const placedShips: Ship[] = [];
    const occupied = new Set<string>();

    for (const len of fleetLengths) {
      let placed = false;
      let attempts = 0;
      while (!placed && attempts < 200) {
        attempts++;
        const orient: 'H' | 'V' = Math.random() > 0.5 ? 'H' : 'V';
        const maxX = orient === 'H' ? 10 - len : 9;
        const maxY = orient === 'V' ? 10 - len : 9;
        const x = Math.floor(Math.random() * (maxX + 1));
        const y = Math.floor(Math.random() * (maxY + 1));

        // Check collision
        let conflict = false;
        const cells: string[] = [];
        for (let i = 0; i < len; i++) {
          const cx = orient === 'H' ? x + i : x;
          const cy = orient === 'V' ? y + i : y;
          const key = `${cx},${cy}`;
          if (occupied.has(key)) {
            conflict = true;
            break;
          }
          cells.push(key);
        }

        if (!conflict) {
          cells.forEach((c) => occupied.add(c));
          placedShips.push({ x, y, length: len, orientation: orient });
          placed = true;
        }
      }
    }

    // Place 3 mines
    const placedMines: Coord[] = [];
    let mineAttempts = 0;
    while (placedMines.length < 3 && mineAttempts < 100) {
      mineAttempts++;
      const mx = Math.floor(Math.random() * 10);
      const my = Math.floor(Math.random() * 10);
      const key = `${mx},${my}`;
      if (!occupied.has(key) && !placedMines.some((m) => m.x === mx && m.y === my)) {
        placedMines.push({ x: mx, y: my });
      }
    }

    setShips(placedShips);
    setMines(placedMines);
  }, []);

  const clearFleet = () => {
    setShips([]);
    setMines([]);
    setIsPlacementSubmitted(false);
  };

  // Reset game state
  const resetGame = () => {
    setPhase('idle');
    setMatchId(null);
    setRoomCode(null);
    setPlayers(null);
    setCurrentTurn(null);
    setShots([]);
    setMyScore(0);
    setOpponentScore(0);
    setStreak(0);
    setWinner(null);
    setForfeit(false);
    setMessages([]);
    setVerification(null);
    setResultHash(null);
    setInQueue(false);
    clearFleet();
  };

  // Socket setup & Event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const socket = getSocket();
    if (!socket.connected) {
      socket.connect();
    }

    socket.on('queue:status', ({ inQueue: isQ }: { inQueue: boolean }) => {
      setInQueue(isQ);
      setPhase(isQ ? 'searching' : 'idle');
    });

    socket.on(
      'match:found',
      (data: {
        matchId: string;
        roomCode: string;
        players: [string, string];
        expiresAt: number;
      }) => {
        setInQueue(false);
        setMatchId(data.matchId);
        setRoomCode(data.roomCode);
        setPlayers(data.players);
        setPhase('placement');
        autoPlaceFleet(); // Pre-populate random legal fleet for fast play
        router.push(`/play/${data.matchId}`);
      },
    );

    socket.on(
      'match:start',
      (data: { matchId: string; currentTurn: string; turnDeadline: number }) => {
        setPhase('battle');
        setCurrentTurn(data.currentTurn);
        setTurnDeadline(data.turnDeadline);
        setTurnSecondsRemaining(20);
      },
    );

    socket.on(
      'turn:timer',
      (data: {
        matchId: string;
        currentTurn: string;
        secondsRemaining: number;
        deadline: number;
      }) => {
        setCurrentTurn(data.currentTurn);
        setTurnSecondsRemaining(data.secondsRemaining);
        setTurnDeadline(data.deadline);
      },
    );

    socket.on('shot:result', (data: ShotResultEvent) => {
      setShots((prev) => [...prev, data]);
      if (address) {
        const norm = address.toLowerCase();
        if (data.shooter.toLowerCase() === norm) {
          setMyScore(data.shooterScore);
          setStreak(data.shooterStreak);
        } else {
          setOpponentScore(data.shooterScore);
        }
      }

      if (data.nextTurn) {
        setCurrentTurn(data.nextTurn);
      }

      if (data.gameOver) {
        setPhase('ended');
        setWinner(data.winner);
        setForfeit(Boolean(data.forfeit));
      }
    });

    socket.on(
      'match:end',
      (data: {
        matchId: string;
        winner: string | null;
        forfeit: boolean;
        scores: Record<string, number>;
      }) => {
        setPhase('ended');
        setWinner(data.winner);
        setForfeit(data.forfeit);
        if (address && data.scores) {
          const norm = address.toLowerCase();
          const p1 = Object.keys(data.scores)[0];
          const p2 = Object.keys(data.scores)[1];
          const other = p1?.toLowerCase() === norm ? p2 : p1;
          setMyScore(data.scores[norm] || 0);
          if (other) setOpponentScore(data.scores[other] || 0);
        }
      },
    );

    socket.on(
      'match:verified',
      (data: { matchId: string; verification: any; resultHash?: string }) => {
        setVerification(data.verification);
        if (data.resultHash) setResultHash(data.resultHash);
      },
    );

    socket.on('chat:message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.off('queue:status');
      socket.off('match:found');
      socket.off('match:start');
      socket.off('turn:timer');
      socket.off('shot:result');
      socket.off('match:end');
      socket.off('match:verified');
      socket.off('chat:message');
    };
  }, [isAuthenticated, address, router, autoPlaceFleet]);

  // Turn timer interval countdown
  useEffect(() => {
    if (phase !== 'battle' || !turnDeadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((turnDeadline - Date.now()) / 1000));
      setTurnSecondsRemaining(remaining);
    }, 500);

    return () => clearInterval(interval);
  }, [phase, turnDeadline]);

  // Submit Fleet Placement & Cryptographic Commitment
  const submitFleet = async () => {
    if (!matchId) throw new Error('No active match');

    // Validate placement locally with @wba/engine
    const validation = validatePlacement({ ships, mines }, DEFAULT_CONFIG);
    if (!validation.ok) {
      throw new Error(`Invalid fleet placement: ${validation.errors.join(', ')}`);
    }

    // Generate cryptographic salt and Keccak-256 commitment hash
    const generatedSalt = generateSalt();
    const computedCommitment = commitPlacement({ ships, mines }, generatedSalt);

    setSalt(generatedSalt);
    setCommitment(computedCommitment);

    // Save salt and fleet locally in sessionStorage for post-match reveal audit
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(
        `wba_reveal_${matchId}`,
        JSON.stringify({ salt: generatedSalt, ships, mines }),
      );
    }

    const socket = getSocket();
    await new Promise<void>((resolve, reject) => {
      socket.emit(
        'placement:submit',
        {
          matchId,
          commitment: computedCommitment,
          ships,
          mines,
        },
        (ack: { ok: boolean; error?: string }) => {
          if (ack && !ack.ok) {
            reject(new Error(ack.error || 'Failed to submit placement'));
          } else {
            setIsPlacementSubmitted(true);
            resolve();
          }
        },
      );
    });
  };

  // Fire Shot
  const fireShot = async (x: number, y: number) => {
    if (!matchId) return;
    if (!isMyTurn) throw new Error('Not your turn');

    const socket = getSocket();
    await new Promise<void>((resolve, reject) => {
      socket.emit(
        'shot:fire',
        { matchId, coordinate: { x, y } },
        (ack: { ok: boolean; error?: string }) => {
          if (ack && !ack.ok) {
            reject(new Error(ack.error || 'Failed to fire shot'));
          } else {
            resolve();
          }
        },
      );
    });
  };

  // Submit Reveal
  const submitReveal = async () => {
    if (!matchId) return;

    let revealData = salt ? { salt, ships, mines } : null;
    if (!revealData && typeof window !== 'undefined') {
      const stored = sessionStorage.getItem(`wba_reveal_${matchId}`);
      if (stored) revealData = JSON.parse(stored);
    }

    if (!revealData) {
      throw new Error('Reveal data (secret salt and ships) not found in session');
    }

    const socket = getSocket();
    await new Promise<void>((resolve, reject) => {
      socket.emit(
        'reveal:submit',
        {
          matchId,
          salt: revealData!.salt,
          ships: revealData!.ships,
          mines: revealData!.mines,
        },
        (ack: { ok: boolean; error?: string }) => {
          if (ack && !ack.ok) {
            // fallback to REST API
            api.matches
              .submitReveal(matchId, revealData!)
              .then(() => resolve())
              .catch(reject);
          } else {
            resolve();
          }
        },
      );
    });
  };

  // Matchmaking Queue
  const joinQueue = (mode: 'ranked' | 'casual' = 'ranked') => {
    const socket = getSocket();
    socket.emit('queue:join', { mode });
    setInQueue(true);
    setPhase('searching');
  };

  const leaveQueue = () => {
    const socket = getSocket();
    socket.emit('queue:leave');
    setInQueue(false);
    setPhase('idle');
  };

  // Private Rooms
  const createPrivateRoom = async (code?: string): Promise<string> => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit(
        'room:create',
        { customCode: code },
        (ack: { ok: boolean; roomCode?: string; error?: string }) => {
          if (ack && ack.ok && ack.roomCode) {
            setRoomCode(ack.roomCode);
            resolve(ack.roomCode);
          } else {
            reject(new Error(ack?.error || 'Failed to create room'));
          }
        },
      );
    });
  };

  const joinPrivateRoom = async (code: string): Promise<void> => {
    const socket = getSocket();
    return new Promise((resolve, reject) => {
      socket.emit(
        'room:join',
        { roomCode: code },
        (ack: { ok: boolean; matchId?: string; error?: string }) => {
          if (ack && ack.ok) {
            setRoomCode(code);
            resolve();
          } else {
            reject(new Error(ack?.error || 'Failed to join room'));
          }
        },
      );
    });
  };

  // Chat
  const sendChat = (text: string) => {
    if (!matchId || !text.trim()) return;
    const socket = getSocket();
    socket.emit('chat:send', { matchId, text: text.trim() });
  };

  return (
    <GameContext.Provider
      value={{
        phase,
        matchId,
        roomCode,
        players,
        currentTurn,
        turnSecondsRemaining,
        turnDeadline,
        ships,
        mines,
        orientation,
        salt,
        commitment,
        isPlacementSubmitted,
        setOrientation,
        toggleOrientation,
        setShips,
        setMines,
        autoPlaceFleet,
        clearFleet,
        submitFleet,
        shots,
        myScore,
        opponentScore,
        streak,
        winner,
        forfeit,
        isMyTurn,
        fireShot,
        messages,
        sendChat,
        inQueue,
        joinQueue,
        leaveQueue,
        createPrivateRoom,
        joinPrivateRoom,
        verification,
        resultHash,
        submitReveal,
        resetGame,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
