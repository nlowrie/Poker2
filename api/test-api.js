import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3001';

async function testAPIServer() {
  console.log('🧪 Testing AI Meeting Notes API...\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health check...');
    const healthResponse = await fetch(`${API_BASE}/api/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Meeting summarization (will fail without API key, but tests the endpoint)
    console.log('\n2. Testing meeting summarization...');
    const summaryResponse = await fetch(`${API_BASE}/api/summarize-meeting`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription: 'This is a test meeting transcription. We discussed the project timeline and decided to move forward with the implementation.',
        sessionId: 'test-session-123',
        participants: ['Alice', 'Bob', 'Charlie']
      })
    });
    
    const summaryData = await summaryResponse.json();
    
    if (summaryResponse.ok) {
      console.log('✅ Meeting summarization successful');
      console.log('Summary length:', summaryData.summary?.length || 0);
    } else {
      console.log('⚠️  Meeting summarization failed (expected if no API key):', summaryData.error);
    }
    
    console.log('\n🎉 API server test completed!');
    
  } catch (error) {
    console.error('❌ Error testing API server:', error.message);
    console.log('\n💡 Make sure the API server is running:');
    console.log('   cd api && npm run dev');
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAPIServer();
}

export default testAPIServer;
