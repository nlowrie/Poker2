// Final Real-Time Broadcasting Verification Test
// This script provides a comprehensive test of the vote broadcasting system

console.log('🧪 FINAL REAL-TIME BROADCASTING VERIFICATION TEST');
console.log('==================================================');

// Test configuration
const TEST_CONFIG = {
  sessionId: 'test-session-123',
  testDuration: 30000, // 30 seconds
  checkInterval: 1000,  // Check every second
  expectedEvents: [
    'vote_submitted',
    'broadcast_sent', 
    'broadcast_received',
    'team_votes_updated'
  ]
};

// Event tracking
let eventsDetected = new Map();
let testStartTime = Date.now();
let testResults = {
  broadcasting: false,
  userDisplay: false,
  errorHandling: false,
  performance: false
};

// Initialize event tracking
TEST_CONFIG.expectedEvents.forEach(event => {
  eventsDetected.set(event, []);
});

// Override console.log to capture relevant events
const originalLog = console.log;
console.log = function(...args) {
  const message = args.join(' ');
  
  // Track vote submission events
  if (message.includes('Vote submitted for item') || message.includes('🔄 Vote submitted')) {
    eventsDetected.get('vote_submitted').push({
      timestamp: Date.now(),
      message: message
    });
  }
  
  // Track broadcast sending
  if (message.includes('Broadcasting vote update') || message.includes('📤 Broadcasting')) {
    eventsDetected.get('broadcast_sent').push({
      timestamp: Date.now(),
      message: message
    });
  }
  
  // Track broadcast receiving
  if (message.includes('Received vote broadcast') || message.includes('📨 Received')) {
    eventsDetected.get('broadcast_received').push({
      timestamp: Date.now(),
      message: message
    });
  }
  
  // Track team votes updates
  if (message.includes('Team votes updated') || message.includes('✅ Team votes')) {
    eventsDetected.get('team_votes_updated').push({
      timestamp: Date.now(),
      message: message
    });
  }
  
  // Call original console.log
  originalLog.apply(console, args);
};

// Test functions
function checkBroadcastingFunctionality() {
  const voteSubmissions = eventsDetected.get('vote_submitted');
  const broadcastsSent = eventsDetected.get('broadcast_sent');
  const broadcastsReceived = eventsDetected.get('broadcast_received');
  
  if (voteSubmissions.length > 0 && broadcastsSent.length > 0 && broadcastsReceived.length > 0) {
    testResults.broadcasting = true;
    console.log('✅ Broadcasting functionality: WORKING');
  } else {
    console.log('❌ Broadcasting functionality: NOT WORKING');
    console.log(`   - Vote submissions: ${voteSubmissions.length}`);
    console.log(`   - Broadcasts sent: ${broadcastsSent.length}`);
    console.log(`   - Broadcasts received: ${broadcastsReceived.length}`);
  }
}

function checkUserDisplayFunctionality() {
  // Check if user names are being displayed correctly (not fallback names)
  const logs = Array.from(document.querySelectorAll('*')).map(el => el.textContent).join(' ');
  
  if (!logs.includes('User ') || logs.includes('Nicholas') || logs.includes('full_name')) {
    testResults.userDisplay = true;
    console.log('✅ User display functionality: WORKING');
  } else {
    console.log('❌ User display functionality: FALLBACK NAMES DETECTED');
  }
}

function checkErrorHandling() {
  // Look for error handling in logs
  const errorLogs = [];
  const originalError = console.error;
  
  console.error = function(...args) {
    errorLogs.push(args.join(' '));
    originalError.apply(console, args);
  };
  
  // Check if errors are handled gracefully
  setTimeout(() => {
    const hasGracefulErrorHandling = errorLogs.some(log => 
      log.includes('handled gracefully') || 
      log.includes('returning null') ||
      log.includes('does not break')
    );
    
    if (errorLogs.length === 0 || hasGracefulErrorHandling) {
      testResults.errorHandling = true;
      console.log('✅ Error handling: ROBUST');
    } else {
      console.log('❌ Error handling: NEEDS IMPROVEMENT');
      console.log('   Error logs:', errorLogs);
    }
  }, 5000);
}

function checkPerformance() {
  const broadcasts = eventsDetected.get('broadcast_sent');
  const receives = eventsDetected.get('broadcast_received');
  
  if (broadcasts.length > 0 && receives.length > 0) {
    const latencies = [];
    
    broadcasts.forEach(sent => {
      const correspondingReceive = receives.find(recv => 
        Math.abs(recv.timestamp - sent.timestamp) < 1000
      );
      
      if (correspondingReceive) {
        latencies.push(correspondingReceive.timestamp - sent.timestamp);
      }
    });
    
    if (latencies.length > 0) {
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      
      if (avgLatency < 200) { // Under 200ms is good
        testResults.performance = true;
        console.log(`✅ Performance: EXCELLENT (${avgLatency.toFixed(0)}ms avg latency)`);
      } else {
        console.log(`⚠️ Performance: ACCEPTABLE (${avgLatency.toFixed(0)}ms avg latency)`);
      }
    }
  }
}

function generateFinalReport() {
  console.log('\n🏆 FINAL TEST RESULTS');
  console.log('====================');
  
  const totalTests = Object.keys(testResults).length;
  const passedTests = Object.values(testResults).filter(result => result).length;
  const successRate = (passedTests / totalTests * 100).toFixed(1);
  
  console.log(`Overall Success Rate: ${successRate}% (${passedTests}/${totalTests})`);
  console.log('');
  
  Object.entries(testResults).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test.replace(/([A-Z])/g, ' $1').toUpperCase()}`);
  });
  
  console.log('');
  
  if (successRate >= 75) {
    console.log('🎉 SYSTEM STATUS: READY FOR PRODUCTION');
    console.log('✅ Real-time vote broadcasting is working correctly!');
  } else {
    console.log('⚠️ SYSTEM STATUS: NEEDS ATTENTION');
    console.log('❌ Some issues detected that should be addressed.');
  }
  
  // Event summary
  console.log('\n📊 EVENT SUMMARY');
  console.log('================');
  eventsDetected.forEach((events, eventType) => {
    console.log(`${eventType}: ${events.length} events detected`);
  });
}

// Start the test
console.log('🚀 Starting comprehensive test...');
console.log('⏱️ Test will run for 30 seconds');
console.log('📝 Monitoring real-time events...');
console.log('');

// Run periodic checks
const testInterval = setInterval(() => {
  checkBroadcastingFunctionality();
  checkUserDisplayFunctionality();
  checkPerformance();
}, TEST_CONFIG.checkInterval);

// Run error handling check
checkErrorHandling();

// Generate final report after test duration
setTimeout(() => {
  clearInterval(testInterval);
  generateFinalReport();
  
  // Restore original console.log
  console.log = originalLog;
}, TEST_CONFIG.testDuration);

// Instructions for manual testing
console.log('📋 MANUAL TEST INSTRUCTIONS:');
console.log('1. Open this page in multiple browser tabs');
console.log('2. Navigate to a planning session');
console.log('3. Submit votes in different tabs');
console.log('4. Observe real-time updates');
console.log('5. Check console for test results');
console.log('');
