# Video Call Initiator Display - Testing Guide

## What Was Implemented

When a user joins a planning session where someone has already started a video call, they will now see:

1. **The video call interface is visible** (even though they haven't joined yet)
2. **The initiator's avatar/placeholder is displayed** in the video participant area
3. **Clear indication of who started the call** in the header
4. **Proper participant count** including the initiator
5. **Visual distinction** showing the initiator is "in call" with a blue background and video icon

## Testing Scenario

### Setup:
1. Open two browser windows/tabs for the same planning session
2. User A starts a video call
3. User B joins the session (or refreshes if already in session)

### Expected Results for User B:

#### Before Joining the Call:
- ✅ Video interface is visible at the top
- ✅ Shows "Video Call Active (started by [User A's name])"
- ✅ Shows User A's avatar with blue background and video icon
- ✅ Shows "1 in call - Click 'Join Video Call' to participate"
- ✅ User A's avatar shows "[Name] • In Call" below it
- ✅ Join Video Call button is available

#### After User B Joins:
- ✅ User B's own video appears (local video)
- ✅ User A appears in remote participants
- ✅ Shows "2 in call"
- ✅ Full video call functionality active

## Visual Indicators

### Initiator Placeholder (when not joined):
- **Blue circular background** (different from regular participants)
- **Video icon overlay** to indicate they're actively in a call
- **Green status dot** showing they're active
- **"In Call" label** below their name
- **Video camera emoji** (🎥) next to their name

### Regular Remote Participants:
- **Gray/dark background** for actual video streams
- **User initials** when no video stream
- **Audio/video status indicators**

## Debug Information

Check the browser console for debug logs showing:
- Initiator ID and presence information
- Whether placeholder should be shown
- Participant counts and states

## Code Changes Made

1. **Added helper functions** to detect when to show initiator placeholder
2. **Enhanced participant display logic** to include initiator when not in remote participants
3. **Improved participant counting** to include initiator in "in call" count
4. **Added visual styling** for initiator placeholder (blue theme)
5. **Enhanced header information** showing who started the call

This ensures that users joining an active video call can immediately see who's already participating, making the video call feature more intuitive and social.
