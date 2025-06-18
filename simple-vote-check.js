/**
 * Simple First Vote Display Verification
 * No console.log interception - just DOM checking
 */

console.log('🎯 Simple First Vote Display Test');

// Simple function to check Team Votes section
function checkTeamVotes() {
  const teamVotesSection = document.querySelector('.space-y-3');
  
  if (!teamVotesSection) {
    console.log('❌ Team Votes section not found');
    return { found: false, votes: [] };
  }

  const voteElements = teamVotesSection.querySelectorAll('.flex.items-center.justify-between.p-3');
  const votes = Array.from(voteElements).map(el => {
    const nameElement = el.querySelector('.font-medium.text-gray-900');
    const pointsElement = el.querySelector('.px-3.py-1.rounded-lg.font-bold');
    
    return {
      name: nameElement ? nameElement.textContent.trim() : 'Unknown',
      points: pointsElement ? pointsElement.textContent.trim() : 'No points'
    };
  });
  
  console.log(`📊 Found ${votes.length} votes in Team Votes section:`);
  votes.forEach((vote, index) => {
    console.log(`   ${index + 1}. ${vote.name} - ${vote.points}`);
  });
  
  // Check specifically for nicholas.d.lowrie
  const nicholasVote = votes.find(v => v.name === 'nicholas.d.lowrie');
  if (nicholasVote) {
    console.log('✅ SUCCESS: Nicholas vote is visible!');
    console.log(`   Name: ${nicholasVote.name}`);
    console.log(`   Points: ${nicholasVote.points}`);
    return { found: true, votes, nicholasVisible: true };
  } else {
    console.log('❌ Nicholas vote not found in Team Votes section');
    return { found: true, votes, nicholasVisible: false };
  }
}

// Run initial check
console.log('🔍 Initial Team Votes check:');
checkTeamVotes();

// Set up simple interval checking
let checkCount = 0;
const maxChecks = 20;

const intervalCheck = setInterval(() => {
  checkCount++;
  console.log(`\n🔍 Check ${checkCount}/${maxChecks}:`);
  
  const result = checkTeamVotes();
  
  if (result.nicholasVisible) {
    console.log('🎉 TEST PASSED: First vote display is working!');
    clearInterval(intervalCheck);
  } else if (checkCount >= maxChecks) {
    console.log('⏰ Test completed after maximum checks');
    clearInterval(intervalCheck);
  }
}, 2000);

// Manual check function
window.checkVotesNow = () => {
  console.log('\n🔍 Manual check:');
  return checkTeamVotes();
};

// Cleanup function
window.cleanupSimpleTest = () => {
  clearInterval(intervalCheck);
  console.log('🧹 Simple test cleaned up');
};

console.log('📝 Instructions:');
console.log('1. Run this test in testmod\'s console');
console.log('2. Have nicholas.d.lowrie vote');
console.log('3. Watch for vote to appear in checks');
console.log('');
console.log('💡 Manual commands:');
console.log('   checkVotesNow() - Check votes immediately');
console.log('   cleanupSimpleTest() - Stop the test');
