// Test script for audio transcription endpoint
import fs from 'fs';
import path from 'path';

const API_BASE_URL = 'http://localhost:3001';

async function testAudioTranscription() {
  console.log('🧪 Testing Audio Transcription API...');
  
  try {
    // Create a small test audio data (base64 encoded silence)
    // This is just for testing the endpoint structure
    const testAudioData = 'UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwGZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAOUXrTp66hVFApGn+DyvnUgBSuBzvLZiTYAdGqz7fOcMgAyX6vi8bVaGAI9k9n1u3AhBSF7zdz9wiEGLYPL9+A8Ag==';
    
    const response = await fetch(`${API_BASE_URL}/api/transcribe-audio`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: testAudioData,
        audioFormat: 'webm',
        source: 'test'
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Audio transcription test PASSED');
      console.log('📝 Response:', result);
    } else {
      const errorData = await response.json();
      console.log('❌ Audio transcription test FAILED');
      console.log('📝 Error:', errorData);
    }
    
  } catch (error) {
    console.log('❌ Test ERROR:', error.message);
    console.log('💡 Make sure:');
    console.log('1. API server is running (npm run dev)');
    console.log('2. OpenAI API key is valid');
    console.log('3. You have sufficient API credits');
  }
}

testAudioTranscription();
