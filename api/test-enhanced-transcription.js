import fetch from 'node-fetch';

const testEnhancedTranscription = async () => {
  console.log('🧪 Testing GPT-4o Enhanced Transcription...\n');
  
  const testTranscription = `
    uh hello everyone um today we're gonna be discussing the uh the sprint planning
    and we need to estimate some user stories so uh john can you tell us about
    the user authentication feature that we discussed last week
    yeah sure so basically um the user should be able to login with their email
    and password and also we want to implement two factor authentication
    ok great so how many story points do you think that would be alice what do you think
    i think maybe 8 points because its quite complex and we need to integrate with
    the existing database schema
    hmm actually i think we could do it in 5 points if we use the existing auth library
    alright lets go with 5 points then
  `;

  try {
    const response = await fetch('http://localhost:3001/api/enhance-transcription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rawTranscription: testTranscription,
        sessionId: 'test-enhancement-789',
        language: 'en'
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Enhanced transcription test PASSED');
      console.log(`📊 Model Used: ${data.metadata.model}`);
      console.log(`📏 Length: ${data.metadata.originalLength} → ${data.metadata.enhancedLength}`);
      console.log('\n📝 Original Transcription:');
      console.log('─'.repeat(60));
      console.log(data.originalTranscription.trim());
      console.log('─'.repeat(60));
      console.log('\n✨ Enhanced Transcription:');
      console.log('─'.repeat(60));
      console.log(data.enhancedTranscription);
      console.log('─'.repeat(60));
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

testEnhancedTranscription();
