# Debug Navigation Guard

## Quick Debug Steps

### 1. Check Browser Console

Open DevTools (F12) and look for these console logs:

**When you start a match:**
```
[NavGuard] Active match saved: match_abc123...
```

**When you try to navigate away:**
```
[NavGuard] Intercepting link click to: /play
```

**When you confirm/cancel:**
```
[NavGuard] User confirmed, forfeiting match
// OR
[NavGuard] User cancelled navigation
```

**In the lobby:**
```
[Lobby] Checking for active match: match_abc123...
```

### 2. Check localStorage

In browser console, run:
```javascript
localStorage.getItem('wba_active_match')
```

**Expected:**
- During active match: `"match_abc123..."` (match ID string)
- After match ends: `null`
- In lobby without match: `null`

### 3. Manual Test Sequence

**Step 1: Start a match**
```
1. Go to /play
2. Click "Quick Match" button
3. Wait for opponent
4. Match starts
5. Open console
6. Run: localStorage.getItem('wba_active_match')
   → Should show match ID
```

**Step 2: Try to navigate**
```
1. Still in the match
2. Click "Play" link in header
3. Check console for logs
4. Should see confirmation dialog
5. Click "Cancel"
6. Should stay on arena page
```

**Step 3: Force navigate**
```
1. Click "Play" link again
2. Click "OK" in confirmation
3. Should see forfeit logs
4. Should navigate to /play
5. Check for "Continue Match" banner
```

**Step 4: Check localStorage**
```
In console: localStorage.getItem('wba_active_match')
→ Should still show match ID (until server clears it)
```

### 4. Force Set/Clear for Testing

**Manually set an active match:**
```javascript
localStorage.setItem('wba_active_match', 'test_match_123')
window.location.reload()
// Should see "Continue Match" banner in lobby
```

**Manually clear:**
```javascript
localStorage.removeItem('wba_active_match')
window.location.reload()
// Banner should disappear
```

### 5. Check Match State in Arena

In arena page console:
```javascript
// Check if guard thinks it should block
const urlParams = new URLSearchParams(window.location.search);
const matchId = urlParams.get('match');
console.log('Match ID from URL:', matchId);
console.log('Spectator?:', urlParams.get('spectate'));
```

## Common Issues

### Issue 1: No confirmation dialog
**Debug:**
```javascript
// In arena page console
console.log('Match ID:', new URLSearchParams(window.location.search).get('match'));
console.log('localStorage:', localStorage.getItem('wba_active_match'));
```

**Possible causes:**
- No matchId in URL → AI practice mode (expected)
- phase === 'ended' → Match already over (expected)
- spectate=true → Spectator mode (expected)

### Issue 2: Banner doesn't appear in lobby
**Debug:**
```javascript
// In lobby page console
console.log('Active match:', localStorage.getItem('wba_active_match'));
```

**If null:** Match wasn't saved or was cleared
**If has value:** Component not re-rendering

**Fix:**
```javascript
// Force re-render
localStorage.setItem('wba_active_match', 'test_match_123')
window.location.reload()
```

### Issue 3: Guard activates when it shouldn't
**Debug:**
```javascript
// In arena page
const params = new URLSearchParams(window.location.search);
console.log('matchId:', params.get('match'));
console.log('spectate:', params.get('spectate'));
console.log('URL:', window.location.href);
```

## Test Script

Run this in browser console to simulate the full flow:

```javascript
// Test 1: Set active match
console.log('TEST 1: Setting active match');
localStorage.setItem('wba_active_match', 'test_match_123');
console.log('Result:', localStorage.getItem('wba_active_match'));

// Test 2: Check if lobby would show banner
console.log('\nTEST 2: Simulating lobby check');
const matchId = localStorage.getItem('wba_active_match');
console.log('Lobby sees match ID:', matchId);
console.log('Should show banner:', matchId !== null);

// Test 3: Clear match
console.log('\nTEST 3: Clearing active match');
localStorage.removeItem('wba_active_match');
console.log('Result:', localStorage.getItem('wba_active_match'));
console.log('Should show banner:', false);

// Test 4: Navigate to test page
console.log('\nTEST 4: Navigate to arena with match ID');
const testUrl = '/arena?match=test_match_123';
console.log('Would navigate to:', testUrl);
console.log('Guard should activate:', true);
```

## Visual Inspection

### Arena Page - Active Match
✅ URL should be: `/arena?match=match_abc123...`
✅ Console should show: `[NavGuard] Active match saved: match_abc123...`
✅ Clicking header links should show confirm dialog
✅ Browser back button should show confirm dialog

### Lobby Page - After Leaving Match
✅ Console should show: `[Lobby] Checking for active match: match_abc123...`
✅ Gold banner at top with: "⚠️ You have an active match in progress"
✅ Button labeled: "Continue Match →"
✅ Clicking button should navigate to `/arena?match=match_abc123...`

### Lobby Page - No Active Match
❌ Console shows: `[Lobby] Checking for active match: null`
❌ No gold banner visible
✅ Can navigate freely

## Network Tab Debugging

1. Open DevTools → Network tab
2. Filter: WS (WebSocket)
3. Look for socket connection
4. Click on connection
5. Check Messages tab for:
   - `match:found`
   - `match:start`
   - `match:forfeit`
   - `match:end`

## React DevTools

1. Install React DevTools extension
2. Open Components tab
3. Search for "ArenaClient"
4. Check props/state:
   - `matchIdParam` - should have value
   - `phase` - should be "placement" or "battle"
   - `isSpectator` - should be false
5. Search for "LobbyClient"
6. Check state:
   - `activeMatchId` - should show match ID or null

## Server-Side Debugging

Check server console for:
```
[Socket] queue:join from 0x...
[Socket] Match paired: match_abc123...
[Socket] Player ... reconnected to active match
[Socket] match:forfeit from ...
```

## Last Resort: Hard Reset

If nothing works:
```javascript
// Clear everything
localStorage.clear();
sessionStorage.clear();

// Reload
window.location.href = '/';

// Start fresh
// 1. Go to lobby
// 2. Start new match
// 3. Check console for [NavGuard] logs
```
