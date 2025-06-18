// Test script to debug item ID mismatch in reveal votes broadcast
console.log('🔍 Testing reveal votes broadcast item ID matching...');

// This script can be run in the browser console of a team member window
// Run this right after seeing the "Skipping reveal votes broadcast" message

function debugRevealVotesBroadcast() {
  console.log('=== REVEAL VOTES BROADCAST DEBUG ===');
  
  // Get current state
  const sessionData = JSON.parse(localStorage.getItem('planningSessionData') || '{}');
  const currentSessionId = sessionData.sessionId;
  
  console.log('📋 Session Info:', {
    sessionId: currentSessionId,
    sessionItemsCount: sessionData.items?.length || 0,
    sessionItems: sessionData.items?.map(item => ({
      id: item.id,
      title: item.title
    })) || []
  });
  
  // Try to get current item from URL or state
  const urlParams = new URLSearchParams(window.location.search);
  const sessionIdFromUrl = urlParams.get('sessionId');
  const itemIndexFromUrl = urlParams.get('itemIndex');
  
  console.log('🔗 URL Info:', {
    sessionIdFromUrl,
    itemIndexFromUrl,
    fullUrl: window.location.href
  });
  
  // Check if React state exists and what it contains
  if (window.React && window.React.version) {
    console.log('⚛️ React version:', window.React.version);
  }
  
  return {
    sessionId: currentSessionId,
    sessionItems: sessionData.items || [],
    urlSessionId: sessionIdFromUrl,
    urlItemIndex: itemIndexFromUrl
  };
}

// Run the debug function
const debugResult = debugRevealVotesBroadcast();

// Also provide a helper function to manually check item matching
window.testItemMatch = function(broadcastItemId) {
  const sessionItems = debugResult.sessionItems;
  const hasMatch = sessionItems.some(item => item.id === broadcastItemId);
  
  console.log('🎯 Item Match Test:', {
    broadcastItemId,
    sessionItemIds: sessionItems.map(item => item.id),
    hasMatch,
    sessionItemsCount: sessionItems.length
  });
  
  return hasMatch;
};

console.log('💡 Use testItemMatch("item-id-here") to test if an item ID matches session items');
console.log('💡 Example: testItemMatch("7dc9f68b-6c60-4eba-9900-79ad3286a45e")');
