# System Audio Capture Troubleshooting Guide

## Overview
The system audio capture feature allows you to transcribe audio that's playing through your computer's speakers/headphones (like YouTube videos, music, or remote participants in video calls).

## Browser Requirements

### ✅ Supported Browsers
- **Chrome 74+** (Recommended)
- **Edge 79+** (Chromium-based)

### ❌ Unsupported Browsers
- Firefox (does not support system audio capture via getDisplayMedia)
- Safari (does not support system audio capture)
- Internet Explorer
- Older versions of Chrome/Edge

## How to Use System Audio Capture

### Step 1: Start a Video Call
1. Click the video call button in the voting session
2. The video interface will appear with control buttons

### Step 2: Click the Orange Headphones Button
1. Look for the orange headphones button (🎧) in the video controls
2. Click it to start system audio capture

### Step 3: Grant Permissions
When you click the button, your browser will show a screen sharing dialog:

1. **IMPORTANT**: Select "Share audio" checkbox
2. Choose which tab/window to share (can be any tab)
3. Click "Share"

### Step 4: Verify Capture
- The headphones button should turn orange when active
- You'll see "🎧 + System Audio" indicator in the UI
- Console logs will show audio processing

## Common Issues & Solutions

### Issue: "Your browser does not support system audio capture"
**Solution**: Switch to Chrome 74+ or Edge 79+

### Issue: No audio is being captured
**Solutions**:
1. Make sure you selected "Share audio" when prompted
2. Ensure audio is actually playing on your computer
3. Check that your system volume is not muted
4. Try refreshing and starting again

### Issue: Permission denied
**Solutions**:
1. Click "Allow" when browser asks for permission
2. Make sure to check "Share audio" in the dialog
3. If you accidentally denied, refresh the page and try again

### Issue: Audio is choppy or cutting out
**Solutions**:
1. Close other applications using audio
2. Check your internet connection
3. Try using headphones instead of speakers

## Testing Steps

### Quick Test
1. Open YouTube in another tab
2. Start playing a video
3. Go back to the voting session
4. Start a video call
5. Click the orange headphones button
6. Select "Share audio" and choose any tab
7. You should see transcription of the YouTube audio

### Advanced Test
1. Have another person join the video call
2. Start system audio capture
3. Both speak simultaneously
4. Check if both voices are being transcribed

## Technical Details

### Audio Processing Flow
1. `getDisplayMedia()` captures system audio
2. `MediaRecorder` records audio chunks
3. Audio chunks are sent to OpenAI Whisper API
4. Transcription is enhanced using GPT-4o
5. Combined transcription is displayed

### Debug Information
Check browser console (F12) for detailed logs:
- `🎧` prefix indicates system audio capture logs
- Look for error messages and permission status
- Audio stream details and chunk processing info

## Troubleshooting Commands

### Check Browser Compatibility
```javascript
console.log('getDisplayMedia available:', !!navigator.mediaDevices?.getDisplayMedia);
console.log('MediaRecorder available:', !!window.MediaRecorder);
```

### Check Audio Constraints
```javascript
console.log('Audio constraints supported:', navigator.mediaDevices.getSupportedConstraints());
```

## Limitations

1. **Browser Support**: Only works in Chrome/Edge
2. **Permission Required**: User must grant screen sharing permission
3. **Audio Selection**: User must manually select "Share audio"
4. **Quality**: Depends on system audio quality and internet connection
5. **Processing Time**: Real-time transcription may have slight delays

## FAQ

**Q: Why do I need to share my screen for audio capture?**
A: The browser's `getDisplayMedia` API is designed for screen sharing, but it can also capture system audio when the "Share audio" option is selected.

**Q: Will this capture my microphone too?**
A: No, system audio capture only captures what's playing through your speakers/headphones, not your microphone input.

**Q: Can I use this with headphones?**
A: Yes, it works with headphones. The system audio capture will pick up whatever audio is being routed to your audio output device.

**Q: Does this work on mobile?**
A: No, mobile browsers do not support the `getDisplayMedia` API required for system audio capture.

## Support
If you continue to have issues, please:
1. Check the browser console for error messages
2. Verify you're using a supported browser
3. Ensure audio is playing and permissions are granted
4. Try the quick test procedure above
