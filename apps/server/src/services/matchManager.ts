import {
  createMatch,
  submitPlacement,
  fire,
  timeoutTurn,
  forfeit,
  submitReveal,
  verifyMatch,
  publicView,
  buildRecord,
  resultHash,
  DEFAULT_CONFIG,
  type MatchState,
  type Viewer,
  type PublicMatchView,
  type PlayerIndex,
  type ShotEntry,
  type ForfeitReason,
  type Hex,
} from '@wba/engine';
import { matchRepo } from '../repositories/matchRepo.js';
import { postMatchProcessor } from '../workers/postMatchWorker.js';

/** How long a finished session stays in memory so players can still submit reveals. */
const REVEAL_WINDOW_MS = 5 * 60 * 1000;

export interface ShotRecord {
  shooter: string;
  target: string;
  coordinate: { x: number; y: number };
  outcome: string;
  pointsAwarded: number;
  shooterStreak: number;
  shooterScore: number;
  timestamp: number;
}

export class MatchSession {
  public matchState: MatchState;
  public shotLog: ShotRecord[] = [];
  public cleanupTimer: NodeJS.Timeout | null = null;
  public onExpireCallback?: (matchId: string) => void;
  public roomCode: string;
  public participants: Map<string, string> = new Map(); // address -> socketId
  public spectators: Set<string> = new Set(); // socketIds
  public placementTimer: NodeJS.Timeout | null = null;
  public turnTimer: NodeJS.Timeout | null = null;
  public disconnectTimers: Map<string, NodeJS.Timeout> = new Map();
  public ioEmitCallback: (room: string, event: string, data: any) => void;
  public onMatchEndCallback?: (matchId: string) => void;

  constructor(
    matchId: string,
    player1: string,
    player2: string,
    roomCode: string,
    ioEmit: (room: string, event: string, data: any) => void,
  ) {
    this.matchState = createMatch({
      matchId,
      players: [player1, player2],
    });
    this.roomCode = roomCode;
    this.ioEmitCallback = ioEmit;
    this.startPlacementTimer();
  }

  public get matchId(): string {
    return this.matchState.matchId;
  }

  public getPlayerIndex(address: string): PlayerIndex | null {
    const norm = address.toLowerCase();
    if (this.matchState.players[0].address === norm) return 0;
    if (this.matchState.players[1].address === norm) return 1;
    return null;
  }

  public startPlacementTimer(): void {
    this.clearTimers();
    const duration = DEFAULT_CONFIG.placementSeconds * 1000;
    this.placementTimer = setTimeout(async () => {
      if (this.matchState.phase === 'placement') {
        const b0 = this.matchState.players[0].board;
        const b1 = this.matchState.players[1].board;

        if (!b0 && !b1) {
          this.endMatch(null, true);
        } else if (!b0) {
          this.handleForfeit(this.matchState.players[0].address, 'placement_timeout');
        } else if (!b1) {
          this.handleForfeit(this.matchState.players[1].address, 'placement_timeout');
        }
      }
    }, duration);
  }

  public startTurnTimer(): void {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    if (this.matchState.phase !== 'battle') return;

    const currentTurnIndex = this.matchState.turn;
    const currentTurnAddress = this.matchState.players[currentTurnIndex].address;

    const duration = DEFAULT_CONFIG.turnSeconds;
    const deadline = Date.now() + duration * 1000;

    this.ioEmitCallback(this.roomCode, 'turn:timer', {
      matchId: this.matchId,
      currentTurn: currentTurnAddress,
      secondsRemaining: duration,
      deadline,
    });

    const expectedCount = this.matchState.shots.length;

    this.turnTimer = setTimeout(async () => {
      if (this.matchState.phase !== 'battle') return;
      if (this.matchState.shots.length !== expectedCount) return;

      const result = timeoutTurn(this.matchState, { expectedShotCount: expectedCount });
      if (!result.ok) return;

      this.matchState = result.state;

      if (this.matchState.phase === 'finished') {
        await this.handleEndedState();
      } else {
        this.ioEmitCallback(this.roomCode, 'match:update', this.getView('spectator'));
        this.startTurnTimer();
      }
    }, duration * 1000);
  }

  public handlePlacement(
    address: string,
    commitment: Hex,
    ships: any[],
    mines: any[],
  ): { ok: boolean; error?: string } {
    const idx = this.getPlayerIndex(address);
    if (idx === null) return { ok: false, error: 'Player not in match' };

    const res = submitPlacement(this.matchState, idx, {
      board: { ships, mines },
      commitment,
    });
    if (!res.ok) return { ok: false, error: res.message };

    this.matchState = res.state;

    // Update commitments in DB
    const commitmentsMap = new Map<string, string>();
    if (this.matchState.players[0].commitment) {
      commitmentsMap.set(this.matchState.players[0].address, this.matchState.players[0].commitment);
    }
    if (this.matchState.players[1].commitment) {
      commitmentsMap.set(this.matchState.players[1].address, this.matchState.players[1].commitment);
    }

    matchRepo.update(this.matchId, {
      commitments: commitmentsMap,
      status: this.matchState.phase === 'finished' ? 'ended' : this.matchState.phase,
    });

    if (this.matchState.phase === 'battle') {
      if (this.placementTimer) clearTimeout(this.placementTimer);
      const currentTurnAddress = this.matchState.players[this.matchState.turn].address;
      this.ioEmitCallback(this.roomCode, 'match:start', {
        matchId: this.matchId,
        currentTurn: currentTurnAddress,
        turnDeadline: Date.now() + DEFAULT_CONFIG.turnSeconds * 1000,
      });
      this.startTurnTimer();
    }

    return { ok: true };
  }

  public handleFire(
    address: string,
    coordinate: { x: number; y: number },
  ): { ok: boolean; error?: string; shot?: ShotEntry } {
    const idx = this.getPlayerIndex(address);
    if (idx === null) return { ok: false, error: 'Player not in match' };

    const res = fire(this.matchState, idx, coordinate.x, coordinate.y);
    if (!res.ok) return { ok: false, error: res.message };

    this.matchState = res.state;
    const shooterState = this.matchState.players[idx];
    const targetIdx = idx === 0 ? 1 : 0;
    const targetState = this.matchState.players[targetIdx];

    const nextTurnAddress =
      this.matchState.phase === 'battle'
        ? this.matchState.players[this.matchState.turn].address
        : null;

    const winnerAddress =
      this.matchState.winner !== null
        ? this.matchState.players[this.matchState.winner].address
        : null;

    this.shotLog.push({
      shooter: shooterState.address,
      target: targetState.address,
      coordinate: { x: coordinate.x, y: coordinate.y },
      outcome: res.shot.outcome,
      pointsAwarded: res.points,
      shooterStreak: shooterState.streak,
      shooterScore: shooterState.score,
      timestamp: Date.now(),
    });

    // Emit shot result
    this.ioEmitCallback(this.roomCode, 'shot:result', {
      matchId: this.matchId,
      shooter: shooterState.address,
      target: targetState.address,
      coordinate,
      outcome: res.shot.outcome,
      pointsAwarded: res.points,
      shooterStreak: shooterState.streak,
      shooterScore: shooterState.score,
      nextTurn: nextTurnAddress,
      gameOver: this.matchState.phase === 'finished',
      winner: winnerAddress,
      forfeit: this.matchState.forfeit !== null,
    });

    if (this.matchState.phase === 'finished') {
      this.handleEndedState();
    } else {
      this.startTurnTimer();
    }

    return { ok: true, shot: res.shot };
  }

  public handleForfeit(address: string, reason: ForfeitReason = 'resigned'): void {
    const idx = this.getPlayerIndex(address);
    if (idx === null) return;

    const res = forfeit(this.matchState, idx, reason);
    if (!res.ok) return;
    console.log(`[MatchSession] ${address} forfeits ${this.matchId} (reason: ${reason})`);

    this.matchState = res.state;
    this.handleEndedState();
  }

  public handleReveal(
    address: string,
    salt: Hex,
    ships: any[],
    mines: any[],
  ): { ok: boolean; error?: string } {
    const idx = this.getPlayerIndex(address);
    if (idx === null) return { ok: false, error: 'Player not in match' };

    const res = submitReveal(this.matchState, idx, {
      board: { ships, mines },
      salt,
    });
    if (!res.ok) return { ok: false, error: res.message };

    this.matchState = res.state;

    this.persistReveals().catch((err) =>
      console.error(`[MatchSession] Failed to persist reveals for ${this.matchId}:`, err),
    );

    // If both revealed, verify match and finalize record
    if (this.matchState.players[0].reveal && this.matchState.players[1].reveal) {
      this.verifyAndPersistFinal().catch((err) =>
        console.error(`[MatchSession] Verification failed for ${this.matchId}:`, err),
      );
    }

    return { ok: true };
  }

  private async handleEndedState(): Promise<void> {
    this.clearTimers();

    const p0 = this.matchState.players[0].address;
    const p1 = this.matchState.players[1].address;
    const scoresObj: Record<string, number> = {
      [p0]: this.matchState.players[0].score,
      [p1]: this.matchState.players[1].score,
    };

    const winnerAddress =
      this.matchState.winner !== null
        ? this.matchState.players[this.matchState.winner].address
        : null;

    const forfeitInfo = this.matchState.forfeit
      ? {
        forfeitedBy: this.matchState.players[this.matchState.forfeit.by].address,
        reason: this.matchState.forfeit.reason,
      }
      : null;

    console.log(`[MatchSession] Match ${this.matchId} ended. Winner: ${winnerAddress}, Forfeit: ${forfeitInfo ? 'Yes' : 'No'}`);

    // Emit match end event with complete information
    this.ioEmitCallback(this.roomCode, 'match:end', {
      matchId: this.matchId,
      winner: winnerAddress,
      forfeitedBy: forfeitInfo?.forfeitedBy || null,
      forfeit: this.matchState.forfeit !== null,
      reason: forfeitInfo?.reason,
      scores: scoresObj,
      message: forfeitInfo
        ? `Match ended by forfeit. ${forfeitInfo.forfeitedBy.slice(0, 8)}... surrendered.`
        : 'Match completed.',
    });

    // Save ended state, the shot log and the canonical record (when there is a winner) to DB
    const finalUpdate: Parameters<typeof matchRepo.update>[1] = {
      status: 'ended',
      winner: winnerAddress,
      forfeit: this.matchState.forfeit !== null,
      scores: new Map(Object.entries(scoresObj)),
      shots: this.shotLog,
      endedAt: new Date(),
    };
    if (winnerAddress !== null) {
      const record = buildRecord(this.matchState);
      finalUpdate.canonicalRecord = record;
      finalUpdate.resultHash = resultHash(record);
    }
    await matchRepo.update(this.matchId, finalUpdate);

    this.scheduleExpiry();

    if (this.onMatchEndCallback) {
      console.log(`[MatchSession] Invoking onMatchEndCallback for match ${this.matchId}`);
      this.onMatchEndCallback(this.matchId);
    }

    // Schedule post-match processing
    await postMatchProcessor.scheduleProcessing(this.matchId);
  }

  public async verifyAndPersistFinal(): Promise<void> {
    const verification = verifyMatch(this.matchState);
    let recordHash: string | undefined;

    if (verification.status === 'verified') {
      recordHash = verification.resultHash;
      await matchRepo.update(this.matchId, { verification: { status: 'verified' } });
    } else {
      await matchRepo.update(this.matchId, {
        verification: {
          status: verification.status,
          details: { errors: verification.errors, missing: verification.missingReveals },
        },
      });
    }

    this.ioEmitCallback(this.roomCode, 'match:verified', {
      matchId: this.matchId,
      verification,
      resultHash: recordHash,
    });
  }

  private async persistReveals(): Promise<void> {
    const reveals = new Map<string, { salt: string; ships: any[]; mines: any[] }>();
    for (const p of this.matchState.players) {
      if (p.reveal) {
        reveals.set(p.address, {
          salt: p.reveal.salt,
          ships: p.reveal.board.ships,
          mines: p.reveal.board.mines,
        });
      }
    }
    await matchRepo.update(this.matchId, { reveals });
  }

  /** Keeps the finished session around for the reveal window, then asks the manager to drop it. */
  private scheduleExpiry(): void {
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = setTimeout(() => this.onExpireCallback?.(this.matchId), REVEAL_WINDOW_MS);
    this.cleanupTimer.unref?.();
  }

  public endMatch(winnerAddress: string | null, isForfeit: boolean): void {
    this.clearTimers();
    const winnerIdx = winnerAddress ? this.getPlayerIndex(winnerAddress) : null;
    this.matchState.phase = 'finished';
    this.matchState.winner = winnerIdx;
    if (isForfeit) {
      this.matchState.forfeit = {
        by: winnerIdx === 0 ? 1 : 0,
        reason: 'disconnect',
      };
    }
    this.handleEndedState();
  }

  public clearTimers(): void {
    if (this.placementTimer) clearTimeout(this.placementTimer);
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.disconnectTimers.forEach((timer) => clearTimeout(timer));
    this.disconnectTimers.clear();
  }

  public dispose(): void {
    this.clearTimers();
    if (this.cleanupTimer) clearTimeout(this.cleanupTimer);
    this.cleanupTimer = null;
  }

  public getView(viewer: Viewer): PublicMatchView {
    return publicView(this.matchState, viewer);
  }
}

export class MatchManager {
  private sessions = new Map<string, MatchSession>(); // matchId -> session
  private roomToMatch = new Map<string, string>(); // roomCode -> matchId
  private playerToMatch = new Map<string, string>(); // address -> matchId
  private ioEmit: (room: string, event: string, data: any) => void = () => { };

  public setIoEmit(fn: (room: string, event: string, data: any) => void): void {
    this.ioEmit = fn;
  }

  public createSession(
    matchId: string,
    player1: string,
    player2: string,
    roomCode: string,
  ): MatchSession {
    const session = new MatchSession(matchId, player1, player2, roomCode, this.ioEmit);
    this.sessions.set(matchId, session);
    this.roomToMatch.set(roomCode, matchId);
    this.playerToMatch.set(player1.toLowerCase(), matchId);
    this.playerToMatch.set(player2.toLowerCase(), matchId);

    // Initial match DB record
    matchRepo.create({
      matchId,
      players: [player1, player2],
      status: 'placement',
      commitments: new Map(),
      startedAt: new Date(),
    });

    session.onExpireCallback = (id) => this.removeSession(id);
    session.onMatchEndCallback = () => {
      this.playerToMatch.delete(player1.toLowerCase());
      this.playerToMatch.delete(player2.toLowerCase());
    };

    return session;
  }

  public getSession(matchId: string): MatchSession | null {
    return this.sessions.get(matchId) ?? null;
  }

  public getSessionByRoom(roomCode: string): MatchSession | null {
    const matchId = this.roomToMatch.get(roomCode);
    if (!matchId) return null;
    return this.getSession(matchId);
  }

  public getActiveMatchForPlayer(address: string): MatchSession | null {
    const norm = address.toLowerCase();
    const matchId = this.playerToMatch.get(norm);
    if (!matchId) return null;
    const session = this.getSession(matchId);
    if (!session || session.matchState.phase === 'finished') {
      // Clean up mapping if match is finished
      this.playerToMatch.delete(norm);
      console.log(`[MatchManager] Cleaned up finished match mapping for player ${norm}`);
      return null;
    }
    return session;
  }

  public removeSession(matchId: string): void {
    const session = this.sessions.get(matchId);
    if (session) {
      session.dispose();
      this.playerToMatch.delete(session.matchState.players[0].address.toLowerCase());
      this.playerToMatch.delete(session.matchState.players[1].address.toLowerCase());
      this.roomToMatch.delete(session.roomCode);
      this.sessions.delete(matchId);
    }
  }

  public clear(): void {
    this.sessions.forEach((s) => s.dispose());
    this.sessions.clear();
    this.roomToMatch.clear();
    this.playerToMatch.clear();
  }

  public listActiveSessions(): Array<{
    matchId: string;
    roomCode: string;
    players: string[];
    phase: string;
    spectatorsCount: number;
  }> {
    const list: Array<{
      matchId: string;
      roomCode: string;
      players: string[];
      phase: string;
      spectatorsCount: number;
    }> = [];
    this.sessions.forEach((s) => {
      if (s.matchState.phase !== 'finished') {
        list.push({
          matchId: s.matchId,
          roomCode: s.roomCode,
          players: [s.matchState.players[0].address, s.matchState.players[1].address],
          phase: s.matchState.phase,
          spectatorsCount: s.spectators.size,
        });
      }
    });
    return list;
  }
}

export const matchManager = new MatchManager();
