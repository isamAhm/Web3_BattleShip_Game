# Navigation Guard - Testing Checklist

## Quick Test Instructions

### ✅ Test 1: Guard Blocks Navigation During Match
**Steps:**
1. Start development server: `npm run dev:web`
2. Open browser to `http://localhost:3000`
3. Click "Play" → "Quick Match" (or create a room)
4. Wait for match to start
5. During placement or battle phase, click any header link (e.g., "Home", "Leaderboard", etc.)

**Expected:**
- ⚠️ Confirmation dialog appears
- Dialog says: *"You are currently in an active match. Leaving will forfeit the game and award victory to your opponent. Are you sure you want to leave?"*
- If you click **Cancel**: Stay on arena page, match continues
- If you click **OK**: Navigate away, match forfeits, opponent wins

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 2: Continue Match Banner Shows
**Steps:**
1. Start a multiplayer match (Quick Match or room)
2. During the match, click a header link
3. In confirmation dialog, click **OK**
4. Arrive at destination page (e.g., lobby)
5. Look for a gold/yellow banner at the top

**Expected:**
- 🟡 Gold banner appears at top of lobby page
- Banner text: "⚠️ You have an active match in progress"
- Banner has "Continue Match →" button on the right
- Banner style: Gold background (#EBB54A), gold border

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 3: Continue Match Button Works
**Steps:**
1. See the "Continue Match" banner (from Test 2)
2. Click "Continue Match →" button

**Expected:**
- Navigate to `/arena?match={matchId}`
- Socket connects to server
- Match state is restored
- You see the game board with current state
- Can continue playing

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 4: AI Practice NOT Blocked
**Steps:**
1. Go to lobby
2. Click "AI Practice"
3. Wait for arena to load
4. Place ships and start battle
5. Try to navigate away (click header link)

**Expected:**
- ❌ NO confirmation dialog
- Navigate immediately without prompt
- (AI practice is local, no multiplayer forfeit needed)

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 5: After Match Ends, No Guard
**Steps:**
1. Start and complete a multiplayer match (win or lose)
2. See match end banner (Victory/Defeat)
3. Click "Lobby →" button OR any header link

**Expected:**
- ❌ NO confirmation dialog
- Navigate immediately
- In lobby: ❌ NO "Continue Match" banner (match is over)

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 6: Browser Back Button Blocked
**Steps:**
1. Start multiplayer match
2. Press browser back button

**Expected:**
- ⚠️ Confirmation dialog appears
- Same message as Test 1
- Cancel: Stay on page
- OK: Navigate back, match forfeits

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 7: Browser Refresh Warning
**Steps:**
1. Start multiplayer match
2. Press F5 (Windows/Linux) or Cmd+R (Mac)

**Expected:**
- ⚠️ Browser's native dialog appears
- Message: "Leave site? Changes you made may not be saved" (browser default)
- Stay: Page stays open
- Leave: Page reloads

**Note:** The exact message is controlled by the browser, not our app.

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 8: Tab Close Warning
**Steps:**
1. Start multiplayer match
2. Try to close the browser tab/window

**Expected:**
- ⚠️ Browser's native dialog appears
- Message: Generic browser warning about leaving
- Cancel: Tab stays open
- OK: Tab closes

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 9: Spectator Mode NOT Blocked
**Steps:**
1. Have someone else start a match
2. Join as spectator
3. Try to navigate away (click header link)

**Expected:**
- ❌ NO confirmation dialog
- Navigate freely
- (Spectators can leave without affecting the match)

**Status:** [ ] Pass / [ ] Fail

---

### ✅ Test 10: Forfeit Button Still Works
**Steps:**
1. Start multiplayer match
2. Click "Forfeit Match" button (🏳️ icon in top-right area)
3. Confirm in the forfeit modal

**Expected:**
- Match ends immediately
- See "MATCH CONCEDED" banner
- Navigate to lobby → NO "Continue Match" banner

**Status:** [ ] Pass / [ ] Fail

---

## Console Debugging

Open browser DevTools (F12) → Console tab

### Look for these logs:

**When navigation is blocked:**
```
[NavGuard] Navigation blocked - confirmation shown
```

**When match is forfeited:**
```
[NavGuard] Match forfeited: match_abc123
```

**When match state is saved:**
```
localStorage: wba_active_match = match_abc123
```

**When match state is cleared:**
```
localStorage: wba_active_match removed
```

### Check localStorage:

In DevTools Console, type:
```javascript
localStorage.getItem('wba_active_match')
```

- During active match: Should return match ID (e.g., `"match_abc123"`)
- After match ends: Should return `null`
- After forfeit: Should return `null`

---

## Common Issues & Solutions

### Issue: No confirmation dialog appears
**Possible causes:**
1. You're in AI practice mode (expected - no guard for AI)
2. Match already ended (check `phase` state)
3. You're a spectator (expected - spectators can leave)
4. Guard not initialized properly

**Debug:**
```javascript
// In browser console
localStorage.getItem('wba_active_match')  // Should return match ID
```

### Issue: "Continue Match" banner doesn't show
**Possible causes:**
1. localStorage was cleared
2. Match ID wasn't saved
3. Component didn't re-check on mount

**Debug:**
```javascript
// In browser console
localStorage.getItem('wba_active_match')  // Should return match ID if banner should show
```

### Issue: Match doesn't reconnect after "Continue"
**Possible causes:**
1. Server-side: Match may have ended on timeout
2. Socket not reconnecting properly
3. Match was already forfeited

**Debug:** Check server logs for match status

---

## Automated Testing (Optional)

If you want to write automated tests:

```typescript
// Example Playwright test
test('should block navigation during active match', async ({ page }) => {
  await page.goto('/play');
  await page.click('[data-testid="quick-match"]');
  
  // Wait for match to start
  await page.waitForSelector('[data-testid="game-board"]');
  
  // Try to navigate
  page.on('dialog', dialog => {
    expect(dialog.message()).toContain('active match');
    dialog.dismiss(); // Click Cancel
  });
  
  await page.click('a[href="/leaderboard"]');
  
  // Should still be on arena page
  expect(page.url()).toContain('/arena');
});
```

---

## Summary

Total Tests: 10

- [ ] Test 1: Guard blocks navigation
- [ ] Test 2: Continue Match banner shows
- [ ] Test 3: Continue Match button works
- [ ] Test 4: AI practice not blocked
- [ ] Test 5: After match ends, no guard
- [ ] Test 6: Browser back button blocked
- [ ] Test 7: Browser refresh warning
- [ ] Test 8: Tab close warning
- [ ] Test 9: Spectator mode not blocked
- [ ] Test 10: Forfeit button still works

**All tests passing? ✅ Implementation is complete!**

---

## Report Issues

If tests fail, report with:
1. Test number that failed
2. What happened vs. what was expected
3. Browser console logs
4. localStorage contents
5. Browser and version
