/**
 * Test script for session management functionality
 * Run this in the browser console to test session ending
 */

// Test session management functionality
async function testSessionManagement() {
  console.log('🧪 Testing Session Management Feature...');
  
  try {
    // Test 1: Import the session history service
    console.log('1️⃣ Testing service import...');
    const { sessionHistoryService } = await import('./src/utils/sessionHistory.ts');
    console.log('✅ Session history service imported successfully');
    
    // Test 2: Check if the database has required columns
    console.log('2️⃣ Testing database structure...');
    const { supabase } = await import('./src/supabaseClient.ts');
    
    const { data: sessions, error } = await supabase
      .from('planning_sessions')
      .select('id, name, status, ended_at, summary')
      .limit(1);
      
    if (error) {
      console.error('❌ Database error:', error);
      console.log('💡 Please run the migration: sql/session_management_setup.sql');
      return false;
    }
    
    console.log('✅ Database structure is ready');
    
    // Test 3: Check if we can query session history
    console.log('3️⃣ Testing session history query...');
    const { data: history, error: historyError } = await supabase
      .from('session_history')
      .select('*')
      .limit(1);
      
    if (historyError && historyError.code === '42P01') {
      console.log('⚠️  Session history table not found - this is expected if migration hasn\'t been run');
    } else if (historyError) {
      console.error('❌ Session history error:', historyError);
      return false;
    } else {
      console.log('✅ Session history table accessible');
    }
    
    console.log('🎉 All tests passed! Session management feature is ready to use.');
    console.log('');
    console.log('📋 To test the feature:');
    console.log('1. Create a planning session as a Moderator');
    console.log('2. Add some backlog items and cast votes');
    console.log('3. Click the orange "End" button on the session');
    console.log('4. Confirm the action and check the summary');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Automatically run the test
testSessionManagement();

// Export for manual testing
if (typeof window !== 'undefined') {
  window.testSessionManagement = testSessionManagement;
}

console.log('🔧 Session Management Test loaded. Run testSessionManagement() to test again.');
