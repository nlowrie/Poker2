# 🔧 Troubleshooting Guide

## Common Issues & Solutions

### 1. "No transcription appearing"
**Causes:**
- Browser doesn't support Web Speech API
- Microphone permission denied
- Not using HTTPS (required for production)

**Solutions:**
```bash
# Check browser support
console.log('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);

# Grant microphone permission
# Check browser address bar for microphone icon
```

### 2. "AI Notes showing fallback summary"
**Causes:**
- OpenAI API quota exceeded (expected)
- Invalid API key
- Network connectivity issues

**Solutions:**
- Check OpenAI billing: https://platform.openai.com/usage
- Verify API key in `/api/.env`
- Fallback summary is expected behavior

### 3. "Recording not starting"
**Causes:**
- MediaRecorder not supported
- No microphone access
- Browser security restrictions

**Solutions:**
```javascript
// Test MediaRecorder support
console.log('MediaRecorder' in window);

// Check permissions
navigator.mediaDevices.getUserMedia({audio: true})
  .then(stream => console.log('✅ Audio access granted'))
  .catch(err => console.log('❌ Audio access denied:', err));
```

### 4. "API calls failing"
**Causes:**
- API server not running
- Port conflicts
- CORS issues

**Solutions:**
```bash
# Check API server
curl http://localhost:3001/api/health

# Restart API server
cd api && npm run dev

# Check Vite proxy in vite.config.ts
```

## Debug Commands

### Check System Status
```bash
# API Health
Invoke-WebRequest -Uri "http://localhost:3001/api/health"

# Frontend Status  
# Open http://localhost:5173 in browser

# Check processes
netstat -an | findstr "3001"
netstat -an | findstr "5173"
```

### Browser Console Tests
```javascript
// Test Web Speech API
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
console.log('Speech recognition available:', !!recognition);

// Test MediaRecorder
navigator.mediaDevices.getUserMedia({audio: true, video: true})
  .then(stream => {
    const recorder = new MediaRecorder(stream);
    console.log('MediaRecorder available:', !!recorder);
  });

// Test API connectivity
fetch('/api/health')
  .then(res => res.json())
  .then(data => console.log('API Status:', data))
  .catch(err => console.log('API Error:', err));
```

### Performance Monitoring
```javascript
// Monitor memory usage
console.log('Memory usage:', performance.memory);

// Check for memory leaks in recording
// Stop/start recording multiple times and monitor memory
```

## Production Checklist

### Security
- [ ] Use HTTPS in production (required for Web Speech API)
- [ ] Secure API key storage
- [ ] Implement rate limiting
- [ ] Add request validation

### Performance
- [ ] Optimize bundle size
- [ ] Add caching for API responses
- [ ] Implement request queuing
- [ ] Monitor API usage costs

### Reliability
- [ ] Add comprehensive error boundaries
- [ ] Implement retry logic for API calls
- [ ] Add offline support for basic features
- [ ] Monitor uptime and performance

---

**Need Help?** Check the browser console (F12) for detailed error messages!
