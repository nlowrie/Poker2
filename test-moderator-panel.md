# Moderator Panel Testing Guide

## Quick Test Steps

### 1. Access the Application
- Navigate to `http://localhost:5180`
- Create or join a session as a Moderator

### 2. Test Panel Toggle
- Look for the "Moderator Panel" button in the top-right header
- Click to open the floating panel
- Verify smooth slide-in animation from the right
- Click the X button or toggle button to close
- Verify smooth slide-out animation

### 3. Test Navigation Controls
- Open the moderator panel
- Use Previous/Next buttons to navigate between backlog items
- Verify the progress bar updates correctly
- Check that buttons are disabled at start/end of list
- Confirm item counter updates

### 4. Test Timer Functionality
- Set a custom timer duration (try 2-3 minutes for quick testing)
- Click "Start" button
- Verify timer counts down in MM:SS format
- Test "Pause" button (timer should stop)
- Test "Resume" button (timer should continue)
- Test "Reset" button (timer should reset to original duration)
- Verify timer activity indicator (pulsing dot) appears on panel toggle button

### 5. Test Voting Controls
- Change estimation type between Fibonacci and T-Shirt
- Submit some test votes (you can open multiple browser tabs)
- Use "Reveal Votes" button
- Test "Accept" and "Skip" buttons after votes are revealed

### 6. Test Quick Actions
- Use "Reset Current Item" to clear all votes and timer
- Toggle chat visibility
- Verify chat button works for moderators through the panel

### 7. Test UI/UX
- Verify main navigation bar is clean and uncluttered
- Confirm no moderator controls appear in the main header
- Check that the panel doesn't obstruct important content
- Test scrolling within the panel if content overflows

### 8. Test Team Member View
- Open the app in another browser tab or incognito mode
- Join as a Team Member (not Moderator)
- Verify no "Moderator Panel" button appears
- Confirm chat button is still accessible for team members
- Check that main navigation shows appropriate information

## Expected Results

### ✅ Success Indicators
- Panel slides smoothly in/out without lag
- All controls work as expected
- Timer synchronizes across browser tabs
- Main navigation is clean and focused
- No JavaScript errors in console
- Responsive design works on different screen sizes

### ❌ Issues to Look For
- Panel animation stuttering or jumping
- Controls not responding to clicks
- Timer not updating correctly
- Panel covering important content
- JavaScript errors in browser console
- Layout breaking on mobile screens

## Test Scenarios

### Scenario 1: Basic Workflow
1. Open moderator panel
2. Start a 2-minute timer
3. Navigate to next item
4. Pause timer
5. Resume timer
6. Reveal votes
7. Accept estimate
8. Close panel

### Scenario 2: Multi-User Testing
1. Open app in 2+ browser tabs
2. Join as moderator in one, team member in others
3. Start timer from moderator
4. Verify timer appears for all users
5. Change items from moderator
6. Verify all users see item change

### Scenario 3: Edge Cases
1. Try to navigate past the last item
2. Try to navigate before the first item
3. Start timer with 0 or negative duration
4. Close panel while timer is running
5. Refresh page with panel open

## Browser Compatibility
Test in:
- Chrome (primary)
- Edge
- Firefox
- Safari (if available)
- Mobile browsers

## Performance Notes
- Panel should open/close within 300ms
- No visible lag during animations
- Smooth scrolling within panel
- No memory leaks with repeated open/close

## Troubleshooting
If issues occur:
1. Check browser console for errors
2. Verify server is running on port 5180
3. Clear browser cache
4. Test in incognito/private mode
5. Check network requests in DevTools
