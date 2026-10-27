# Battle Arena — Game Server

Node.js + Express + Socket.IO backend for Web3 Battle Arena.

## Stack
- **Express** — REST API (auth, players, matches, leaderboard)
- **Socket.IO** — real-time game events
- **MongoDB** — persistent storage (players, matches, badges)
- **Redis** — nonces, matchmaking queue, leaderboards
- **SIWE** — Sign-In with Ethereum (EIP-4361)
- **viem** — on-chain reads/writes via the relayer

## Quick Start

```bash
# 1. Install deps
cd apps/server
npm install

# 2. Copy and fill env
cp .env.example .env

# 3. Start MongoDB + Redis (Docker)
docker run -d -p 27017:27017 mongo
docker run -d -p 6379:6379 redis

# 4. Start dev server
npm run dev
```

Server runs on **http://localhost:4000**

## REST Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | /auth/nonce       | —    | Get a one-time SIWE nonce |
| POST | /auth/verify      | —    | Verify signed SIWE message → set session |
| GET  | /auth/me          | ✅   | Current session info |
| POST | /auth/logout      | ✅   | Destroy session |
| GET  | /players/:address | —    | Player profile + ranks |
| PATCH| /players/me       | ✅   | Update username/avatar |
| GET  | /players/:address/badges | — | Player badge list |
| GET  | /matches/:matchId | —   | Match details |
| GET  | /matches/:matchId/verify | — | Recompute & verify result hash |
| GET  | /matches?player=0x… | —  | Match history |
| GET  | /leaderboard/points | — | Top 20 by points |
| GET  | /leaderboard/streak | — | Top 20 by best streak |
| GET  | /leaderboard/fastest | — | Top 20 fastest wins |
| GET  | /health           | —    | Health check |

## Socket.IO Events

### Client → Server
| Event | Payload | Description |
|-------|---------|-------------|
| `queue:join` | — | Enter matchmaking queue |
| `queue:leave` | — | Leave queue |
| `room:create` | — | Create private room |
| `room:join` | `{ matchId }` | Join private room by ID |
| `placement:submit` | `{ matchId, board, salt }` | Submit fleet + commitment |
| `shot:fire` | `{ matchId, row, col }` | Fire a shot |
| `reveal:submit` | `{ matchId, board, salt }` | Post-game board reveal |
| `spectate:join` | `{ matchId }` | Watch a live match |
| `chat:send` | `{ matchId, text }` | Send chat message |
| `invite:send` | `{ to }` | Invite a player |

### Server → Client
| Event | Payload | Description |
|-------|---------|-------------|
| `match:found` | `{ matchId, opponent }` | Paired with opponent |
| `match:start` | `{ matchId, state }` | Both placed, battle begins |
| `match:rejoin` | `{ matchId, state }` | Reconnect to existing match |
| `shot:result` | `{ shooter, row, col, outcome, points, scores, streaks }` | Shot outcome |
| `turn:timer` | `{ player, seconds }` | Turn started |
| `turn:timeout` | `{ player }` | Turn timed out |
| `match:end` | `{ winner, forfeitedBy, scores }` | Match over |
| `match:verified` | `{ resultHash }` | Result hash after record |
| `chat:message` | `{ sender, text, ts }` | Incoming chat |
| `invite:received` | `{ from }` | Friend invite |
| `error` | `{ msg }` | Server-side error |

## Chain Modes

Set `CHAIN_MODE` in `.env`:

- **`simulated`** (default) — writes a fake `0xSIM_...` tx to `chain_log` collection. No gas, no RPC needed. Great for demos.
- **`testnet`** — calls `MatchRegistry.recordMatch()` on Base Sepolia via the relayer wallet. Requires `RELAYER_PRIVATE_KEY`, `REGISTRY_ADDRESS`, `RPC_URL`.

## Architecture

```
Client (browser)
  │  HTTPS / WSS
  ▼
Express + Socket.IO (port 4000)
  ├── /auth/*        SIWE login
  ├── /players/*     Profile API
  ├── /matches/*     Match history + verify
  ├── /leaderboard/* Redis sorted sets
  │
  ├── roomManager    In-memory live match state
  ├── matchmaking    Redis queue → pair players
  ├── engine         Pure game logic (placement, shots, scoring)
  ├── recordMatch    Persist to MongoDB + update leaderboards
  └── badgeWorker    Check thresholds → mint ERC-1155 badges
        │
        └── relayer  viem wallet → MatchRegistry / AchievementBadges
              │
              └── Base Sepolia (or simulated)
```
