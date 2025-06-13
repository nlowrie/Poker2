# Test Chat Unread Count Functionality

## Quick Test Instructions

### 1. Open Two Browser Windows
```
Window 1: http://localhost:5174 (Moderator)
Window 2: http://localhost:5174 (Team Member)
```

### 2. Create and Join Session
- **Window 1**: Create new session, select items, start session
- **Window 2**: Join using session invite link

### 3. Test Unread Count
1. **Hide chat** in Window 1 (click Chat button to close)
2. **Send message** from Window 2
3. **Verify**: Red badge appears on Window 1 chat button
4. **Click Chat** in Window 1 to open
5. **Verify**: Badge disappears

### 4. Test Multiple Messages
1. **Hide chat** in Window 1
2. **Send 3 messages** from Window 2
3. **Verify**: Badge shows "3"
4. **Open chat** in Window 1
5. **Verify**: Badge disappears

### 5. Test High Count
1. **Hide chat** in Window 1
2. **Send 12 messages** from Window 2 (or use browser dev tools to simulate)
3. **Verify**: Badge shows "9+"

## Expected Results

✅ **No JavaScript errors in console**
✅ **No 400 database errors**
✅ **Unread count badge appears correctly**
✅ **Badge resets when chat is opened**
✅ **Real-time message delivery works**

## Debug Commands

### Check Console Errors
```javascript
// In browser console
console.clear();
// Perform test actions
// Look for any errors
```

### Simulate High Message Count
```javascript
// In browser dev tools
// Find the setChatUnreadCount function and call it
// This is for testing UI only
```

## Quick Fix Verification

1. **Start dev server**: `npm run dev`
2. **Open browser**: Navigate to local URL
3. **Create session**: Should work without errors
4. **Send messages**: Real-time delivery should work
5. **Toggle chat**: Unread count should work

If any step fails, check the documentation files for troubleshooting.
