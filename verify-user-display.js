// This script logs information about current user display in the VotingSession component
// It will help verify that the refactoring fixed the issue with user names in team votes

console.log("=== User Display Verification Script ===");

// Helper function to get user initials (same logic as getUserInitials)
const getUserInitials = (displayName) => {
  if (!displayName || displayName.trim() === '') {
    return '?';
  }

  const trimmedName = displayName.trim();
  
  // Handle Anonymous users
  if (trimmedName.toLowerCase().startsWith('anonymous')) {
    return 'A';
  }

  // Split name into words and get first letter of each
  const words = trimmedName.split(/\s+/);
  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  // Take first letter of first and last word
  const firstInitial = words[0].charAt(0).toUpperCase();
  const lastInitial = words[words.length - 1].charAt(0).toUpperCase();
  
  return firstInitial + lastInitial;
};

// Check for authenticated user
const checkUserAuth = () => {
  const user = localStorage.getItem('supabase.auth.token');
  console.log("Authenticated user found:", !!user);
  
  if (user) {
    try {
      const userData = JSON.parse(user);
      const userEmail = userData.user?.email;
      const userFullName = userData.user?.user_metadata?.full_name;
      const expectedDisplayName = userFullName || (userEmail ? userEmail.split('@')[0] : 'Anonymous');
      
      console.log("User display name should be:", expectedDisplayName);
      console.log("User initials should be:", getUserInitials(expectedDisplayName));
      
      return { expectedDisplayName, expectedInitials: getUserInitials(expectedDisplayName) };
    } catch (e) {
      console.log("Could not parse user data");
    }
  }
  return null;
};

// Check header user display
const checkHeaderDisplay = (expectedData) => {
  const userIcon = document.querySelector('.flex.items-center.space-x-3');
  if (!userIcon) {
    console.log("User icon not found in header");
    return;
  }
  
  const nameEl = userIcon.querySelector('span.text-sm.font-medium');
  const avatarEl = userIcon.querySelector('.bg-gradient-to-br');
  
  if (nameEl && avatarEl) {
    const headerName = nameEl.textContent;
    const headerInitials = avatarEl.textContent;
    
    console.log(`Header display - Name: "${headerName}", Initials: "${headerInitials}"`);
    
    if (expectedData) {
      if (headerName === expectedData.expectedDisplayName) {
        console.log("✓ Header name matches expected display name");
      } else {
        console.warn(`⚠️ Header name mismatch: expected "${expectedData.expectedDisplayName}", got "${headerName}"`);
      }
      
      if (headerInitials === expectedData.expectedInitials) {
        console.log("✓ Header initials match expected initials");
      } else {
        console.warn(`⚠️ Header initials mismatch: expected "${expectedData.expectedInitials}", got "${headerInitials}"`);
      }
    }
    
    return { headerName, headerInitials };
  }
};

// Check team votes display
const checkTeamVotes = (expectedData) => {
  const teamVotesContainer = document.querySelector('.space-y-3');
  if (!teamVotesContainer) {
    console.log("Team votes container not found - are you in a voting session?");
    return;
  }
  
  const voteElements = teamVotesContainer.querySelectorAll('.flex.items-center.justify-between');
  console.log(`Found ${voteElements.length} votes in the team votes section`);
  
  voteElements.forEach((el, index) => {
    const nameEl = el.querySelector('span.font-medium');
    const avatarEl = el.querySelector('.bg-gradient-to-br');
    const youEl = el.querySelector('.text-blue-600');
    
    if (nameEl && avatarEl) {
      const voteName = nameEl.textContent;
      const voteInitials = avatarEl.textContent;
      const isCurrentUser = !!youEl;
      
      console.log(`Vote ${index + 1} - Name: "${voteName}", Initials: "${voteInitials}", Is You: ${isCurrentUser}`);
      
      // Check if this looks like a fallback name
      if (voteName && voteName.includes("User ")) {
        console.warn(`⚠️ Possible fallback name detected: ${voteName}`);
      } else {
        console.log("✓ This appears to be a proper name");
      }
      
      // If this is the current user, check consistency
      if (isCurrentUser && expectedData) {
        if (voteName === expectedData.expectedDisplayName) {
          console.log("✓ Current user vote name matches expected display name");
        } else {
          console.warn(`⚠️ Current user vote name mismatch: expected "${expectedData.expectedDisplayName}", got "${voteName}"`);
        }
        
        if (voteInitials === expectedData.expectedInitials) {
          console.log("✓ Current user vote initials match expected initials");
        } else {
          console.warn(`⚠️ Current user vote initials mismatch: expected "${expectedData.expectedInitials}", got "${voteInitials}"`);
        }
      }
      
      // Check avatar styling consistency
      const hasGradient = avatarEl.classList.contains('bg-gradient-to-br');
      const hasBlueTopurple = avatarEl.classList.contains('from-blue-500') && avatarEl.classList.contains('to-purple-600');
      
      if (hasGradient && hasBlueTopurple) {
        console.log("✓ Avatar uses consistent gradient styling");
      } else {
        console.warn("⚠️ Avatar styling doesn't match header avatar styling");
      }
    }
  });
};

// Run checks when script is loaded
const expectedData = checkUserAuth();
setTimeout(() => {
  console.log("\n=== Checking Header Display ===");
  const headerData = checkHeaderDisplay(expectedData);
  
  console.log("\n=== Checking Team Votes Display ===");
  checkTeamVotes(expectedData);
  
  console.log("\n=== Verification Complete ===");
  if (expectedData && headerData) {
    console.log("Summary:");
    console.log(`Expected: Name="${expectedData.expectedDisplayName}", Initials="${expectedData.expectedInitials}"`);
    console.log(`Header: Name="${headerData.headerName}", Initials="${headerData.headerInitials}"`);
    console.log("Check the individual vote entries above for team votes consistency");
  }
  console.log("If you don't see warnings about fallback names or mismatches, the fix is working!");
}, 2000); // Wait for UI to load

// Add to global scope so it can be run from console
window.verifyUserDisplay = () => {
  console.log("\n=== Manual Verification Triggered ===");
  const expectedData = checkUserAuth();
  console.log("\n=== Checking Header Display ===");
  const headerData = checkHeaderDisplay(expectedData);
  console.log("\n=== Checking Team Votes Display ===");
  checkTeamVotes(expectedData);
  console.log("=== Manual Verification Complete ===");
};

console.log("You can run window.verifyUserDisplay() in the console to check again at any time");

// Additional function to monitor broadcast events
window.monitorBroadcasts = () => {
  console.log("=== Monitoring Broadcast Events ===");
  console.log("This will intercept and log vote broadcasting to verify consistent naming");
  
  // Hook into WebSocket or Supabase events if possible
  // Note: This is a development/debugging tool
  const originalLog = console.log;
  console.log = function(...args) {
    // Look for broadcast-related logs
    const message = args.join(' ');
    if (message.includes('broadcast') || message.includes('vote') || message.includes('payload')) {
      originalLog.apply(console, ['🔔 BROADCAST:', ...args]);
    } else {
      originalLog.apply(console, args);
    }
  };
  
  console.log("Broadcast monitoring enabled. Vote on an item to see the broadcast payload.");
  console.log("Look for voterName in the payload - it should NOT contain 'User 1234' patterns");
};
