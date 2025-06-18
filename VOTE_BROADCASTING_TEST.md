# Vote Broadcasting Consistency Test

## Purpose
Test that when a user votes in a planning poker session, their vote is broadcasted to all participants with the same name and avatar that appears in their local display, not with fallback names like "User 5196".

## Setup Required
1. Two or more browser windows/tabs
2. Different user accounts logged in to each
3. Join the same planning poker session
4. Have at least one backlog item to vote on

## Test Steps

### Test 1: Basic Vote Broadcasting
1. **User A Action**: Vote on the current item
2. **User B Observation**: Check that a notification appears saying "[User A's proper name] submitted a vote"
3. **User B Verification**: Look at the team votes section and verify User A's vote shows their proper name, not a fallback
4. **Expected Result**: User A's display name should be identical in both User A's view and User B's view

### Test 2: Vote Change Broadcasting
1. **User A Action**: Change their vote to a different value
2. **User B Observation**: Check that a notification appears saying "[User A's proper name] changed their vote"
3. **User B Verification**: Verify the updated vote in team votes section shows the proper name
4. **Expected Result**: Consistent naming throughout the change process

### Test 3: Multiple Users Voting
1. **All Users**: Vote on the same item in sequence
2. **Each User**: Observe notifications as other users vote
3. **All Users**: Compare the team votes section
4. **Expected Result**: All names should be consistent across all browser windows/participants

### Test 4: Avatar Consistency
1. **All Users**: After voting, check the team votes section
2. **Verification**: Ensure all avatars use the same gradient styling (blue-500 to purple-600)
3. **Verification**: Ensure initials match the user's display name
4. **Expected Result**: Avatar appearance should be identical across all participants

## Automated Verification

Run this script in each browser's console to verify consistency:

```javascript
// Enhanced verification for broadcasting
const verifyBroadcastConsistency = () => {
  console.log("=== Broadcast Consistency Check ===");
  
  // Get current user info
  const user = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}');
  const currentUserEmail = user.user?.email;
  const currentUserName = user.user?.user_metadata?.full_name || (currentUserEmail ? currentUserEmail.split('@')[0] : 'Unknown');
  
  console.log(`Current user: ${currentUserName}`);
  
  // Check team votes for consistency
  const voteElements = document.querySelectorAll('.flex.items-center.justify-between');
  console.log(`Found ${voteElements.length} votes in team votes`);
  
  voteElements.forEach((el, index) => {
    const nameEl = el.querySelector('span.font-medium');
    const avatarEl = el.querySelector('.bg-gradient-to-br');
    const youEl = el.querySelector('.text-blue-600');
    
    if (nameEl && avatarEl) {
      const voteName = nameEl.textContent;
      const voteInitials = avatarEl.textContent;
      const isCurrentUser = !!youEl;
      
      console.log(`Vote ${index + 1}:`, {
        name: voteName,
        initials: voteInitials,
        isCurrentUser: isCurrentUser,
        hasFallbackPattern: /User \d{4}/.test(voteName)
      });
      
      if (/User \d{4}/.test(voteName)) {
        console.error(`❌ FALLBACK NAME DETECTED: ${voteName}`);
      } else {
        console.log(`✅ Proper name detected: ${voteName}`);
      }
    }
  });
};

// Run the check
verifyBroadcastConsistency();

// Make it available globally
window.verifyBroadcastConsistency = verifyBroadcastConsistency;
```

## Expected Broadcast Payload

When a user votes, the broadcast payload should now include:
```javascript
{
  itemId: "item-id",
  voterId: "user-id", 
  voterName: "Proper Display Name", // NOT "User 1234"
  voterInitials: "PDN", // Consistent initials
  value: "5",
  timestamp: "2025-06-18T..."
}
```

## Troubleshooting

### If fallback names still appear:
1. Check browser console for any errors during vote submission
2. Verify that `getUserDisplayName()` function is working correctly
3. Check network tab to see the actual broadcast payload being sent
4. Ensure all browser windows are using the same version of the code

### If notifications show wrong names:
1. The issue is likely in the broadcast sender, not receiver
2. Check that `getUserDisplayName(user)` is being called correctly in the vote submission
3. Verify user authentication state

### If avatars are inconsistent:
1. Check that all avatar elements have the `bg-gradient-to-br from-blue-500 to-purple-600` classes
2. Verify that `getUserInitials()` is being used consistently

## Success Criteria

✅ No "User 1234" style names appear in any participant's view  
✅ All participants see identical names for the same user  
✅ All participants see identical avatar styling  
✅ Vote notifications display proper user names  
✅ Real-time updates maintain name consistency  

This test verifies that the vote broadcasting fix successfully eliminates fallback names and ensures consistent user representation across all participants in the planning poker session.
