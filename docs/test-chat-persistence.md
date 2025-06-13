# Chat Persistence Testing Guide

## 🧪 Manual Testing Steps

### Test 1: Basic Persistence
1. **Start the app**: `npm run dev`
2. **Create a session** as Moderator
3. **Join session** in second browser window as Team Member
4. **Send 3-4 messages** from both users
5. **Close one browser window** (simulate user leaving)
6. **Reopen and rejoin session**
7. **✅ Verify**: All previous messages are visible

### Test 2: Database Verification
1. **Send messages** in the app
2. **Check Supabase dashboard** → Table Editor → `chat_messages`
3. **✅ Verify**: Messages appear in database with correct:
   - `session_id`
   - `user_id` and `user_name`
   - `message` content
   - `created_at` timestamps
   - `backlog_item_id` (if applicable)

### Test 3: Real-time + Persistence
1. **Multiple users in session**
2. **Send messages rapidly** from different users
3. **Check for duplicates** (should be none)
4. **✅ Verify**: 
   - Messages appear in real-time for all users
   - No duplicate messages in UI
   - All messages saved to database

### Test 4: Error Handling
1. **Disconnect internet** while sending message
2. **✅ Verify**: 
   - Message rolls back from UI
   - Input text is restored
   - No broken state

### Test 5: Large History
1. **Send 20+ messages** in a session
2. **Rejoin session**
3. **✅ Verify**:
   - All messages load quickly
   - Messages appear in correct chronological order
   - No performance issues

## 🔍 Database Queries for Testing

### Check All Messages for a Session
```sql
SELECT 
  user_name,
  message,
  created_at,
  backlog_item_id
FROM chat_messages 
WHERE session_id = 'YOUR_SESSION_ID'
ORDER BY created_at ASC;
```

### Count Messages by User
```sql
SELECT 
  user_name,
  COUNT(*) as message_count
FROM chat_messages 
WHERE session_id = 'YOUR_SESSION_ID'
GROUP BY user_name, user_id;
```

### Recent Messages Across All Sessions
```sql
SELECT 
  session_id,
  user_name,
  message,
  created_at
FROM chat_messages 
ORDER BY created_at DESC 
LIMIT 20;
```

## 🐛 Common Issues to Watch For

### Issue 1: Duplicate Messages
- **Symptoms**: Same message appears twice in UI
- **Check**: Console for React key warnings
- **Fix**: Verify deduplication logic in ChatPanel

### Issue 2: Messages Not Saving
- **Symptoms**: Messages disappear on refresh
- **Check**: Browser console for database errors
- **Fix**: Check Supabase table permissions and RLS policies

### Issue 3: Slow Loading
- **Symptoms**: Long delay when joining session
- **Check**: Network tab for slow database queries
- **Fix**: Verify database indexes are created

### Issue 4: Permission Errors
- **Symptoms**: 403 errors when saving messages
- **Check**: Supabase Auth and RLS policies
- **Fix**: Ensure policies allow authenticated users to insert/read

## ✅ Success Criteria

- [ ] Messages persist across browser sessions
- [ ] Real-time delivery works correctly
- [ ] No duplicate messages in UI or database
- [ ] Loading states work properly
- [ ] Error handling doesn't break the UI
- [ ] Database queries are efficient (< 500ms)
- [ ] Multiple users can chat simultaneously
- [ ] Messages include proper metadata (user, timestamp, item)

## 🔧 Debugging Tips

### Enable Detailed Logging
Add this to your browser console to see detailed chat operations:

```javascript
// Enable debug logging
localStorage.setItem('debug-chat', 'true');

// Check what messages are being loaded
localStorage.setItem('debug-chat-load', 'true');

// Disable debug logging
localStorage.removeItem('debug-chat');
```

### Check Real-time Connection
```javascript
// In browser console, check if Supabase channel is connected
console.log('Channel status:', window.supabase?.channel?.state);
```

### Monitor Database Operations
1. Open Supabase Dashboard
2. Go to Logs → Database
3. Filter by `chat_messages` table
4. Watch for INSERT/SELECT operations

## 📊 Performance Benchmarks

### Expected Performance
- **History Loading**: < 500ms for 100 messages
- **Message Sending**: < 200ms total (save + broadcast)
- **Real-time Delivery**: < 100ms between users
- **Memory Usage**: < 50MB for 1000 messages

### Monitoring Commands
```bash
# Check bundle size impact
npm run build
# Look for any significant size increases

# Monitor during development
# Open DevTools → Performance tab
# Record session while sending many messages
```

---

**Run these tests after implementing chat persistence to ensure everything works correctly!** 🚀
