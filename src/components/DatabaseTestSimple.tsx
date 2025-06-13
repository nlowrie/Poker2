import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function DatabaseTestSimple() {
  const [results, setResults] = useState<string[]>([]);

  const addResult = (message: string) => {
    setResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const runTests = async () => {
      addResult('Starting database tests...');      // Test 1: Basic connection
      try {
        const { error } = await supabase.from('user_profiles').select('*').limit(1);
        if (error) {
          addResult(`❌ Basic connection failed: ${error.message}`);
        } else {
          addResult('✅ Basic database connection works');
        }
      } catch (err) {
        addResult(`❌ Connection error: ${err}`);
      }

      // Test 2: Check if chat_messages table exists
      try {
        const { error } = await supabase.from('chat_messages').select('count').limit(1);
        if (error) {
          addResult(`❌ chat_messages table check failed: ${error.message}`);
          if (error.message.includes('relation "chat_messages" does not exist')) {
            addResult('📋 The chat_messages table needs to be created in the database');
          }
        } else {
          addResult('✅ chat_messages table exists');
        }
      } catch (err) {
        addResult(`❌ Table check error: ${err}`);
      }

      // Test 3: Try to create the table (this might fail due to permissions)
      if (results.some(r => r.includes('does not exist'))) {
        addResult('📋 Attempting to create chat_messages table...');
        try {
          const { error } = await supabase.rpc('exec_sql', {
            sql: `CREATE TABLE IF NOT EXISTS chat_messages (
              id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
              session_id TEXT NOT NULL,
              user_id TEXT NOT NULL,
              user_name TEXT NOT NULL,
              user_role TEXT NOT NULL,
              message TEXT NOT NULL,
              original_message TEXT,
              is_edited BOOLEAN DEFAULT FALSE,
              is_deleted BOOLEAN DEFAULT FALSE,
              edit_count INTEGER DEFAULT 0,
              backlog_item_id TEXT,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
              updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
              edited_at TIMESTAMP WITH TIME ZONE,
              deleted_at TIMESTAMP WITH TIME ZONE
            );`
          });
          
          if (error) {
            addResult(`❌ Could not create table via RPC: ${error.message}`);
          } else {
            addResult('✅ Table creation attempted via RPC');
          }
        } catch (err) {
          addResult(`❌ RPC call failed: ${err}`);
        }
      }
    };

    runTests();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Database Connection Test</h2>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {results.length === 0 ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-gray-500">Running tests...</p>
            </div>
          ) : (
            results.map((result, index) => (
              <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                {result}
              </div>
            ))
          )}
        </div>
      </div>

      {results.some(r => r.includes('table needs to be created')) && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded-lg">
          <h4 className="font-semibold text-yellow-800 mb-2">Action Required:</h4>
          <p className="text-yellow-700 mb-2">
            The chat_messages table doesn't exist in your Supabase database. 
            You need to run the SQL script manually in your Supabase dashboard.
          </p>
          <ol className="text-yellow-700 text-sm list-decimal list-inside space-y-1">
            <li>Go to your Supabase dashboard</li>
            <li>Navigate to the SQL Editor</li>
            <li>Copy and paste the contents of <code>sql/create_chat_messages_table.sql</code></li>
            <li>Execute the script</li>
            <li>Refresh this page to test again</li>
          </ol>
        </div>
      )}
    </div>
  );
}
