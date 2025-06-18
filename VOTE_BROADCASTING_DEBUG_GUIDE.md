# Vote Broadcasting Debug Guide

## Problem Statement
When users vote in a planning poker session, their votes are only showing in their local view and are not being broadcasted to other participants in real-time.

## Potential Root Causes

### 1. Channel Initialization Issues
- Supabase channel not properly created or subscribed
- Channel permissions not configured correctly
- Multiple channels being created instead of sharing one

### 2. Broadcast Sending Issues
- `channel.send()` failing silently
- Incorrect payload format
- Network connectivity problems
- Supabase API limits or errors

### 3. Broadcast Receiving Issues
- Event listeners not properly registered
- Filtering logic preventing vote updates
- Race conditions in vote loading

### 4. Database vs Real-time Sync Issues
- Votes saved to database but broadcast not sent
- Database save failing, preventing broadcast
- Vote loading logic not triggered by broadcasts

## Debug Process

### Step 1: Load Debug Tools
```javascript
// In browser console, load the debug script
const script = document.createElement('script');
script.src = '/debug-vote-broadcasting.js';
document.body.appendChild(script);
```

### Step 2: Multi-Tab Testing
1. **Open 2+ browser tabs/windows**
2. **Log in as different users** in each tab
3. **Join the same voting session** in all tabs
4. **Run debug script** in each tab
5. **Vote in one tab** and watch console logs in others

### Step 3: Monitor Console Output

#### Expected Success Pattern:
```
Tab A (Voter):
📡 Sending vote broadcast: {type: "broadcast", event: "vote-submitted", ...}
✅ Vote broadcast sent successfully

Tab B (Observer):
📥 Received vote-submitted broadcast: {payload: {voterId: "...", voterName: "..."}}
🔄 Refreshing votes due to broadcast from: [User Name]
```

#### Common Failure Patterns:

**Pattern 1: No Broadcast Sent**
```
Tab A: ❌ No channel available for broadcasting vote
```
*Solution: Check channel initialization in useEffect*

**Pattern 2: Broadcast Sent but Not Received**
```
Tab A: ✅ Vote broadcast sent successfully
Tab B: (No broadcast received logs)
```
*Solution: Check event listener registration and Supabase connection*

**Pattern 3: Broadcast Received but Ignored**
```
Tab B: 📥 Received vote-submitted broadcast
Tab B: 🚫 Ignoring broadcast: {reason: "different item"}
```
*Solution: Check item ID matching logic*

**Pattern 4: Broadcast Received but No Update**
```
Tab B: 📥 Received vote-submitted broadcast
Tab B: 🔄 Refreshing votes due to broadcast
(But no visual update occurs)
```
*Solution: Check loadVotesForCurrentItem function*

## Common Fixes

### Fix 1: Ensure Channel Exists
Add this check to the vote submission:
```tsx
if (!channel) {
  console.error('❌ No channel available for broadcasting');
  setVoteNotification('Vote saved but connection issue detected');
  return;
}
```

### Fix 2: Add Broadcast Error Handling
```tsx
channel.send(broadcastPayload).catch((error) => {
  console.error('❌ Vote broadcast failed:', error);
  setVoteNotification('Vote saved but failed to notify participants');
});
```

### Fix 3: Verify Channel Subscription
```tsx
.subscribe(async (status) => {
  console.log('Channel subscription status:', status);
  if (status === 'SUBSCRIBED') {
    console.log('✅ Successfully subscribed to channel');
    // Track presence...
  } else if (status === 'CHANNEL_ERROR') {
    console.error('❌ Channel subscription failed');
  }
});
```

### Fix 4: Debug Broadcast Reception
```tsx
.on('broadcast', { event: 'vote-submitted' }, (payload) => {
  console.log('📥 Raw broadcast received:', payload);
  const { itemId, voterId, voterName } = payload.payload;
  
  console.log('Broadcast details:', {
    broadcastItemId: itemId,
    currentItemId: currentItem?.id,
    broadcastUserId: voterId,
    currentUserId: user?.id,
    shouldProcess: itemId === currentItem?.id && voterId !== user?.id
  });
  
  // Rest of processing...
});
```

## Testing Checklist

- [ ] **Multiple Users**: At least 2 different authenticated users
- [ ] **Same Session**: All users joined to the same voting session URL
- [ ] **Same Item**: All users viewing the same backlog item
- [ ] **Console Monitoring**: Debug script running in all tabs
- [ ] **Network Tab**: Check for WebSocket/Supabase API calls
- [ ] **Vote Submission**: Verify database saves are successful
- [ ] **Real-time Updates**: Confirm other participants see votes

## Advanced Debugging

### Check Supabase Configuration
```javascript
// Verify Supabase is configured correctly
console.log('Supabase URL:', process.env.REACT_APP_SUPABASE_URL);
console.log('Supabase Key:', process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
```

### Monitor Network Activity
1. Open browser Developer Tools
2. Go to Network tab
3. Filter by "WS" (WebSocket) or "supabase"
4. Vote and watch for real-time traffic

### Check Database State
```sql
-- Verify votes are being saved
SELECT * FROM estimations 
WHERE session_id = 'your-session-id' 
ORDER BY created_at DESC;
```

## Resolution Verification

Once fixes are applied, verify success by:

1. **Multi-tab testing** shows real-time vote updates
2. **Console logs** show successful broadcast send/receive
3. **UI updates** happen immediately in all participant tabs
4. **Notifications** appear when other users vote
5. **Team votes section** updates without page refresh

The goal is seamless real-time collaboration where all participants see votes appear instantly across all browser windows.
