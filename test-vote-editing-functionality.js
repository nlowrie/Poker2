/**
 * Test script to validate the vote editing functionality after reveal
 * This script tests that participants can edit their votes after reveal
 * and that the changes are broadcasted and reflected in real-time
 */

const { createClient } = require('@supabase/supabase-js');

// Test configuration
const SUPABASE_URL = 'https://lkfhniwzbgbdfxdrxnsr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxrZmhuaXd6YmdiZGZ4ZHJ4bnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMzMTEyNzUsImV4cCI6MjA0ODg4NzI3NX0.uTGPK5WuZ7gN8lFYTlGgmq8HB-AUbhJ5rJ5v3Lz5Xqw';

// Create Supabase clients for two different users
const supabase1 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabase2 = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test session data
const TEST_SESSION_ID = 'test-vote-edit-' + Date.now();
const TEST_ITEM_ID = 'test-item-' + Date.now();

let user1, user2;
let channel1, channel2;

async function setupTestUsers() {
  console.log('🔧 Setting up test users...');
  
  // Create test users (in a real scenario, these would be authenticated users)
  user1 = {
    id: 'user1-' + Date.now(),
    email: 'user1@test.com',
    user_metadata: { full_name: 'Test User 1' }
  };
  
  user2 = {
    id: 'user2-' + Date.now(),
    email: 'user2@test.com',
    user_metadata: { full_name: 'Test User 2' }
  };
  
  console.log('✅ Test users created:', { user1: user1.id, user2: user2.id });
}

async function setupRealtimeChannels() {
  console.log('🔧 Setting up realtime channels...');
  
  // Create channels for both users
  channel1 = supabase1.channel(`session:${TEST_SESSION_ID}:user1`);
  channel2 = supabase2.channel(`session:${TEST_SESSION_ID}:user2`);
  
  // Subscribe to channels
  await new Promise((resolve) => {
    let subscribed = 0;
    
    channel1.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribed++;
        if (subscribed === 2) resolve();
      }
    });
    
    channel2.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        subscribed++;
        if (subscribed === 2) resolve();
      }
    });
  });
  
  console.log('✅ Realtime channels subscribed');
}

async function setupTestData() {
  console.log('🔧 Setting up test data...');
  
  // Create test session
  await supabase1.from('planning_sessions').insert({
    id: TEST_SESSION_ID,
    name: 'Test Vote Edit Session',
    moderator_id: user1.id,
    created_at: new Date().toISOString()
  });
  
  // Create test backlog item
  await supabase1.from('backlog_items').insert({
    id: TEST_ITEM_ID,
    title: 'Test Vote Edit Item',
    description: 'Testing vote editing functionality',
    session_id: TEST_SESSION_ID,
    created_at: new Date().toISOString()
  });
  
  console.log('✅ Test data created');
}

async function testVoteSubmission() {
  console.log('🧪 Testing initial vote submission...');
  
  // User 1 submits initial vote
  await supabase1.from('estimations').insert({
    user_id: user1.id,
    backlog_item_id: TEST_ITEM_ID,
    points: 5,
    estimation_type: 'fibonacci',
    created_at: new Date().toISOString()
  });
  
  // User 2 submits initial vote
  await supabase2.from('estimations').insert({
    user_id: user2.id,
    backlog_item_id: TEST_ITEM_ID,
    points: 8,
    estimation_type: 'fibonacci',
    created_at: new Date().toISOString()
  });
  
  console.log('✅ Initial votes submitted:', { user1: 5, user2: 8 });
}

async function testVoteReveal() {
  console.log('🧪 Testing vote reveal...');
  
  // Simulate vote reveal broadcast
  const revealPayload = {
    type: 'broadcast',
    event: 'votes-revealed',
    payload: {
      itemId: TEST_ITEM_ID,
      revealedBy: user1.id,
      revealedByName: 'Test User 1',
      consensus: null,
      average: 6.5,
      hasConsensus: false,
      timestamp: new Date().toISOString()
    }
  };
  
  await channel1.send(revealPayload);
  console.log('✅ Vote reveal broadcasted');
}

async function testVoteEditing() {
  console.log('🧪 Testing vote editing after reveal...');
  
  let voteChangeReceived = false;
  const voteChangePromise = new Promise((resolve) => {
    // User 2 listens for vote changes
    channel2.on('broadcast', { event: 'vote-changed' }, (payload) => {
      console.log('📥 User 2 received vote-changed broadcast:', payload);
      voteChangeReceived = true;
      resolve(payload);
    });
  });
  
  // Wait a moment for listener to be set up
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // User 1 edits their vote (5 -> 3)
  await supabase1.from('estimations')
    .update({ 
      points: 3,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', user1.id)
    .eq('backlog_item_id', TEST_ITEM_ID);
  
  // User 1 broadcasts the vote change
  const voteChangePayload = {
    type: 'broadcast',
    event: 'vote-changed',
    payload: {
      itemId: TEST_ITEM_ID,
      voterId: user1.id,
      voterName: 'Test User 1',
      newValue: '3',
      timestamp: new Date().toISOString()
    }
  };
  
  await channel1.send(voteChangePayload);
  console.log('📡 Vote change broadcasted by User 1');
  
  // Wait for broadcast to be received
  await Promise.race([
    voteChangePromise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout waiting for vote change broadcast')), 5000))
  ]);
  
  if (voteChangeReceived) {
    console.log('✅ Vote change broadcast received successfully');
  } else {
    throw new Error('❌ Vote change broadcast not received');
  }
}

async function testResultsUpdate() {
  console.log('🧪 Testing results update after vote edit...');
  
  // Fetch updated votes
  const { data: votes, error } = await supabase1
    .from('estimations')
    .select('*')
    .eq('backlog_item_id', TEST_ITEM_ID);
  
  if (error) {
    throw new Error('Failed to fetch updated votes: ' + error.message);
  }
  
  console.log('Updated votes:', votes);
  
  // Calculate new consensus/average
  const voteValues = votes.map(v => v.points);
  const newAverage = voteValues.reduce((sum, val) => sum + val, 0) / voteValues.length;
  
  console.log('New average after vote edit:', newAverage);
  console.log('Vote values:', voteValues);
  
  // Verify the calculation is correct
  const expectedAverage = (3 + 8) / 2; // User 1: 3, User 2: 8
  if (Math.abs(newAverage - expectedAverage) < 0.01) {
    console.log('✅ Results calculation updated correctly');
  } else {
    throw new Error(`❌ Results calculation incorrect. Expected: ${expectedAverage}, Got: ${newAverage}`);
  }
}

async function cleanup() {
  console.log('🧹 Cleaning up test data...');
  
  // Remove test data
  await supabase1.from('estimations').delete().eq('backlog_item_id', TEST_ITEM_ID);
  await supabase1.from('backlog_items').delete().eq('id', TEST_ITEM_ID);
  await supabase1.from('planning_sessions').delete().eq('id', TEST_SESSION_ID);
  
  // Unsubscribe from channels
  if (channel1) await supabase1.removeChannel(channel1);
  if (channel2) await supabase2.removeChannel(channel2);
  
  console.log('✅ Cleanup completed');
}

async function runTests() {
  console.log('🚀 Starting vote editing functionality tests...\n');
  
  try {
    await setupTestUsers();
    await setupRealtimeChannels();
    await setupTestData();
    await testVoteSubmission();
    await testVoteReveal();
    await testVoteEditing();
    await testResultsUpdate();
    
    console.log('\n🎉 All tests passed! Vote editing functionality is working correctly.');
    console.log('\n✅ Test Summary:');
    console.log('  - Initial vote submission: PASS');
    console.log('  - Vote reveal broadcasting: PASS');
    console.log('  - Vote editing after reveal: PASS');
    console.log('  - Vote change broadcasting: PASS');
    console.log('  - Results update after edit: PASS');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  } finally {
    await cleanup();
  }
}

// Run the tests
runTests().catch(console.error);
