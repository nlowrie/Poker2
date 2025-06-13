# Planning Poker Testing - Multi-Browser Setup
# This PowerShell script opens multiple browser windows for testing

Write-Host "🎯 Planning Poker App - Multi-Browser Testing Setup" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
Write-Host ""

$appUrl = "http://localhost:5173"

Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
Start-Process PowerShell -ArgumentList "-Command", "npm run dev" -WindowStyle Minimized

Start-Sleep -Seconds 3

Write-Host "🌐 Opening browsers for testing..." -ForegroundColor Green
Write-Host ""

# Open regular Chrome window (for Moderator)
Write-Host "Opening Chrome (Normal) - Use this for MODERATOR" -ForegroundColor Blue
Start-Process "chrome.exe" -ArgumentList $appUrl

Start-Sleep -Seconds 2

# Open Chrome incognito window (for Team Member)
Write-Host "Opening Chrome (Incognito) - Use this for TEAM MEMBER" -ForegroundColor Magenta
Start-Process "chrome.exe" -ArgumentList "--incognito", $appUrl

Write-Host ""
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Testing Instructions:"
Write-Host "1. In the NORMAL Chrome window:"
Write-Host "   - Sign in as Moderator (testmod@example.com / testpassword123)"
Write-Host "   - Create a planning session"
Write-Host "   - Copy the invite link"
Write-Host ""
Write-Host "2. In the INCOGNITO Chrome window:"
Write-Host "   - Paste the invite link"
Write-Host "   - Sign up/in as Team Member (testuser@example.com / testpassword123)"
Write-Host "   - Join the session"
Write-Host ""
Write-Host "3. Test collaborative features between both windows!"
Write-Host ""

Read-Host "Press Enter to continue..."
