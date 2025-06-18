// Test to verify the reveal votes broadcasting fix
// Run this in the team member browser window

console.log('🔧 REVEAL VOTES BROADCASTING FIX TEST');
console.log('=====================================');

console.log('\n📊 CURRENT STATE CHECK:');
console.log('========================');

// Check current item state
const currentItemElement = document.querySelector('[data-testid="current-item"]');
console.log('Current item in DOM:', currentItemElement?.textContent || 'Not found');

// Check vote visibility
const voteElements = document.querySelectorAll('[data-testid*="vote"], .vote-item, .bg-gray-100');
let revealedCount = 0;
let hiddenCount = 0;

voteElements.forEach((element, index) => {
  const text = element.textContent || '';
  const isRevealed = /\d+/.test(text) && !text.includes('•') && !text.includes('?');
  if (isRevealed) {
    revealedCount++;
    console.log(`Vote ${index + 1}: REVEALED - "${text.slice(0, 20)}"`);
  } else {
    hiddenCount++;
    console.log(`Vote ${index + 1}: HIDDEN - "${text.slice(0, 20)}"`);
  }
});

console.log(`\n📈 Vote Status: ${revealedCount} revealed, ${hiddenCount} hidden`);

// Check for reveal button (should not exist for team members when votes are revealed)
const revealButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.includes('Reveal Votes')
);

if (revealButton) {
  console.log('🔵 Reveal button found (unusual for team member)');
} else {
  console.log('✅ No reveal button found (correct for team member)');
}

// Check notifications
const notifications = document.querySelectorAll('[class*="notification"], [class*="bg-green-500"], .animate-fade-in');
if (notifications.length > 0) {
  console.log('\n📢 Active notifications:');
  notifications.forEach((notif, index) => {
    console.log(`${index + 1}. "${notif.textContent}"`);
  });
} else {
  console.log('\n📢 No active notifications');
}

console.log('\n🧪 BROADCASTING FIX STATUS:');
console.log('===========================');

if (revealedCount > 0) {
  console.log('✅ SUCCESS: Votes are revealed! The fix is working.');
  console.log('💡 The reveal votes broadcasting is now functioning correctly.');
} else if (hiddenCount > 0) {
  console.log('🔄 TESTING NEEDED: Votes are hidden.');
  console.log('💡 Go to the moderator window and click "Reveal Votes" to test the fix.');
} else {
  console.log('⚠️ NO VOTES: No votes found to test with.');
  console.log('💡 Make sure there are votes submitted before testing reveal functionality.');
}

console.log('\n📋 NEXT STEPS:');
console.log('===============');
console.log('1. If votes are hidden, have the moderator click "Reveal Votes"');
console.log('2. Watch this console for broadcast messages');
console.log('3. Verify votes become visible automatically');
console.log('4. Check for notification about votes being revealed');

// Set up a quick listener to catch the next broadcast
if (typeof supabase !== 'undefined') {
  const sessionId = window.location.pathname.match(/sessions\/([^\/]+)/)?.[1];
  if (sessionId) {
    console.log('\n🎯 Setting up broadcast listener for next reveal...');
    
    const quickTestChannel = supabase.channel(`quicktest-${sessionId}`);
    quickTestChannel
      .on('broadcast', { event: 'votes-revealed' }, (payload) => {
        console.log('🎉 BROADCAST RECEIVED! Fix is working!', payload);
        console.log('✅ Reveal votes broadcasting is now functional');
        quickTestChannel.unsubscribe();
      })
      .subscribe();
      
    // Auto cleanup
    setTimeout(() => {
      quickTestChannel.unsubscribe();
      console.log('🔌 Quick test listener cleaned up');
    }, 60000);
  }
} else {
  console.log('\n⚠️ Cannot set up test listener - Supabase not accessible');
}
