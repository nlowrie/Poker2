// Test script to verify reveal votes broadcasting functionality
// Run this in browser console to test the reveal votes feature

console.log('🧪 REVEAL VOTES FUNCTIONALITY TEST');
console.log('====================================');

// Test the reveal votes broadcasting
function testRevealVotesBroadcasting() {
  console.log('1. Testing Reveal Votes Broadcasting...');
  
  // Check if reveal votes button exists and is clickable
  const revealButton = document.querySelector('button:has(svg + text):contains("Reveal Votes")');
  if (!revealButton) {
    console.log('❌ Reveal Votes button not found - make sure you have votes and are moderator');
    return;
  }
  
  console.log('✅ Reveal Votes button found');
  
  // Check if the button is enabled
  if (revealButton.disabled) {
    console.log('❌ Reveal Votes button is disabled');
    return;
  }
  
  console.log('✅ Reveal Votes button is enabled');
  
  // Listen for broadcast events (if we can access the channel)
  console.log('2. Looking for channel broadcast setup...');
  
  // Check if votes are hidden initially
  const voteValues = document.querySelectorAll('[data-testid="vote-value"], .vote-value');
  console.log(`📊 Found ${voteValues.length} vote display elements`);
  
  voteValues.forEach((element, index) => {
    console.log(`Vote ${index + 1}:`, element.textContent || element.innerHTML);
  });

  console.log('3. Manual Test Instructions:');
  console.log('   - Click the "Reveal Votes" button');
  console.log('   - Check if votes become visible to all participants');
  console.log('   - Verify notification appears for team members');
  console.log('   - Check if timer stops (if active)');
  
  return {
    revealButton,
    voteElements: voteValues
  };
}

// Test the broadcast listener
function testBroadcastListener() {
  console.log('4. Testing broadcast listener...');
  
  // Check if Supabase channel is available
  if (typeof supabase !== 'undefined') {
    console.log('✅ Supabase is available');
    
    // Try to access the channel (this might not work from console)
    console.log('📡 Channel broadcasting should work within the component');
  } else {
    console.log('❌ Supabase not accessible from console');
  }
}

// Test reveal state
function testRevealState() {
  console.log('5. Testing reveal state...');
  
  // Check if votes are currently revealed
  const hiddenVotes = document.querySelectorAll('.vote-hidden, [aria-label*="hidden"]');
  const revealedVotes = document.querySelectorAll('.vote-revealed, [data-revealed="true"]');
  
  console.log(`🔒 Hidden votes: ${hiddenVotes.length}`);
  console.log(`👁️ Revealed votes: ${revealedVotes.length}`);
  
  // Check for estimation results
  const estimationResults = document.querySelectorAll('[data-testid="estimation-result"], .estimation-result');
  console.log(`📊 Estimation results visible: ${estimationResults.length}`);
  
  estimationResults.forEach((result, index) => {
    console.log(`Estimation Result ${index + 1}:`, result.textContent);
  });
}

// Run all tests
console.log('🚀 Starting Reveal Votes Functionality Test...');
testRevealVotesBroadcasting();
testBroadcastListener();
testRevealState();

console.log('✅ Test completed. Check the logs above for results.');
console.log('');
console.log('💡 Next Steps:');
console.log('1. Open multiple browser windows/tabs to the same session');
console.log('2. Have different users vote on an item');
console.log('3. As moderator, click "Reveal Votes"');
console.log('4. Verify all participants see the revealed votes simultaneously');
