// Test script to verify the reveal votes receiver fix
console.log('🧪 Testing reveal votes receiver fix...');

// Instructions:
// Run this in the TEAM MEMBER window console
// Then go to moderator window and run the moderator test script

console.log('🎯 This is the TEAM MEMBER receiver test script');
console.log('📋 Monitoring for reveal votes broadcasts...');

// Store original console.log to avoid interference
const originalLog = console.log;

// Track broadcasts received
let broadcastsReceived = 0;
let lastBroadcastData = null;

// Override console.log to catch broadcast messages
console.log = function(...args) {
  // Call original log
  originalLog.apply(console, args);
  
  // Check for reveal votes broadcast messages
  const message = args[0];
  if (typeof message === 'string') {
    if (message.includes('📥 Received reveal-votes broadcast')) {
      broadcastsReceived++;
      lastBroadcastData = args[1];
      originalLog('🎉 SUCCESS: Reveal votes broadcast received!', { 
        count: broadcastsReceived, 
        data: lastBroadcastData 
      });
    } else if (message.includes('✅ Applying reveal votes broadcast')) {
      originalLog('🚀 SUCCESS: Reveal votes broadcast being applied!');
    } else if (message.includes('⏭️ Skipping reveal votes broadcast')) {
      originalLog('❌ WARNING: Reveal votes broadcast was skipped!', args[1]);
    }
  }
};

// Monitor for state changes
let lastRevealedState = null;
setInterval(() => {
  // Check if votes are revealed
  const revealedElements = document.querySelectorAll('[data-testid="vote-result"], .vote-result, .revealed-vote');
  const isRevealed = revealedElements.length > 0;
  
  if (isRevealed !== lastRevealedState) {
    lastRevealedState = isRevealed;
    if (isRevealed) {
      originalLog('🎊 SUCCESS: Votes are now revealed in UI!');
      originalLog('📊 Revealed votes count:', revealedElements.length);
    }
  }
}, 1000);

originalLog('✅ Receiver test setup complete!');
originalLog('🔍 Monitoring for:');
originalLog('  - Reveal votes broadcasts');
originalLog('  - Broadcast application');
originalLog('  - UI state changes');
originalLog('📢 Now run the moderator test script and click "Reveal Votes"');

// Provide a way to check current state
window.checkReceiverState = function() {
  const sessionData = JSON.parse(localStorage.getItem('planningSessionData') || '{}');
  const revealedElements = document.querySelectorAll('[data-testid="vote-result"], .vote-result, .revealed-vote');
  
  originalLog('🔍 Current Receiver State:', {
    broadcastsReceived,
    lastBroadcastData,
    sessionId: sessionData.sessionId,
    currentItemIndex: sessionData.currentItemIndex,
    isRevealedInUI: revealedElements.length > 0,
    revealedElementsCount: revealedElements.length
  });
};

originalLog('💡 Use checkReceiverState() to check current state manually');
