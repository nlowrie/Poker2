// Vote Display Issue Diagnostic Test
// This test specifically checks if votes from other users are being displayed correctly

console.log('🔍 VOTE DISPLAY ISSUE DIAGNOSTIC TEST');
console.log('=====================================');

// Track vote state changes
let voteStateHistory = [];
let originalSetVotes = null;

function interceptVoteState() {
  console.log('🔧 Setting up vote state interception...');
  
  // Try to find React's state setter by searching for the setVotes function
  // This is a bit hacky but necessary for debugging
  
  // Monitor votes state changes by observing the votes array
  const checkVotesState = () => {
    if (window.votes) {
      const currentVotes = window.votes;
      const timestamp = Date.now();
      
      // Check if votes changed
      const lastSnapshot = voteStateHistory[voteStateHistory.length - 1];
      const votesChanged = !lastSnapshot || 
        JSON.stringify(lastSnapshot.votes) !== JSON.stringify(currentVotes);
      
      if (votesChanged) {
        console.log('🔄 VOTES STATE CHANGED:', {
          timestamp: new Date(timestamp).toLocaleTimeString(),
          newVotesCount: currentVotes?.length || 0,
          newVotes: currentVotes || [],
          previousVotesCount: lastSnapshot?.votes?.length || 0
        });
        
        voteStateHistory.push({
          timestamp,
          votes: JSON.parse(JSON.stringify(currentVotes || [])),
          context: 'state_check'
        });
        
        // Show detailed vote info
        if (currentVotes && currentVotes.length > 0) {
          console.log('📊 Current votes breakdown:');
          currentVotes.forEach((vote, index) => {
            console.log(`  Vote ${index + 1}:`, {
              userId: vote.userId,
              userName: vote.userName,
              points: vote.points,
              timestamp: vote.timestamp,
              canEdit: vote.canEdit
            });
          });
        } else {
          console.log('📊 No votes in current state');
        }
      }
    }
  };
  
  // Check votes state every 500ms
  setInterval(checkVotesState, 500);
  
  console.log('✅ Vote state monitoring active');
}

function monitorBroadcastToVoteFlow() {
  console.log('👂 Monitoring broadcast-to-vote display flow...');
  
  // Enhanced console.log interception for vote-related events
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Track when broadcasts are received
    if (message.includes('📥 Received vote-submitted broadcast')) {
      console.log('🎯 BROADCAST RECEIVED - Starting vote flow tracking...');
      
      // Capture current votes state
      const currentVotes = window.votes || [];
      voteStateHistory.push({
        timestamp: Date.now(),
        votes: JSON.parse(JSON.stringify(currentVotes)),
        context: 'broadcast_received',
        message: message
      });
      
      // Set up a series of checks to see what happens to votes
      setTimeout(() => checkVoteFlowStep('100ms after broadcast'), 100);
      setTimeout(() => checkVoteFlowStep('500ms after broadcast'), 500);
      setTimeout(() => checkVoteFlowStep('1s after broadcast'), 1000);
      setTimeout(() => checkVoteFlowStep('2s after broadcast'), 2000);
    }
    
    // Track when votes are loaded
    if (message.includes('🔍 Loaded') && message.includes('votes for item')) {
      const votesMatch = message.match(/(\d+) votes/);
      const voteCount = votesMatch ? parseInt(votesMatch[1]) : 0;
      
      console.log('📊 VOTES LOADED - Checking if they appear in UI...', {
        voteCount: voteCount,
        currentVotesState: window.votes?.length || 0
      });
      
      voteStateHistory.push({
        timestamp: Date.now(),
        votes: JSON.parse(JSON.stringify(window.votes || [])),
        context: 'votes_loaded',
        message: message,
        voteCount: voteCount
      });
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
}

function checkVoteFlowStep(step) {
  const currentVotes = window.votes || [];
  
  console.log(`🔍 Vote flow check (${step}):`, {
    votesInState: currentVotes.length,
    votes: currentVotes.map(v => ({
      userName: v.userName,
      userId: v.userId,
      points: v.points
    }))
  });
  
  // Check if votes are in DOM
  const voteElements = document.querySelectorAll('[key]').length || 
                     document.querySelectorAll('.space-y-3 > div').length;
  
  console.log(`🔍 Vote elements in DOM (${step}): ${voteElements}`);
}

function analyzeVoteDisplayIssue() {
  console.log('\n📊 VOTE DISPLAY ISSUE ANALYSIS');
  console.log('==============================');
  
  const currentVotes = window.votes || [];
  const currentUser = window.user;
  
  // Check current state
  console.log('📋 Current State:');
  console.log('  - Votes in React state:', currentVotes.length);
  console.log('  - Current user:', currentUser?.email || 'unknown');
  
  if (currentVotes.length > 0) {
    console.log('  - Vote details:');
    currentVotes.forEach((vote, index) => {
      console.log(`    ${index + 1}. ${vote.userName} (${vote.userId}) - ${vote.points} points`);
    });
  }
  
  // Check DOM elements
  const teamVotesSection = document.querySelector('.space-y-3');
  if (teamVotesSection) {
    const voteElements = teamVotesSection.children.length;
    console.log('  - Vote elements in DOM:', voteElements);
    
    // Check if there's a loading state
    const loadingElement = teamVotesSection.querySelector('.animate-spin');
    if (loadingElement) {
      console.log('  - ⚠️ Loading state detected - votes might be updating');
    }
    
    // Check for "waiting" message
    const waitingElement = teamVotesSection.querySelector('[class*="text-center"]');
    if (waitingElement) {
      console.log('  - ℹ️ Waiting message found:', waitingElement.textContent?.trim());
    }
  } else {
    console.log('  - ❌ Team votes section not found in DOM');
  }
  
  // Check if votes are being filtered out
  console.log('\n🔍 Potential Issues:');
  
  if (currentVotes.length === 0) {
    console.log('  ❌ No votes in React state - issue with vote loading');
  } else if (teamVotesSection && teamVotesSection.children.length === 0) {
    console.log('  ❌ Votes in state but not rendering - issue with React rendering');
  } else {
    console.log('  ✅ Votes appear to be in both state and DOM');
  }
  
  // Analyze vote history
  console.log('\n📈 Vote State History:');
  voteStateHistory.slice(-5).forEach((snapshot, index) => {
    console.log(`  ${index + 1}. ${snapshot.context} (${new Date(snapshot.timestamp).toLocaleTimeString()}): ${snapshot.votes.length} votes`);
  });
}

function simulateVoteDisplayTest() {
  console.log('\n🧪 SIMULATING VOTE DISPLAY TEST');
  console.log('===============================');
  
  // Try to manually trigger a vote display update
  if (window.loadVotesForCurrentItem) {
    console.log('🔄 Manually triggering vote reload...');
    
    window.loadVotesForCurrentItem().then(() => {
      console.log('✅ Manual vote reload completed');
      setTimeout(() => {
        analyzeVoteDisplayIssue();
      }, 1000);
    }).catch(error => {
      console.error('❌ Manual vote reload failed:', error);
    });
  } else {
    console.log('❌ loadVotesForCurrentItem function not available');
  }
}

function generateVoteDisplayReport() {
  console.log('\n🏆 VOTE DISPLAY DIAGNOSTIC REPORT');
  console.log('=================================');
  
  const currentVotes = window.votes || [];
  const currentUser = window.user;
  
  const report = {
    'Current User': currentUser?.email || 'unknown',
    'Votes in State': currentVotes.length,
    'State History Events': voteStateHistory.length,
    'Last State Change': voteStateHistory.length > 0 ? 
      new Date(voteStateHistory[voteStateHistory.length - 1].timestamp).toLocaleTimeString() : 'none'
  };
  
  console.table(report);
  
  // Show vote details
  if (currentVotes.length > 0) {
    console.log('\n📊 Current Votes:');
    console.table(currentVotes.map(vote => ({
      User: vote.userName,
      Points: vote.points,
      Timestamp: vote.timestamp ? new Date(vote.timestamp).toLocaleTimeString() : 'unknown',
      CanEdit: vote.canEdit ? 'Yes' : 'No'
    })));
  }
  
  // Recommendations
  console.log('\n💡 Recommendations:');
  
  if (currentVotes.length === 0) {
    console.log('  1. Check if vote loading is working correctly');
    console.log('  2. Verify database query returns correct data');
    console.log('  3. Check if broadcasts trigger vote reloading');
  } else {
    console.log('  1. Votes are in state - check React rendering');
    console.log('  2. Verify vote display components are not being filtered');
    console.log('  3. Check CSS visibility and display properties');
  }
}

// Auto-start the diagnostic
function runVoteDisplayDiagnostic() {
  console.log('🚀 Starting Vote Display Diagnostic...');
  
  interceptVoteState();
  monitorBroadcastToVoteFlow();
  
  // Initial analysis
  setTimeout(() => {
    analyzeVoteDisplayIssue();
  }, 1000);
  
  // Generate report after 30 seconds
  setTimeout(() => {
    generateVoteDisplayReport();
  }, 30000);
  
  console.log('✅ Vote display diagnostic is running...');
  console.log('📝 Diagnostic will generate a report in 30 seconds');
  console.log('🧪 Run simulateVoteDisplayTest() to manually test vote loading');
}

// Export functions
window.runVoteDisplayDiagnostic = runVoteDisplayDiagnostic;
window.analyzeVoteDisplayIssue = analyzeVoteDisplayIssue;
window.simulateVoteDisplayTest = simulateVoteDisplayTest;
window.generateVoteDisplayReport = generateVoteDisplayReport;

console.log('✅ Vote Display Issue Diagnostic Test Loaded');
console.log('🚀 Run runVoteDisplayDiagnostic() to start monitoring vote display');
console.log('🔍 Run analyzeVoteDisplayIssue() to check current vote state');
console.log('🧪 Run simulateVoteDisplayTest() to manually test vote loading');

// Auto-start
runVoteDisplayDiagnostic();
