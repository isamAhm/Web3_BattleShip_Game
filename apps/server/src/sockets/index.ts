import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'node:http';
import cookie from 'cookie';
import { authService } from '../services/auth.js';
import { matchmakingService } from '../services/matchmaking.js';
import { matchManager } from '../services/matchManager.js';
import { socialRepo } from '../repositories/socialRepo.js';
import { playerRepo } from '../repositories/playerRepo.js';
import {
  queueJoinPayloadSchema,
  roomCreatePayloadSchema,
  roomJoinPayloadSchema,
  placementPayloadSchema,
  firePayloadSchema,
  revealPayloadSchema,
  chatSendPayloadSchema,
  spectateJoinPayloadSchema,
  inviteSendPayloadSchema,
  SessionUser,
} from '@wba/shared';
import { DEFAULT_CONFIG } from '@wba/engine';

export interface AuthenticatedSocket extends Socket {
  data: {
    user: SessionUser;
  };
}

export function setupSocketServer(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Reflect origin so Access-Control-Allow-Credentials: true is valid in browsers
        callback(null, true);
      },
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Track every connected socket per normalized address (multiple tabs / reconnect overlap)
  const userSockets = new Map<string, Set<string>>(); // address -> socketIds
  const userRoom = (address: string) => `user:${address.toLowerCase()}`;

  /** Puts every live socket of the given players into the match room and tells them it started. */
  const announceMatch = (
    players: string[],
    matchId: string,
    roomCode: string,
  ): void => {
    const session = matchManager.getSession(matchId);
    for (const p of players) {
      const addr = p.toLowerCase();
      const ids = userSockets.get(addr);
      if (ids && ids.size > 0 && session) session.participants.set(addr, [...ids][ids.size - 1]);
      io.in(userRoom(addr)).socketsJoin(roomCode);
    }
    for (const p of players) {
      io.to(userRoom(p)).emit('match:found', {
        matchId,
        roomCode,
        players,
        expiresAt: Date.now() + DEFAULT_CONFIG.placementSeconds * 1000,
      });
    }
  };

  // Bind MatchManager emitter to Socket.IO
  matchManager.setIoEmit((room: string, event: string, data: any) => {
    io.to(room).emit(event, data);
  });

  // Authentication Middleware
  io.use(async (socket, next) => {
    const rawCookies = socket.handshake.headers.cookie;
    let sessionToken: string | undefined;

    if (rawCookies) {
      const parsed = cookie.parse(rawCookies);
      sessionToken = parsed.wba_session;
    }

    if (!sessionToken && socket.handshake.auth?.token) {
      sessionToken = socket.handshake.auth.token;
    }

    if (!sessionToken) {
      return next(new Error('Unauthorized: No session token provided'));
    }

    try {
      const user = await authService.getSession(sessionToken);
      if (!user) {
        return next(new Error('Unauthorized: Invalid or expired session'));
      }
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Unauthorized: Authentication error'));
    }
  });

  io.on('connection', (rawSocket: Socket) => {
    const socket = rawSocket as AuthenticatedSocket;
    const userAddress = socket.data.user.address.toLowerCase();
    if (!userSockets.has(userAddress)) userSockets.set(userAddress, new Set());
    userSockets.get(userAddress)!.add(socket.id);
    socket.join(userRoom(userAddress));
    console.log(`[Socket] Client connected: ${userAddress} (${socket.id})`);

    // Check if player has an active match and handle reconnection
    const activeSession = matchManager.getActiveMatchForPlayer(userAddress);
    if (activeSession) {
      console.log(`[Socket] Player ${userAddress} reconnected to active match ${activeSession.matchId}`);
      socket.join(activeSession.roomCode);
      activeSession.participants.set(userAddress, socket.id);

      // Cancel disconnect timer if any
      const dcTimer = activeSession.disconnectTimers.get(userAddress);
      if (dcTimer) {
        clearTimeout(dcTimer);
        activeSession.disconnectTimers.delete(userAddress);
      }

      // Send viewer-specific restored view
      const playerIdx = activeSession.getPlayerIndex(userAddress);
      socket.emit(
        'match:restore',
        activeSession.getView(playerIdx !== null ? playerIdx : 'spectator'),
      );
    }

    // --- Matchmaking: Queue ---
    socket.on('queue:join', (payload) => {
      try {
        console.log(`[Socket] queue:join from ${userAddress}`);
        queueJoinPayloadSchema.parse(payload || {});
        const result = matchmakingService.joinQueue(userAddress);
        console.log(`[Socket] matchmaking result for ${userAddress}:`, result);

        if (!result.ok) {
          socket.emit('error', {
            message: result.error,
            ...(result.activeMatchId
              ? { code: 'ACTIVE_MATCH', matchId: result.activeMatchId }
              : {}),
          });
          return;
        }

        if (result.match) {
          const { matchId, roomCode, players } = result.match;
          console.log(`[Socket] Match paired: ${matchId} between ${players.join(' & ')}`);
          announceMatch(players, matchId, roomCode);
        } else {
          socket.emit('queue:status', { inQueue: true });
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('queue:leave', () => {
      matchmakingService.leaveQueue(userAddress);
      socket.emit('queue:status', { inQueue: false });
    });

    // --- Private Rooms ---
    socket.on('room:create', (payload, ack) => {
      try {
        const { customCode } = roomCreatePayloadSchema.parse(payload || {});
        const res = matchmakingService.createPrivateRoom(userAddress, customCode);
        if (!res.ok) {
          if (ack) ack({ ok: false, error: res.error, activeMatchId: res.activeMatchId });
          else socket.emit('error', { message: res.error });
          return;
        }

        socket.join(res.roomCode!);
        if (ack) ack({ ok: true, roomCode: res.roomCode });
        socket.emit('room:created', { roomCode: res.roomCode });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
        else socket.emit('error', { message: err.message });
      }
    });

    socket.on('room:join', (payload, ack) => {
      try {
        const { roomCode } = roomJoinPayloadSchema.parse(payload);
        const res = matchmakingService.joinPrivateRoom(userAddress, roomCode);
        if (!res.ok) {
          if (ack) ack({ ok: false, error: res.error, activeMatchId: res.activeMatchId });
          else socket.emit('error', { message: res.error });
          return;
        }

        const { matchId, players } = res.match!;
        announceMatch(players, matchId, res.match!.roomCode);

        if (ack) ack({ ok: true, matchId });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
        else socket.emit('error', { message: err.message });
      }
    });

    // --- Placement ---
    socket.on('placement:submit', (payload, ack) => {
      try {
        const { matchId, commitment, ships, mines } = placementPayloadSchema.parse(payload);
        const session = matchManager.getSession(matchId);
        if (!session) {
          const err = 'Match session not found';
          if (ack) ack({ ok: false, error: err });
          else socket.emit('error', { message: err });
          return;
        }

        const res = session.handlePlacement(userAddress, commitment as `0x${string}`, ships, mines);
        if (!res.ok) {
          if (ack) ack({ ok: false, error: res.error });
          else socket.emit('error', { message: res.error });
          return;
        }

        if (ack) ack({ ok: true });
        socket.emit('placement:accepted', { matchId });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
        else socket.emit('error', { message: err.message });
      }
    });

    // --- Shot Fire ---
    socket.on('shot:fire', (payload, ack) => {
      try {
        const { matchId, coordinate } = firePayloadSchema.parse(payload);
        const session = matchManager.getSession(matchId);
        if (!session) {
          const err = 'Match session not found';
          if (ack) ack({ ok: false, error: err });
          else socket.emit('error', { message: err });
          return;
        }

        const res = session.handleFire(userAddress, coordinate);
        if (!res.ok) {
          if (ack) ack({ ok: false, error: res.error });
          else socket.emit('error', { message: res.error });
          return;
        }

        if (ack) ack({ ok: true, result: res.shot });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
        else socket.emit('error', { message: err.message });
      }
    });

    // --- Reveal Submit ---
    socket.on('reveal:submit', (payload, ack) => {
      try {
        const { matchId, salt, ships, mines } = revealPayloadSchema.parse(payload);
        const session = matchManager.getSession(matchId);
        if (!session) {
          const err = 'Match session not found';
          if (ack) ack({ ok: false, error: err });
          else socket.emit('error', { message: err });
          return;
        }

        const res = session.handleReveal(userAddress, salt as `0x${string}`, ships, mines);
        if (!res.ok) {
          if (ack) ack({ ok: false, error: res.error });
          else socket.emit('error', { message: res.error });
          return;
        }

        if (ack) ack({ ok: true });
        socket.emit('reveal:accepted', { matchId });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
        else socket.emit('error', { message: err.message });
      }
    });

    // --- Forfeit Match ---
    socket.on('match:forfeit', (payload, ack) => {
      try {
        const matchId = typeof payload === 'string' ? payload : payload?.matchId;
        const session = matchManager.getSession(matchId);
        if (!session) {
          console.log(`[Socket] match:forfeit - session not found for match ${matchId}`);
          if (ack) ack({ ok: false, error: 'Match session not found' });
          return;
        }

        const forfeitingPlayerIdx = session.getPlayerIndex(userAddress);
        if (forfeitingPlayerIdx === null) {
          if (ack) ack({ ok: false, error: 'Player not in match' });
          return;
        }
        if (session.matchState.phase === 'finished') {
          // Already over (e.g. the opponent forfeited first): nothing left to forfeit
          if (ack) ack({ ok: true, alreadyFinished: true });
          return;
        }

        console.log(`[Socket] match:forfeit - Player ${userAddress} forfeiting match ${matchId}`);

        // Notify all players in the room immediately about the forfeit
        {
          const otherPlayerIdx = forfeitingPlayerIdx === 0 ? 1 : 0;
          const otherPlayer = session.matchState.players[otherPlayerIdx];

          // Emit forfeit notification to the room
          io.to(session.roomCode).emit('match:forfeit-notification', {
            matchId,
            forfeitedBy: userAddress,
            winner: otherPlayer.address,
            reason: 'resigned',
            message: `${userAddress.slice(0, 8)}... has forfeited the match`,
          });

          console.log(`[Socket] Forfeit notification sent to room ${session.roomCode}`);
        }

        // Handle the forfeit (this will call handleEndedState internally)
        session.handleForfeit(userAddress, 'resigned');
        console.log(`[Socket] Player ${userAddress} forfeited match ${matchId}`);

        if (ack) ack({ ok: true });
      } catch (err: any) {
        console.error('[Socket] match:forfeit error:', err);
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    // --- Spectate ---
    socket.on('spectate:join', (payload) => {
      try {
        const { matchId } = spectateJoinPayloadSchema.parse(payload);
        const session = matchManager.getSession(matchId);
        if (!session) {
          socket.emit('error', { message: 'Match not found' });
          return;
        }

        session.spectators.add(socket.id);
        socket.join(session.roomCode);
        socket.emit('spectate:view', session.getView('spectator'));
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('spectate:leave', (payload) => {
      try {
        const { matchId } = spectateJoinPayloadSchema.parse(payload);
        const session = matchManager.getSession(matchId);
        if (session) {
          session.spectators.delete(socket.id);
          socket.leave(session.roomCode);
        }
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- In-Game Chat ---
    socket.on('chat:send', async (payload) => {
      try {
        const { matchId, text } = chatSendPayloadSchema.parse(payload);
        const session = matchManager.getSession(matchId);
        if (!session) return;

        const player = await playerRepo.findByAddress(userAddress);
        const username = player?.username || `Player_${userAddress.slice(2, 8)}`;

        io.to(session.roomCode).emit('chat:message', {
          sender: userAddress,
          username,
          text,
          timestamp: Date.now(),
        });
      } catch (err: any) {
        socket.emit('error', { message: err.message });
      }
    });

    // --- Game Invites ---
    socket.on('invite:send', async (payload, ack) => {
      try {
        const { recipientAddress, roomCode } = inviteSendPayloadSchema.parse(payload);
        const invite = await socialRepo.createInvite(userAddress, recipientAddress, roomCode);
        const sender = await playerRepo.findByAddress(userAddress);

        // Notify every live socket of the recipient (no-op if they are offline)
        io.to(userRoom(recipientAddress)).emit('invite:received', {
          inviteId: invite.inviteId,
          from: userAddress,
          fromUsername: sender?.username || `Player_${userAddress.slice(2, 8)}`,
          roomCode,
          createdAt: invite.createdAt.toISOString(),
        });

        if (ack) ack({ ok: true, inviteId: invite.inviteId });
      } catch (err: any) {
        if (ack) ack({ ok: false, error: err.message });
      }
    });

    // --- Disconnect & Grace Period ---
    socket.on('disconnect', () => {
      const ids = userSockets.get(userAddress);
      ids?.delete(socket.id);
      // Another socket for this address is still connected (new tab / reconnect overlap):
      // the player is not gone, so keep their queue entry and do not arm a forfeit timer.
      if (ids && ids.size > 0) return;
      userSockets.delete(userAddress);
      matchmakingService.leaveQueue(userAddress);

      const session = matchManager.getActiveMatchForPlayer(userAddress);
      if (session && session.matchState.phase !== 'finished') {
        // Arm 30s reconnect grace timer
        const graceMs = DEFAULT_CONFIG.reconnectGraceSeconds * 1000;
        const timer = setTimeout(() => {
          // If still disconnected when timer fires, trigger forfeit
          if (session.matchState.phase !== 'finished') {
            session.handleForfeit(userAddress, 'disconnect');
          }
        }, graceMs);

        session.disconnectTimers.set(userAddress, timer);
      }
    });
  });

  return io;
}
