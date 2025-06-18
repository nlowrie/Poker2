import fetch from 'node-fetch';

const runCompleteAPITests = async () => {
  console.log('🔧 Complete API Testing Suite\n');
  
  // Test 1: Health Check
  console.log('1️⃣ Testing Health Check...');
  try {
    const health = await fetch('http://localhost:3001/api/health');
    const healthData = await health.json();
    console.log('✅ Health:', healthData.status);
  } catch (error) {
    console.log('❌ Health check failed:', error.message);
    return;
  }

  // Test 2: Simple Summarization
  console.log('\n2️⃣ Testing Basic Summarization...');
  try {
    const response = await fetch('http://localhost:3001/api/summarize-meeting', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcription: 'Team meeting. Discussed project timeline. John will handle backend. Mary will do frontend. Due date is Friday.',
        sessionId: 'test-123',
        participants: ['John', 'Mary']
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Summarization successful');
      console.log('📊 Model:', data.metadata.model);
      console.log('📝 Summary preview:', data.summary.substring(0, 100) + '...');
    } else {
      console.log('⚠️  Summarization failed:', data.error);
      console.log('💡 Error code:', data.code);
    }
  } catch (error) {
    console.log('❌ Summarization test error:', error.message);
  }

  // Test 3: Advanced Summarization
  console.log('\n3️⃣ Testing Advanced Summarization...');
  try {
    const response = await fetch('http://localhost:3001/api/summarize-meeting/advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcription: 'Sprint planning meeting. We estimated 5 story points for user login feature. Alice raised concerns about database performance. Bob suggested using Redis cache. Action item: Research Redis implementation by Wednesday.',
        sessionId: 'test-advanced-456',
        participants: ['Alice', 'Bob', 'Charlie'],
        options: {
          extractActionItems: true,
          extractDecisions: true,
          summaryLength: 'medium'
        }
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Advanced summarization successful');
      console.log('📊 Model:', data.metadata.model);
      console.log('🔍 Advanced features enabled');
    } else {
      console.log('⚠️  Advanced summarization failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Advanced test error:', error.message);
  }

  console.log('\n🎯 API Testing Complete!');
  console.log('\nNext: Test the frontend integration');
};

runCompleteAPITests();
