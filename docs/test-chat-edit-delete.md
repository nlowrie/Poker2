# Chat Edit and Delete Functionality Test Guide

This guide covers testing the new chat message editing and deletion features in the Planning Poker application.

## Features Implemented

### Message Editing
- Users can edit their own messages by clicking the edit icon (visible on hover)
- Edit mode provides a textarea with the current message content
- Users can save changes with Enter key or the save button
- Users can cancel editing with Escape key or the cancel button
- Character count (500 max) displayed during editing
- Edited messages show "(edited)" indicator with timestamp

### Message Deletion
- Users can delete their own messages by clicking the trash icon (visible on hover)
- Deletion requires confirmation dialog
- Deleted messages are soft-deleted (not permanently removed from database)
- Deleted messages show as "This message has been deleted" with reduced opacity
- Original timestamp and deletion timestamp are preserved

### Real-time Synchronization
- Message edits are broadcast to all users in the session
- Message deletions are broadcast to all users in the session
- Other users see updates immediately without page refresh

## Test Cases

### Test 1: Basic Message Editing
1. **Setup**: Join a planning session with at least 2 users
2. **Actions**:
   - Send a test message: "This is my original message"
   - Hover over your own message to see edit/delete buttons
   - Click the edit button (pencil icon)
   - Modify the message to: "This is my edited message"
   - Press Enter or click the save button
3. **Expected Results**:
   - Message content updates immediately
   - Message shows "(edited)" indicator with timestamp
   - Other users see the updated message in real-time
   - Message is updated in the database

### Test 2: Edit Cancellation
1. **Actions**:
   - Click edit on one of your messages
   - Change the text in the textarea
   - Press Escape or click the cancel button
2. **Expected Results**:
   - Edit mode closes without saving changes
   - Original message content is preserved
   - No database update occurs

### Test 3: Message Deletion
1. **Actions**:
   - Send a test message: "This message will be deleted"
   - Hover over the message and click the trash icon
   - Confirm deletion in the dialog
2. **Expected Results**:
   - Message content changes to "This message has been deleted"
   - Message appears with reduced opacity and gray styling
   - Deletion timestamp is shown
   - Other users see the deleted message state
   - Message is soft-deleted in database (isDeleted=true)

### Test 4: Security - Can't Edit Other Users' Messages
1. **Actions**:
   - Have another user send a message
   - Hover over their message
2. **Expected Results**:
   - No edit/delete buttons are visible
   - Only the message author can edit/delete their messages

### Test 5: Real-time Updates
1. **Setup**: Two browser windows/tabs with same session
2. **Actions**:
   - In Window 1: Send, edit, or delete a message
   - Observe Window 2
3. **Expected Results**:
   - Changes appear immediately in Window 2
   - No page refresh required
   - All message states (edited/deleted) sync correctly

### Test 6: Edit Validation
1. **Actions**:
   - Edit a message and remove all text (make it empty)
   - Try to save
2. **Expected Results**:
   - Save button is disabled for empty messages
   - No database update occurs
   - User must add content or cancel

### Test 7: Character Limit
1. **Actions**:
   - Edit a message and try to exceed 500 characters
   - Observe character counter
2. **Expected Results**:
   - Character count displays correctly (e.g., "485/500")
   - Textarea prevents input beyond 500 characters
   - Counter updates in real-time

### Test 8: Keyboard Shortcuts
1. **Actions**:
   - Enter edit mode for a message
   - Try various keyboard combinations:
     - Enter (should save)
     - Shift+Enter (should add new line)
     - Escape (should cancel)
2. **Expected Results**:
   - Enter saves the edit
   - Shift+Enter creates new line without saving
   - Escape cancels edit mode

### Test 9: Chat History Persistence
1. **Actions**:
   - Send, edit, and delete messages
   - Refresh the page or rejoin the session
2. **Expected Results**:
   - All message states are preserved
   - Edited messages still show "(edited)" indicator
   - Deleted messages still show as deleted
   - Edit history is maintained

### Test 10: Error Handling
1. **Actions**:
   - Simulate network issues (disconnect internet briefly)
   - Try editing or deleting messages during disconnection
2. **Expected Results**:
   - Error messages in console (check developer tools)
   - UI remains responsive
   - Operations retry when connection is restored

## Visual Indicators to Verify

### Edited Messages
- "(edited)" text appears after timestamp
- Edit timestamp shown if available
- No visual difference in message appearance otherwise

### Deleted Messages
- Grayed out appearance with reduced opacity
- Text reads "This message has been deleted"
- Deletion timestamp shown
- Different background color (gray instead of blue/white)

### Edit Mode
- Textarea replaces message text
- Save (green check) and cancel (X) buttons visible
- Character counter shows current/max characters
- Auto-focus on textarea when entering edit mode

### Hover Effects
- Edit and delete buttons appear on hover for own messages
- No buttons appear for other users' messages
- Smooth transition animations

## Database Verification

To verify database changes, check the `chat_messages` table:

```sql
-- Check message edit history
SELECT id, message, original_message, is_edited, edit_count, edited_at 
FROM chat_messages 
WHERE session_id = 'your-session-id';

-- Check soft-deleted messages
SELECT id, message, is_deleted, deleted_at 
FROM chat_messages 
WHERE session_id = 'your-session-id' AND is_deleted = true;
```

## Common Issues to Watch For

1. **Duplicate messages** - Ensure deduplication logic works
2. **React key warnings** - Verify unique keys for all list items
3. **Memory leaks** - Check that event listeners are cleaned up
4. **Race conditions** - Verify message order is maintained
5. **Permission issues** - Ensure users can only edit their own messages

## Success Criteria

✅ Users can edit their own messages  
✅ Users can delete their own messages  
✅ Real-time updates work across all users  
✅ Visual indicators show edited/deleted states  
✅ Keyboard shortcuts work correctly  
✅ Character limits are enforced  
✅ Security prevents editing others' messages  
✅ Database persistence works correctly  
✅ Error handling gracefully manages failures  
✅ UI remains responsive during operations  

## Notes

- Edit history is tracked (edit count, original message, timestamps)
- Soft deletion preserves message data for audit purposes
- Real-time broadcasting ensures all users stay synchronized
- Responsive design works on both desktop and mobile
- Accessibility features include proper ARIA labels and keyboard navigation
