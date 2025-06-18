# Video Call Testing Guide

## Current Implementation Status ✅

The video call functionality is **already implemented** and should work when you:

### Step 1: Start a Planning Session
1. Open the app in your browser
2. Sign in as a Moderator
3. Create a new planning session with backlog items
4. Start the voting session

### Step 2: Start Video Call
1. In the voting session, look for the **"Start Video Call"** button in the top controls
2. Click **"Start Video Call"**
3. Allow camera and microphone permissions when prompted
4. You should see your own video in a circular avatar (mirrored with `transform: scaleX(-1)`)

### Step 3: Test with Multiple Users
1. Copy the session invite link
2. Open an incognito browser window (or different browser)
3. Join the session as a Team Member
4. In the voting session, click **"Join Video Call"**
5. Both users should now see each other in the video call

## Video Call Features ✅

- **Mirrored local video**: Your own video is displayed with `transform: scaleX(-1)`
- **Circular video avatars**: All participants appear in 64px circular frames
- **Audio/Video controls**: Toggle camera and microphone
- **WebRTC signaling**: Uses Supabase real-time channels
- **Participant tracking**: Shows who's in the video call
- **Role-based controls**: Moderators can end calls for everyone

## Technical Implementation

### Video Element (Already Implemented)
```tsx
<video
  ref={localVideoRef}
  autoPlay
  muted
  playsInline
  className="w-full h-full object-cover"
  style={{ transform: 'scaleX(-1)' }}  // This mirrors your video
/>
```

### Key Components
- **VotingSession.tsx**: Handles video call buttons and state
- **CompactVideoConference.tsx**: Manages WebRTC and video display
- **Supabase channels**: Real-time signaling for WebRTC

## Troubleshooting

If video calls don't work:

1. **Check browser permissions**: Camera/microphone must be allowed
2. **Use HTTPS**: WebRTC requires secure connections in production
3. **Check console**: Look for WebRTC or media errors
4. **Try different browsers**: Chrome/Firefox work best
5. **Check network**: Firewalls might block WebRTC

## Database Setup (Optional)

The video_sessions table tracks calls but isn't required for basic functionality:

```sql
-- Run this if you want call tracking (optional)
CREATE TABLE video_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL,
    started_by UUID NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    participants_count INTEGER DEFAULT 1,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Current Status: ✅ READY TO TEST

The video call functionality should work immediately. Just:
1. Start a voting session
2. Click "Start Video Call" 
3. Allow browser permissions
4. Your mirrored video should appear
5. Other users can join and see you

The implementation matches your requirements exactly!
