// Quick test to verify if reveal votes broadcasting is working
// Run this in BOTH browser windows (moderator and team member)

console.log('🧪 REVEAL VOTES RECEIVER TEST');
console.log('=============================');

// Check if this user received the broadcast
console.log('Current user info:');
console.log('- Session ID:', window.location.pathname.match(/sessions\/([^\/]+)/)?.[1]);
console.log('- User role:', document.querySelector('[data-testid="user-role"]')?.textContent || 'Unknown');

// Check if votes are currently revealed
const voteElements = document.querySelectorAll('[data-testid*="vote"], .vote-item, .bg-gray-100');
let revealedVotes = 0;
let hiddenVotes = 0;

voteElements.forEach((element, index) => {
  const text = element.textContent || '';
  const isHidden = text.includes('•') || text.includes('?') || text.includes('hidden');
  const hasNumericValue = /\d+/.test(text) && !isHidden;
  const hasTShirtSize = /(XS|S|M|L|XL|XXL)/.test(text) && !isHidden;
  
  if (hasNumericValue || hasTShirtSize) {
    revealedVotes++;
    console.log(`Vote ${index + 1}: REVEALED - "${text.slice(0, 30)}"`);
  } else if (isHidden) {
    hiddenVotes++;
    console.log(`Vote ${index + 1}: HIDDEN - "${text.slice(0, 30)}"`);
  }
});

console.log('\n📊 VOTE VISIBILITY STATUS:');
console.log(`✅ Revealed votes: ${revealedVotes}`);
console.log(`🔒 Hidden votes: ${hiddenVotes}`);

if (revealedVotes > 0) {
  console.log('✅ SUCCESS: Votes are revealed! Broadcasting worked.');
} else if (hiddenVotes > 0) {
  console.log('❌ ISSUE: Votes are still hidden. Broadcast may not have been received.');
} else {
  console.log('⚠️ No votes found. Make sure you have votes to reveal.');
}

// Check for reveal votes button status
const revealButton = Array.from(document.querySelectorAll('button')).find(btn => 
  btn.textContent.includes('Reveal Votes')
);

if (revealButton) {
  console.log('\n🔵 REVEAL BUTTON STATUS:');
  console.log('- Button found:', true);
  console.log('- Button disabled:', revealButton.disabled);
  console.log('- Button visible:', !revealButton.hidden);
} else {
  console.log('\n✅ NO REVEAL BUTTON: This is normal for team members or when votes are already revealed');
}

// Check for recent notifications
const notifications = document.querySelectorAll('[class*="notification"], [class*="bg-green-500"], .animate-fade-in');
if (notifications.length > 0) {
  console.log('\n📢 ACTIVE NOTIFICATIONS:');
  notifications.forEach((notif, index) => {
    console.log(`${index + 1}. "${notif.textContent}"`);
  });
} else {
  console.log('\n📢 No active notifications found');
}

console.log('\n💡 INSTRUCTIONS:');
console.log('1. Run this test in BOTH browser windows (moderator + team member)');
console.log('2. Compare the results');
console.log('3. If votes are revealed in both windows, broadcasting is working!');
console.log('4. If votes are only revealed in moderator window, there\'s a broadcast issue');
