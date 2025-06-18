/**
 * Test to verify that the first vote from user A appears in the Team Votes section for user B immediately
 */

console.log('🎯 Starting First Vote Display Test');
console.log('📋 This test will verify that when user A votes first, their vote appears in Team Votes for user B');

// Test state
let testState = {
  user1VoteSubmitted: false,
  user2VotesUpdated: false,
  user1VoteVisibleToUser2: false,
  testCompleted: false
};

// Vote monitoring for both users
const monitorVoteDisplay = () => {
  const teamVotesSection = document.querySelector('.space-y-3');
  
  if (!teamVotesSection) {
    console.log('⚠️ Team Votes section not found');
    return;
  }

  const voteElements = teamVotesSection.querySelectorAll('.flex.items-center.justify-between.p-3');
  console.log(`🔍 Current votes displayed: ${voteElements.length}`);
  
  // Check for specific users
  const userVotes = Array.from(voteElements).map(el => {
    const nameElement = el.querySelector('.font-medium.text-gray-900');
    const pointsElement = el.querySelector('.px-3.py-1.rounded-lg.font-bold');
    return {
      name: nameElement ? nameElement.textContent : 'Unknown',
      points: pointsElement ? pointsElement.textContent : 'No points',
      isRevealed: pointsElement && !pointsElement.textContent.includes('?')
    };
  });
  
  console.log('👥 Current vote display:', userVotes);
  
  // Check if nicholas.d.lowrie's vote is visible
  const nicholasVote = userVotes.find(v => v.name === 'nicholas.d.lowrie');
  if (nicholasVote) {
    console.log('✅ Nicholas vote is visible in Team Votes');
    testState.user1VoteVisibleToUser2 = true;
  } else {
    console.log('❌ Nicholas vote is NOT visible in Team Votes');
  }
  
  return userVotes;
};

// Monitor vote submission events
const originalConsoleLog = console.log;
console.log = function(...args) {
  const logText = args.join(' ');
  
  // Detect vote submission
  if (logText.includes('🗳️ Vote submitted successfully')) {
    console.log('🎯 DETECTED: Vote submission completed');
    testState.user1VoteSubmitted = true;
  }
  
  // Detect vote loading
  if (logText.includes('✅ CROSS-USER VOTE: Vote refresh completed')) {
    console.log('🎯 DETECTED: Cross-user vote refresh completed');
    testState.user2VotesUpdated = true;
    
    // Give a moment for UI to update, then check
    setTimeout(() => {
      console.log('🔍 Checking if first vote is visible after refresh...');
      monitorVoteDisplay();
      
      if (testState.user1VoteVisibleToUser2) {
        console.log('🎉 SUCCESS: First vote is visible in Team Votes section');
      } else {
        console.log('❌ ISSUE: First vote is NOT visible in Team Votes section');
      }
      
      testState.testCompleted = true;
    }, 500);
  }
  
  // Detect broadcast reception
  if (logText.includes('📥 Received vote-submitted broadcast')) {
    console.log('🎯 DETECTED: Vote broadcast received by other user');
  }
  
  return originalConsoleLog.apply(console, args);
};

// Set up mutation observer for Team Votes section
const observeTeamVotes = () => {
  const targetNode = document.querySelector('.space-y-3');
  
  if (!targetNode) {
    console.log('⚠️ Team Votes section not found, retrying in 1 second...');
    setTimeout(observeTeamVotes, 1000);
    return;
  }
  
  console.log('👀 Setting up mutation observer for Team Votes section');
  
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        console.log('🔄 Team Votes section updated - new votes added');
        monitorVoteDisplay();
      }
    });
  });
  
  observer.observe(targetNode, {
    childList: true,
    subtree: true
  });
  
  console.log('✅ Mutation observer set up for Team Votes section');
};

// Initial setup
console.log('🚀 Setting up first vote display test...');
console.log('📝 Test Instructions:');
console.log('1. Open this page as user A (nicholas.d.lowrie)');
console.log('2. Open another tab/browser as user B (testmod)');
console.log('3. As user A, vote on the current item');
console.log('4. Watch the console in user B\'s tab to see if the vote appears immediately');

// Start monitoring
observeTeamVotes();
monitorVoteDisplay();

// Periodic status check
const statusInterval = setInterval(() => {
  if (testState.testCompleted) {
    clearInterval(statusInterval);
    console.log('🏁 Test completed');
    console.log('📊 Final Test Results:');
    console.log(`   User 1 Vote Submitted: ${testState.user1VoteSubmitted}`);
    console.log(`   User 2 Votes Updated: ${testState.user2VotesUpdated}`);
    console.log(`   User 1 Vote Visible to User 2: ${testState.user1VoteVisibleToUser2}`);
    
    if (testState.user1VoteVisibleToUser2) {
      console.log('🎉 TEST PASSED: First vote display is working correctly');
    } else {
      console.log('❌ TEST FAILED: First vote is not displaying immediately');
    }
    return;
  }
  
  console.log('⏳ Test Status:', testState);
}, 10000);

// Cleanup function
window.cleanupFirstVoteTest = () => {
  clearInterval(statusInterval);
  console.log = originalConsoleLog;
  console.log('🧹 First vote display test cleaned up');
};

console.log('🎯 First Vote Display Test is running...');
console.log('💡 To stop the test, run: cleanupFirstVoteTest()');
