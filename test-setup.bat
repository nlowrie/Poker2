@echo off
cls
echo 🎯 Planning Poker App - Testing Setup
echo ======================================
echo.

echo 🔧 Quick Testing Options:
echo.
echo 1. MULTIPLE BROWSERS METHOD (Recommended)
echo    - Browser 1: Sign in as Moderator
echo    - Browser 2 (Incognito): Join as Team Member
echo.

echo 2. TEST USER CREDENTIALS
echo    Moderator: testmod@example.com / testpassword123
echo    Team Member: testuser@example.com / testpassword123
echo.

echo 3. TESTING WORKFLOW
echo    Step 1: Create/sign in as moderator
echo    Step 2: Create planning session
echo    Step 3: Copy invite link
echo    Step 4: Open incognito/different browser
echo    Step 5: Use invite link to join as team member
echo.

echo 4. TESTING CHECKLIST
echo    ✓ Role-based permissions (Moderator vs Team Member)
echo    ✓ Session creation and joining
echo    ✓ Voting functionality
echo    ✓ Vote revealing
echo    ✓ Estimate acceptance
echo    ✓ Real-time updates
echo.

echo 🌐 BROWSER SHORTCUTS:
echo    Chrome Incognito: Ctrl+Shift+N
echo    Firefox Private: Ctrl+Shift+P
echo    Edge InPrivate: Ctrl+Shift+N
echo.

echo 🔗 Quick Links:
echo    App: http://localhost:5173
echo    Auth Page: http://localhost:5173 (if not signed in)
echo.

echo 📋 For detailed instructions, see TESTING_GUIDE.md
echo.

pause
