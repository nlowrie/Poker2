#!/usr/bin/env node

// Test script to verify consensus estimates functionality
// This script will test the fixed query without browser interaction

const { createClient } = require('@supabase/supabase-js');

// Note: These would need to be replaced with actual Supabase credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Supabase credentials not found in environment variables');
  console.log('This test requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConsensusEstimatesQuery() {
  try {
    console.log('🔍 Testing consensus estimates query...');
    
    // Test the fixed query
    const { data, error } = await supabase
      .from('consensus_estimates')
      .select('*')
      .order('applied_at', { ascending: false });

    if (error) {
      console.error('❌ Query failed:', error);
      return false;
    }

    console.log('✅ Query successful!');
    console.log(`📊 Found ${data?.length || 0} consensus estimates`);
    
    if (data && data.length > 0) {
      console.log('📋 Sample data:');
      console.log(JSON.stringify(data[0], null, 2));
    }

    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testConsensusEstimatesQuery()
  .then(success => {
    if (success) {
      console.log('🎉 Consensus estimates query test passed!');
    } else {
      console.log('💥 Consensus estimates query test failed!');
    }
  })
  .catch(error => {
    console.error('💥 Test error:', error);
  });
