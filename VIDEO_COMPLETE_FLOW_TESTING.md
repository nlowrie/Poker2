# Video Call Complete Flow Testing

## Expected Flow Verification

### 1. **Initiator Starts Video Call**

**Action**: User A clicks "Start Video Call" button
**Expected Results**:
- ✅ Video interface appears immediately
- ✅ User A sees their own video in a circular element labeled "You"
- ✅ Video controls are enabled (video/audio toggles, end call)
- ✅ Status shows "Video Call Active"
- ✅ Button changes to "Leave Call" (red)
- ✅ Database records the video session

### 2. **Other Participants See Active Call**

**Action**: User B is in the same session (or joins/refreshes)
**Expected Results**:
- ✅ Video interface appears automatically
- ✅ User B sees User A's blue avatar with video icon
- ✅ Status shows "Video Call Active (started by User A)"
- ✅ User B sees "1 in call - Click 'Join Video Call' to participate"
- ✅ User B sees "Join Video Call" button (blue)
- ✅ Video controls are disabled for User B (until they join)

### 3. **Participant Joins Video Call**

**Action**: User B clicks "Join Video Call" button
**Expected Results**:
- ✅ User B's own video appears as "You"
- ✅ User B's video controls become enabled
- ✅ User B sees User A's real video (if User A has video on)
- ✅ User A sees User B's video appear
- ✅ Status shows "2 in call" for both users
- ✅ User B's button changes to "Leave Call" (red)

### 4. **Multiple Participants**

**Action**: User C joins the session and then the video call
**Expected Results**:
- ✅ User C sees the video interface with User A's avatar
- ✅ User C clicks "Join Video Call"
- ✅ User C sees their own video + User A's + User B's videos
- ✅ All users see all participants' videos
- ✅ Status shows "3 in call"

### 5. **Participant Leaves Call**

**Action**: User B clicks "Leave Call"
**Expected Results**:
- ✅ User B's video disappears from other participants' views
- ✅ User B's video interface shows "Join Video Call" button again
- ✅ User B's controls are disabled again
- ✅ Status shows "2 in call"
- ✅ User B sees initiator's avatar again (if they were the only other participant)

### 6. **Initiator Ends Call**

**Action**: User A (initiator) clicks "End Call"
**Expected Results**:
- ✅ Video interface disappears for all participants
- ✅ All participants see "User A ended the video call" notification
- ✅ Database marks session as ended
- ✅ All users see "Start Video Call" button again

## Key Visual Elements

### **For Initiator (User A)**:
- **Own video**: Circular element labeled "You" with blue border
- **Controls**: All enabled (video, audio, end call)
- **Status**: "Video Call Active"

### **For Non-Joined Participants (User B before joining)**:
- **Initiator's avatar**: Blue circular background with video icon
- **Own placeholder**: Dashed circle with "Click to join" message
- **Controls**: All disabled
- **Status**: "Video Call Active (started by User A)" + "1 in call - Click 'Join Video Call' to participate"

### **For Joined Participants (User B after joining)**:
- **Own video**: Circular element labeled "You" with blue border
- **Other participants**: Real video streams or avatars
- **Controls**: All enabled
- **Status**: "X in call"

## Technical Implementation Points

### **State Management**:
- `isVideoCallActive`: true when any call is active
- `hasJoinedVideoCall`: true only when current user has joined
- `videoCallInitiator`: ID of the user who started the call

### **Button Logic**:
```tsx
{!isVideoCallActive ? (
  "Start Video Call" // Green button
) : !hasJoinedVideoCall ? (
  "Join Video Call"  // Blue button
) : (
  "Leave Call"       // Red button
)}
```

### **Video Display Logic**:
- **Initiator sees own video** when they start the call
- **Others see initiator's avatar** until they join
- **Joined users see all real video streams**
- **Controls enabled only for joined users**

This flow ensures a smooth, intuitive video conferencing experience within the planning poker session!
