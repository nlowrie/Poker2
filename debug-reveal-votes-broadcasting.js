// Debug script for reveal votes broadcasting issue
// Run this in the browser console to diagnose the problem

console.log('🔧 REVEAL VOTES BROADCASTING DEBUGGER');
console.log('=====================================');

function debugRevealVotesBroadcasting() {
  console.log('\n1. 📊 CHECKING CHANNEL STATUS');
  console.log('==============================');
  
  // Check if we can access the React component state
  let reactFiber = null;
  try {
    // Try to find React Fiber from DOM
    const appRoot = document.querySelector('#root') || document.querySelector('[data-reactroot]');
    if (appRoot && appRoot._reactInternalInstance) {
      reactFiber = appRoot._reactInternalInstance;
    } else if (appRoot && appRoot._reactInternals) {
      reactFiber = appRoot._reactInternals;
    }
  } catch (e) {
    console.log('Could not access React internals');
  }
  
  // Check for Supabase
  if (typeof supabase !== 'undefined') {
    console.log('✅ Supabase is available');
    console.log('Supabase URL:', supabase.supabaseUrl);
  } else {
    console.log('❌ Supabase not accessible from console');
  }
  
  // Check current session/URL
  console.log('Current URL:', window.location.href);
  const sessionMatch = window.location.href.match(/sessions\/([^/?]+)/);
  if (sessionMatch) {
    console.log('✅ Session ID detected:', sessionMatch[1]);
  } else {
    console.log('❌ No session ID found in URL');
  }
  
  console.log('\n2. 🔍 CHECKING UI ELEMENTS');
  console.log('===========================');
  
  // Check for reveal votes button
  const revealButton = document.querySelector('button:has(.lucide-eye)') || 
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.includes('Reveal Votes')
                      );
  
  if (revealButton) {
    console.log('✅ Reveal Votes button found');
    console.log('Button text:', revealButton.textContent);
    console.log('Button disabled:', revealButton.disabled);
    console.log('Button classes:', revealButton.className);
  } else {
    console.log('❌ Reveal Votes button not found');
    console.log('Available buttons:', Array.from(document.querySelectorAll('button')).map(b => b.textContent));
  }
  
  // Check for votes
  const voteElements = document.querySelectorAll('[data-testid*="vote"], .vote-item, .bg-gray-100');
  console.log('Vote elements found:', voteElements.length);
  
  // Check for team votes section
  const teamVotesHeader = Array.from(document.querySelectorAll('h3')).find(h => h.textContent.includes('Team Votes'));
  console.log('Team Votes section found:', !!teamVotesHeader);
  
  console.log('\n3. 🔗 CHECKING NETWORK');
  console.log('======================');
  
  // Check WebSocket connections
  const wsConnections = performance.getEntriesByType('resource').filter(entry => 
    entry.name.includes('ws://') || entry.name.includes('wss://')
  );
  console.log('WebSocket connections:', wsConnections.length);
  
  // Check for Supabase realtime connections
  const realtimeConnections = performance.getEntriesByType('resource').filter(entry => 
    entry.name.includes('supabase') && (entry.name.includes('realtime') || entry.name.includes('ws'))
  );
  console.log('Supabase realtime connections:', realtimeConnections.length);
  
  console.log('\n4. 📡 TESTING BROADCAST CAPABILITY');
  console.log('==================================');
  
  if (typeof supabase !== 'undefined' && sessionMatch) {
    const testChannelName = `session-${sessionMatch[1]}`;
    console.log('Testing channel:', testChannelName);
    
    try {
      const testChannel = supabase.channel(testChannelName);
      console.log('✅ Test channel created successfully');
      
      // Try to subscribe
      testChannel.subscribe((status) => {
        console.log('📡 Test channel status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to test channel');
          
          // Try to send a test broadcast
          testChannel.send({
            type: 'broadcast',
            event: 'debug-test',
            payload: { message: 'Debug test message', timestamp: new Date().toISOString() }
          }).then((result) => {
            console.log('✅ Test broadcast sent successfully:', result);
          }).catch((error) => {
            console.error('❌ Test broadcast failed:', error);
          });
          
          // Clean up
          setTimeout(() => {
            testChannel.unsubscribe();
            console.log('🔌 Test channel unsubscribed');
          }, 2000);
        } else {
          console.log('❌ Test channel subscription failed:', status);
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to create test channel:', error);
    }
  } else {
    console.log('❌ Cannot test broadcast - missing Supabase or session ID');
  }
  
  console.log('\n5. 📝 RECOMMENDATIONS');
  console.log('======================');
  console.log('To fix reveal votes broadcasting:');
  console.log('1. Ensure all users are subscribed to the same channel');
  console.log('2. Check that the channel name format is consistent');
  console.log('3. Verify Supabase real-time is properly configured');
  console.log('4. Check browser console for any JavaScript errors');
  console.log('5. Ensure users have proper authentication');
  
  return {
    hasSupabase: typeof supabase !== 'undefined',
    hasRevealButton: !!revealButton,
    sessionId: sessionMatch ? sessionMatch[1] : null,
    voteElementsCount: voteElements.length
  };
}

// Auto-run the debugger
const debugResults = debugRevealVotesBroadcasting();
console.log('\n🎯 DEBUG RESULTS:', debugResults);

// Additional manual test function
window.testRevealVotesBroadcast = function() {
  console.log('\n🧪 MANUAL REVEAL VOTES TEST');
  console.log('============================');
  
  const revealButton = document.querySelector('button:has(.lucide-eye)') || 
                      Array.from(document.querySelectorAll('button')).find(btn => 
                        btn.textContent.includes('Reveal Votes')
                      );
  
  if (revealButton && !revealButton.disabled) {
    console.log('🖱️ Clicking reveal votes button...');
    
    // Add event listener to capture the click
    revealButton.addEventListener('click', function() {
      console.log('📡 Reveal votes button clicked!');
      console.log('Checking for broadcast logs in 2 seconds...');
      
      setTimeout(() => {
        console.log('✅ If you see broadcast logs above, the button is working');
        console.log('❌ If no broadcast logs, there may be a channel issue');
      }, 2000);
    }, { once: true });
    
    revealButton.click();
  } else {
    console.log('❌ Cannot test - button not found or disabled');
  }
};

console.log('\n💡 Run window.testRevealVotesBroadcast() to test the button click');
