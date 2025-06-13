# Chat Functionality Testing Script

## Quick Multi-Browser Testing Setup

### Method 1: Browser + Incognito
1. **Main Browser**: Open http://localhost:5174 in your default browser
2. **Incognito/Private**: Open the same URL in incognito/private mode
3. **Different Users**: Login with different accounts in each window
4. **Same Session**: Join the same planning session in both windows

### Method 2: Different Browsers
1. **Chrome**: http://localhost:5174
2. **Firefox**: http://localhost:5174  
3. **Edge**: http://localhost:5174
4. Use different email accounts for each browser

## Test Checklist

### Basic Chat Functions
- [ ] Chat toggle button appears in session header with MessageCircle icon
- [ ] Chat panel slides out from right side when toggled
- [ ] Chat panel can be closed with X button in header
- [ ] Can type and send messages using textarea
- [ ] Messages appear in chat panel with proper formatting
- [ ] Timestamp shows on messages in HH:MM format
- [ ] User name and role display correctly for all messages

### Real-time Features
- [ ] Messages appear instantly in other browser windows
- [ ] Sender information correct across all windows (name and role)
- [ ] Timestamps are synchronized across all users
- [ ] New messages trigger auto-scroll to bottom
- [ ] Messages from current user appear on right (blue background)
- [ ] Messages from other users appear on left (white background)

### UI/UX Features  
- [ ] Chat panel is full height on right side
- [ ] Panel slides in/out smoothly with animation
- [ ] Mobile view shows full-screen overlay with backdrop
- [ ] Unread message count appears in header button when chat is closed
- [ ] Auto-focus on textarea when chat opens
- [ ] Character counter shows correctly (0/500)
- [ ] Send button is disabled when message is empty
- [ ] Enter key sends message, Shift+Enter creates new line

### Cross-User Communication
- [ ] **Test 1**: User A sends "Hello from User A" → appears in User B's chat
- [ ] **Test 2**: User B sends "Reply from User B" → appears in User A's chat  
- [ ] **Test 3**: Multiple rapid messages sync correctly
- [ ] **Test 4**: Long messages display properly without breaking layout
- [ ] **Test 5**: Messages show correct sender names and roles

### Edge Cases
- [ ] Very long messages display properly
- [ ] Multiple rapid messages handle correctly
- [ ] Chat works when switching between backlog items
- [ ] Browser refresh doesn't break chat
- [ ] Network interruption/reconnection

## Sample Test Messages

Use these messages to test different scenarios:

### Short Messages
- "Hi everyone!"
- "Ready to start?"
- "Good point"

### Longer Messages  
- "I think this story might be more complex than it appears because we need to consider the integration with the payment system."
- "Looking at the acceptance criteria, I'm not sure about the error handling requirements. Can we clarify what should happen when the API is unavailable?"

### Technical Discussion
- "This will require a database migration"
- "We should consider the performance impact"
- "What about mobile users?"

### Questions & Clarifications
- "How should we handle edge cases?"
- "What's the expected behavior for guest users?"
- "Should this work offline?"

## Expected Results

### ✅ Success Indicators
- All messages appear in real-time across browsers
- User names and roles display correctly
- Timestamps are accurate and synchronized
- Chat toggle works smoothly
- Unread count updates properly
- No console errors in browser developer tools

### ❌ Issues to Report
- Messages don't appear in other windows
- Wrong user names or roles
- Chat doesn't open/close properly
- Console errors in browser developer tools
- UI elements don't display correctly
- Mobile view problems

## Troubleshooting

### Common Issues
1. **Messages not syncing**: Check network connection and Supabase status
2. **User names wrong**: Verify user profile setup is complete
3. **Chat won't open**: Check for JavaScript errors in console
4. **Mobile issues**: Test on actual mobile device vs browser mobile simulation

### Browser Developer Tools
Press F12 and check:
- **Console**: Look for error messages
- **Network**: Verify WebSocket connections
- **Application**: Check local storage and session data

## Performance Testing

### Load Testing
- Open 3-5 browser windows simultaneously
- Send messages rapidly from multiple users
- Monitor CPU and memory usage
- Check for any lag or delays

### Stress Testing
- Send very long messages (500+ characters)
- Send many messages quickly (10+ in 10 seconds)
- Leave chat open for extended periods
- Test with poor network conditions

---

**Quick Start**: Open two browser windows, login as different users, join same session, and start chatting!
