# Participants List Testing Guide

## Overview
This guide covers testing the real-time participants list functionality in the planning poker app, which displays all users (moderator and team members) currently active in a voting session.

## Features to Test

### 1. Participants Display
- **Location**: Header section of VotingSession component
- **Shows**: All users currently connected to the session
- **Updates**: Real-time when users join/leave

### 2. Participant Information
Each participant shows:
- **Avatar**: First letter of name in colored circle
- **Name**: User's display name
- **Role**: "Moderator" or "Team Member"
- **Online Status**: Green dot for online, gray for offline
- **Current User Indicator**: "(You)" label for current user

### 3. Real-time Updates
- **Join Notifications**: Shows when users join the session
- **Leave Notifications**: Shows when users leave the session
- **Presence Sync**: Updates participant list automatically

## Testing Steps

### Step 1: Single User Session
1. **Login** as a user (any role)
2. **Create/Join** a planning session
3. **Navigate** to voting session
4. **Verify**: 
   - Participants section shows "Session Participants (1)"
   - Your user appears with "(You)" indicator
   - Green online status dot is visible
   - Role is displayed correctly

### Step 2: Multi-User Session
1. **Open** a second browser/incognito window
2. **Login** as a different user
3. **Join** the same session
4. **Verify** in both windows:
   - Participants count increases to (2)
   - Both users appear in the list
   - Join notification appears
   - Real-time sync works both ways

### Step 3: User Leave Testing
1. **Close** one browser window or navigate away
2. **Verify** in remaining window:
   - Participants count decreases
   - User disappears from list
   - Leave notification appears
   - Status updates in real-time

### Step 4: Role-Based Display
1. **Test** with different user roles:
   - Moderator + Team Member
   - Multiple Team Members
2. **Verify**:
   - Correct role labels appear
   - All participants visible regardless of role

### Step 5: Session Persistence
1. **Refresh** the page
2. **Verify**:
   - Participants list rebuilds correctly
   - Connection re-establishes automatically
   - No duplicate entries appear

## Expected Behaviors

### Successful Scenarios
✅ **All Connected Users Visible**: Every user in the session appears in the list
✅ **Real-time Updates**: Changes happen instantly across all browsers
✅ **Correct Information**: Names, roles, and status display accurately
✅ **Notifications**: Join/leave events trigger appropriate notifications
✅ **Self-Identification**: Current user is clearly marked with "(You)"
✅ **Status Indicators**: Online/offline status reflects actual connection state

### Edge Cases to Test
- **Network Interruption**: Temporary connection loss
- **Rapid Join/Leave**: Multiple users joining/leaving quickly
- **Browser Refresh**: Page reload during active session
- **Multiple Tabs**: Same user in multiple tabs
- **Session Navigation**: Moving between different session views

## Troubleshooting

### Common Issues

#### Participants Not Appearing
- **Check**: Supabase connection
- **Verify**: Real-time subscriptions are active
- **Look for**: Console errors related to presence tracking

#### Duplicate Participants
- **Cause**: Multiple presence tracking instances
- **Solution**: Ensure proper cleanup on component unmount
- **Check**: Browser developer tools for multiple connections

#### Status Not Updating
- **Issue**: Presence sync not working
- **Debug**: Check Supabase real-time dashboard
- **Verify**: Channel subscription status

#### Notifications Not Showing
- **Check**: Notification state management
- **Verify**: Event payload structure
- **Look for**: Join/leave event handlers

## Browser Testing
Test across different browsers:
- **Chrome**: Primary testing browser
- **Firefox**: Alternative testing
- **Edge**: Microsoft compatibility
- **Safari**: Mac users (if available)

## Performance Considerations
- **Large Sessions**: Test with 10+ users
- **Network Conditions**: Test on slow connections
- **Device Types**: Mobile and desktop compatibility

## Implementation Details

### Key Components
- **VotingSession.tsx**: Main component with participants display
- **Supabase Presence**: Real-time tracking mechanism
- **Channel Subscriptions**: Event handling for join/leave

### Event Types
- **presence sync**: Full participant list update
- **presence join**: New user joined
- **presence leave**: User left session

### State Management
```typescript
const [participants, setParticipants] = useState<Array<{
  id: string;
  name: string;
  role: string;
  isOnline: boolean;
  lastSeen: Date;
}>>([]);
```

## Success Criteria
The participants list feature is working correctly when:
1. All active users appear in the list
2. Real-time updates work reliably
3. User information is accurate and current
4. Join/leave notifications function properly
5. The UI is responsive and intuitive
6. Performance remains good with multiple users

---

*Last Updated: [Current Date]*
*Feature Status: ✅ Implemented and Ready for Testing*
