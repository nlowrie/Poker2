// Vote Broadcasting Debug Script
// Run this in the browser console to debug vote broadcasting issues

console.log("=== Vote Broadcasting Debug Tool ===");

// Function to check if Supabase connection is working
const checkSupabaseConnection = () => {
  console.log("📡 Checking Supabase connection...");
  
  // Check if supabase is available globally
  if (typeof window.supabase !== 'undefined') {
    console.log("✅ Supabase client found globally");
    return window.supabase;
  }
  
  // Check if we can find it in the React dev tools
  const reactFiberKey = Object.keys(document.querySelector('#root')).find(key => key.startsWith('__reactFiber'));
  if (reactFiberKey) {
    console.log("✅ React fiber found, checking for Supabase in component tree");
  }
  
  console.log("⚠️ Supabase client not found globally - this might affect broadcasting");
  return null;
};

// Function to monitor channel activity
const monitorChannelActivity = () => {
  console.log("👂 Starting channel activity monitor...");
  
  // Override console.log to catch channel-related messages
  const originalLog = console.log;
  const originalError = console.error;
  
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('broadcast') || message.includes('channel') || message.includes('vote')) {
      originalLog.apply(console, ['🔔 CHANNEL ACTIVITY:', ...args]);
    } else {
      originalLog.apply(console, args);
    }
  };
  
  console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('broadcast') || message.includes('channel') || message.includes('vote')) {
      originalError.apply(console, ['🚨 CHANNEL ERROR:', ...args]);
    } else {
      originalError.apply(console, args);
    }
  };
  
  console.log("Channel monitoring is now active. Vote on an item to see activity.");
};

// Function to test manual broadcast
const testManualBroadcast = () => {
  console.log("🧪 Testing manual broadcast...");
  
  // Try to find the channel in the component state
  const rootElement = document.querySelector('#root');
  if (!rootElement) {
    console.error("❌ Root element not found");
    return;
  }
  
  console.log("📍 To test broadcasting:");
  console.log("1. Open browser dev tools in multiple tabs/windows");
  console.log("2. Run this script in each tab");  
  console.log("3. Vote in one tab and watch for logs in other tabs");
  console.log("4. Check for '📥 Received vote-submitted broadcast' messages");
  console.log("5. Check for '📡 Sending vote broadcast' messages");
};

// Function to check voting session state
const checkVotingSessionState = () => {
  console.log("🔍 Checking voting session state...");
  
  // Look for voting session indicators
  const voteCards = document.querySelectorAll('[class*="grid"][class*="gap"]');
  const teamVotes = document.querySelector('.space-y-3');
  const notifications = document.querySelector('[class*="notification"]');
  
  console.log("Voting UI Elements Found:", {
    voteCards: voteCards.length,
    teamVotesSection: !!teamVotes,
    notifications: !!notifications,
    currentUrl: window.location.href
  });
  
  // Check for session ID in URL
  const urlParts = window.location.pathname.split('/');
  const sessionId = urlParts[urlParts.length - 1];
  console.log("Session ID from URL:", sessionId);
  
  return sessionId;
};

// Main debugging function
const debugVoteBroadcasting = () => {
  console.log("\n=== VOTE BROADCASTING DIAGNOSIS ===");
  
  const supabase = checkSupabaseConnection();
  const sessionId = checkVotingSessionState();
  
  console.log("\n📋 DIAGNOSIS CHECKLIST:");
  console.log("1. ✅ Run this script in multiple browser tabs with different users");
  console.log("2. ✅ Ensure all tabs are on the same voting session");
  console.log("3. ✅ Vote in one tab and check console logs in other tabs");
  console.log("4. ✅ Look for broadcast send/receive messages");
  
  console.log("\n🎯 WHAT TO LOOK FOR:");
  console.log("- '📡 Sending vote broadcast' - means the vote is being sent");
  console.log("- '📥 Received vote-submitted broadcast' - means other tabs receive it");
  console.log("- '🔄 Refreshing votes due to broadcast' - means votes are being updated");
  console.log("- '🚫 Ignoring broadcast' - means the broadcast was filtered out");
  
  console.log("\n🔧 COMMON ISSUES:");
  console.log("- Different session IDs between tabs");
  console.log("- Channel not properly initialized");
  console.log("- User ID conflicts");
  console.log("- Database submission failing");
  
  return {
    supabaseAvailable: !!supabase,
    sessionId: sessionId,
    timestamp: new Date().toISOString()
  };
};

// Start monitoring and run initial diagnosis
monitorChannelActivity();
const diagnosis = debugVoteBroadcasting();

// Export functions to global scope
window.debugVoteBroadcasting = debugVoteBroadcasting;
window.testManualBroadcast = testManualBroadcast;
window.checkVotingSessionState = checkVotingSessionState;

console.log("\n✨ Debug tools available:");
console.log("- window.debugVoteBroadcasting() - Run full diagnosis");
console.log("- window.testManualBroadcast() - Get test instructions");
console.log("- window.checkVotingSessionState() - Check current session");

console.log("\n🚀 Ready to debug! Vote in this tab and watch the console...");
