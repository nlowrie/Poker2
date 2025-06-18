// Production configuration for current implementation
export const getProductionVideoConfig = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  return {
    rtcConfig: {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        // Add TURN servers in production
        ...(isDevelopment ? [] : [
          {
            urls: process.env.VITE_TURN_URL || 'turn:your-turn-server.com:3478',
            username: process.env.VITE_TURN_USERNAME,
            credential: process.env.VITE_TURN_PASSWORD
          }
        ])
      ],
      iceCandidatePoolSize: 10,
      bundlePolicy: 'max-bundle',
      rtcpMuxPolicy: 'require'
    },
    
    constraints: {
      video: {
        width: { min: 320, ideal: 640, max: 1280 },
        height: { min: 240, ideal: 480, max: 720 },
        frameRate: { min: 10, ideal: 30, max: 60 },
        // Production: Enable hardware acceleration
        facingMode: 'user'
      },
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Production: Better audio quality
        channelCount: { ideal: 2 },
        sampleRate: { ideal: 48000 },
        sampleSize: { ideal: 16 }
      }
    },
    
    // Production: Add quality monitoring
    enableStats: !isDevelopment,
    statsInterval: 5000,
    
    // Production: Add recording capability
    enableRecording: process.env.VITE_ENABLE_RECORDING === 'true',
    
    // Production: Bandwidth limits
    maxBitrate: {
      video: 2000000, // 2Mbps
      audio: 128000   // 128kbps
    }
  };
};

// Error reporting for production
export const reportVideoError = (error: Error, context: any) => {
  if (process.env.NODE_ENV === 'production') {
    // Send to your error tracking service
    console.error('Video Error:', error, context);
    
    // Could integrate with Sentry, LogRocket, etc.
    if ((window as any).Sentry) {
      (window as any).Sentry.captureException(error, { extra: context });
    }
  } else {
    console.warn('Video Error (dev):', error, context);
  }
};
