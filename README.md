# Web3 Battle Arena — Battleship

On-chain Battleship. Real players. Verifiable results.

> Hackathon prototype · Base Sepolia · v1.0

---

## What it is

Classic 10×10 Battleship extended with hidden mines, hit-streak multipliers, and a speed bonus. Gameplay runs off-chain for speed. Results are committed on-chain so anyone can verify them.

**Key Web3 features:**
- **Sign-In with Ethereum (SIWE)** — wallet-based login, no passwords
- **Commit-reveal** — fleet hashed before battle, revealed after to prove nobody cheated
- **On-chain match record** — `MatchRegistry` contract stores winner + result hash
- **ERC-1155 badges** — soulbound achievement tokens (First Win, Admiral, etc.)

---

## Project structure

```
battle-arena/
├── src/                  ← Next.js frontend (App Router + Tailwind v4)
│   ├── app/              ← Pages: /, /play, /arena, /leaderboard, /badges, /replays, /settings
│   ├── components/       ← UI components (game, lobby, landing, layout, settings)
│   └── lib/              ← socket.ts, useGameSocket.ts, useAuth.ts, themes.ts
│
├── apps/
│   └── server/           ← Node.js + Express + Socket.IO
│       └── src/
│           ├── auth/     ← SIWE login (nonce, verify, session)
│           ├── chain/    ← relayer.ts (viem), badgeWorker.ts
│           ├── db/       ← mongo.ts, redis.ts
│           ├── game/     ← roomManager, matchmaking, recordMatch
│           ├── routes/   ← players, matches, leaderboard REST
│           └── sockets/  ← gameHandler (all Socket.IO events)
│
└── packages/
    ├── engine/           ← Pure TypeScript game logic (no I/O)
    │   └── src/          ← types, placement, commitment, scoring, engine, tests
    └── contracts/        ← Solidity (Hardhat)
        └── contracts/    ← MatchRegistry.sol, AchievementBadges.sol
```

---

## Quick Start (development)

### Prerequisites
- Node.js 20+
- Docker (for MongoDB + Redis)

### 1. Start databases
```bash
docker compose up mongo redis -d
```

### 2. Frontend
```bash
# In battle-arena/
npm install
cp .env.local.example .env.local   # set NEXT_PUBLIC_SERVER_URL
npm run dev                         # http://localhost:3000
```

### 3. Game server
```bash
cd apps/server
npm install
cp .env.example .env               # fill SESSION_SECRET at minimum
npm run dev                        # http://localhost:4000
```

### 4. (Optional) Deploy contracts
```bash
cd packages/contracts
npm install
npx hardhat compile
npx hardhat run scripts/deploy.ts --network localhost
# Add REGISTRY_ADDRESS and BADGES_ADDRESS to apps/server/.env
```

---

## Environment variables

### Frontend (`battle-arena/.env.local`)
```
NEXT_PUBLIC_SERVER_URL=http://localhost:4000
```

### Server (`apps/server/.env`)
```
PORT=4000
MONGO_URI=mongodb://localhost:27017/battle-arena
REDIS_URL=redis://localhost:6379
SESSION_SECRET=<random string>
SIWE_DOMAIN=localhost:3000
CLIENT_ORIGIN=http://localhost:3000
CHAIN_MODE=simulated          # or "testnet"
RELAYER_PRIVATE_KEY=          # testnet only
REGISTRY_ADDRESS=             # testnet only
RPC_URL=https://sepolia.base.org
```

---

## Game rules

| Item | Value |
|------|-------|
| Grid | 10 × 10 |
| Ships | Carrier(5), Battleship(4), Cruiser(3), Submarine(3), Destroyer(2) |
| Mines per player | 3 (hidden) |
| Turn time | 20 seconds |
| Placement time | 60 seconds |
| Forfeit after | 3 missed turns |

### Scoring
| Event | Points |
|-------|--------|
| Hit | +10 × streak multiplier |
| Sink | +(25 + 5×size) × multiplier |
| Miss | 0 (resets streak) |
| Mine hit | −20 (resets streak) |
| Win bonus | +50 |
| Speed bonus | max(0, 100 − 5×(shots−17)) |

Streak multiplier starts at ×1.0, grows by ×0.25 per consecutive hit, capped at ×2.0.

---

## Socket events (summary)

See `apps/server/README.md` for the full table.

**Client → Server:** `queue:join`, `placement:submit`, `shot:fire`, `reveal:submit`, `chat:send`

**Server → Client:** `match:found`, `match:start`, `shot:result`, `turn:timer`, `match:end`, `match:verified`

---

## Chain modes

| Mode | Description |
|------|-------------|
| `simulated` | Fake `0xSIM_...` tx written to MongoDB. No gas, works offline. Default. |
| `testnet` | Real tx on Base Sepolia via relayer wallet. Set `CHAIN_MODE=testnet` + keys. |

---

## Running tests
```bash
# Engine unit tests
cd packages/engine
npm run build
node --test dist/engine.test.js
```

---

## Demo script

1. Open two browser windows, sign in with different wallets
2. Both click **Play** → **Quick Match** → join queue → get paired
3. Place ships and mines (or wait for auto-place)
4. Watch commitments lock, then battle begins
5. Fire shots — observe hit/miss/mine/sunk in the shot log
6. Build a streak to see the multiplier rise
7. Match ends → reveals verified → result hash shown
8. Open **/replays** → click **Verify** on the match → see ✅ Verified
9. Check **/leaderboard** for updated rankings
10. Check **/badges** for newly minted achievements

---

Built for the Base hackathon · October 2026
