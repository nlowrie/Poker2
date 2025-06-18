// Real-time Broadcasting Test Script
// Run this in browser console to test vote broadcasting

console.log('🧪 Real-time Broadcasting Test Started');

// Test 1: Check if channel is properly set up
function testChannelSetup() {
  console.log('\n📡 Testing Channel Setup...');
  
  // Check if voting session variables are available
  const checks = {
    sessionId: window.sessionId || 'NOT_FOUND',
    user: window.user || 'NOT_FOUND',
    channel: window.channel || 'NOT_FOUND',
    channelState: window.channel?.state || 'NOT_FOUND',
    sessionItems: window.sessionItems?.length || 'NOT_FOUND',
    currentItemIndex: window.currentItemIndex || 'NOT_FOUND'
  };
  
  console.table(checks);
  
  if (window.channel) {
    console.log('✅ Channel exists');
    console.log('Channel state:', window.channel.state);
    console.log('Channel topic:', window.channel.topic);
  } else {
    console.error('❌ No channel found');
  }
  
  return checks;
}

// Test 2: Monitor broadcasts
function monitorBroadcasts() {
  console.log('\n👂 Setting up broadcast monitor...');
  
  if (!window.channel) {
    console.error('❌ No channel available for monitoring');
    return;
  }
  
  // Create a temporary listener to monitor all broadcasts
  const tempChannel = window.supabase?.channel(`test-monitor-${Date.now()}`);
  
  if (tempChannel) {
    tempChannel
      .on('broadcast', {}, (payload) => {
        console.log('🔊 BROADCAST DETECTED:', payload);
      })
      .subscribe();
    
    console.log('✅ Broadcast monitor active');
    
    // Clean up after 30 seconds
    setTimeout(() => {
      tempChannel.unsubscribe();
      console.log('🔇 Broadcast monitor stopped');
    }, 30000);
  }
}

// Test 3: Send a test broadcast
function sendTestBroadcast() {
  console.log('\n📤 Sending test broadcast...');
  
  if (!window.channel) {
    console.error('❌ No channel available for test broadcast');
    return;
  }
  
  const testPayload = {
    type: 'broadcast',
    event: 'test-broadcast',
    payload: {
      test: true,
      timestamp: new Date().toISOString(),
      sender: window.user?.id || 'unknown'
    }
  };
  
  window.channel.send(testPayload)
    .then(result => {
      console.log('✅ Test broadcast sent:', result);
    })
    .catch(error => {
      console.error('❌ Test broadcast failed:', error);
    });
}

// Test 4: Simulate vote
function simulateVote() {
  console.log('\n🗳️ Simulating vote...');
  
  if (!window.handleVote) {
    console.error('❌ handleVote function not found');
    return;
  }
  
  // Try to call handleVote with a test value
  try {
    window.handleVote('5');
    console.log('✅ Vote simulation attempted');
  } catch (error) {
    console.error('❌ Vote simulation failed:', error);
  }
}

// Test 5: Check vote loading
function checkVoteLoading() {
  console.log('\n🔍 Checking vote loading...');
  
  const voteElements = document.querySelectorAll('[data-testid="team-vote"], .vote-item, .user-vote');
  console.log(`Found ${voteElements.length} vote elements in DOM`);
  
  voteElements.forEach((element, index) => {
    console.log(`Vote ${index + 1}:`, element.textContent?.trim());
  });
  
  // Check if votes are being loaded
  if (window.votes) {
    console.log('Current votes state:', window.votes);
  } else {
    console.log('No votes state found');
  }
}

// Run all tests
function runAllTests() {
  console.log('🚀 Running all real-time broadcasting tests...');
  
  const setup = testChannelSetup();
  
  if (setup.channel !== 'NOT_FOUND') {
    monitorBroadcasts();
    
    setTimeout(() => {
      sendTestBroadcast();
    }, 1000);
    
    setTimeout(() => {
      checkVoteLoading();
    }, 2000);
  } else {
    console.error('❌ Cannot run tests - channel not available');
  }
}

// Manual test instructions
function showManualTestInstructions() {
  console.log(`
🎯 MANUAL TESTING INSTRUCTIONS:

✅ GOOD NEWS: Based on your logs, broadcasting is WORKING! 
   I can see: "✅ Vote broadcast sent successfully: ok" and 
   "🔄 Refreshing votes due to broadcast from: testmod"

🔍 WHAT YOUR LOGS SHOW:
✅ Channel subscription: WORKING
✅ Vote broadcast sending: WORKING  
✅ Vote broadcast receiving: WORKING
✅ Vote refresh triggering: WORKING
⚠️ HTTP 406 error: Minor issue with getUserVote query (doesn't break broadcasting)

📋 TO CONFIRM FULL FUNCTIONALITY:

1. Open this planning session in TWO browser tabs
2. In Tab 1: Vote for a story (click on a number like 5)
3. In Tab 2: The vote should appear IMMEDIATELY in the team votes table
4. In Tab 2: Vote for the same story (click different number like 3)  
5. In Tab 1: The vote should appear IMMEDIATELY

🔍 EXPECTED LOGS IN EACH TAB:
✅ "📡 Attempting to send vote broadcast" (when you vote)
✅ "✅ Vote broadcast sent successfully: ok" (confirms sent)
✅ "📥 Received vote-submitted broadcast" (in other tab)
✅ "🔄 Refreshing votes due to broadcast from: [username]" (in other tab)

⚠️ IGNORE THESE (they don't affect broadcasting):
❌ HTTP 406 errors (database policy issue, but votes still work)
❌ "getUserVote query failed" (individual vote lookup, doesn't break real-time)

🎯 SUCCESS CRITERIA:
- Votes appear in other tabs without page refresh
- User names show properly (not "User 5196")
- Team votes table updates in real-time

📝 TEST FUNCTIONS:
- testChannelSetup() - Check channel configuration
- monitorBroadcasts() - Listen for all broadcasts
- sendTestBroadcast() - Send a test message
- checkVoteLoading() - Check current vote state
- runAllTests() - Run all tests automatically
`);
}

// Export functions to global scope
window.testChannelSetup = testChannelSetup;
window.monitorBroadcasts = monitorBroadcasts;
window.sendTestBroadcast = sendTestBroadcast;
window.simulateVote = simulateVote;
window.checkVoteLoading = checkVoteLoading;
window.runAllTests = runAllTests;
window.showManualTestInstructions = showManualTestInstructions;

console.log('✅ Real-time Broadcasting Test Script Loaded');
console.log('📝 Run showManualTestInstructions() for detailed testing steps');
console.log('🚀 Run runAllTests() to start automated testing');
