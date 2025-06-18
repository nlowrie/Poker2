/**
 * Enhanced Database Race Condition Test
 * This test specifically focuses on the database write/read timing issue
 */

console.log('🎯 Starting Enhanced Database Race Condition Test');
console.log('🔍 This test monitors database operations and timing');

// Enhanced test state tracking
const testState = {
  // Database operations timing  
  voteSubmitStarted: null,
  voteSubmitCompleted: null,
  voteInsertedSuccessfully: null,
  broadcastSent: null,
  broadcastReceived: null,  
  crossUserQueryStarted: null,
  crossUserQueryCompleted: null,
  crossUserQueryFoundRecords: 0,
  
  // Timing analysis
  submitToBroadcastMs: null,
  broadcastToQueryMs: null,
  insertToQueryMs: null,
  
  // Final results
  success: false,
  issueDetected: null
};

// Helper to calculate time differences
const calculateTimings = () => {
  if (testState.voteSubmitCompleted && testState.broadcastSent) {
    testState.submitToBroadcastMs = testState.broadcastSent - testState.voteSubmitCompleted;
  }
  
  if (testState.broadcastReceived && testState.crossUserQueryStarted) {
    testState.broadcastToQueryMs = testState.crossUserQueryStarted - testState.broadcastReceived;
  }
  
  if (testState.voteInsertedSuccessfully && testState.crossUserQueryStarted) {
    testState.insertToQueryMs = testState.crossUserQueryStarted - testState.voteInsertedSuccessfully;
  }
};

// Enhanced console logging interceptor
const originalConsoleLog = console.log;
console.log = function(...args) {
  const logText = args.join(' ');
  const timestamp = Date.now();
  
  // Prevent recursive calls by checking if this is our own timing log
  if (logText.includes('⏰ TIMING:') || logText.includes('📊 TIMING:') || logText.includes('🔍 DATABASE:')) {
    return originalConsoleLog.apply(console, args);
  }
  
  // Track vote submission flow with precise timing
  if (logText.includes('🗳️ Submitting estimation')) {
    testState.voteSubmitStarted = timestamp;
    originalConsoleLog('⏰ TIMING: Vote submit started at', new Date(timestamp).toLocaleTimeString() + '.' + (timestamp % 1000));
  }
  
  if (logText.includes('✅ Estimation inserted successfully') || logText.includes('✅ Estimation updated successfully')) {
    testState.voteInsertedSuccessfully = timestamp;
    testState.voteSubmitCompleted = timestamp;
    originalConsoleLog('⏰ TIMING: Vote database write completed at', new Date(timestamp).toLocaleTimeString() + '.' + (timestamp % 1000));
  }
  
  // Track broadcasting timing
  if (logText.includes('✅ Vote broadcast sent successfully')) {
    testState.broadcastSent = timestamp;
    originalConsoleLog('⏰ TIMING: Broadcast sent at', new Date(timestamp).toLocaleTimeString() + '.' + (timestamp % 1000));
    calculateTimings();
    if (testState.submitToBroadcastMs !== null) {
      originalConsoleLog('📊 TIMING: Submit to broadcast delay:', testState.submitToBroadcastMs + 'ms');
    }
  }
  
  // Track broadcast reception
  if (logText.includes('📥 Received vote-submitted broadcast')) {
    testState.broadcastReceived = timestamp;
    originalConsoleLog('⏰ TIMING: Broadcast received at', new Date(timestamp).toLocaleTimeString() + '.' + (timestamp % 1000));
  }
  
  // Track cross-user database query timing
  if (logText.includes('🔍 CROSS-USER: About to load votes for item after delay')) {
    testState.crossUserQueryStarted = timestamp;
    originalConsoleLog('⏰ TIMING: Cross-user query started at', new Date(timestamp).toLocaleTimeString() + '.' + (timestamp % 1000));
    calculateTimings();
    if (testState.broadcastToQueryMs !== null) {
      originalConsoleLog('📊 TIMING: Broadcast to query delay:', testState.broadcastToQueryMs + 'ms');
    }
    if (testState.insertToQueryMs !== null) {
      originalConsoleLog('📊 TIMING: Insert to query delay:', testState.insertToQueryMs + 'ms');
      if (testState.insertToQueryMs < 0) {
        originalConsoleLog('⚠️ WARNING: Cross-user query started BEFORE database write completed!');
        testState.issueDetected = 'Query started before database write completed';
      }
    }
  }
  
  // Track query results
  if (logText.includes('✅ Estimations query successful')) {
    testState.crossUserQueryCompleted = timestamp;
    const match = logText.match(/(\d+) records/);
    if (match) {
      testState.crossUserQueryFoundRecords = parseInt(match[1]);
      originalConsoleLog('⏰ TIMING: Cross-user query completed at', new Date(timestamp).toLocaleTimeString() + '.' + (timestamp % 1000));
      originalConsoleLog('📊 RESULT: Found', testState.crossUserQueryFoundRecords, 'records');
      
      if (testState.crossUserQueryFoundRecords > 0) {
        testState.success = true;
        originalConsoleLog('🎉 SUCCESS: Cross-user query found the new vote!');
      } else if (testState.voteInsertedSuccessfully) {
        originalConsoleLog('❌ ISSUE: Cross-user query found 0 records despite successful database write');
        testState.issueDetected = 'Database write successful but cross-user query found 0 records';
      }
    }
  }
  
  // Track specific database operations
  if (logText.includes('🔍 Query timestamp:')) {
    originalConsoleLog('🔍 DATABASE: Query executed at precise timestamp');
  }
  
  if (logText.includes('⚠️ No estimation records found')) {
    originalConsoleLog('⚠️ DATABASE: Query returned empty result set');
  }
  
  return originalConsoleLog.apply(console, args);
};

// Generate detailed timing report
const generateTimingReport = () => {
  console.log('\n📊 ENHANCED DATABASE RACE CONDITION TEST REPORT');
  console.log('════════════════════════════════════════════════════════');
  
  console.log('\n⏰ PRECISE TIMING ANALYSIS:');
  if (testState.voteSubmitStarted) {
    console.log('   Vote Submit Started:', new Date(testState.voteSubmitStarted).toLocaleTimeString() + '.' + (testState.voteSubmitStarted % 1000));
  }
  if (testState.voteInsertedSuccessfully) {
    console.log('   Database Write Completed:', new Date(testState.voteInsertedSuccessfully).toLocaleTimeString() + '.' + (testState.voteInsertedSuccessfully % 1000));
  }
  if (testState.broadcastSent) {
    console.log('   Broadcast Sent:', new Date(testState.broadcastSent).toLocaleTimeString() + '.' + (testState.broadcastSent % 1000));
  }
  if (testState.broadcastReceived) {
    console.log('   Broadcast Received:', new Date(testState.broadcastReceived).toLocaleTimeString() + '.' + (testState.broadcastReceived % 1000));
  }
  if (testState.crossUserQueryStarted) {
    console.log('   Cross-User Query Started:', new Date(testState.crossUserQueryStarted).toLocaleTimeString() + '.' + (testState.crossUserQueryStarted % 1000));
  }
  if (testState.crossUserQueryCompleted) {
    console.log('   Cross-User Query Completed:', new Date(testState.crossUserQueryCompleted).toLocaleTimeString() + '.' + (testState.crossUserQueryCompleted % 1000));
  }
  
  console.log('\n📏 TIMING INTERVALS:');
  if (testState.submitToBroadcastMs !== null) {
    console.log('   Submit to Broadcast:', testState.submitToBroadcastMs + 'ms');
  }
  if (testState.broadcastToQueryMs !== null) {
    console.log('   Broadcast to Query:', testState.broadcastToQueryMs + 'ms');
  }
  if (testState.insertToQueryMs !== null) {
    console.log('   Insert to Query:', testState.insertToQueryMs + 'ms');
    if (testState.insertToQueryMs < 100) {
      console.log('   ⚠️ WARNING: Very short delay between database write and cross-user query');
    }
  }
  
  console.log('\n📈 RESULTS:');
  console.log('   Records Found by Cross-User Query:', testState.crossUserQueryFoundRecords);
  console.log('   Test Success:', testState.success ? '✅ YES' : '❌ NO');
  
  if (testState.issueDetected) {
    console.log('\n🚨 ISSUE DETECTED:');
    console.log('   ', testState.issueDetected);
  }
  
  console.log('\n💡 RECOMMENDATIONS:');
  if (testState.insertToQueryMs !== null && testState.insertToQueryMs < 100) {
    console.log('   - Increase delay between database write and broadcast');
    console.log('   - Current delay may be insufficient for database consistency');
  }
  if (testState.crossUserQueryFoundRecords === 0 && testState.voteInsertedSuccessfully) {
    console.log('   - Database write successful but not visible to cross-user query');
    console.log('   - Possible database replication lag or transaction isolation issue');
  }
  if (testState.success) {
    console.log('   - Timing appears to be working correctly');
    console.log('   - First vote display should work as expected');
  }
  
  console.log('════════════════════════════════════════════════════════\n');
};

// Start the test
console.log('🚀 Enhanced Database Race Condition Test is running...');
console.log('📝 Instructions:');
console.log('1. Run this in User B\'s console (testmod)');
console.log('2. Have User A (nicholas.d.lowrie) vote');
console.log('3. Watch for precise timing analysis');

// Auto-generate report after reasonable time
let reportTimeout = setTimeout(() => {
  if (testState.voteSubmitStarted) {
    generateTimingReport();
  }
}, 15000);

// Cleanup function
window.cleanupDatabaseRaceTest = () => {
  clearTimeout(reportTimeout);
  console.log = originalConsoleLog;
  generateTimingReport();
  console.log('🧹 Database race condition test cleaned up');
};

console.log('💡 To stop test and get report: cleanupDatabaseRaceTest()');
