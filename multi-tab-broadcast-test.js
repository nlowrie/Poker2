// Multi-Tab Broadcasting Test
// This script helps test if vote broadcasts are working between multiple participants

console.log("=== Multi-Tab Broadcasting Test (v2) ===");

// Clean up any existing test variables to prevent "already declared" errors
if (typeof TEST_CONFIG !== 'undefined') {
  console.log("♻️ Cleaning up previous test session...");
}

// Test configuration
window.TEST_CONFIG = {
  sessionId: '382b639f-c7f6-44f9-afa8-029d8358c4b4', // From your logs
  currentItemId: '3e55012c-e99d-470c-b815-1cee3a4d48f7', // From your logs
  testUserId: '52b457d5-fda9-4726-b46f-12aab5cbb8e5' // Your user ID from logs
};

console.log("📋 Test Configuration:", window.TEST_CONFIG);

// Enhanced monitoring specifically for broadcasting
window.monitorBroadcasting = () => {
  console.log("🎯 Starting enhanced broadcast monitoring...");
  
  // Track broadcast events
  let broadcastsSent = 0;
  let broadcastsReceived = 0;
  let votesRefreshed = 0;
  
  const originalLog = console.log;
  
  console.log = function(...args) {
    const message = args.join(' ');
    
    // Count different types of events
    if (message.includes('📡 Sending vote broadcast')) {
      broadcastsSent++;
      originalLog.apply(console, ['🚀 BROADCAST SENT #' + broadcastsSent + ':', ...args]);
    } else if (message.includes('📥 Received vote-submitted broadcast') || message.includes('📥 Received vote-changed broadcast')) {
      broadcastsReceived++;
      originalLog.apply(console, ['📨 BROADCAST RECEIVED #' + broadcastsReceived + ':', ...args]);
    } else if (message.includes('🔄 Refreshing votes due to broadcast') || message.includes('🔄 Refreshing votes due to vote change')) {
      votesRefreshed++;
      originalLog.apply(console, ['🔄 VOTE REFRESH #' + votesRefreshed + ':', ...args]);
    } else if (message.includes('🚫 Ignoring broadcast')) {
      originalLog.apply(console, ['⚠️ BROADCAST IGNORED:', ...args]);
    } else {
      originalLog.apply(console, args);
    }
  };
  
  // Show statistics every 10 seconds
  setInterval(() => {
    console.log(`📊 BROADCAST STATS: Sent: ${broadcastsSent}, Received: ${broadcastsReceived}, Refreshes: ${votesRefreshed}`);
  }, 10000);
  
  return { broadcastsSent, broadcastsReceived, votesRefreshed };
};

// Test instructions for multiple tabs
const showMultiTabInstructions = () => {
  console.log("\n🎮 MULTI-TAB TEST INSTRUCTIONS:");
  console.log("1. 📱 Open this SAME session URL in 2+ browser tabs");
  console.log("2. 👤 Log in as DIFFERENT users in each tab");
  console.log("3. 📜 Run this script in EACH tab");
  console.log("4. 🗳️ Vote in Tab A and watch Tab B console");
  console.log("5. 👀 Look for these messages in Tab B:");
  console.log("   - '📨 BROADCAST RECEIVED'");
  console.log("   - '🔄 VOTE REFRESH'");
  console.log("   - Vote should appear in Tab B's team votes section");
  
  console.log("\n✅ SUCCESS INDICATORS:");
  console.log("- Tab A: Shows '🚀 BROADCAST SENT'");
  console.log("- Tab B: Shows '📨 BROADCAST RECEIVED'");
  console.log("- Tab B: Shows '🔄 VOTE REFRESH'");
  console.log("- Tab B: Vote appears immediately in UI");
  
  console.log("\n❌ FAILURE INDICATORS:");
  console.log("- Tab A: Shows '❌ No channel available'");
  console.log("- Tab B: No '📨 BROADCAST RECEIVED' message");
  console.log("- Tab B: Shows '⚠️ BROADCAST IGNORED'");
  console.log("- Tab B: Vote doesn't appear until page refresh");
};

// Check current participant count
const checkParticipants = () => {
  console.log("👥 Checking participants...");
  
  // Look for participant indicators in the UI
  const teamVotes = document.querySelectorAll('.flex.items-center.justify-between');
  const participantCount = teamVotes.length;
  
  console.log(`Found ${participantCount} votes/participants in team votes section`);
  
  if (participantCount >= 2) {
    console.log("✅ Multiple participants detected - ready for broadcasting test");
  } else {
    console.log("⚠️ Only 1 participant detected - need multiple users for proper test");
  }
  
  return participantCount;
};

// Main test function
const runBroadcastTest = () => {
  console.log("\n🚀 RUNNING BROADCAST TEST");
  
  const participantCount = checkParticipants();
  monitorBroadcasting();
  showMultiTabInstructions();
  
  console.log("\n🎯 READY TO TEST!");
  console.log("Vote on an item and watch for broadcast messages...");
  
  return {
    sessionId: TEST_CONFIG.sessionId,
    participantCount: participantCount,
    testReady: participantCount >= 1,
    timestamp: new Date().toISOString()
  };
};

// Auto-run the test
const testResult = runBroadcastTest();

// Global functions
window.runBroadcastTest = runBroadcastTest;
window.checkParticipants = checkParticipants;

console.log("\n📞 Available commands:");
console.log("- window.runBroadcastTest() - Restart the test");
console.log("- window.checkParticipants() - Check participant count");

console.log("\n⏰ Test started at:", new Date().toLocaleTimeString());
console.log("🔊 Enhanced broadcast monitoring is now active!");
