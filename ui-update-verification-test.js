// Real-Time UI Update Verification Test
// This test checks if the UI is actually updating when votes are received

console.log('🔍 REAL-TIME UI UPDATE VERIFICATION TEST');
console.log('======================================');

// Test configuration
const testConfig = {
  currentUser: window.user?.email || 'UNKNOWN',
  sessionId: window.sessionId || 'UNKNOWN',
  currentItem: window.sessionItems?.[window.currentItemIndex]?.id || 'UNKNOWN'
};

console.log('📋 Test Configuration:', testConfig);

// Track UI changes
let uiChangeLog = [];
let initialTeamVotesContent = null;

function captureInitialUIState() {
  console.log('📸 Capturing initial UI state...');
  
  // Find team votes section
  const teamVotesSelectors = [
    '[data-testid="team-votes"]',
    '.team-votes',
    '.vote-summary',
    '.voting-results',
    '.votes-list'
  ];
  
  let teamVotesElement = null;
  for (const selector of teamVotesSelectors) {
    teamVotesElement = document.querySelector(selector);
    if (teamVotesElement) {
      console.log(`✅ Found team votes element with selector: ${selector}`);
      break;
    }
  }
  
  if (!teamVotesElement) {
    // Try to find by text content
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.textContent?.includes('Team Votes') || 
          element.textContent?.includes('Votes:') ||
          element.textContent?.includes('nicholas.d.lowrie') ||
          element.textContent?.includes('testmod')) {
        teamVotesElement = element;
        console.log('✅ Found team votes element by text content');
        break;
      }
    }
  }
  
  if (teamVotesElement) {
    initialTeamVotesContent = teamVotesElement.textContent;
    console.log('📋 Initial team votes content:', initialTeamVotesContent);
    
    // Set up a mutation observer to watch for changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' || mutation.type === 'characterData') {
          const newContent = teamVotesElement.textContent;
          if (newContent !== initialTeamVotesContent) {
            console.log('🔄 TEAM VOTES UI UPDATED!');
            console.log('📋 Old content:', initialTeamVotesContent);
            console.log('📋 New content:', newContent);
            
            uiChangeLog.push({
              timestamp: Date.now(),
              oldContent: initialTeamVotesContent,
              newContent: newContent,
              changeType: 'UI_UPDATE'
            });
            
            initialTeamVotesContent = newContent;
          }
        }
      });
    });
    
    observer.observe(teamVotesElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
    
    console.log('👁️ UI mutation observer set up successfully');
    
    // Clean up after 60 seconds
    setTimeout(() => {
      observer.disconnect();
      console.log('🧹 UI mutation observer cleaned up');
    }, 60000);
    
    return teamVotesElement;
  } else {
    console.error('❌ Could not find team votes element in DOM');
    console.log('🔍 Available elements with text content:');
    
    // List elements that might contain votes
    const allElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && el.textContent.trim().length > 0)
      .slice(0, 20); // Show first 20 elements
      
    allElements.forEach((el, index) => {
      const text = el.textContent.trim().substring(0, 100);
      console.log(`${index + 1}. ${el.tagName}: ${text}...`);
    });
    
    return null;
  }
}

function monitorVoteBroadcasts() {
  console.log('👂 Monitoring real-time vote broadcasts and UI updates...');
  
  // Enhanced logging to capture broadcast events
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Capture when votes are received
    if (message.includes('📥 Received vote-submitted broadcast') || 
        message.includes('📥 Received vote-changed broadcast')) {
      console.log('🎯 VOTE BROADCAST RECEIVED - Checking UI...');
      
      // Check UI after a short delay to allow for updates
      setTimeout(() => {
        checkCurrentUIState();
      }, 1000);
    }
    
    // Capture when votes are loaded
    if (message.includes('🔍 Loaded') && message.includes('votes for item')) {
      console.log('📊 VOTES LOADED - Checking UI...');
      
      setTimeout(() => {
        checkCurrentUIState();
      }, 500);
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
}

function checkCurrentUIState() {
  console.log('🔍 Checking current UI state...');
  
  // Find all elements that might contain vote information
  const voteElements = document.querySelectorAll('*');
  const voteContent = [];
  
  voteElements.forEach(element => {
    const text = element.textContent;
    if (text && (
      text.includes('nicholas.d.lowrie') ||
      text.includes('testmod') ||
      text.includes('Team Votes') ||
      text.includes('Vote:') ||
      text.includes('Points:') ||
      (text.match(/\b\d+\b/) && text.length < 50) // Short text with numbers
    )) {
      voteContent.push({
        tag: element.tagName,
        text: text.trim().substring(0, 100),
        classes: element.className
      });
    }
  });
  
  if (voteContent.length > 0) {
    console.log('📋 Current vote-related UI content:');
    console.table(voteContent);
  } else {
    console.log('❌ No vote-related content found in UI');
  }
  
  // Check React state if available
  if (window.votes) {
    console.log('📊 React votes state:', window.votes);
  }
}

function testUIUpdate() {
  console.log('🧪 Testing UI update detection...');
  
  // Simulate a vote by calling the vote function if available
  if (window.handleVote) {
    console.log('🗳️ Simulating vote to test UI updates...');
    
    // Capture UI state before vote
    const beforeState = captureCurrentVoteElements();
    console.log('📸 UI state before vote:', beforeState);
    
    // Submit a test vote
    window.handleVote('13').then(() => {
      console.log('✅ Test vote submitted');
      
      // Check UI state after vote
      setTimeout(() => {
        const afterState = captureCurrentVoteElements();
        console.log('📸 UI state after vote:', afterState);
        
        // Compare states
        if (JSON.stringify(beforeState) !== JSON.stringify(afterState)) {
          console.log('✅ UI UPDATED after vote!');
        } else {
          console.log('❌ UI did NOT update after vote');
        }
      }, 2000);
    }).catch(error => {
      console.error('❌ Test vote failed:', error);
    });
  } else {
    console.log('❌ handleVote function not available');
  }
}

function captureCurrentVoteElements() {
  const voteElements = [];
  
  // Look for common vote display patterns
  const selectors = [
    '[data-testid*="vote"]',
    '[class*="vote"]',
    '[class*="team"]',
    '.user-vote',
    '.team-vote',
    '.vote-card',
    '.vote-display'
  ];
  
  selectors.forEach(selector => {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      if (el.textContent && el.textContent.trim().length > 0) {
        voteElements.push({
          selector: selector,
          text: el.textContent.trim(),
          classes: el.className
        });
      }
    });
  });
  
  return voteElements;
}

function generateUITestReport() {
  console.log('\n🏆 UI UPDATE VERIFICATION REPORT');
  console.log('================================');
  
  const report = {
    'Test Duration': 'Real-time (ongoing)',
    'UI Changes Detected': uiChangeLog.length,
    'Initial Content Found': initialTeamVotesContent ? 'Yes' : 'No',
    'Mutation Observer Active': 'Yes',
    'Current User': testConfig.currentUser,
    'Session ID': testConfig.sessionId
  };
  
  console.table(report);
  
  if (uiChangeLog.length > 0) {
    console.log('✅ UI updates were detected:');
    console.table(uiChangeLog);
  } else {
    console.log('❌ No UI updates detected');
    console.log('💡 This could mean:');
    console.log('   - UI is not updating when broadcasts are received');
    console.log('   - Vote elements are not in the expected DOM structure');
    console.log('   - React state updates are not triggering re-renders');
  }
  
  // Show current vote elements
  checkCurrentUIState();
}

// Auto-run the test
function runUIVerificationTest() {
  console.log('🚀 Starting UI Verification Test...');
  
  const teamVotesElement = captureInitialUIState();
  
  if (teamVotesElement) {
    monitorVoteBroadcasts();
    
    // Generate report after 30 seconds
    setTimeout(() => {
      generateUITestReport();
    }, 30000);
    
    console.log('✅ UI verification test is running...');
    console.log('📝 Test will generate a report in 30 seconds');
    console.log('🗳️ Try voting in another tab to see if UI updates are detected');
  } else {
    console.log('❌ Could not set up UI verification test - team votes element not found');
  }
}

// Export functions
window.runUIVerificationTest = runUIVerificationTest;
window.checkCurrentUIState = checkCurrentUIState;
window.testUIUpdate = testUIUpdate;
window.generateUITestReport = generateUITestReport;

console.log('✅ Real-Time UI Update Verification Test Loaded');
console.log('🚀 Run runUIVerificationTest() to start monitoring UI updates');
console.log('🔍 Run checkCurrentUIState() to see current vote display');
console.log('🧪 Run testUIUpdate() to simulate a vote and test UI updates');

// Auto-run
runUIVerificationTest();
