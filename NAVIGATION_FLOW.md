# Navigation Guard Flow Diagram

## Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│ Player in Arena Component                                   │
│ - matchIdParam: "match_123"                                 │
│ - phase: "battle"                                           │
│ - isSpectator: false                                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ shouldBlock = true   │◄─── Calculated via useMemo
          └──────────┬───────────┘
                     │
     ┌───────────────┴───────────────┐
     │                               │
     ▼                               ▼
┌─────────────────┐         ┌─────────────────┐
│ Browser Events  │         │ Component State │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │                           │
    ┌────┴────┬─────────────┐       │
    ▼         ▼             ▼       ▼
┌────────┐ ┌──────┐ ┌──────────┐ ┌────────┐
│ Back/  │ │Close/│ │ Internal │ │ Match  │
│Forward │ │Reload│ │ Links    │ │ Ends   │
└───┬────┘ └───┬──┘ └────┬─────┘ └───┬────┘
    │          │         │           │
    │          │         │           │ phase = "ended"
    │          │         │           │
    ▼          ▼         ▼           ▼
┌────────────────────────────┐   shouldBlock = false
│ CONFIRM DIALOG             │   Navigation allowed ✓
│ "You are in an active      │
│ match. Leaving will        │
│ forfeit..."                │
└────────┬───────────────────┘
         │
    ┌────┴─────┐
    ▼          ▼
┌────────┐  ┌────────┐
│ Cancel │  │  OK    │
└───┬────┘  └───┬────┘
    │           │
    │           ▼
    │      ┌─────────────────────┐
    │      │ await forfeitMatch()│
    │      │ - Emit socket event │
    │      │ - Server processes  │
    │      │ - Opponent wins     │
    │      └──────────┬──────────┘
    │                 │
    │                 ▼
    │         ┌───────────────┐
    │         │ Navigation    │
    │         │ Proceeds      │
    │         └───────────────┘
    │
    ▼
┌───────────────┐
│ Stay on Page  │
│ Match Active  │
└───────────────┘
```

## Code Flow

### 1. Guard Initialization
```typescript
// In ArenaClient.tsx
const shouldBlockNavigation = useMemo(() => {
  return Boolean(matchIdParam && phase !== "ended" && !isSpectator);
}, [matchIdParam, phase, isSpectator]);

useNavigationGuard({
  shouldBlock: shouldBlockNavigation,
  onNavigateAway: async () => {
    await forfeitMatch(matchIdParam);
  }
});
```

### 2. Event Listeners (in useNavigationGuard.ts)

#### Browser Close/Refresh
```typescript
window.addEventListener("beforeunload", (e) => {
  if (shouldBlock) {
    e.preventDefault();
    e.returnValue = message;
  }
});
```

#### Back/Forward Button
```typescript
window.addEventListener("popstate", (e) => {
  if (shouldBlock) {
    const confirmed = window.confirm(message);
    if (confirmed) {
      onNavigateAway?.();
    } else {
      // Restore position
      window.history.pushState(null, "", pathname);
    }
  }
});
```

## State Transitions

```
Lobby (No Guard)
    │
    ├─► [Queue Join] ────► Waiting (No Guard)
    │                           │
    └───────────────────────────┘
                                │
                                ▼
                    [Match Found - matchId set]
                                │
                                ▼
                        ┌───────────────┐
                        │ GUARD ACTIVE  │ ◄──┐
                        └───────┬───────┘    │
                                │            │
                    ┌───────────┴────────┐   │
                    │                    │   │
                    ▼                    ▼   │
            ┌──────────────┐    ┌──────────────┐
            │ Placement    │───►│ Battle       │
            │ Phase        │    │ Phase        │
            └──────────────┘    └──────┬───────┘
                                       │
                                       │
                                       ▼
                            [Game Ends - phase="ended"]
                                       │
                                       ▼
                              ┌────────────────┐
                              │ GUARD INACTIVE │
                              └────────────────┘
                                       │
                                       ▼
                              Free Navigation
```

## Socket Communication

```
Client (Browser)                    Server
     │                                 │
     │ ─── match:forfeit ─────────────>│
     │     { matchId: "..." }          │
     │                                 │
     │                          [Server Process]
     │                          • Update match
     │                          • Award opponent
     │                          • Update DB
     │                                 │
     │<──── match:end ─────────────────│
     │     { winner, forfeitedBy }     │
     │                                 │
     │<──── (ack response) ────────────│
     │     { ok: true }                │
     │                                 │
```

## User Journey Example

### Scenario: Player accidentally clicks back button during battle

1. **Initial State**:
   - Player is in active battle
   - Taking turns with opponent
   - `matchIdParam = "match_abc123"`
   - `phase = "battle"`

2. **Trigger Event**:
   - User presses browser back button
   - `popstate` event fires

3. **Guard Intercepts**:
   - `shouldBlock = true`
   - Shows confirm dialog
   - Waits for user decision

4. **User Chooses "Cancel"**:
   - Guard calls `window.history.pushState()`
   - URL stays the same
   - Match continues
   - No socket communication

5. **Alternative - User Chooses "OK"**:
   - Guard calls `onNavigateAway()`
   - Socket emits `match:forfeit`
   - Server processes forfeit
   - Navigation proceeds
   - User sees previous page

### Scenario: Match completes naturally

1. **Match Ends**:
   - Final shot lands
   - `onMatchEnd` callback fires
   - `setPhase("ended")`

2. **Guard Deactivates**:
   - `shouldBlock` recalculates
   - Returns `false`
   - Event listeners still attached but inactive

3. **User Navigates**:
   - Clicks "Lobby →" button
   - No confirmation dialog
   - Immediate navigation
   - Clean exit
