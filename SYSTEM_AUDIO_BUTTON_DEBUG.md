# System Audio Button Debug Guide

## Issue: Orange System Audio Button Not Visible

The orange system audio capture button (with Headphones icon) is only visible when the video call interface is active.

## Steps to Make Button Visible:

1. **Start the Application**:
   - Frontend: `npm run dev` (runs on http://localhost:5176)
   - Backend: `node api/server.js` (runs on http://localhost:3001)

2. **Navigate to a Voting Session**:
   - Go to the main page
   - Create or join a planning poker session
   - Make sure you're in an active voting session

3. **Activate Video Call Interface**:
   - Look for the **Video Call button** in the top toolbar (Video icon)
   - Click it to start a video meeting
   - This will make the video interface visible on the right side

4. **Find the System Audio Button**:
   - Once video is active, scroll down in the video interface panel
   - Look for the **Call Controls** section at the bottom
   - The orange button with headphones icon should be visible among other controls:
     - Mute (microphone icon)
     - Camera (video icon) 
     - Screen Share (monitor icon)
     - Hand Raise (hand icon)
     - Recording (circle icon)
     - **System Audio (headphones icon)** ← This is the orange button
     - End Call (phone icon)

## Button Behavior:
- **Inactive State**: Gray background with dark headphones icon
- **Active State**: Orange background with white headphones icon
- **Tooltip**: "Capture headphone audio (what you hear)" when inactive
- **Tooltip**: "Stop system audio capture" when active

## Technical Details:
- Button location: Line 1356-1368 in `src/components/VotingSession.tsx`
- State variable: `isCapturingSystemAudio`
- Functions: `startSystemAudioCapture()` and `stopSystemAudioCapture()`
- Icon: `Headphones` from lucide-react

## If Button Still Not Visible:
1. Check browser console for errors
2. Verify video interface is actually rendered (`currentUserVideoActive` should be true)
3. Check if video call controls section is visible
4. Try refreshing the page after starting video
5. Check browser permissions for microphone/camera access

## Testing System Audio Capture:
1. Start a YouTube video or play audio on your computer
2. Click the orange headphones button
3. Select "Share audio" when browser prompts for screen/audio sharing
4. The button should turn orange and start capturing system audio
5. Check browser console for transcription logs

## Console Logs to Watch:
- Look for logs starting with `🎧` for system audio capture
- Look for logs starting with `🎤` for transcription
- Look for logs starting with `✨` for enhanced transcription
