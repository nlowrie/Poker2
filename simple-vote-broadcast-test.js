// Simple Vote Broadcasting Test - Focus on Core Issue
// This test isolates the vote broadcasting problem between different users

console.log('🎯 SIMPLE VOTE BROADCASTING TEST');
console.log('===============================');

// Store original functions to restore later
let originalHandleVote = null;
let originalLoadVotesForCurrentItem = null;

// Test state
let testResults = {
  broadcastSent: false,
  broadcastReceived: false,
  votesReloaded: false,
  userDisplayed: false
};

function setupSimpleTest() {
  console.log('🔧 Setting up simple vote broadcasting test...');
  
  // Capture the original functions
  if (window.handleVote) {
    originalHandleVote = window.handleVote;
  }
  
  // Override handleVote to add more logging
  if (originalHandleVote) {
    window.handleVote = async function(value) {
      console.log('🗳️ TEST: Vote submission started for value:', value);
      
      try {
        const result = await originalHandleVote.call(this, value);
        console.log('✅ TEST: Vote submission completed successfully');
        testResults.broadcastSent = true;
        return result;
      } catch (error) {
        console.error('❌ TEST: Vote submission failed:', error);
        throw error;
      }
    };
  }
  
  // Monitor broadcasts more specifically
  if (window.channel) {
    // Remove existing listeners to avoid conflicts
    console.log('🔄 Setting up test broadcast listeners...');
    
    window.channel.on('broadcast', { event: 'vote-submitted' }, (payload) => {
      console.log('📨 TEST: vote-submitted broadcast received:', payload);
      
      if (payload.payload.voterId !== window.user?.id) {
        console.log('🎯 TEST: Cross-user vote broadcast detected!');
        testResults.broadcastReceived = true;
        
        // Check if votes get reloaded
        setTimeout(() => {
          console.log('🔍 TEST: Checking if votes were reloaded...');
          const teamVotesSection = document.querySelector('[data-testid="team-votes"]') || 
                                   document.querySelector('.team-votes') ||
                                   document.querySelectorAll('*').find(el => el.textContent?.includes('Team Votes'));
          
          if (teamVotesSection) {
            console.log('✅ TEST: Team votes section found');
            console.log('📊 TEST: Current team votes content:', teamVotesSection.textContent);
            testResults.votesReloaded = true;
            
            // Check if the voting user's name appears
            const voterName = payload.payload.voterName;
            if (teamVotesSection.textContent.includes(voterName)) {
              console.log('✅ TEST: Voter name found in team votes!');
              testResults.userDisplayed = true;
            } else {
              console.log('❌ TEST: Voter name NOT found in team votes');
              console.log('📋 TEST: Expected name:', voterName);
              console.log('📋 TEST: Actual content:', teamVotesSection.textContent);
            }
          } else {
            console.log('❌ TEST: Team votes section not found');
          }
          
          generateTestReport();
        }, 2000);
      } else {
        console.log('🔄 TEST: Own vote broadcast (expected)');
      }
    });
    
    window.channel.on('broadcast', { event: 'vote-changed' }, (payload) => {
      console.log('📨 TEST: vote-changed broadcast received:', payload);
      
      if (payload.payload.voterId !== window.user?.id) {
        console.log('🎯 TEST: Cross-user vote change broadcast detected!');
        testResults.broadcastReceived = true;
      }
    });
  } else {
    console.error('❌ TEST: No channel available for testing');
  }
  
  console.log('✅ TEST: Setup complete');
}

function generateTestReport() {
  console.log('\n📊 SIMPLE VOTE BROADCASTING TEST RESULTS');
  console.log('========================================');
  
  const results = [
    { Test: 'Broadcast Sent', Status: testResults.broadcastSent ? '✅ PASS' : '❌ FAIL' },
    { Test: 'Broadcast Received', Status: testResults.broadcastReceived ? '✅ PASS' : '❌ FAIL' },
    { Test: 'Votes Reloaded', Status: testResults.votesReloaded ? '✅ PASS' : '❌ FAIL' },
    { Test: 'User Displayed', Status: testResults.userDisplayed ? '✅ PASS' : '❌ FAIL' }
  ];
  
  console.table(results);
  
  const passedTests = Object.values(testResults).filter(Boolean).length;
  const totalTests = Object.keys(testResults).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`\n🏆 Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
  
  if (successRate === '100.0') {
    console.log('🎉 SUCCESS: Vote broadcasting is working perfectly!');
  } else if (passedTests === 0) {
    console.log('💥 CRITICAL: Vote broadcasting is completely broken');
    console.log('🔧 NEXT STEPS:');
    console.log('   1. Check if users are on the same session');
    console.log('   2. Check browser network tab for failed requests');
    console.log('   3. Verify Supabase real-time is enabled');
    console.log('   4. Check database permissions/RLS policies');
  } else {
    console.log('⚠️ PARTIAL: Some parts of vote broadcasting are working');
    
    if (!testResults.broadcastSent) {
      console.log('❌ Issue: Votes are not being sent properly');
    }
    if (!testResults.broadcastReceived) {
      console.log('❌ Issue: Broadcasts are not being received by other users');
    }
    if (!testResults.votesReloaded) {
      console.log('❌ Issue: Votes are not being refreshed when broadcasts are received');
    }
    if (!testResults.userDisplayed) {
      console.log('❌ Issue: User names are not being displayed correctly');
    }
  }
}

function resetTest() {
  console.log('🔄 Resetting test state...');
  
  // Reset test results
  testResults = {
    broadcastSent: false,
    broadcastReceived: false,
    votesReloaded: false,
    userDisplayed: false
  };
  
  // Restore original functions
  if (originalHandleVote) {
    window.handleVote = originalHandleVote;
  }
  
  console.log('✅ Test reset complete');
}

function runSimpleVoteBroadcastTest() {
  console.log('🚀 Starting Simple Vote Broadcasting Test...');
  console.log('');
  console.log('📋 INSTRUCTIONS:');
  console.log('1. Make sure you have TWO USERS logged in to the SAME session');
  console.log('2. Run this function in BOTH user tabs');
  console.log('3. In ONE tab, click a vote button (like 5 or 8)');
  console.log('4. Watch the console in the OTHER tab for test results');
  console.log('5. Results will be generated automatically after 2 seconds');
  console.log('');
  
  setupSimpleTest();
  
  // Auto-reset after 30 seconds to clean up
  setTimeout(() => {
    resetTest();
    console.log('🧹 Test automatically cleaned up after 30 seconds');
  }, 30000);
}

// Export functions
window.runSimpleVoteBroadcastTest = runSimpleVoteBroadcastTest;
window.resetTest = resetTest;
window.generateTestReport = generateTestReport;

console.log('✅ Simple Vote Broadcasting Test Loaded');
console.log('🚀 Run runSimpleVoteBroadcastTest() to start testing');
console.log('🔄 Run resetTest() to clean up if needed');
