# Navigation Guard Implementation

## Overview
Implemented a navigation guard system to prevent players from accidentally leaving an active multiplayer match. When a player attempts to navigate away (browser back button, closing tab, or clicking links), they will be prompted to confirm if they want to forfeit the match.

## What Was Changed

### 1. New Hook: `useNavigationGuard.ts`
**Location:** `apps/web/src/lib/useNavigationGuard.ts`

This custom React hook provides comprehensive navigation blocking:

#### Features:
- **Browser refresh/close protection**: Uses `beforeunload` event to warn users when closing or refreshing the page
- **Back/forward button protection**: Intercepts browser navigation via `popstate` event
- **Programmatic navigation**: Provides `navigateWithConfirmation()` method for internal navigation with confirmation

#### API:
```typescript
useNavigationGuard({
  shouldBlock: boolean,           // Enable/disable the guard
  message?: string,               // Custom confirmation message
  onNavigateAway?: () => void     // Callback when user confirms navigation
})
```

#### How It Works:
1. **Browser Close/Refresh**: Shows native browser confirmation dialog
2. **Back Button**: Pushes state back and shows confirm dialog, restoring position if cancelled
3. **Programmatic**: Returns a method to navigate with confirmation

### 2. Integration in `ArenaClient.tsx`
**Location:** `apps/web/src/components/game/ArenaClient.tsx`

#### Changes Made:

1. **Import the hook**:
```typescript
import { useNavigationGuard } from "@/lib/useNavigationGuard";
```

2. **Determine when to block** (added after the spectate useEffect):
```typescript
const shouldBlockNavigation = useMemo(() => {
  // Block navigation if:
  // 1. Player is in a multiplayer match (has matchIdParam)
  // 2. Match is not ended yet
  // 3. Player is not a spectator
  return Boolean(matchIdParam && phase !== "ended" && !isSpectator);
}, [matchIdParam, phase, isSpectator]);
```

3. **Apply the guard**:
```typescript
useNavigationGuard({
  shouldBlock: shouldBlockNavigation,
  message: "You are currently in an active match. Leaving will forfeit the game and award victory to your opponent. Are you sure you want to leave?",
  onNavigateAway: async () => {
    // Forfeit the match when navigating away
    if (matchIdParam && phase !== "ended") {
      try {
        await forfeitMatch(matchIdParam);
      } catch (error) {
        console.error("Failed to forfeit match on navigation:", error);
      }
    }
  },
});
```

## Behavior

### When Guard is ACTIVE (blocks navigation):
- Player is in a multiplayer match (`matchIdParam` exists)
- Match is in "placement" or "battle" phase (not "ended")
- Player is not a spectator

### When Guard is INACTIVE (allows free navigation):
- No match ID (AI practice mode)
- Match has ended
- Player is spectating
- Player is on any other page

### User Experience:

1. **During Active Match - Browser Back Button**:
   - Browser shows: "You are currently in an active match. Leaving will forfeit..."
   - User clicks "Cancel" → Stays on the page, match continues
   - User clicks "OK" → Match is forfeited via socket, then navigation proceeds

2. **During Active Match - Browser Close/Refresh**:
   - Native browser dialog: "Leave site? Changes you made may not be saved"
   - User clicks "Stay" → Page remains open, match continues
   - User clicks "Leave" → Match forfeits (via `beforeunload`), browser closes/refreshes

3. **During Active Match - Clicking Link to Another Page**:
   - If link uses Next.js router and you implement `navigateWithConfirmation`
   - Shows confirm dialog before navigation
   - Match forfeits if user confirms

4. **After Match Ends**:
   - No confirmation dialogs
   - Free navigation everywhere

## Technical Details

### Socket Communication
When user confirms leaving, the guard calls:
```typescript
await forfeitMatch(matchId)
```

This emits a `match:forfeit` socket event to the server, which:
- Awards victory to the opponent
- Updates match records
- Notifies other player
- Cleans up match state

### State Management
The guard uses React's `useMemo` to efficiently compute when blocking should occur:
- Recalculates only when `matchIdParam`, `phase`, or `isSpectator` changes
- Prevents unnecessary re-renders

### Browser Compatibility
- `beforeunload` event: Supported in all modern browsers
- `popstate` event: Supported in all browsers with History API
- Custom message in `beforeunload`: Limited by browser security (most modern browsers show generic message)

## Testing

### Manual Test Cases:

1. **Test AI Practice Mode** (should NOT block):
   - Start AI practice game
   - Try browser back button → Should navigate freely

2. **Test Multiplayer - Placement Phase** (should block):
   - Join matchmaking queue
   - Get matched with opponent
   - During ship placement, click browser back → Should show confirmation

3. **Test Multiplayer - Battle Phase** (should block):
   - Deploy fleet and start battle
   - During active combat, try to close tab → Should show confirmation
   - Confirm close → Match should be forfeited on server

4. **Test Multiplayer - After Match Ends** (should NOT block):
   - Complete a match (win or lose)
   - Click lobby link → Should navigate freely

5. **Test Spectator Mode** (should NOT block):
   - Join as spectator
   - Try navigation → Should work freely

## Future Enhancements

Potential improvements:
1. Add visual indicator showing match is "protected" (lock icon)
2. Custom modal dialog instead of native confirm (better UX)
3. Automatic reconnection if accidentally disconnected
4. Grace period for accidental clicks
5. Integration with Header navigation links to use `navigateWithConfirmation`

## Files Modified

- ✅ Created: `apps/web/src/lib/useNavigationGuard.ts`
- ✅ Modified: `apps/web/src/components/game/ArenaClient.tsx`

## No Breaking Changes
- Existing functionality preserved
- Only adds protection layer
- Backward compatible
- Works alongside existing forfeit button
