/**
 * Comprehensive First Vote Test
 * This test monitors the complete flow of the first vote submission and display
 */

console.log('🎯 Starting Comprehensive First Vote Test');

// Enhanced test state tracking
const testState = {
  // Vote submission tracking
  voteSubmissionStarted: false,
  voteSubmissionCompleted: false,
  voteSubmissionError: null,
  
  // Database operations
  databaseWriteCompleted: false,
  localVoteRefreshCompleted: false,
  
  // Broadcasting
  broadcastSent: false,
  broadcastReceived: false,
  broadcastError: null,
  
  // Cross-user updates
  crossUserVoteRefreshStarted: false,
  crossUserVoteRefreshCompleted: false,
  
  // UI updates
  teamVotesSectionUpdated: false,
  firstVoteVisible: false,
  
  // Timestamps
  timestamps: {}
};

// Helper function to add timestamp
const addTimestamp = (event) => {
  testState.timestamps[event] = new Date().toISOString();
  console.log(`⏰ ${event}: ${testState.timestamps[event]}`);
};

// Monitor Team Votes section
const checkTeamVotesSection = () => {
  const teamVotesSection = document.querySelector('.space-y-3');
  
  if (!teamVotesSection) {
    console.log('⚠️ Team Votes section not found');
    return { found: false, votes: [] };
  }

  const voteElements = teamVotesSection.querySelectorAll('.flex.items-center.justify-between.p-3');
  const votes = Array.from(voteElements).map(el => {
    const nameElement = el.querySelector('.font-medium.text-gray-900');
    const pointsElement = el.querySelector('.px-3.py-1.rounded-lg.font-bold');
    const timestampElement = el.querySelector('.text-xs.text-gray-400');
    
    return {
      name: nameElement ? nameElement.textContent.trim() : 'Unknown',
      points: pointsElement ? pointsElement.textContent.trim() : 'No points',
      timestamp: timestampElement ? timestampElement.textContent.trim() : 'No timestamp',
      isRevealed: pointsElement && !pointsElement.textContent.includes('?')
    };
  });
  
  console.log(`🔍 Team Votes Section Check: ${votes.length} votes found`);
  votes.forEach((vote, index) => {
    console.log(`   Vote ${index + 1}: ${vote.name} - ${vote.points} (${vote.timestamp})`);
  });
  
  // Check if nicholas.d.lowrie's vote is visible
  const nicholasVote = votes.find(v => v.name === 'nicholas.d.lowrie');
  if (nicholasVote && !testState.firstVoteVisible) {
    testState.firstVoteVisible = true;
    addTimestamp('first_vote_visible_in_ui');
    console.log('🎉 SUCCESS: Nicholas vote is now visible in Team Votes!');
  }
  
  return { found: true, votes };
};

// Enhanced console logging interceptor
const originalConsoleLog = console.log;
console.log = function(...args) {
  const logText = args.join(' ');
  
  // Track vote submission flow
  if (logText.includes('🗳️ Submitting vote')) {
    testState.voteSubmissionStarted = true;
    addTimestamp('vote_submission_started');
  }
  
  if (logText.includes('🗳️ Vote submitted successfully')) {
    testState.voteSubmissionCompleted = true;
    addTimestamp('vote_submission_completed');
  }
  
  if (logText.includes('Loading votes for item')) {
    if (testState.voteSubmissionStarted && !testState.localVoteRefreshCompleted) {
      addTimestamp('local_vote_refresh_started');
    } else if (testState.broadcastReceived && !testState.crossUserVoteRefreshCompleted) {
      testState.crossUserVoteRefreshStarted = true;
      addTimestamp('cross_user_vote_refresh_started');
    }
  }
  
  if (logText.includes('Loaded') && logText.includes('votes for item')) {
    if (testState.voteSubmissionStarted && !testState.localVoteRefreshCompleted) {
      testState.localVoteRefreshCompleted = true;
      addTimestamp('local_vote_refresh_completed');
    } else if (testState.crossUserVoteRefreshStarted && !testState.crossUserVoteRefreshCompleted) {
      testState.crossUserVoteRefreshCompleted = true;
      addTimestamp('cross_user_vote_refresh_completed');
    }
  }
  
  // Track broadcasting
  if (logText.includes('✅ Vote broadcast sent successfully')) {
    testState.broadcastSent = true;
    addTimestamp('broadcast_sent');
  }
  
  if (logText.includes('📥 Received vote-submitted broadcast')) {
    testState.broadcastReceived = true;
    addTimestamp('broadcast_received');
  }
  
  if (logText.includes('❌ Vote broadcast failed')) {
    testState.broadcastError = logText;
    addTimestamp('broadcast_error');
  }
  
  if (logText.includes('✅ CROSS-USER VOTE: Vote refresh completed')) {
    addTimestamp('cross_user_refresh_completed');
    
    // Check UI after a brief delay
    setTimeout(() => {
      console.log('🔍 Checking UI after cross-user vote refresh...');
      checkTeamVotesSection();
    }, 200);
  }
  
  // Track UI updates
  if (logText.includes('🔄 Team Votes section updated')) {
    testState.teamVotesSectionUpdated = true;
    addTimestamp('team_votes_section_updated');
    
    // Check the current state
    setTimeout(() => checkTeamVotesSection(), 100);
  }
  
  return originalConsoleLog.apply(console, args);
};

// Set up mutation observer for Team Votes section
const setupMutationObserver = () => {
  const targetNode = document.querySelector('.space-y-3');
  
  if (!targetNode) {
    console.log('⚠️ Team Votes section not found, retrying in 1 second...');
    setTimeout(setupMutationObserver, 1000);
    return;
  }
  
  console.log('👀 Setting up mutation observer for Team Votes section');
  
  const observer = new MutationObserver((mutations) => {
    let hasChanges = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && 
          (mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0)) {
        hasChanges = true;
      }
    });
    
    if (hasChanges) {
      console.log('🔄 Team Votes section updated - DOM changes detected');
      testState.teamVotesSectionUpdated = true;
      addTimestamp('dom_mutation_detected');
      
      // Check the updated content
      setTimeout(() => checkTeamVotesSection(), 50);
    }
  });
  
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Mutation observer set up successfully');
  return observer;
};

// Test monitoring and reporting
const generateReport = () => {
  console.log('\n📊 COMPREHENSIVE FIRST VOTE TEST REPORT');
  console.log('═══════════════════════════════════════════');
  
  console.log('\n🔄 VOTE SUBMISSION FLOW:');
  console.log(`   Started: ${testState.voteSubmissionStarted ? '✅' : '❌'}`);
  console.log(`   Completed: ${testState.voteSubmissionCompleted ? '✅' : '❌'}`);
  console.log(`   Local Refresh: ${testState.localVoteRefreshCompleted ? '✅' : '❌'}`);
  
  console.log('\n📡 BROADCASTING FLOW:');
  console.log(`   Broadcast Sent: ${testState.broadcastSent ? '✅' : '❌'}`);
  console.log(`   Broadcast Received: ${testState.broadcastReceived ? '✅' : '❌'}`);
  console.log(`   Cross-User Refresh Started: ${testState.crossUserVoteRefreshStarted ? '✅' : '❌'}`);
  console.log(`   Cross-User Refresh Completed: ${testState.crossUserVoteRefreshCompleted ? '✅' : '❌'}`);
  
  console.log('\n🎨 UI UPDATE FLOW:');
  console.log(`   Team Votes Section Updated: ${testState.teamVotesSectionUpdated ? '✅' : '❌'}`);
  console.log(`   First Vote Visible: ${testState.firstVoteVisible ? '✅' : '❌'}`);
  
  console.log('\n⏰ TIMELINE:');
  Object.entries(testState.timestamps).forEach(([event, timestamp]) => {
    console.log(`   ${event}: ${new Date(timestamp).toLocaleTimeString()}.${new Date(timestamp).getMilliseconds()}`);
  });
  
  if (testState.broadcastError) {
    console.log('\n❌ ERRORS:');
    console.log(`   Broadcast Error: ${testState.broadcastError}`);
  }
  
  // Final assessment
  console.log('\n🎯 FINAL ASSESSMENT:');
  if (testState.firstVoteVisible) {
    console.log('   🎉 TEST PASSED: First vote is displaying correctly');
  } else if (testState.crossUserVoteRefreshCompleted) {
    console.log('   ⚠️ TEST PARTIAL: Vote refresh completed but UI not updated');
  } else if (testState.broadcastReceived) {
    console.log('   ⚠️ TEST PARTIAL: Broadcast received but refresh not completed');
  } else if (testState.broadcastSent) {
    console.log('   ⚠️ TEST PARTIAL: Broadcast sent but not received');
  } else {
    console.log('   ❌ TEST FAILED: Vote flow not working correctly');
  }
  
  console.log('═══════════════════════════════════════════\n');
};

// Start the test
console.log('🚀 Setting up comprehensive first vote test...');
console.log('📝 Test Instructions:');
console.log('1. Open this page as user A (nicholas.d.lowrie) in one tab');
console.log('2. Open the same session as user B (testmod) in another tab');
console.log('3. Have user A vote first while watching user B\'s console');
console.log('4. The test will track the complete flow and generate a report');

// Initial setup
const observer = setupMutationObserver();
checkTeamVotesSection();

// Generate periodic reports
let reportInterval = setInterval(() => {
  if (testState.firstVoteVisible || 
      (testState.voteSubmissionStarted && 
       Date.now() - new Date(testState.timestamps.vote_submission_started || 0).getTime() > 10000)) {
    generateReport();
    clearInterval(reportInterval);
  }
}, 5000);

// Cleanup function
window.cleanupComprehensiveFirstVoteTest = () => {
  clearInterval(reportInterval);
  if (observer) observer.disconnect();
  console.log = originalConsoleLog;
  generateReport();
  console.log('🧹 Comprehensive first vote test cleaned up');
};

console.log('🎯 Comprehensive First Vote Test is running...');
console.log('💡 To stop the test and get final report, run: cleanupComprehensiveFirstVoteTest()');
