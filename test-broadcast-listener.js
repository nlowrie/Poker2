// Test if the user can receive broadcasts at all
// Run this in the team member window BEFORE clicking reveal votes

console.log('🎯 BROADCAST LISTENER TEST');
console.log('==========================');

// Check if Supabase is available
if (typeof supabase === 'undefined') {
  console.error('❌ Supabase not available');
} else {
  console.log('✅ Supabase available');
  
  // Get session ID
  const sessionId = window.location.pathname.match(/sessions\/([^\/]+)/)?.[1];
  if (!sessionId) {
    console.error('❌ No session ID found');
  } else {
    console.log('✅ Session ID:', sessionId);
    
    // Create test listener
    const testChannel = supabase.channel(`session-${sessionId}`);
    
    // Listen for ANY broadcast events
    testChannel
      .on('broadcast', { event: 'votes-revealed' }, (payload) => {
        console.log('🎉 VOTES-REVEALED BROADCAST RECEIVED!', payload);
        console.log('✅ Broadcasting is working for this user!');
      })
      .on('broadcast', { event: 'vote-submitted' }, (payload) => {
        console.log('📝 Vote submitted broadcast received:', payload);
      })
      .on('broadcast', { event: 'test-broadcast' }, (payload) => {
        console.log('🧪 Test broadcast received:', payload);
      })
      .subscribe((status) => {
        console.log('📡 Test channel status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Test listener successfully subscribed');
          console.log('💡 Now click "Reveal Votes" in the moderator window');
          console.log('🔍 Watch for "VOTES-REVEALED BROADCAST RECEIVED!" message');
          
          // Send a test broadcast to verify bidirectional communication
          setTimeout(() => {
            testChannel.send({
              type: 'broadcast',
              event: 'test-broadcast',
              payload: { 
                message: 'Test from team member', 
                timestamp: new Date().toISOString(),
                sender: 'test-listener'
              }
            }).then(() => {
              console.log('📤 Test broadcast sent from this user');
            }).catch((error) => {
              console.error('❌ Failed to send test broadcast:', error);
            });
          }, 1000);
          
        } else {
          console.error('❌ Test listener subscription failed:', status);
        }
      });
    
    // Auto cleanup after 5 minutes
    setTimeout(() => {
      testChannel.unsubscribe();
      console.log('🔌 Test listener cleaned up');
    }, 300000);
    
    // Store reference for manual cleanup
    window.testBroadcastChannel = testChannel;
  }
}

console.log('\n📋 MANUAL CLEANUP:');
console.log('Run: window.testBroadcastChannel?.unsubscribe()');
