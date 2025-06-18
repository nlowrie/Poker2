// Cross-User Broadcasting Diagnostic Test
// This test specifically checks if votes broadcast between different users

console.log('🔬 CROSS-USER BROADCASTING DIAGNOSTIC TEST');
console.log('==========================================');

// Test configuration
const diagnosticConfig = {
  sessionId: window.sessionId || 'unknown',
  currentUserId: window.user?.id || 'unknown',
  currentUserEmail: window.user?.email || 'unknown',
  channelTopic: window.channel?.topic || 'unknown',
  channelState: window.channel?.state || 'unknown'
};

console.log('📋 Current Session Info:');
console.table(diagnosticConfig);

// Test 1: Check if we can send and receive broadcasts in the same tab
function testSameTabBroadcast() {
  console.log('\n🧪 Test 1: Same Tab Broadcast Test');
  
  if (!window.channel) {
    console.error('❌ No channel available');
    return false;
  }
  
  const testPayload = {
    type: 'broadcast',
    event: 'diagnostic-test',
    payload: {
      testId: Date.now(),
      sender: diagnosticConfig.currentUserId,
      senderEmail: diagnosticConfig.currentUserEmail,
      timestamp: new Date().toISOString()
    }
  };
  
  // Set up a temporary listener
  let received = false;
  const tempListener = (payload) => {
    console.log('✅ Same tab broadcast received:', payload);
    received = true;
  };
  
  window.channel.on('broadcast', { event: 'diagnostic-test' }, tempListener);
  
  // Send the broadcast
  window.channel.send(testPayload)
    .then(result => {
      console.log('✅ Same tab broadcast sent:', result);
      
      // Check if received after a short delay
      setTimeout(() => {
        if (received) {
          console.log('✅ Same tab broadcast: WORKING');
        } else {
          console.log('❌ Same tab broadcast: NOT RECEIVED');
        }
        
        // Clean up listener
        window.channel.off('broadcast', { event: 'diagnostic-test' }, tempListener);
      }, 1000);
    })
    .catch(error => {
      console.error('❌ Same tab broadcast failed:', error);
      window.channel.off('broadcast', { event: 'diagnostic-test' }, tempListener);
    });
  
  return true;
}

// Test 2: Monitor for cross-user broadcasts
function monitorCrossUserBroadcasts() {
  console.log('\n👂 Test 2: Cross-User Broadcast Monitor');
  console.log('Listening for broadcasts from other users...');
  
  if (!window.channel) {
    console.error('❌ No channel available for monitoring');
    return;
  }
  
  const monitorStartTime = Date.now();
  let broadcastsReceived = [];
  
  // Listen for vote broadcasts from other users
  const voteListener = (payload) => {
    const { voterId, voterName } = payload.payload;
    
    if (voterId !== diagnosticConfig.currentUserId) {
      console.log('🎯 CROSS-USER VOTE BROADCAST DETECTED:', {
        from_user: voterName,
        from_user_id: voterId,
        current_user_id: diagnosticConfig.currentUserId,
        payload: payload.payload
      });
      
      broadcastsReceived.push({
        type: 'vote',
        from: voterName,
        fromId: voterId,
        timestamp: Date.now(),
        payload: payload.payload
      });
    } else {
      console.log('🔄 Own vote broadcast received (expected)');
    }
  };
  
  window.channel.on('broadcast', { event: 'vote-submitted' }, voteListener);
  window.channel.on('broadcast', { event: 'vote-changed' }, voteListener);
  
  // Report results after 30 seconds
  setTimeout(() => {
    console.log('\n📊 Cross-User Broadcast Monitor Results:');
    console.log(`Monitored for: ${(Date.now() - monitorStartTime) / 1000} seconds`);
    console.log(`Cross-user broadcasts received: ${broadcastsReceived.length}`);
    
    if (broadcastsReceived.length > 0) {
      console.log('✅ Cross-user broadcasting: WORKING');
      console.table(broadcastsReceived);
    } else {
      console.log('❌ Cross-user broadcasting: NO BROADCASTS RECEIVED');
      console.log('💡 This could mean:');
      console.log('   - No other users are voting');
      console.log('   - Broadcasting is not working between users');
      console.log('   - Users are on different channels/sessions');
    }
    
    // Clean up listeners
    window.channel.off('broadcast', { event: 'vote-submitted' }, voteListener);
    window.channel.off('broadcast', { event: 'vote-changed' }, voteListener);
  }, 30000);
}

// Test 3: Send a test vote broadcast to simulate voting
function sendTestVoteBroadcast() {
  console.log('\n📤 Test 3: Send Test Vote Broadcast');
  
  if (!window.channel) {
    console.error('❌ No channel available');
    return;
  }
  
  if (!diagnosticConfig.sessionId || diagnosticConfig.sessionId === 'unknown') {
    console.error('❌ No session ID available');
    return;
  }
  
  const currentItem = window.sessionItems?.[window.currentItemIndex];
  if (!currentItem) {
    console.error('❌ No current item available for test broadcast');
    return;
  }
  
  const testVoteBroadcast = {
    type: 'broadcast',
    event: 'vote-submitted',
    payload: {
      itemId: currentItem.id,
      voterId: diagnosticConfig.currentUserId,
      voterName: diagnosticConfig.currentUserEmail.split('@')[0] || 'Test User',
      voterInitials: 'TU',
      value: '5',
      timestamp: new Date().toISOString(),
      isTest: true
    }
  };
  
  console.log('📡 Sending test vote broadcast:', testVoteBroadcast);
  
  window.channel.send(testVoteBroadcast)
    .then(result => {
      console.log('✅ Test vote broadcast sent successfully:', result);
      console.log('💡 This should trigger vote refresh in other user tabs');
    })
    .catch(error => {
      console.error('❌ Test vote broadcast failed:', error);
      console.error('❌ Channel info:', {
        state: window.channel.state,
        topic: window.channel.topic,
        subscribed: window.channelSubscribed
      });
    });
}

// Test 4: Check channel consistency across tabs
function checkChannelConsistency() {
  console.log('\n🔍 Test 4: Channel Consistency Check');
  
  const channelInfo = {
    exists: !!window.channel,
    state: window.channel?.state,
    topic: window.channel?.topic,
    subscribed: window.channelSubscribed,
    sessionId: diagnosticConfig.sessionId,
    userId: diagnosticConfig.currentUserId,
    userEmail: diagnosticConfig.currentUserEmail
  };
  
  console.log('📋 Current Channel Info:');
  console.table(channelInfo);
  
  // Store in localStorage for comparison across tabs
  const channelData = {
    ...channelInfo,
    timestamp: Date.now(),
    tabId: `tab-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  };
  
  localStorage.setItem('diagnostic-channel-info', JSON.stringify(channelData));
  console.log('💾 Channel info saved to localStorage for cross-tab comparison');
  
  // Check for other tab data
  const otherTabData = localStorage.getItem('diagnostic-other-tabs');
  if (otherTabData) {
    try {
      const otherTabs = JSON.parse(otherTabData);
      console.log('👥 Other tab channel info found:');
      console.table(otherTabs);
    } catch (e) {
      console.log('⚠️ Could not parse other tab data');
    }
  } else {
    console.log('ℹ️ No other tab data found');
  }
}

// Instructions for multi-user testing
function showMultiUserTestInstructions() {
  console.log(`
🎯 MULTI-USER TESTING INSTRUCTIONS:

SETUP:
1. Ensure you have TWO USERS logged in:
   - User 1: nicholas.d.lowrie (currently: ${diagnosticConfig.currentUserEmail})
   - User 2: testmod (or another user account)

2. Open the SAME planning session in both user accounts:
   - Session ID: ${diagnosticConfig.sessionId}
   - Make sure both users are on the SAME item/card

TESTING STEPS:
1. In nicholas.d.lowrie tab: Run runCrossUserTests() in console
2. In testmod tab: Run runCrossUserTests() in console  
3. In nicholas.d.lowrie tab: Vote on the current card (click a number)
4. In testmod tab: Check console for "🎯 CROSS-USER VOTE BROADCAST DETECTED"
5. In testmod tab: Vote on the same card
6. In nicholas.d.lowrie tab: Check console for the broadcast detection

EXPECTED RESULTS:
✅ Both users should see "🎯 CROSS-USER VOTE BROADCAST DETECTED" when the OTHER user votes
✅ Team votes section should update in real-time for both users
✅ Vote counts should be consistent across both tabs

TROUBLESHOOTING:
❌ If no cross-user broadcasts detected:
   - Check if both users are on the same session ID
   - Check if both users are subscribed to the channel
   - Verify both users are looking at the same item/card
   - Check browser console for channel connection errors
`);
}

// Run all cross-user diagnostic tests
function runCrossUserTests() {
  console.log('🚀 Running Cross-User Broadcasting Diagnostic Tests...');
  
  checkChannelConsistency();
  
  setTimeout(() => {
    testSameTabBroadcast();
  }, 1000);
  
  setTimeout(() => {
    monitorCrossUserBroadcasts();
  }, 2000);
  
  setTimeout(() => {
    sendTestVoteBroadcast();
  }, 3000);
}

// Export functions to global scope
window.testSameTabBroadcast = testSameTabBroadcast;
window.monitorCrossUserBroadcasts = monitorCrossUserBroadcasts;
window.sendTestVoteBroadcast = sendTestVoteBroadcast;
window.checkChannelConsistency = checkChannelConsistency;
window.runCrossUserTests = runCrossUserTests;
window.showMultiUserTestInstructions = showMultiUserTestInstructions;

console.log('✅ Cross-User Broadcasting Diagnostic Test Loaded');
console.log('📝 Run showMultiUserTestInstructions() for detailed testing steps');
console.log('🚀 Run runCrossUserTests() to start diagnostic testing');
console.log('💡 Make sure you have TWO DIFFERENT USERS logged in for proper testing!');
