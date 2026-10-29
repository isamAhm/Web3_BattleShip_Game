# Forfeit/Surrender Implementation

## Overview
Implemented proper forfeit notifications and match ending when a player surrenders. Both players now receive immediate notifications, and the match properly concludes with the opponent being awarded the victory.

## Changes Made

### 1. Server-Side Socket Handler (`apps/server/src/sockets/index.ts`)

#### Enhanced `match:forfeit` event handler:

**Before:**
```typescript
socket.on('match:forfeit', (payload, ack) => {
  const matchId = typeof payload === 'string' ? payload : payload?.matchId;
  const session = matchManager.getSession(matchId);
  if (!session) {
    if (ack) ack({ ok: false, error: 'Match session not found' });
    return;
  }
  session.handleForfeit(userAddress, 'resigned');
  if (ack) ack({ ok: true });
});
```

**After:**
```typescript
socket.on('match:forfeit', (payload, ack) => {
  const matchId = typeof payload === 'string' ? payload : payload?.matchId;
  const session = matchManager.getSession(matchId);
  if (!session) {
    console.log(`[Socket] match:forfeit - session not found for match ${matchId}`);
    if (ack) ack({ ok: false, error: 'Match session not found' });
    return;
  }

  console.log(`[Socket] match:forfeit - Player ${userAddress} forfeiting match ${matchId}`);
  
  // Notify all players in the room immediately about the forfeit
  const forfeitingPlayerIdx = session.getPlayerIndex(userAddress);
  if (forfeitingPlayerIdx !== null) {
    const otherPlayerIdx = forfeitingPlayerIdx === 0 ? 1 : 0;
    const otherPlayer = session.matchState.players[otherPlayerIdx];
    
    // Emit forfeit notification to the room BEFORE handling forfeit
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
  
  if (ack) ack({ ok: true });
});
```

**New features:**
- ✅ Logs forfeit events for debugging
- ✅ Emits immediate `match:forfeit-notification` event to all players in room
- ✅ Includes winner information in notification
- ✅ Sends before processing forfeit (so opponent gets instant feedback)

---

### 2. Match Manager (`apps/server/src/services/matchManager.ts`)

#### Enhanced `handleEndedState()` method:

**Added:**
- Forfeit information extraction from match state
- Enhanced `match:end` event payload with forfeit details
- Better logging
- Descriptive message for clients

**New payload structure:**
```typescript
{
  matchId: string,
  winner: string | null,
  forfeitedBy: string | null,     // NEW
  forfeit: boolean,
  reason: string,                  // NEW
  scores: Record<string, number>,
  message: string,                 // NEW
}
```

**Example messages:**
- Forfeit: `"Match ended by forfeit. 0x6d84d8... surrendered."`
- Normal: `"Match completed."`

---

### 3. Client Socket Hook (`apps/web/src/lib/useGameSocket.ts`)

#### Added forfeit notification listener:

```typescript
socket.on("match:forfeit-notification", (data: any) => {
  console.log("[Socket] Forfeit notification received:", data);
  // Show immediate notification about forfeit
  if (cbRef.current.onError) {
    const isMe = typeof window !== "undefined" && 
      data.forfeitedBy.toLowerCase() === localStorage.getItem("wba_current_addr")?.toLowerCase();
    
    if (!isMe) {
      cbRef.current.onError(`Opponent forfeited the match. You win!`);
    }
  }
});
```

#### Updated `MatchEndPayload` interface:

```typescript
export interface MatchEndPayload {
  winner: string;
  forfeitedBy: string | null;
  forfeit: boolean;              // Added
  scores: Record<string, number>;
  reason?: string;               // Added
  message?: string;              // Added
}
```

---

### 4. Arena Client (`apps/web/src/components/game/ArenaClient.tsx`)

#### Enhanced `onMatchEnd` callback:

**Before:**
```typescript
onMatchEnd: (payload) => {
  setPhase("ended");
  clearActiveMatch();
  const won = payload.winner && address 
    ? payload.winner.toLowerCase() === address.toLowerCase() 
    : false;
  setBannerAlert({
    type: won ? "win" : "lose",
    text: won ? "🏆 VICTORY! ENEMY FLEET ANNIHILATED!" : "💥 DEFEAT! ALL FRIENDLY VESSELS SUNK!",
  });
  setStatusMsg(won ? "Match ended: Victory awarded!" : "Match ended: Defeat.");
  // ... reveal logic
},
```

**After:**
```typescript
onMatchEnd: (payload) => {
  setPhase("ended");
  clearActiveMatch();
  const won = payload.winner && address 
    ? payload.winner.toLowerCase() === address.toLowerCase() 
    : false;
  
  // Check if match ended by forfeit
  const wasForfeit = payload.forfeit || payload.forfeitedBy;
  const iForfeited = payload.forfeitedBy && address 
    ? payload.forfeitedBy.toLowerCase() === address.toLowerCase()
    : false;
  
  let bannerText = "";
  if (wasForfeit) {
    if (iForfeited) {
      bannerText = "🏳️ MATCH CONCEDED · SURRENDER RECORDED";
    } else {
      bannerText = "🏆 VICTORY BY FORFEIT! OPPONENT SURRENDERED!";
    }
  } else {
    bannerText = won 
      ? "🏆 VICTORY! ENEMY FLEET ANNIHILATED!" 
      : "💥 DEFEAT! ALL FRIENDLY VESSELS SUNK!";
  }
  
  setBannerAlert({
    type: won ? "win" : "lose",
    text: bannerText,
  });
  
  const statusText = wasForfeit
    ? (iForfeited 
        ? "Commander conceded the sector. Opponent awarded victory."
        : "Opponent forfeited. Victory awarded to you!")
    : (won ? "Match ended: Victory awarded!" : "Match ended: Defeat.");
  
  setStatusMsg(statusText);
  // ... reveal logic
},
```

**New features:**
- ✅ Detects forfeit-based match endings
- ✅ Shows different banner for forfeit wins vs normal wins
- ✅ Shows different status messages
- ✅ Differentiates between "I forfeited" and "Opponent forfeited"

---

## User Experience Flow

### Scenario 1: Player A Forfeits

**Player A's perspective:**
1. Clicks "Forfeit Match" button
2. Confirms in modal
3. Socket emits `match:forfeit` event
4. Sees banner: "🏳️ MATCH CONCEDED · SURRENDER RECORDED"
5. Status: "Commander conceded the sector. Opponent awarded victory."
6. Match ends, phase = "ended"

**Player B's perspective (opponent):**
1. Playing normally
2. Receives `match:forfeit-notification` event instantly
3. Status message appears: "Opponent forfeited the match. You win!"
4. Receives `match:end` event shortly after
5. Sees banner: "🏆 VICTORY BY FORFEIT! OPPONENT SURRENDERED!"
6. Status: "Opponent forfeited. Victory awarded to you!"
7. Match ends, phase = "ended"

---

### Scenario 2: Player Navigates Away (Forced Forfeit)

**Player A's perspective:**
1. Clicks header link during match
2. Confirms navigation dialog
3. Navigation guard calls `forfeitMatch()`
4. Socket emits `match:forfeit` event
5. Navigates to new page
6. (If they return) Match is over

**Player B's perspective:**
1. Playing normally
2. Receives forfeit notification
3. Status: "Opponent forfeited the match. You win!"
4. Match end banner: "🏆 VICTORY BY FORFEIT! OPPONENT SURRENDERED!"
5. Can play again or return to lobby

---

## Event Sequence Diagram

```
Player A (Forfeiter)          Server              Player B (Opponent)
      │                          │                        │
      │ Click "Forfeit"          │                        │
      ├─────────────────────────►│                        │
      │  match:forfeit           │                        │
      │                          │                        │
      │                          ├──── Notify Room ──────►│
      │                          │  match:forfeit-        │
      │◄─────────────────────────┤    notification        │
      │  (also receives)         │                        │
      │                          │                        │
      │                          ├──── Process ──────┐    │
      │                          │   handleForfeit()  │    │
      │                          │   - Set winner     │    │
      │                          │   - Update DB      │    │
      │                          │◄──────────────────┘    │
      │                          │                        │
      │◄─────────────────────────┤─────── Emit ──────────►│
      │      match:end           │    match:end           │
      │  { forfeitedBy: A,       │  { forfeitedBy: A,     │
      │    winner: B }           │    winner: B }         │
      │                          │                        │
      │  Banner:                 │                   Banner:
      │  "MATCH CONCEDED"        │     "VICTORY BY FORFEIT!"
      │                          │                        │
```

---

## Socket Events

### New Event: `match:forfeit-notification`

**Emitted by:** Server (immediately when player forfeits)
**Sent to:** All players in the match room
**Purpose:** Instant notification before match processing completes

**Payload:**
```typescript
{
  matchId: string,
  forfeitedBy: string,    // Address of player who forfeited
  winner: string,         // Address of opponent (winner)
  reason: 'resigned' | 'disconnect' | 'placement_timeout',
  message: string         // Human-readable message
}
```

**Example:**
```json
{
  "matchId": "match_abc123",
  "forfeitedBy": "0x6d84d869c12238d6b73ecea8c095db85c48f1de4",
  "winner": "0xfc9df993b57ceb4388fff5e5cb45bbc645421ffb",
  "reason": "resigned",
  "message": "0x6d84d8... has forfeited the match"
}
```

---

### Enhanced Event: `match:end`

**Emitted by:** Server (after forfeit is processed)
**Sent to:** All players in the match room

**New fields in payload:**
```typescript
{
  matchId: string,
  winner: string | null,
  forfeitedBy: string | null,  // NEW
  forfeit: boolean,
  reason?: string,             // NEW
  scores: Record<string, number>,
  message?: string             // NEW
}
```

---

## Testing Checklist

### Test 1: Normal Forfeit via Button
- [ ] Player A clicks "Forfeit Match" button
- [ ] Player A sees confirmation dialog
- [ ] Player A clicks "Confirm Surrender"
- [ ] Player A sees "MATCH CONCEDED" banner
- [ ] Player B immediately sees notification popup
- [ ] Player B sees "VICTORY BY FORFEIT" banner
- [ ] Both players' match ends (phase = "ended")
- [ ] Database shows match as forfeited

### Test 2: Forfeit via Navigation
- [ ] Player A is in active match
- [ ] Player A clicks header link
- [ ] Player A confirms navigation
- [ ] Match is forfeited automatically
- [ ] Player B receives forfeit notification
- [ ] Player B sees victory banner
- [ ] Player A can return and see "Continue Match" (shows forfeited state)

### Test 3: Server Logs
- [ ] Console shows `[Socket] match:forfeit - Player ...`
- [ ] Console shows `[Socket] Forfeit notification sent to room ...`
- [ ] Console shows `[MatchSession] Match ... ended. Winner: ..., Forfeit: Yes`

### Test 4: Client Logs
- [ ] Forfeiting player sees `[Arena] Forfeiting match: ...`
- [ ] Forfeiting player sees `[Arena] Match forfeited successfully`
- [ ] Opponent sees `[Socket] Forfeit notification received: ...`
- [ ] Both see `match:end` event in console

---

## Files Modified

1. ✅ `apps/server/src/sockets/index.ts` - Enhanced forfeit handler with notifications
2. ✅ `apps/server/src/services/matchManager.ts` - Enhanced handleEndedState with forfeit info
3. ✅ `apps/web/src/lib/useGameSocket.ts` - Added forfeit notification listener
4. ✅ `apps/web/src/components/game/ArenaClient.tsx` - Enhanced match end UI for forfeits

---

## Benefits

1. **Immediate Feedback**: Opponent sees forfeit instantly via `match:forfeit-notification`
2. **Clear Communication**: Different messages for different scenarios
3. **Proper Match Ending**: Both players see match as ended
4. **Database Integrity**: Forfeit is recorded with winner information
5. **Better UX**: Clear banners indicating forfeit vs normal win/loss
6. **Debugging**: Comprehensive logging for troubleshooting

---

## Known Behavior

- ✅ Forfeit sets winner to opponent automatically
- ✅ Forfeiting player gets no points
- ✅ Winning player gets victory points
- ✅ Match state is saved to database
- ✅ Both players can see match record after forfeit
- ✅ Spectators also see forfeit notification
- ✅ Works with navigation guard integration

---

## Future Enhancements

Potential improvements:
1. Add toast/notification system for better visibility
2. Show forfeit reason in UI (resigned vs disconnected vs timeout)
3. Add forfeit cooldown to prevent abuse
4. Track forfeit stats in player profile
5. Penalize repeated forfeits (rating points, ban, etc.)
6. Show forfeit history in match replays
