import fetch from 'node-fetch';

const testGPT4oSummarization = async () => {
  console.log('🧪 Testing GPT-4o Meeting Summarization...\n');
  
  const testTranscription = `
    Meeting Transcript - Product Planning Session
    
    Alice: Good morning everyone. Let's discuss the Q3 roadmap for our new feature.
    Bob: I think we should prioritize the user authentication system first.
    Charlie: Agreed. The security audit highlighted some gaps there.
    Alice: Okay, so action item one - Bob will lead the auth system redesign.
    Bob: I can have a prototype ready by next Friday.
    Charlie: I'll help with the security review. We should also consider two-factor authentication.
    Alice: Great. What about the mobile app integration?
    Charlie: That's lower priority. Let's tackle it in Q4.
    Bob: Sounds good. I'll send out the technical specs by Wednesday.
    Alice: Perfect. Next meeting is scheduled for Thursday at 2 PM.
  `;

  try {
    const response = await fetch('http://localhost:3001/api/summarize-meeting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcription: testTranscription,
        sessionId: 'gpt4o-test-session',
        participants: ['Alice', 'Bob', 'Charlie']
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ GPT-4o Summarization Test PASSED');
      console.log(`📊 Model Used: ${data.metadata.model}`);
      console.log(`📝 Summary Length: ${data.metadata.summaryLength} characters`);
      console.log('\n🤖 AI Summary:');
      console.log('─'.repeat(50));
      console.log(data.summary);
      console.log('─'.repeat(50));
    } else {
      console.log('❌ Test FAILED:', data.error);
      console.log('Error Code:', data.code);
    }

  } catch (error) {
    console.error('❌ Test ERROR:', error.message);
    console.log('\n💡 Make sure:');
    console.log('1. API server is running (npm run dev)');
    console.log('2. OpenAI API key is valid');
    console.log('3. You have sufficient API credits');
  }
};

testGPT4oSummarization();
