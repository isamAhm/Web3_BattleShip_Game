# Navigation Guard Fixes - Complete Implementation

## Issues Fixed

### 1. ✅ Navigation Guard Not Working
**Problem:** The initial implementation didn't intercept Next.js router navigation (router.push, Link components).

**Solution:** Added router method interception to catch all Next.js programmatic navigation.

### 2. ✅ No Match State Persistence
**Problem:** When users navigated away, the app lost track of active matches and couldn't show "Continue Match" button.

**Solution:** Implemented localStorage persistence to remember active matches across page loads.

### 3. ✅ Spectator Mode Issue
**Problem:** After navigating away from a match, returning showed spectator mode incorrectly.

**Solution:** Proper cleanup of match state ensures only real spectators see spectator mode.

## What Was Changed

### 1. Enhanced `useNavigationGuard.ts`

#### Added Features:
- **Next.js Router Interception**: Overrides `router.push()`, `router.replace()`, and `router.back()` to show confirmation dialogs
- **Match ID Tracking**: Saves active match ID to localStorage
- **Navigation State Tracking**: Uses ref to prevent double confirmations
- **Utility Functions**: `getActiveMatch()` and `clearActiveMatch()` for match state management

#### Key Implementation:
```typescript
// Intercept Next.js navigation
useEffect(() => {
  if (!shouldBlock) return;

  const originalPush = router.push;
  
  (router as any).push = async (href: string, options?: any) => {
    if (isNavigatingRef.current) {
      return originalPush.call(router, href, options);
    }

    const isLeavingPage = !href.includes(pathname);

    if (isLeavingPage && shouldBlock) {
      const confirmed = window.confirm(message);
      if (confirmed) {
        isNavigatingRef.current = true;
        await onNavigateAway?.();
        return originalPush.call(router, href, options);
      }
      return; // Block navigation
    }
    return originalPush.call(router, href, options);
  };

  // ... similar for replace and back
}, [shouldBlock, message, pathname, onNavigateAway, router]);
```

#### localStorage Integration:
```typescript
// Save match state when blocking is enabled
useEffect(() => {
  if (shouldBlock && matchId) {
    localStorage.setItem("wba_active_match", matchId);
  } else if (!shouldBlock) {
    localStorage.removeItem("wba_active_match");
  }
}, [shouldBlock, matchId]);
```

### 2. Updated `ArenaClient.tsx`

#### Changes:
1. **Import clearActiveMatch utility**
2. **Pass matchId to navigation guard**
3. **Clear match state on match end**
4. **Clear match state on forfeit**
5. **Add console logging for debugging**

```typescript
// Pass matchId to guard
useNavigationGuard({
  shouldBlock: shouldBlockNavigation,
  matchId: matchIdParam,  // NEW: Track match ID
  message: "You are currently in an active match...",
  onNavigateAway: async () => {
    if (matchIdParam && phase !== "ended") {
      await forfeitMatch(matchIdParam);
      console.log("[NavGuard] Match forfeited:", matchIdParam);
    }
  },
});

// Clear on match end
onMatchEnd: (payload) => {
  setPhase("ended");
  clearActiveMatch(); // NEW: Clean up localStorage
  // ... rest of logic
},

// Clear on forfeit
const handleForfeitMatch = async () => {
  // ... existing logic
  clearActiveMatch(); // NEW: Clean up localStorage
};
```

### 3. Enhanced `LobbyClient.tsx`

#### Added Features:
1. **Active Match Detection**: Checks localStorage on component mount
2. **Continue Match Banner**: Shows prominent banner when active match exists
3. **Continue Match Button**: One-click return to active match

```typescript
import { getActiveMatch } from "@/lib/useNavigationGuard";

const [activeMatchId, setActiveMatchId] = useState<string | null>(null);

// Check for active match on mount
useEffect(() => {
  const matchId = getActiveMatch();
  setActiveMatchId(matchId);
}, []);

const handleContinueMatch = () => {
  if (activeMatchId) {
    router.push(`/arena?match=${activeMatchId}`);
  }
};
```

#### UI Component:
```jsx
{activeMatchId && (
  <div className="mb-5 px-5 py-3.5 rounded-[14px] border flex items-center gap-3"
       style={{ background: "rgba(235,181,74,0.12)", borderColor: "rgba(235,181,74,0.35)" }}>
    <span className="w-3 h-3 rounded-full flex-none bg-[var(--brass)]" />
    <span className="text-[14px] font-semibold text-[var(--brass)]">
      ⚠️ You have an active match in progress
    </span>
    <button onClick={handleContinueMatch} className="ml-auto px-4 py-2...">
      Continue Match →
    </button>
  </div>
)}
```

## How It Works Now

### Scenario 1: Player Clicks Header "Play" Link During Match

1. Player is in active battle (matchId stored in localStorage)
2. Player clicks "Play" link in header
3. Navigation guard intercepts `router.push('/play')`
4. Confirmation dialog appears: *"You are currently in an active match. Leaving will forfeit..."*
5. If **Cancel** → Navigation blocked, stays in match
6. If **OK** → `forfeitMatch()` called, then navigates to lobby

### Scenario 2: Player Clicks Browser Back Button

1. Player in active match
2. Presses browser back button
3. `popstate` event fires
4. Confirmation dialog appears
5. If **Cancel** → `window.history.pushState()` restores position
6. If **OK** → `forfeitMatch()` called, navigation proceeds

### Scenario 3: Player Closes Tab/Refreshes

1. Player in active match
2. Tries to close tab or refresh page
3. `beforeunload` event fires
4. Native browser dialog: *"Leave site? Changes you made may not be saved"*
5. If **Stay** → Page stays open
6. If **Leave** → Match forfeits (via beforeunload), page closes

### Scenario 4: Player Navigates Away Then Returns

1. Player confirms leaving match (forfeited)
2. Arrives at lobby
3. localStorage still has `wba_active_match`
4. **Continue Match** banner shows at top
5. Player clicks "Continue Match →"
6. Returns to arena with `?match={matchId}`
7. Server detects player has active match via socket connection
8. `match:restore` event fires
9. Player rejoins the match (or sees it was forfeited)

### Scenario 5: Match Ends Naturally

1. Final shot lands, match ends
2. `onMatchEnd()` callback fires
3. `clearActiveMatch()` removes from localStorage
4. Player clicks "Lobby →" button
5. No confirmation dialog (guard inactive)
6. No "Continue Match" banner in lobby
7. Clean state

## Testing Guide

### Test 1: Navigation Guard Blocks Router.push
```
1. Start a multiplayer match
2. During placement or battle, click any header link
3. ✅ Should show confirmation dialog
4. Click Cancel
5. ✅ Should stay on arena page
```

### Test 2: Navigation Guard Allows Forfeit
```
1. Start a multiplayer match
2. Click header link
3. ✅ Confirmation dialog appears
4. Click OK
5. ✅ Should navigate to new page
6. Check server logs
7. ✅ Should see forfeit event
```

### Test 3: Continue Match Button Appears
```
1. Start multiplayer match
2. Force navigate away (confirm dialog)
3. Arrive at lobby
4. ✅ Should see gold "Continue Match" banner at top
5. ✅ Banner should have match warning and button
```

### Test 4: Continue Match Button Works
```
1. See "Continue Match" banner in lobby
2. Click "Continue Match →"
3. ✅ Should navigate to /arena?match={id}
4. ✅ Should reconnect to match via socket
5. ✅ Should see match state restored
```

### Test 5: AI Practice Not Blocked
```
1. Click "AI Practice" in lobby
2. Start game
3. Try to navigate away
4. ✅ Should NOT show confirmation
5. ✅ Should navigate freely
```

### Test 6: After Match Ends, No Guard
```
1. Complete a multiplayer match
2. Click "Lobby →" button
3. ✅ Should navigate immediately, no dialog
4. In lobby
5. ✅ Should NOT see "Continue Match" banner
```

### Test 7: Browser Back Button
```
1. In active multiplayer match
2. Press browser back button
3. ✅ Confirmation dialog appears
4. Click Cancel
5. ✅ Still on arena page
6. ✅ Match continues normally
```

### Test 8: Browser Refresh
```
1. In active multiplayer match
2. Press F5 or Cmd+R
3. ✅ Browser shows native leave confirmation
4. Click Stay
5. ✅ Page doesn't reload
6. Click Reload
7. ✅ Page reloads (match may forfeit depending on implementation)
```

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│ User Navigation Attempt                         │
│ (Link click, router.push, back button, etc.)   │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────┐
│ Navigation Guard Hook                            │
│ • Checks shouldBlock flag                        │
│ • shouldBlock = matchId && phase != ended        │
└──────────────────┬──────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
    shouldBlock          shouldBlock
      = false              = true
         │                   │
         │                   ▼
         │         ┌──────────────────────┐
         │         │ Show Confirm Dialog  │
         │         │ "Leaving will forfeit│
         │         │ the game..."         │
         │         └──────┬───────────────┘
         │                │
         │       ┌────────┴────────┐
         │       │                 │
         │       ▼                 ▼
         │   [Cancel]          [OK]
         │       │                 │
         │       │                 ▼
         │       │         ┌────────────────┐
         │       │         │ forfeitMatch() │
         │       │         │ Emit socket    │
         │       │         └────────┬───────┘
         │       │                  │
         │       │                  ▼
         │       │         ┌────────────────┐
         │       │         │ clearActiveMatch()
         │       │         │ Remove localStorage
         │       │         └────────┬───────┘
         │       │                  │
         │       ▼                  ▼
         │   Block Nav      Allow Navigation
         │   Stay on page   Proceed to dest
         │       │                  │
         └───────┴──────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ localStorage  │
         │ wba_active_   │
         │ match = ?     │
         └───────┬───────┘
                 │
                 ▼
         ┌───────────────────────┐
         │ Lobby Component       │
         │ Checks getActiveMatch()│
         │ Shows "Continue" if   │
         │ match exists          │
         └───────────────────────┘
```

## Files Modified

1. ✅ **apps/web/src/lib/useNavigationGuard.ts**
   - Added router method interception
   - Added localStorage persistence
   - Added utility functions
   - Enhanced with navigation state tracking

2. ✅ **apps/web/src/components/game/ArenaClient.tsx**
   - Import clearActiveMatch
   - Pass matchId to guard
   - Clear match on end
   - Clear match on forfeit

3. ✅ **apps/web/src/components/lobby/LobbyClient.tsx**
   - Import getActiveMatch
   - Check for active match on mount
   - Show "Continue Match" banner
   - Handle continue match click

## Benefits

1. **Complete Protection**: Blocks all navigation types (links, back button, refresh, close)
2. **Persistent State**: Match state survives page reloads
3. **Better UX**: Clear "Continue Match" option when returning
4. **Graceful Forfeit**: Proper socket communication on navigation
5. **No False Positives**: Only blocks during actual multiplayer matches
6. **Spectator Safe**: Spectators can navigate freely
7. **AI Practice Safe**: Solo games not affected

## Known Limitations

1. **Native Browser Dialog**: Can't customize the `beforeunload` dialog text in modern browsers
2. **Router Override**: Overriding router methods is a bit hacky but necessary for Next.js
3. **localStorage Only**: Doesn't sync across tabs (could use BroadcastChannel in future)
4. **Manual Server Check**: Server should also validate match state on reconnection

## Future Enhancements

- Custom modal instead of native confirm() for better UX
- BroadcastChannel API for cross-tab synchronization
- Visual "Protected" indicator on page
- Grace period for accidental clicks
- Auto-reconnect with retry logic
- Server-side session validation
