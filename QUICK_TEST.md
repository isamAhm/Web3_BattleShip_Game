# Quick Test - Navigation Guard

## Test Now (5 minutes)

### Step 1: Start Match
1. Open browser to `http://localhost:3000/play`
2. Open DevTools Console (F12)
3. Click "Quick Match"
4. Wait for match to start

**Expected Console Output:**
```
[Arena] Navigation guard state: {
  matchIdParam: "match_abc123...",
  phase: "placement",
  isSpectator: false,
  shouldBlock: true
}
[NavGuard] Active match saved: match_abc123...
```

### Step 2: Test Navigation Block
1. Still in arena page
2. Click "Play" in the header
3. Watch console

**Expected:**
```
[NavGuard] Intercepting link click to: /play
```
- ⚠️ Confirmation dialog should appear
- Dialog text: "You are currently in an active match..."

### Step 3: Cancel Navigation
1. Click "Cancel" in the dialog

**Expected:**
```
[NavGuard] User cancelled navigation
```
- You stay on arena page
- Match continues

### Step 4: Confirm Navigation
1. Click "Play" header link again
2. Click "OK" in the dialog

**Expected:**
```
[NavGuard] User confirmed, forfeiting match
[Arena] Forfeiting match: match_abc123...
[Arena] Match forfeited successfully
```
- Navigate to /play page
- Check for gold banner at top

### Step 5: Check Continue Match
1. Now in lobby (/play page)
2. Look at the top of the page

**Expected:**
- 🟡 Gold banner with warning icon
- Text: "⚠️ You have an active match in progress"
- Button: "Continue Match →"

**Console:**
```
[Lobby] Checking for active match: match_abc123...
```

### Step 6: Test Continue Button
1. Click "Continue Match →" button

**Expected:**
- Navigate back to `/arena?match=match_abc123...`
- Reconnect to match

---

## If It Doesn't Work

### Check 1: Is the guard active?

**In arena page console:**
```javascript
// Check current state
const params = new URLSearchParams(window.location.search);
console.log('Match ID:', params.get('match'));
console.log('Phase:', 'check console logs above');
console.log('Spectator:', params.get('spectate'));
```

### Check 2: Is localStorage being set?

**In arena page console:**
```javascript
localStorage.getItem('wba_active_match')
```

**Should return:** `"match_abc123..."` (actual match ID)
**If null:** Guard not saving match ID

### Check 3: Is the click interceptor working?

**In arena page console:**
```javascript
// Add test listener
document.addEventListener('click', (e) => {
  console.log('CLICK:', e.target);
}, true);

// Now click "Play" link and check console
```

### Check 4: Manually trigger guard

**In arena page console:**
```javascript
// Force a navigation attempt
const event = new MouseEvent('click', { bubbles: true });
const playLink = document.querySelector('a[href="/play"]');
if (playLink) {
  console.log('Clicking play link...');
  playLink.dispatchEvent(event);
} else {
  console.log('Play link not found!');
}
```

### Check 5: Test with direct window.confirm

**In arena page console:**
```javascript
// Test if confirm works
const result = window.confirm('Test confirmation dialog');
console.log('Confirm result:', result);
```

---

## Manual localStorage Test

If the navigation guard seems to work but Continue Match doesn't show:

### In any page console:

```javascript
// 1. Set a fake active match
localStorage.setItem('wba_active_match', 'test_match_12345');

// 2. Navigate to lobby
window.location.href = '/play';

// 3. Check if banner appears
// (should see gold banner at top)

// 4. Clear when done testing
localStorage.removeItem('wba_active_match');
```

---

## What to Report

If it still doesn't work, copy these outputs:

### 1. Console logs from arena page:
```
(paste all logs starting with [Arena] or [NavGuard])
```

### 2. localStorage value:
```javascript
localStorage.getItem('wba_active_match')
// Result: ???
```

### 3. URL when in match:
```javascript
window.location.href
// Result: ???
```

### 4. What happens when you click a link:
- [ ] Nothing happens
- [ ] Navigates immediately without dialog
- [ ] Shows dialog but doesn't forfeit
- [ ] Other: ___________

### 5. Does banner show in lobby?
- [ ] Yes
- [ ] No
- [ ] Shows but button doesn't work

---

## Nuclear Option: Test HTML Only

Create this file: `test-guard.html`

```html
<!DOCTYPE html>
<html>
<head>
  <title>Guard Test</title>
</head>
<body>
  <h1>Navigation Guard Test</h1>
  <a href="/play" id="playLink">Go to Play</a>
  
  <script>
    let blocking = true;
    
    document.addEventListener('click', function(e) {
      const target = e.target.closest('a');
      if (!target) return;
      
      const href = target.getAttribute('href');
      if (!href || href.startsWith('http')) return;
      
      if (blocking) {
        console.log('Intercepted:', href);
        e.preventDefault();
        e.stopPropagation();
        
        const confirmed = confirm('Leave page?');
        if (confirmed) {
          console.log('Confirmed');
          blocking = false;
          window.location.href = href;
        } else {
          console.log('Cancelled');
        }
      }
    }, true);
    
    console.log('Guard active:', blocking);
  </script>
</body>
</html>
```

Open this file in browser and click the link. If this works, the issue is with React/Next.js integration.
