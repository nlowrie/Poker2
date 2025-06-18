// Test script to verify the reveal votes broadcasting fix
console.log('🧪 Testing reveal votes broadcasting fix...');

// Instructions:
// 1. Run this in moderator window console first
// 2. Then run test-reveal-votes-receiver-fixed.js in team member window console
// 3. Click "Reveal Votes" in moderator window
// 4. Check both console outputs

console.log('🎯 This is the MODERATOR test script');
console.log('📋 Steps:');
console.log('1. Run test-reveal-votes-receiver-fixed.js in the TEAM MEMBER window console');
console.log('2. Come back here and run: testRevealVotesBroadcast()');
console.log('3. Check both console outputs for success messages');

window.testRevealVotesBroadcast = function() {
  console.log('🚀 Testing reveal votes broadcast...');
  
  // Get current session data
  const sessionData = JSON.parse(localStorage.getItem('planningSessionData') || '{}');
  const currentItem = sessionData.items?.[sessionData.currentItemIndex || 0];
  
  console.log('📊 Current State:', {
    sessionId: sessionData.sessionId,
    currentItemIndex: sessionData.currentItemIndex,
    currentItemId: currentItem?.id,
    currentItemTitle: currentItem?.title,
    totalItems: sessionData.items?.length || 0
  });
  
  // Simulate clicking reveal votes button
  const revealButton = document.querySelector('button[title*="Reveal"]');
  if (revealButton && !revealButton.disabled) {
    console.log('🎯 Found Reveal Votes button, clicking...');
    revealButton.click();
    
    setTimeout(() => {
      console.log('✅ Reveal votes clicked! Check team member console for broadcast receipt.');
    }, 500);
  } else {
    console.log('❌ Reveal Votes button not found or disabled');
    console.log('Available buttons:', Array.from(document.querySelectorAll('button')).map(btn => btn.textContent?.trim()));
  }
};

console.log('💡 Run testRevealVotesBroadcast() when ready to test');
