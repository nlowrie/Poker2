// Multi-User Real-Time Voting Test Suite
// Run this in both user tabs to diagnose cross-user broadcasting issues

console.log('🎯 MULTI-USER REAL-TIME VOTING TEST SUITE');
console.log('=========================================');

// Test configuration
const TEST_CONFIG = {
  currentUser: {
    id: window.user?.id || 'UNKNOWN',
    email: window.user?.email || 'UNKNOWN',
    name: window.user?.user_metadata?.full_name || window.user?.email?.split('@')[0] || 'UNKNOWN'
  },
  session: {
    id: window.sessionId || 'UNKNOWN',
    channelTopic: window.channel?.topic || 'UNKNOWN',
    channelState: window.channel?.state || 'UNKNOWN',
    channelSubscribed: window.channelSubscribed || false
  },
  currentItem: {
    id: window.sessionItems?.[window.currentItemIndex]?.id || 'UNKNOWN',
    title: window.sessionItems?.[window.currentItemIndex]?.title || 'UNKNOWN',
    index: window.currentItemIndex || 0
  }
};

console.log('📋 Test Configuration:');
console.table(TEST_CONFIG);

// Global test state
let testState = {
  isRunning: false,
  startTime: null,
  events: [],
  partnerId: null,
  partnerName: null,
  broadcastsSent: 0,
  broadcastsReceived: 0,
  votesLoaded: 0,
  crossUserVotes: []
};

// Event logging function
function logTestEvent(category, message, data = {}) {
  const event = {
    timestamp: Date.now(),
    category,
    message,
    data: { ...data },
    user: TEST_CONFIG.currentUser.email
  };
  
  testState.events.push(event);
  console.log(`[${category}] ${message}`, data);
  
  // Store in localStorage for cross-tab analysis
  const allEvents = JSON.parse(localStorage.getItem('multiUserTestEvents') || '[]');
  allEvents.push(event);
  localStorage.setItem('multiUserTestEvents', JSON.stringify(allEvents.slice(-100))); // Keep last 100 events
}

// Enhanced console logging to capture voting events
function setupEventCapture() {
  logTestEvent('SETUP', 'Setting up event capture...');
  
  // Capture console.log messages for vote-related events
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Capture vote broadcasting events
    if (message.includes('📡 Attempting to send vote broadcast')) {
      testState.broadcastsSent++;
      logTestEvent('BROADCAST', 'Vote broadcast sent', { 
        count: testState.broadcastsSent,
        message: message 
      });
    }
    
    // Capture vote broadcast reception
    if (message.includes('📥 Received vote-submitted broadcast') || message.includes('📥 Received vote-changed broadcast')) {
      testState.broadcastsReceived++;
      logTestEvent('BROADCAST', 'Vote broadcast received', { 
        count: testState.broadcastsReceived,
        message: message 
      });
    }
    
    // Capture cross-user vote detection
    if (message.includes('🔍 CROSS-USER VOTE DEBUG') || message.includes('🔍 CROSS-USER VOTE CHANGE DEBUG')) {
      logTestEvent('CROSS_USER', 'Cross-user vote detected', { message: message });
    }
    
    // Capture vote loading
    if (message.includes('🔍 Loaded') && message.includes('votes for item')) {
      testState.votesLoaded++;
      logTestEvent('VOTE_LOAD', 'Votes loaded', { 
        count: testState.votesLoaded,
        message: message 
      });
    }
    
    // Call original console.log
    originalLog.apply(console, args);
  };
  
  logTestEvent('SETUP', 'Event capture setup complete');
}

// Test function to identify test partner
function identifyTestPartner() {
  logTestEvent('PARTNER', 'Looking for test partner...');
  
  // Check localStorage for other users' test data
  const allEvents = JSON.parse(localStorage.getItem('multiUserTestEvents') || '[]');
  const otherUserEvents = allEvents.filter(event => event.user !== TEST_CONFIG.currentUser.email);
  
  if (otherUserEvents.length > 0) {
    const latestOtherEvent = otherUserEvents[otherUserEvents.length - 1];
    testState.partnerId = latestOtherEvent.user;
    testState.partnerName = latestOtherEvent.user.split('@')[0];
    
    logTestEvent('PARTNER', 'Test partner identified', {
      partnerId: testState.partnerId,
      partnerName: testState.partnerName,
      partnerLastSeen: new Date(latestOtherEvent.timestamp).toLocaleTimeString()
    });
    
    return true;
  } else {
    logTestEvent('PARTNER', 'No test partner found', {
      instruction: 'Make sure the other user runs this test too'
    });
    return false;
  }
}

// Test function to send a vote
function sendTestVote(value = '5') {
  logTestEvent('TEST_VOTE', `Sending test vote: ${value}`);
  
  if (window.handleVote) {
    window.handleVote(value).then(() => {
      logTestEvent('TEST_VOTE', 'Test vote sent successfully', { value });
    }).catch(error => {
      logTestEvent('TEST_VOTE', 'Test vote failed', { value, error: error.message });
    });
  } else {
    logTestEvent('TEST_VOTE', 'handleVote function not found');
  }
}

// Test function to analyze cross-user behavior
function analyzeCrossUserBehavior() {
  logTestEvent('ANALYSIS', 'Analyzing cross-user behavior...');
  
  const allEvents = JSON.parse(localStorage.getItem('multiUserTestEvents') || '[]');
  const myEvents = allEvents.filter(event => event.user === TEST_CONFIG.currentUser.email);
  const partnerEvents = allEvents.filter(event => event.user !== TEST_CONFIG.currentUser.email);
  
  const analysis = {
    myBroadcastsSent: myEvents.filter(e => e.category === 'BROADCAST' && e.message.includes('sent')).length,
    myBroadcastsReceived: myEvents.filter(e => e.category === 'BROADCAST' && e.message.includes('received')).length,
    partnerBroadcastsSent: partnerEvents.filter(e => e.category === 'BROADCAST' && e.message.includes('sent')).length,
    partnerBroadcastsReceived: partnerEvents.filter(e => e.category === 'BROADCAST' && e.message.includes('received')).length,
    crossUserDetections: myEvents.filter(e => e.category === 'CROSS_USER').length,
    totalVoteLoads: myEvents.filter(e => e.category === 'VOTE_LOAD').length
  };
  
  logTestEvent('ANALYSIS', 'Cross-user behavior analysis complete', analysis);
  
  // Determine if cross-user voting is working
  const isWorking = analysis.myBroadcastsReceived > 0 && analysis.crossUserDetections > 0;
  
  logTestEvent('ANALYSIS', `Cross-user voting status: ${isWorking ? 'WORKING' : 'NOT WORKING'}`, {
    isWorking,
    reasoning: isWorking ? 
      'Broadcasts are being received and cross-user votes detected' : 
      'No cross-user broadcasts received or processed'
  });
  
  return analysis;
}

// Main test function for User 1 (nicholas.d.lowrie)
function runUser1Test() {
  console.log('👤 Running User 1 Test (nicholas.d.lowrie)...');
  logTestEvent('TEST_START', 'User 1 test started');
  
  setupEventCapture();
  
  setTimeout(() => {
    logTestEvent('TEST_STEP', 'Step 1: Identifying test partner');
    const hasPartner = identifyTestPartner();
    
    if (hasPartner) {
      setTimeout(() => {
        logTestEvent('TEST_STEP', 'Step 2: Sending test vote');
        sendTestVote('8');
        
        setTimeout(() => {
          logTestEvent('TEST_STEP', 'Step 3: Analyzing results');
          const analysis = analyzeCrossUserBehavior();
          generateTestReport(analysis);
        }, 5000);
      }, 2000);
    } else {
      logTestEvent('TEST_ERROR', 'Cannot run test without partner');
    }
  }, 1000);
}

// Main test function for User 2 (testmod)
function runUser2Test() {
  console.log('👤 Running User 2 Test (testmod)...');
  logTestEvent('TEST_START', 'User 2 test started');
  
  setupEventCapture();
  
  setTimeout(() => {
    logTestEvent('TEST_STEP', 'Step 1: Identifying test partner');
    const hasPartner = identifyTestPartner();
    
    if (hasPartner) {
      setTimeout(() => {
        logTestEvent('TEST_STEP', 'Step 2: Waiting for partner vote');
        // User 2 waits and then sends their own vote
        
        setTimeout(() => {
          logTestEvent('TEST_STEP', 'Step 3: Sending test vote');
          sendTestVote('3');
          
          setTimeout(() => {
            logTestEvent('TEST_STEP', 'Step 4: Analyzing results');
            const analysis = analyzeCrossUserBehavior();
            generateTestReport(analysis);
          }, 5000);
        }, 3000);
      }, 2000);
    } else {
      logTestEvent('TEST_ERROR', 'Cannot run test without partner');
    }
  }, 1000);
}

// Generate comprehensive test report
function generateTestReport(analysis) {
  console.log('\n🏆 MULTI-USER VOTING TEST REPORT');
  console.log('================================');
  
  const reportData = {
    'Current User': TEST_CONFIG.currentUser.email,
    'Test Partner': testState.partnerName || 'Not Found',
    'Session ID': TEST_CONFIG.session.id,
    'Current Item': TEST_CONFIG.currentItem.title,
    'Channel State': TEST_CONFIG.session.channelState,
    'Channel Subscribed': TEST_CONFIG.session.channelSubscribed,
    'Broadcasts Sent': analysis.myBroadcastsSent,
    'Broadcasts Received': analysis.myBroadcastsReceived,
    'Cross-User Detections': analysis.crossUserDetections,
    'Vote Loads': analysis.totalVoteLoads
  };
  
  console.table(reportData);
  
  // Determine overall status
  let status = 'UNKNOWN';
  let recommendations = [];
  
  if (analysis.myBroadcastsSent > 0 && analysis.myBroadcastsReceived > 0 && analysis.crossUserDetections > 0) {
    status = '✅ WORKING';
    recommendations.push('Cross-user voting is functioning correctly');
  } else if (analysis.myBroadcastsSent > 0 && analysis.myBroadcastsReceived === 0) {
    status = '❌ BROADCAST ISSUE';
    recommendations.push('Votes are being sent but not received by other users');
    recommendations.push('Check if both users are on the same session');
    recommendations.push('Verify Supabase real-time configuration');
  } else if (analysis.myBroadcastsReceived > 0 && analysis.crossUserDetections === 0) {
    status = '⚠️ PROCESSING ISSUE';
    recommendations.push('Broadcasts are received but not processed correctly');
    recommendations.push('Check vote loading and user name resolution logic');
  } else {
    status = '💥 CRITICAL ISSUE';
    recommendations.push('Broadcasting system is not working at all');
    recommendations.push('Check channel setup and subscription status');
  }
  
  console.log(`\n🎯 Overall Status: ${status}`);
  console.log('\n📝 Recommendations:');
  recommendations.forEach((rec, index) => {
    console.log(`${index + 1}. ${rec}`);
  });
  
  logTestEvent('TEST_COMPLETE', 'Test report generated', { status, analysis, recommendations });
}

// Auto-detect user and run appropriate test
function runAutoTest() {
  const userEmail = TEST_CONFIG.currentUser.email;
  
  if (userEmail.includes('nicholas.d.lowrie')) {
    runUser1Test();
  } else if (userEmail.includes('testmod') || userEmail !== 'UNKNOWN') {
    runUser2Test();
  } else {
    console.log('❌ Could not detect user type. Please run runUser1Test() or runUser2Test() manually.');
  }
}

// Clean up function
function cleanupTest() {
  localStorage.removeItem('multiUserTestEvents');
  testState = {
    isRunning: false,
    startTime: null,
    events: [],
    partnerId: null,
    partnerName: null,
    broadcastsSent: 0,
    broadcastsReceived: 0,
    votesLoaded: 0,
    crossUserVotes: []
  };
  
  logTestEvent('CLEANUP', 'Test cleanup complete');
}

// Export functions to global scope
window.runUser1Test = runUser1Test;
window.runUser2Test = runUser2Test;
window.runAutoTest = runAutoTest;
window.cleanupTest = cleanupTest;
window.analyzeCrossUserBehavior = analyzeCrossUserBehavior;
window.sendTestVote = sendTestVote;

console.log('✅ Multi-User Real-Time Voting Test Suite Loaded');
console.log('');
console.log('🚀 QUICK START:');
console.log('  runAutoTest() - Automatically detect user and run appropriate test');
console.log('  runUser1Test() - Run as User 1 (nicholas.d.lowrie)');
console.log('  runUser2Test() - Run as User 2 (testmod or other)');
console.log('  cleanupTest() - Clean up test data');
console.log('');
console.log('📋 INSTRUCTIONS:');
console.log('1. Make sure both users are on the SAME planning session');
console.log('2. Run runAutoTest() in BOTH user tabs');
console.log('3. Wait for the test to complete automatically');
console.log('4. Check the test report for results and recommendations');
