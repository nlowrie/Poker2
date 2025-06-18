// Comprehensive Reveal Votes Broadcasting Test
// Instructions: Run this test to verify reveal votes functionality

console.log('🧪 COMPREHENSIVE REVEAL VOTES BROADCASTING TEST');
console.log('==============================================');

function testRevealVotesBroadcasting() {
  console.log('\n1. 📊 PRE-REVEAL STATE CHECK');
  console.log('============================');
  
  // Check current state
  const revealButton = document.querySelector('button[class*="bg-blue-600"]:has(.lucide-eye)');
  const teamVotesSection = document.querySelector('h3:contains("Team Votes")');
  const voteElements = document.querySelectorAll('[data-testid*="vote"], .vote-item, .bg-gray-100');
  
  console.log('🔍 Current State:', {
    revealButtonExists: !!revealButton,
    revealButtonDisabled: revealButton?.disabled || false,
    teamVotesSectionExists: !!teamVotesSection,
    voteElementsCount: voteElements.length,
    currentUrl: window.location.href
  });
  
  // Check if user is moderator
  const moderatorControls = document.querySelectorAll('[class*="moderator"], button:contains("Start Timer"), button:contains("Reveal Votes")');
  console.log('👤 User Role Check:', {
    hasModeratorControls: moderatorControls.length > 0,
    moderatorControlsCount: moderatorControls.length
  });
  
  console.log('\n2. 🔒 VOTES VISIBILITY CHECK');
  console.log('============================');
  
  // Check if votes are currently hidden
  voteElements.forEach((element, index) => {
    const isHidden = element.textContent.includes('•') || element.textContent.includes('?') || element.classList.contains('vote-hidden');
    console.log(`Vote ${index + 1}:`, {
      element: element.tagName,
      content: element.textContent?.slice(0, 50) + '...',
      isHidden: isHidden,
      classes: element.className
    });
  });
  
  return {
    revealButton,
    voteElements,
    canTest: !!revealButton && !revealButton.disabled
  };
}

function simulateRevealVotesClick() {
  console.log('\n3. 🎯 REVEAL VOTES SIMULATION');
  console.log('==============================');
  
  const revealButton = document.querySelector('button[class*="bg-blue-600"]:has(.lucide-eye)');
  
  if (!revealButton) {
    console.log('❌ Cannot simulate - Reveal Votes button not found');
    console.log('💡 Make sure you are:');
    console.log('   - Logged in as a Moderator');
    console.log('   - In a voting session with votes');
    console.log('   - Votes are not already revealed');
    return false;
  }
  
  if (revealButton.disabled) {
    console.log('❌ Cannot simulate - Reveal Votes button is disabled');
    return false;
  }
  
  console.log('🖱️ Simulating Reveal Votes button click...');
  
  // Add click listener to intercept and log
  const originalOnClick = revealButton.onclick;
  revealButton.onclick = function(event) {
    console.log('📡 Reveal Votes clicked! Event details:', {
      timestamp: new Date().toISOString(),
      buttonText: this.textContent,
      buttonClasses: this.className
    });
    
    // Call original handler
    if (originalOnClick) {
      return originalOnClick.call(this, event);
    }
  };
  
  // Simulate click
  revealButton.click();
  
  console.log('✅ Reveal Votes click simulated');
  return true;
}

function checkPostRevealState() {
  console.log('\n4. 👁️ POST-REVEAL STATE CHECK');
  console.log('==============================');
  
  setTimeout(() => {
    const voteElements = document.querySelectorAll('[data-testid*="vote"], .vote-item, .bg-gray-100');
    const notifications = document.querySelectorAll('[class*="notification"], [class*="bg-green-500"], .animate-fade-in');
    const estimationResults = document.querySelectorAll('[data-testid*="estimation"], .estimation-result, [class*="consensus"]');
    const revealButton = document.querySelector('button[class*="bg-blue-600"]:has(.lucide-eye)');
    
    console.log('📊 Post-Reveal Analysis:', {
      voteElementsCount: voteElements.length,
      notificationsCount: notifications.length,
      estimationResultsCount: estimationResults.length,
      revealButtonVisible: !!revealButton,
      timestamp: new Date().toISOString()
    });
    
    // Check if votes are now visible
    console.log('\n🔍 Vote Visibility After Reveal:');
    voteElements.forEach((element, index) => {
      const content = element.textContent || '';
      const hasNumericValue = /\d+/.test(content) && !content.includes('•');
      const hasTShirtSize = /(XS|S|M|L|XL|XXL)/.test(content) && !content.includes('•');
      
      console.log(`Vote ${index + 1}:`, {
        content: content.slice(0, 50),
        hasNumericValue,
        hasTShirtSize,
        isRevealed: hasNumericValue || hasTShirtSize
      });
    });
    
    // Check notifications
    console.log('\n📢 Notifications:');
    notifications.forEach((notification, index) => {
      console.log(`Notification ${index + 1}:`, notification.textContent);
    });
    
    // Check estimation results
    console.log('\n🎯 Estimation Results:');
    estimationResults.forEach((result, index) => {
      console.log(`Result ${index + 1}:`, result.textContent);
    });
    
  }, 1000); // Wait 1 second for UI updates
  
  setTimeout(() => {
    console.log('\n5. 🔄 BROADCAST VERIFICATION');
    console.log('============================');
    console.log('💡 To verify broadcasting works:');
    console.log('   1. Open another browser window/tab to the same session');
    console.log('   2. Login as a different user (Team Member)');
    console.log('   3. Check if votes are revealed there too');
    console.log('   4. Look for notification "Votes have been revealed!"');
    console.log('');
    console.log('🧪 Test completed! Check console logs above for detailed results.');
  }, 2000);
}

function runFullTest() {
  console.log('🚀 STARTING FULL REVEAL VOTES TEST...\n');
  
  const preTestResults = testRevealVotesBroadcasting();
  
  if (preTestResults.canTest) {
    console.log('✅ Pre-test passed - attempting reveal votes simulation');
    const clickResult = simulateRevealVotesClick();
    
    if (clickResult) {
      console.log('✅ Click simulation successful - checking post-reveal state');
      checkPostRevealState();
    }
  } else {
    console.log('❌ Cannot proceed with test - requirements not met');
    console.log('\n💡 SETUP INSTRUCTIONS:');
    console.log('=======================');
    console.log('1. Login as a Moderator');
    console.log('2. Create or join a planning session');
    console.log('3. Add backlog items to the session');
    console.log('4. Have team members vote on an item');
    console.log('5. Run this test again');
  }
}

// Auto-run the test
runFullTest();
