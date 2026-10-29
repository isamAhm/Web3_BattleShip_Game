# Navigation Guard & Forfeit - Complete Implementation

## Final Behavior

### Scenario 1: Player Tries to Navigate Away (Clicks Link/Back Button)

**Step 1: Confirmation Dialog Appears**
```
⚠️ "You are currently in an active match. Leaving will forfeit 
    the game and award victory to your opponent. Are you sure?"
    
    [Cancel]  [OK]
```

**Step 2A: User Clicks "Cancel"**
- Stays on arena page
- Match continues
- localStorage keeps match ID (for potential refresh)
- No forfeit occurs

**Step 2B: User Clicks "OK"**
- `forfeitMatch()` is called on server
- Server emits `match:forfeit-notification` to opponent
- Server calls `handleForfeit()` → sets winner to opponent
- Server emits `match:end` event
- localStorage is **CLEARED** (match is over)
- User navigates to destination
- Opponent sees: "🏆 VICTORY BY FORFEIT! OPPONENT SURRENDERED!"

---

### Scenario 2: Player Refreshes Page (F5)

**What Happens:**
1. Browser shows native warning: "Leave site?"
2. If user leaves: Page refreshes
3. localStorage still has match ID
4. Arena page loads with same match ID in URL
5. Socket connects → Server detects player has active match
6. Server emits `match:restore` event
7. Player rejoins match at current state

**Result:** Player can continue the match after refresh ✅

---

### Scenario 3: Player Navigates Away Then Wants to Return

**If User Confirmed Leaving (Scenario 1B):**
- localStorage was cleared
- Match was forfeited on server
- NO "Continue Match" button shows in lobby
- Match is over ✅

**If User Accidentally Closed Tab (Without Confirming):**
- localStorage still has match ID
- Match is still active on server
- "Continue Match" button shows in lobby
- Player can click it and rejoin via server's `match:restore`

---

### Scenario 4: Player in Lobby After Navigation

**Case A: Forfeited Match (Confirmed Navigation)**
```
Lobby View:
- No gold banner
- No "Continue Match" button
- Can start new matches freely
```

**Case B: Active Match (Closed without confirming)**
```
Lobby View:
┌─────────────────────────────────────────────────┐
│ ⚠️ You have an active match in progress         │
│                        [Continue Match →] button │
└─────────────────────────────────────────────────┘
- Gold banner at top
- Clicking button navigates to /arena?match={id}
- Server reconnects player to active match
```

---

## Technical Flow

### Navigation Guard Logic

```typescript
// User confirms leaving
if (confirmed) {
  blockingRef.current = false;          // Disable guard
  await forfeitMatch(matchId);          // Forfeit on server
  localStorage.removeItem("match");     // Clear storage ✅
  window.location.href = href;          // Navigate
}

// User cancels
else {
  window.history.pushState(...);        // Stay on page
  // localStorage keeps match ID for potential rejoin
}
```

### Server Forfeit Handler

```typescript
socket.on('match:forfeit', async (payload, ack) => {
  // 1. Emit immediate notification to opponent
  io.to(roomCode).emit('match:forfeit-notification', {
    forfeitedBy: userAddress,
    winner: opponentAddress,
    message: "Opponent forfeited"
  });
  
  // 2. Process forfeit
  session.handleForfeit(userAddress, 'resigned');
  //    → Sets winner to opponent
  //    → Calls handleEndedState()
  //    → Emits match:end to both players
  
  ack({ ok: true });
});
```

### Client Match End Handler

```typescript
onMatchEnd: (payload) => {
  setPhase("ended");
  clearActiveMatch();  // Clear localStorage ✅
  
  if (payload.forfeit) {
    if (payload.forfeitedBy === myAddress) {
      setBannerAlert("🏳️ MATCH CONCEDED");
    } else {
      setBannerAlert("🏆 VICTORY BY FORFEIT!");
    }
  }
}
```

---

## Key Points

### ✅ Prevents "Already in Match" Issue
- When user confirms navigation → forfeit is processed → localStorage cleared
- Next time they visit lobby → no active match → can play normally

### ✅ Allows Match Resumption  
- When user accidentally closes/refreshes → localStorage preserved
- Lobby shows "Continue Match" button
- Clicking it returns them to active match

### ✅ Clear State Management
```
Confirmed Leave → Forfeit + Clear Storage → No Continue Button
Accidental Close → Keep Storage → Show Continue Button
Match Ends → Clear Storage → No Continue Button
```

### ✅ Opponent Notification
- Immediate notification via `match:forfeit-notification`
- Match end event with forfeit details
- Different UI messages for forfeiter vs winner

---

## Testing Scenarios

### Test 1: Confirm Navigation Away
```
1. Start match
2. Click header "Play" link
3. Click "OK" in dialog
4. Check console: "Match forfeited and cleared from storage"
5. Arrive at lobby
6. Verify: NO "Continue Match" banner
7. Verify: Can start new match
8. Check opponent's screen: Shows forfeit victory banner
```

### Test 2: Cancel Navigation
```
1. Start match
2. Click header link
3. Click "Cancel"
4. Verify: Still on arena page
5. Verify: Match continues normally
6. Check localStorage: Match ID still there
```

### Test 3: Refresh During Match
```
1. Start match
2. Press F5
3. Browser shows warning
4. Click "Leave"
5. Page refreshes
6. Verify: Match state restored
7. Verify: Can continue playing
```

### Test 4: Close Tab Then Return
```
1. Start match
2. Close tab (without confirming dialog)
3. localStorage still has match ID
4. Open app again
5. Go to lobby
6. Verify: "Continue Match" banner shows
7. Click "Continue Match →"
8. Verify: Returns to active match
```

### Test 5: Forfeit Then Try to Play
```
1. Start match
2. Navigate away (confirm)
3. Match forfeited, storage cleared
4. In lobby: NO banner
5. Click "Quick Match"
6. Verify: Can queue normally (not blocked)
```

---

## localStorage States

```typescript
// Active match (player in game or temporarily away)
localStorage.getItem('wba_active_match')
// → "match_abc123..."

// After forfeit (confirmed navigation)
localStorage.getItem('wba_active_match')  
// → null

// After match ends naturally
localStorage.getItem('wba_active_match')
// → null
```

---

## Server States

```typescript
// Player in active match
matchManager.getSession(matchId).participants.has(playerAddress)
// → true

// After forfeit
matchState.phase === 'finished'
matchState.forfeit.by === playerIndex
matchState.winner === opponentIndex

// Match removed from active sessions
matchManager.getSession(matchId)
// → null (after post-processing)
```

---

## Console Logs Guide

### Navigation Attempt
```
[NavGuard] Intercepting link click to: /play
```

### User Confirms
```
[NavGuard] User confirmed - forfeiting match and navigating
[Arena] Forfeiting match: match_abc123
[Socket] match:forfeit - Player 0x... forfeiting
[Socket] Forfeit notification sent to room
[Arena] Match forfeited successfully
[NavGuard] Match forfeited and cleared from storage
```

### User Cancels
```
[NavGuard] User cancelled navigation
```

### Lobby Check
```
[Lobby] Checking for active match: match_abc123
// OR
[Lobby] Checking for active match: null
```

---

## Summary

✅ **Navigation blocked** during active match
✅ **Confirmation required** to leave (with clear warning)
✅ **Match forfeited** if user confirms
✅ **localStorage cleared** after forfeit (prevents "already in match")
✅ **Continue button shows** if player closed without confirming
✅ **Opponent notified** immediately on forfeit
✅ **Server state updated** correctly (winner set, match ended)
✅ **No more "player already in match"** after forfeiting

The implementation now properly handles all edge cases and provides a smooth user experience!
