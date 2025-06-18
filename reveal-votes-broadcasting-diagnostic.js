// Comprehensive Test for Reveal Votes Broadcasting Issue
// Run this script to diagnose and test the reveal votes broadcasting

console.log('🚨 REVEAL VOTES BROADCASTING ISSUE DIAGNOSTIC');
console.log('=============================================');

// Step 1: Test the broadcasting setup
function testBroadcastingSetup() {
  console.log('\n📡 STEP 1: TESTING BROADCASTING SETUP');
  console.log('======================================');
  
  // Check if user is in a session
  const sessionId = window.location.pathname.match(/sessions\/([^\/]+)/)?.[1];
  if (!sessionId) {
    console.error('❌ No session ID found in URL');
    return false;
  }
  console.log('✅ Session ID found:', sessionId);
  
  // Check if Supabase is available
  if (typeof supabase === 'undefined') {
    console.error('❌ Supabase not available');
    return false;
  }
  console.log('✅ Supabase available');
  
  return { sessionId };
}

// Step 2: Test channel connection
async function testChannelConnection(sessionId) {
  console.log('\n🔗 STEP 2: TESTING CHANNEL CONNECTION');
  console.log('=====================================');
  
  try {
    const testChannel = supabase.channel(`session-${sessionId}`);
    
    return new Promise((resolve) => {
      let subscribed = false;
      
      testChannel
        .on('broadcast', { event: 'debug-test' }, (payload) => {
          console.log('✅ Test broadcast received:', payload);
        })
        .subscribe((status) => {
          console.log('📡 Channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            subscribed = true;
            console.log('✅ Successfully subscribed to test channel');
            
            // Send test broadcast
            testChannel.send({
              type: 'broadcast',
              event: 'debug-test',
              payload: { message: 'Test message', timestamp: new Date().toISOString() }
            }).then((result) => {
              console.log('✅ Test broadcast sent:', result);
              testChannel.unsubscribe();
              resolve(true);
            }).catch((error) => {
              console.error('❌ Test broadcast failed:', error);
              testChannel.unsubscribe();
              resolve(false);
            });
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.error('❌ Channel subscription failed:', status);
            resolve(false);
          }
        });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!subscribed) {
          console.error('❌ Channel subscription timed out');
          testChannel.unsubscribe();
          resolve(false);
        }
      }, 5000);
    });
  } catch (error) {
    console.error('❌ Failed to create test channel:', error);
    return false;
  }
}

// Step 3: Check UI state
function checkUIState() {
  console.log('\n🖼️ STEP 3: CHECKING UI STATE');
  console.log('=============================');
  
  // Check for reveal votes button
  const revealButton = Array.from(document.querySelectorAll('button')).find(btn => 
    btn.textContent.includes('Reveal Votes')
  );
  
  if (!revealButton) {
    console.error('❌ Reveal Votes button not found');
    console.log('Available buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent.trim()));
    return false;
  }
  
  console.log('✅ Reveal Votes button found');
  console.log('Button text:', revealButton.textContent);
  console.log('Button disabled:', revealButton.disabled);
  
  // Check if votes are present
  const voteElements = document.querySelectorAll('[class*="vote"], [data-testid*="vote"]');
  console.log('Vote elements found:', voteElements.length);
  
  if (voteElements.length === 0) {
    console.warn('⚠️ No vote elements found - make sure there are votes to reveal');
  }
  
  // Check user role
  const userRoleIndicators = document.querySelectorAll('[data-role], [class*="moderator"]');
  console.log('User role indicators found:', userRoleIndicators.length);
  
  return { revealButton, voteElements };
}

// Step 4: Simulate reveal votes and monitor
function simulateRevealVotes(revealButton) {
  console.log('\n🎯 STEP 4: SIMULATING REVEAL VOTES');
  console.log('==================================');
  
  return new Promise((resolve) => {
    let broadcastReceived = false;
    let broadcastSent = false;
    
    // Monitor console for broadcast logs
    const originalConsoleLog = console.log;
    const originalConsoleWarn = console.warn;
    const originalConsoleError = console.error;
    
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string') {
        if (args[0].includes('BROADCASTING REVEAL VOTES')) {
          broadcastSent = true;
          console.log('🚀 DETECTED: Broadcast attempt');
        } else if (args[0].includes('RECEIVED REVEAL VOTES BROADCAST')) {
          broadcastReceived = true;
          console.log('📥 DETECTED: Broadcast received');
        }
      }
      originalConsoleLog.apply(console, args);
    };
    
    // Click the button
    console.log('🖱️ Clicking Reveal Votes button...');
    revealButton.click();
    
    // Check results after 3 seconds
    setTimeout(() => {
      console.log = originalConsoleLog;
      console.warn = originalConsoleWarn;
      console.error = originalConsoleError;
      
      console.log('\n📊 REVEAL VOTES TEST RESULTS:');
      console.log('==============================');
      console.log('Broadcast sent:', broadcastSent ? '✅' : '❌');
      console.log('Broadcast received:', broadcastReceived ? '✅' : '❌');
      
      if (broadcastSent && !broadcastReceived) {
        console.log('🔍 DIAGNOSIS: Broadcast sent but not received - possible channel issue');
      } else if (!broadcastSent) {
        console.log('🔍 DIAGNOSIS: Broadcast not sent - check moderator permissions and channel connection');
      } else if (broadcastSent && broadcastReceived) {
        console.log('🔍 DIAGNOSIS: Broadcasting working correctly');
      }
      
      resolve({ broadcastSent, broadcastReceived });
    }, 3000);
  });
}

// Step 5: Multi-user test instructions
function multiUserTestInstructions() {
  console.log('\n👥 STEP 5: MULTI-USER TEST INSTRUCTIONS');
  console.log('========================================');
  console.log('To test with multiple users:');
  console.log('1. Open another browser window/tab (or incognito mode)');
  console.log('2. Login as a different user (Team Member)');
  console.log('3. Join the same session');
  console.log('4. In the original window (Moderator), run: window.testRevealVotesMultiUser()');
  console.log('5. Watch both windows for synchronized vote reveals');
  
  // Create multi-user test function
  window.testRevealVotesMultiUser = function() {
    console.log('🧪 MULTI-USER REVEAL VOTES TEST');
    console.log('================================');
    
    const revealButton = Array.from(document.querySelectorAll('button')).find(btn => 
      btn.textContent.includes('Reveal Votes')
    );
    
    if (revealButton && !revealButton.disabled) {
      console.log('🖱️ Clicking reveal votes for multi-user test...');
      console.log('👀 Watch other browser windows for synchronized updates');
      revealButton.click();
      
      setTimeout(() => {
        console.log('✅ Multi-user test completed');
        console.log('Check other browser windows to see if votes were revealed there too');
      }, 2000);
    } else {
      console.log('❌ Cannot run multi-user test - button not available');
    }
  };
}

// Main diagnostic function
async function runRevealVotesDiagnostic() {
  console.log('🚀 STARTING REVEAL VOTES DIAGNOSTIC...\n');
  
  // Step 1: Test setup
  const setupResult = testBroadcastingSetup();
  if (!setupResult) {
    console.log('\n❌ DIAGNOSTIC FAILED: Setup issues');
    return;
  }
  
  // Step 2: Test channel
  const channelResult = await testChannelConnection(setupResult.sessionId);
  if (!channelResult) {
    console.log('\n❌ DIAGNOSTIC FAILED: Channel connection issues');
    return;
  }
  
  // Step 3: Check UI
  const uiResult = checkUIState();
  if (!uiResult) {
    console.log('\n❌ DIAGNOSTIC FAILED: UI state issues');
    return;
  }
  
  // Step 4: Simulate reveal votes
  if (uiResult.revealButton && !uiResult.revealButton.disabled) {
    const simulationResult = await simulateRevealVotes(uiResult.revealButton);
    
    if (!simulationResult.broadcastSent) {
      console.log('\n🔧 TROUBLESHOOTING STEPS:');
      console.log('1. Check that you are logged in as a Moderator');
      console.log('2. Verify that there are votes to reveal');
      console.log('3. Check browser console for JavaScript errors');
      console.log('4. Refresh the page and try again');
    }
  } else {
    console.log('\n⚠️ Cannot simulate - button not available or disabled');
  }
  
  // Step 5: Multi-user instructions
  multiUserTestInstructions();
  
  console.log('\n✅ DIAGNOSTIC COMPLETED');
  console.log('Check the results above for issues and recommendations');
}

// Auto-run the diagnostic
runRevealVotesDiagnostic();
