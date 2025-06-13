import { useState } from 'react';
import { saveChatMessage, loadChatMessages, editChatMessage, deleteChatMessage } from '../utils/planningSession';
import { supabase } from '../supabaseClient';

export default function ChatDebugger() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [sessionId] = useState('test-session-' + Date.now());

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };
  const testDatabaseConnection = async () => {
    try {
      const { error } = await supabase.from('chat_messages').select('count').limit(1);
      if (error) {
        addResult(`❌ Database connection failed: ${error.message}`);
      } else {
        addResult('✅ Database connection successful');
      }
    } catch (error) {
      addResult(`❌ Database connection error: ${error}`);
    }
  };

  const testTableExists = async () => {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_name', 'chat_messages')
        .eq('table_schema', 'public');
      
      if (error) {
        addResult(`❌ Table check failed: ${error.message}`);
      } else if (data && data.length > 0) {
        addResult('✅ chat_messages table exists');
      } else {
        addResult('❌ chat_messages table does not exist');
      }
    } catch (error) {
      addResult(`❌ Table check error: ${error}`);
    }
  };

  const testSaveMessage = async () => {
    try {
      const testMessage = {
        id: 'test-' + Date.now(),
        sessionId,
        userId: 'test-user',
        userName: 'Test User',
        userRole: 'Team Member',
        message: 'Test message at ' + new Date().toLocaleTimeString(),
        timestamp: new Date()
      };

      await saveChatMessage(testMessage);
      addResult('✅ Message saved successfully');
    } catch (error) {
      addResult(`❌ Save message failed: ${error}`);
    }
  };

  const testLoadMessages = async () => {
    try {
      const messages = await loadChatMessages(sessionId);
      addResult(`✅ Loaded ${messages.length} messages`);
      messages.forEach((msg, i) => {
        addResult(`  ${i + 1}. ${msg.userName}: ${msg.message}`);
      });
    } catch (error) {
      addResult(`❌ Load messages failed: ${error}`);
    }
  };

  const testEditMessage = async () => {
    try {
      // First, get the last message to edit
      const messages = await loadChatMessages(sessionId);
      if (messages.length === 0) {
        addResult('❌ No messages to edit');
        return;
      }

      const lastMessage = messages[messages.length - 1];
      await editChatMessage(lastMessage.id, lastMessage.userId, 'Edited: ' + lastMessage.message);
      addResult('✅ Message edited successfully');
    } catch (error) {
      addResult(`❌ Edit message failed: ${error}`);
    }
  };

  const testDeleteMessage = async () => {
    try {
      // First, get the last message to delete
      const messages = await loadChatMessages(sessionId);
      if (messages.length === 0) {
        addResult('❌ No messages to delete');
        return;
      }

      const lastMessage = messages[messages.length - 1];
      await deleteChatMessage(lastMessage.id, lastMessage.userId);
      addResult('✅ Message deleted successfully');
    } catch (error) {
      addResult(`❌ Delete message failed: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Chat Database Debugger</h2>
      <p className="text-gray-600 mb-4">Test Session ID: {sessionId}</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={testDatabaseConnection}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Test DB Connection
        </button>
        <button
          onClick={testTableExists}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Check Table
        </button>
        <button
          onClick={testSaveMessage}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Save Message
        </button>
        <button
          onClick={testLoadMessages}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors"
        >
          Load Messages
        </button>
        <button
          onClick={testEditMessage}
          className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
        >
          Edit Message
        </button>
        <button
          onClick={testDeleteMessage}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Delete Message
        </button>
        <button
          onClick={clearResults}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
        >
          Clear Results
        </button>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Test Results:</h3>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {testResults.length === 0 ? (
            <p className="text-gray-500 italic">No tests run yet</p>
          ) : (
            testResults.map((result, index) => (
              <div key={index} className="text-sm font-mono bg-white p-2 rounded border">
                {result}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
