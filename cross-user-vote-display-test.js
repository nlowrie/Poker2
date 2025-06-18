// Cross-User Vote Display Test
// This test specifically verifies that votes from one user appear in another user's interface

console.log('🎯 CROSS-USER VOTE DISPLAY TEST');
console.log('===============================');

// Test configuration
let testConfig = {
  currentUser: window.user?.email || 'UNKNOWN',
  sessionId: window.sessionId || 'UNKNOWN',
  currentItem: window.sessionItems?.[window.currentItemIndex] || null,
  channelConnected: window.channelSubscribed || false
};

console.log('📋 Test Configuration:', testConfig);

// Track the complete vote flow
let voteFlowLog = [];

function logVoteFlow(step, data = {}) {
  const entry = {
    timestamp: Date.now(),
    step: step,
    data: data,
    user: testConfig.currentUser
  };
  
  voteFlowLog.push(entry);
  console.log(`[${step}]`, data);
}

function monitorCrossUserVoteFlow() {
  console.log('👂 Setting up cross-user vote flow monitoring...');
  
  // Monitor broadcast reception
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    
    if (message.includes('📥 Received vote-submitted broadcast')) {
      logVoteFlow('BROADCAST_RECEIVED', { message });
      
      // Immediately check current vote state
      setTimeout(() => {
        const currentVotes = window.votes || [];
        logVoteFlow('VOTES_STATE_AFTER_BROADCAST', {
          votesCount: currentVotes.length,
          votes: currentVotes.map(v => ({ name: v.userName, points: v.points }))
        });
      }, 50);
    }
    
    if (message.includes('🔍 CROSS-USER VOTE DEBUG')) {
      logVoteFlow('CROSS_USER_PROCESSING', { message });
    }
    
    if (message.includes('✅ CROSS-USER VOTE: Vote refresh completed')) {
      logVoteFlow('VOTE_REFRESH_COMPLETED', { message });
      
      // Check votes state after refresh
      setTimeout(() => {
        const currentVotes = window.votes || [];
        logVoteFlow('VOTES_STATE_AFTER_REFRESH', {
          votesCount: currentVotes.length,
          votes: currentVotes.map(v => ({ name: v.userName, points: v.points }))
        });
        
        // Check DOM elements
        const voteElements = document.querySelectorAll('.space-y-3 > div');
        logVoteFlow('DOM_ELEMENTS_AFTER_REFRESH', {
          elementCount: voteElements.length,
          hasLoadingSpinner: !!document.querySelector('.animate-spin'),
          hasWaitingMessage: !!document.querySelector('[class*="text-center"]')
        });
      }, 100);
    }
    
    if (message.includes('🔍 VOTE RENDERING DEBUG')) {
      logVoteFlow('VOTE_RENDERING', { message });
    }
    
    if (message.includes('🔍 RENDERING VOTE:')) {
      logVoteFlow('INDIVIDUAL_VOTE_RENDER', { message });
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
  
  logVoteFlow('MONITORING_STARTED', { user: testConfig.currentUser });
}

function checkCurrentVoteDisplay() {
  console.log('\n🔍 CHECKING CURRENT VOTE DISPLAY');
  console.log('=================================');
  
  const currentVotes = window.votes || [];
  const votesLoading = window.votesLoading || false;
  
  logVoteFlow('CURRENT_STATE_CHECK', {
    votesInState: currentVotes.length,
    votesLoading: votesLoading,
    votes: currentVotes.map(v => ({
      userId: v.userId,
      userName: v.userName,
      points: v.points,
      canEdit: v.canEdit
    }))
  });
  
  // Check DOM representation
  const teamVotesSection = document.querySelector('.space-y-3');
  if (teamVotesSection) {
    const voteElements = teamVotesSection.children;
    const loadingElement = teamVotesSection.querySelector('.animate-spin');
    const waitingElement = teamVotesSection.querySelector('[class*="text-center"]');
    
    logVoteFlow('DOM_STATE_CHECK', {
      teamVotesSectionFound: true,
      voteElementsCount: voteElements.length,
      hasLoadingSpinner: !!loadingElement,
      hasWaitingMessage: !!waitingElement,
      waitingMessageText: waitingElement?.textContent?.trim()
    });
    
    // Analyze each vote element
    Array.from(voteElements).forEach((element, index) => {
      if (!element.querySelector('.animate-spin') && !element.querySelector('[class*="text-center"]')) {
        const userNameElement = element.querySelector('.font-medium');
        const userName = userNameElement?.textContent?.trim();
        
        logVoteFlow('VOTE_ELEMENT_ANALYSIS', {
          elementIndex: index,
          userName: userName,
          elementHtml: element.outerHTML.substring(0, 200) + '...'
        });
      }
    });
  } else {
    logVoteFlow('DOM_STATE_CHECK', {
      teamVotesSectionFound: false,
      error: 'Team votes section not found in DOM'
    });
  }
}

function simulateCrossUserVote() {
  console.log('\n🧪 SIMULATING CROSS-USER VOTE SCENARIO');
  console.log('======================================');
  
  // This function helps simulate the scenario manually
  console.log('📝 MANUAL TEST STEPS:');
  console.log('1. Make sure you have this test running in BOTH user tabs (nicholas and testmod)');
  console.log('2. In nicholas.d.lowrie tab: Vote on the current item');
  console.log('3. In testmod tab: Watch the console for vote flow logs');
  console.log('4. Check if nicholas vote appears in testmod Team Votes section');
  console.log('');
  console.log('🔍 Expected Flow:');
  console.log('  nicholas votes → broadcast sent → testmod receives broadcast → votes refreshed → nicholas vote appears in testmod UI');
}

function analyzeVoteDisplayIssue() {
  console.log('\n📊 VOTE DISPLAY ISSUE ANALYSIS');
  console.log('==============================');
  
  const recentLogs = voteFlowLog.slice(-10);
  const currentVotes = window.votes || [];
  
  console.log('📋 Recent Vote Flow Events:');
  recentLogs.forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.step} (${new Date(entry.timestamp).toLocaleTimeString()})`);
    if (entry.data && Object.keys(entry.data).length > 0) {
      console.log('   Data:', entry.data);
    }
  });
  
  console.log('\n🔍 Current State Analysis:');
  console.log('- Votes in React state:', currentVotes.length);
  console.log('- Current user:', testConfig.currentUser);
  
  if (currentVotes.length > 0) {
    console.log('- Vote details:');
    currentVotes.forEach((vote, index) => {
      console.log(`  ${index + 1}. ${vote.userName} - ${vote.points} points (${vote.userId})`);
    });
  }
  
  // Check for common issues
  console.log('\n💡 Issue Analysis:');
  
  const hasBroadcastReceived = recentLogs.some(log => log.step === 'BROADCAST_RECEIVED');
  const hasVoteRefresh = recentLogs.some(log => log.step === 'VOTE_REFRESH_COMPLETED');
  const hasVoteRendering = recentLogs.some(log => log.step === 'VOTE_RENDERING');
  
  if (!hasBroadcastReceived) {
    console.log('❌ No broadcasts received - check channel connection');
  } else if (!hasVoteRefresh) {
    console.log('❌ Broadcast received but vote refresh not completed');
  } else if (!hasVoteRendering) {
    console.log('❌ Vote refresh completed but votes not rendering');
  } else if (currentVotes.length === 0) {
    console.log('❌ Vote flow completed but no votes in state');
  } else {
    console.log('✅ Vote flow appears to be working');
    console.log('   Issue might be in final UI rendering or vote filtering');
  }
}

function generateCrossUserTestReport() {
  console.log('\n🏆 CROSS-USER VOTE DISPLAY TEST REPORT');
  console.log('======================================');
  
  const currentVotes = window.votes || [];
  const otherUserVotes = currentVotes.filter(vote => 
    vote.userId !== window.user?.id
  );
  
  const report = {
    'Test User': testConfig.currentUser,
    'Session ID': testConfig.sessionId,
    'Channel Connected': testConfig.channelConnected,
    'Total Votes in State': currentVotes.length,
    'Other User Votes': otherUserVotes.length,
    'Vote Flow Events': voteFlowLog.length
  };
  
  console.table(report);
  
  if (otherUserVotes.length > 0) {
    console.log('✅ SUCCESS: Other user votes are visible');
    console.log('Other user votes:');
    otherUserVotes.forEach(vote => {
      console.log(`  - ${vote.userName}: ${vote.points} points`);
    });
  } else {
    console.log('❌ ISSUE: No other user votes visible');
    
    if (currentVotes.length === 0) {
      console.log('   No votes at all in state');
    } else {
      console.log('   Only own votes in state:');
      currentVotes.forEach(vote => {
        console.log(`  - ${vote.userName}: ${vote.points} points (own: ${vote.canEdit})`);
      });
    }
  }
  
  // Show recent vote flow
  console.log('\n📈 Recent Vote Flow:');
  voteFlowLog.slice(-5).forEach((entry, index) => {
    console.log(`${index + 1}. ${entry.step} (${new Date(entry.timestamp).toLocaleTimeString()})`);
  });
}

// Auto-start the test
function runCrossUserVoteDisplayTest() {
  console.log('🚀 Starting Cross-User Vote Display Test...');
  
  monitorCrossUserVoteFlow();
  
  // Initial state check
  setTimeout(() => {
    checkCurrentVoteDisplay();
  }, 1000);
  
  // Show instructions
  setTimeout(() => {
    simulateCrossUserVote();
  }, 2000);
  
  // Generate analysis after 30 seconds
  setTimeout(() => {
    analyzeVoteDisplayIssue();
  }, 30000);
  
  // Generate final report after 45 seconds
  setTimeout(() => {
    generateCrossUserTestReport();
  }, 45000);
  
  console.log('✅ Cross-user vote display test is running...');
  console.log('📝 Test will generate reports in 30 and 45 seconds');
}

// Export functions
window.runCrossUserVoteDisplayTest = runCrossUserVoteDisplayTest;
window.checkCurrentVoteDisplay = checkCurrentVoteDisplay;
window.analyzeVoteDisplayIssue = analyzeVoteDisplayIssue;
window.generateCrossUserTestReport = generateCrossUserTestReport;

console.log('✅ Cross-User Vote Display Test Loaded');
console.log('🚀 Run runCrossUserVoteDisplayTest() to start monitoring');
console.log('🔍 Run checkCurrentVoteDisplay() to check current state');
console.log('📊 Run analyzeVoteDisplayIssue() to analyze recent events');

// Auto-start
runCrossUserVoteDisplayTest();
