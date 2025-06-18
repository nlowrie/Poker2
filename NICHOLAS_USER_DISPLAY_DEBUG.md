# Debugging User Display Issue - nicholas.d.lowrie@gmail.com

## Issue
nicholas.d.lowrie@gmail.com votes on an issue but their avatar and name are not being displayed correctly in the team votes section.

## Debugging Steps Applied

### 1. Enhanced Database Query Logging
Modified `getEstimationsForItem` in `planningSession.ts` to:
- Log successful user profile joins
- Log fallback scenarios when user profiles unavailable
- Better error handling and debugging output

### 2. Comprehensive User Data Logging
Added detailed console logging in `VotingSession.tsx`:
- Current user auth data
- Raw estimations data from database
- Step-by-step name resolution process
- Final resolved user names

### 3. Improved Name Resolution Logic
Enhanced the user name resolution to:
- Try multiple data sources in proper order
- Special handling for current user's information
- Use auth context when database data unavailable
- Prefer email username (nicholas.d.lowrie) over generic names

## Expected Console Output

When nicholas.d.lowrie@gmail.com votes, you should see:

```javascript
🔍 Debug - Current user data: {
  currentUser: { name: "nicholas.d.lowrie", role: "Moderator" },
  authUser: { id: "...", email: "nicholas.d.lowrie@gmail.com" },
  authUserMetadata: { ... },
  authUserEmail: "nicholas.d.lowrie@gmail.com",
  authUserId: "..."
}

🔍 Debug - Raw estimations: [
  {
    id: "...",
    session_id: "...",
    backlog_item_id: "...",
    user_id: "...",
    value: "5",
    created_at: "...",
    user_profiles: null // or { full_name: "...", role: "..." }
  }
]

🔍 Debug - Estimation data: {
  user_id: "...",
  user_profiles: null,
  user_metadata: null,
  users: null,
  email: null,
  isCurrentUser: true
}

🔍 Final resolved user name: {
  user_id: "...",
  finalUserName: "nicholas.d.lowrie",
  isCurrentUser: true,
  currentUserEmail: "nicholas.d.lowrie@gmail.com",
  currentUserName: "nicholas.d.lowrie",
  estimationSources: {
    user_profiles_full_name: null,
    user_metadata_full_name: null,
    users_email: null,
    direct_email: null,
    auth_email: "nicholas.d.lowrie@gmail.com"
  }
}
```

## Expected Visual Result

In the Team Votes section, you should see:
```
[ND] nicholas.d.lowrie (Moderator) - You
```

## Troubleshooting Scenarios

### Scenario 1: Database Has No User Profile Data
If `user_profiles` table doesn't exist or has no data:
- Should fall back to using auth context
- Should extract "nicholas.d.lowrie" from email
- Should show proper avatar with "ND" initials

### Scenario 2: User Profile Data Available
If `user_profiles` has full name data:
- Should use the full name from database
- Should show proper role (Moderator)
- Should display correct avatar

### Scenario 3: Minimal Data Available
If only basic estimation data is available:
- Should use current user auth information
- Should extract username from email address
- Should never show "Anonymous User" for logged-in user

## Testing Instructions

1. **Log in as nicholas.d.lowrie@gmail.com**
2. **Vote on a backlog item**
3. **Open browser developer console**
4. **Look for the debug messages above**
5. **Check the Team Votes section for proper display**

## Data Sources Priority (Current Implementation)

For the current user's vote:
1. `est.user_profiles?.full_name` - Database user profile
2. `est.user_metadata?.full_name` - Auth metadata
3. `est.users?.email?.split('@')[0]` - Users table email
4. `est.email?.split('@')[0]` - Direct email field
5. `currentUser.name` - Component props
6. `user.user_metadata?.full_name` - Auth context full name
7. `user.email?.split('@')[0]` - Auth context email (should give "nicholas.d.lowrie")
8. `'You'` - Self identifier
9. `'Anonymous User'` - Final fallback (should not reach this)

## Files Modified
- `src/components/VotingSession.tsx` - Enhanced debugging and name resolution
- `src/utils/planningSession.ts` - Improved query error handling and logging

## Next Steps
1. Test with nicholas.d.lowrie@gmail.com account
2. Review console output to identify which data sources are available
3. Confirm proper name resolution and avatar display
4. Remove debug logging once issue is resolved

## Date: June 17, 2025
