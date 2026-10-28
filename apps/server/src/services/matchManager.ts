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

export class MatchSession {
  public matchState: MatchState;
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

    // If both revealed, verify match and finalize record
    if (this.matchState.players[0].reveal && this.matchState.players[1].reveal) {
      this.verifyAndPersistFinal();
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

    this.ioEmitCallback(this.roomCode, 'match:end', {
      matchId: this.matchId,
      winner: winnerAddress,
      forfeit: this.matchState.forfeit !== null,
      scores: scoresObj,
    });

    // Save preliminary ended state to DB
    await matchRepo.update(this.matchId, {
      status: 'ended',
      winner: winnerAddress,
      forfeit: this.matchState.forfeit !== null,
      scores: new Map(Object.entries(scoresObj)),
      endedAt: new Date(),
    });

    if (this.onMatchEndCallback) {
      this.onMatchEndCallback(this.matchId);
    }

    // Schedule post-match processing
    await postMatchProcessor.scheduleProcessing(this.matchId);
  }

  public async verifyAndPersistFinal(): Promise<void> {
    const verification = verifyMatch(this.matchState);
    let recordHash: string | undefined;

    if (verification.status === 'verified') {
      const record = buildRecord(this.matchState);
      recordHash = resultHash(record);

      await matchRepo.update(this.matchId, {
        verification: { status: 'verified' },
        canonicalRecord: record,
        resultHash: recordHash,
      });

      // Trigger post-match processing for chain recording
      await postMatchProcessor.scheduleProcessing(this.matchId);
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

  public getView(viewer: Viewer): PublicMatchView {
    return publicView(this.matchState, viewer);
  }
}

export class MatchManager {
  private sessions = new Map<string, MatchSession>(); // matchId -> session
  private roomToMatch = new Map<string, string>(); // roomCode -> matchId
  private playerToMatch = new Map<string, string>(); // address -> matchId
  private ioEmit: (room: string, event: string, data: any) => void = () => {};

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
      this.playerToMatch.delete(norm);
      return null;
    }
    return session;
  }

  public removeSession(matchId: string): void {
    const session = this.sessions.get(matchId);
    if (session) {
      session.clearTimers();
      this.playerToMatch.delete(session.matchState.players[0].address.toLowerCase());
      this.playerToMatch.delete(session.matchState.players[1].address.toLowerCase());
      this.roomToMatch.delete(session.roomCode);
      this.sessions.delete(matchId);
    }
  }

  public clear(): void {
    this.sessions.forEach((s) => s.clearTimers());
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
