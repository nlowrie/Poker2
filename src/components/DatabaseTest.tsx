import { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function DatabaseTest() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const runTests = async () => {
    setIsLoading(true);
    const results: string[] = [];

    try {
      // Test 1: Check if estimations table exists
      results.push('=== Testing Database Structure ===');
      
      const { data: tableInfo, error: tableError } = await supabase
        .from('estimations')
        .select('*')
        .limit(1);
      
      if (tableError) {
        results.push(`❌ Estimations table error: ${tableError.message}`);
      } else {
        results.push('✅ Estimations table exists and accessible');
      }

      // Test 2: Check user_profiles table
      const { data: profilesData, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (profilesError) {
        results.push(`❌ User profiles table error: ${profilesError.message}`);
      } else {
        results.push('✅ User profiles table exists and accessible');
      }

      // Test 3: Check planning_sessions table
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('planning_sessions')
        .select('*')
        .limit(1);
      
      if (sessionsError) {
        results.push(`❌ Planning sessions table error: ${sessionsError.message}`);
      } else {
        results.push('✅ Planning sessions table exists and accessible');
      }

      // Test 4: Check backlog_items table
      const { data: itemsData, error: itemsError } = await supabase
        .from('backlog_items')
        .select('*')
        .limit(1);
      
      if (itemsError) {
        results.push(`❌ Backlog items table error: ${itemsError.message}`);
      } else {
        results.push('✅ Backlog items table exists and accessible');
      }      // Test 5: Test estimation insert/update with proper schema
      results.push('\n=== Testing Estimation Operations ===');
      
      if (sessionsData?.length && itemsData?.length) {
        const { data: currentUser } = await supabase.auth.getUser();
        if (currentUser.user) {
          const testEstimation = {
            session_id: sessionsData[0].id,
            backlog_item_id: itemsData[0].id,
            issue_id: itemsData[0].id, // Include for backward compatibility
            user_id: currentUser.user.id,
            value: '8'
          };          // Try inserting
          let { data: insertData, error: insertError } = await supabase
            .from('estimations')
            .insert([testEstimation])
            .select();

          if (insertError) {
            results.push(`❌ Insert estimation error: ${insertError.message}`);
            results.push(`   Code: ${insertError.code}, Details: ${insertError.details}`);
            
            // Try alternative insert without issue_id
            const altEstimation = {
              session_id: sessionsData[0].id,
              backlog_item_id: itemsData[0].id,
              user_id: currentUser.user.id,
              value: '8'
            };
            
            const { data: altData, error: altError } = await supabase
              .from('estimations')
              .insert([altEstimation])
              .select();
              
            if (altError) {
              results.push(`❌ Alternative insert also failed: ${altError.message}`);
            } else {
              results.push('✅ Alternative insert (without issue_id) successful');
              insertData = altData;
            }
          } else {
            results.push('✅ Estimation insert successful');
          }

          if (insertData && insertData.length > 0) {
            // Try updating
            const { error: updateError } = await supabase
              .from('estimations')
              .update({ value: '13' })
              .eq('id', insertData[0].id);

            if (updateError) {
              results.push(`❌ Update estimation error: ${updateError.message}`);
            } else {
              results.push('✅ Estimation update successful');
            }

            // Clean up - delete test estimation
            await supabase
              .from('estimations')
              .delete()
              .eq('id', insertData[0].id);
            results.push('✅ Test estimation cleaned up');
          }
        }
      } else {
        results.push('⚠️ No test data available - create some sessions and backlog items first');
      }

      // Test 6: Test join query
      results.push('\n=== Testing Join Queries ===');
      const { data: joinData, error: joinError } = await supabase
        .from('estimations')
        .select(`
          *,
          user_profiles(full_name, role)
        `)
        .limit(1);

      if (joinError) {
        results.push(`❌ Join query error: ${joinError.message}`);
        
        // Try without join
        const { data: noJoinData, error: noJoinError } = await supabase
          .from('estimations')
          .select('*')
          .limit(1);
        
        if (noJoinError) {
          results.push(`❌ Simple query also failed: ${noJoinError.message}`);
        } else {
          results.push('✅ Simple query works, but join fails');
        }
      } else {
        results.push('✅ Join query with user_profiles works');
      }

    } catch (error) {
      results.push(`❌ Unexpected error: ${error}`);
    }

    setTestResults(results);
    setIsLoading(false);
  };

  return (
    <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Database Connection Test</h2>
      
      <button
        onClick={runTests}
        disabled={isLoading}
        className={`px-4 py-2 rounded-lg font-medium ${
          isLoading 
            ? 'bg-gray-300 cursor-not-allowed' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {isLoading ? 'Running Tests...' : 'Run Database Tests'}
      </button>

      {testResults.length > 0 && (
        <div className="mt-6">
          <h3 className="font-semibold mb-2">Test Results:</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <pre className="text-sm whitespace-pre-wrap font-mono">
              {testResults.join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
