# Testing Multiple Users - Planning Poker App

## Quick Testing Setup

### Method 1: Multiple Browsers (Recommended)

1. **Browser 1 (Chrome):** 
   - Sign in as Moderator
   - Create a planning session
   - Copy the invite link

2. **Browser 2 (Firefox/Edge/Safari or Chrome Incognito):**
   - Use the invite link
   - Sign up as a new Team Member
   - Join the session

### Method 2: Using Test User Creation

1. **Create Test Users:**
   - Go to the Auth page
   - Click "Show Quick Test Users" at the bottom
   - Create a test moderator: `testmod@example.com` / `testpassword123`
   - Create a test team member: `testuser@example.com` / `testpassword123`

2. **Switch Between Users:**
   - Click the user icon in the top right
   - Click "Sign Out"
   - Sign in with different credentials

### Method 3: Manual User Creation

Create users with these test credentials:

**Moderator:**
- Email: `moderator@test.com`
- Password: `testpass123`

**Team Member:**
- Email: `teammember@test.com`
- Password: `testpass123`

## Testing Workflow

### 1. Set Up the Session (Moderator)
- Sign in as moderator
- Create a planning session
- Add some backlog items
- Start a planning session
- Copy the invite link from the "Share Session" button

### 2. Join as Team Member
- Open different browser/incognito window
- Paste the invite link
- Sign up/sign in as team member
- Select "Team Member" role if prompted
- Join the session

### 3. Test Features
- **Moderator can:**
  - Reveal votes
  - Accept/skip estimates
  - Navigate between items
  - Control voting timer
  - Manage session

- **Team Member can:**
  - Vote on items
  - See other participants
  - View voting results when revealed

### 4. Quick Reset
- Sign out from both browsers
- Clear browser data if needed
- Start fresh testing

## Development Tips

- Use browser dev tools to see different screen sizes
- Test on both desktop and mobile
- Check network tab for any API errors
- Use different email domains to avoid confusion

## Troubleshooting

- **Auto-login issue:** Clear browser cookies/localStorage
- **Role not saving:** Check Supabase user metadata
- **Session not found:** Verify the invite link format
- **Voting not working:** Check browser console for errors
