# Meeting Summarizer API

A Node.js/Express API server that provides AI-powered meeting summarization using OpenAI's GPT models.

## Features

- 🤖 AI-powered meeting transcription summarization
- 📝 Structured markdown output with key sections
- 🔍 Advanced analysis with action items and decisions
- 🚀 RESTful API endpoints
- ⚡ Fast and reliable processing
- 🛡️ Error handling and validation

## Setup

1. **Install dependencies:**
   ```bash
   cd api
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your OpenAI API key:
   ```
   OPENAI_API_KEY=your_actual_api_key_here
   ```

3. **Start the server:**
   ```bash
   npm run dev
   ```

   The API will be available at `http://localhost:3001`

## API Endpoints

### Health Check
```
GET /api/health
```

### Basic Meeting Summarization
```
POST /api/summarize-meeting
```

**Request Body:**
```json
{
  "transcription": "Meeting transcription text...",
  "sessionId": "session-123",
  "participants": ["Alice", "Bob", "Charlie"]
}
```

**Response:**
```json
{
  "success": true,
  "summary": "# Meeting Summary\n\n## Overview...",
  "metadata": {
    "sessionId": "session-123",
    "participants": ["Alice", "Bob", "Charlie"],
    "transcriptionLength": 1500,
    "summaryLength": 800,
    "model": "gpt-3.5-turbo",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

### Advanced Meeting Summarization
```
POST /api/summarize-meeting/advanced
```

**Request Body:**
```json
{
  "transcription": "Meeting transcription text...",
  "sessionId": "session-123",
  "participants": ["Alice", "Bob", "Charlie"],
  "options": {
    "extractActionItems": true,
    "extractDecisions": true,
    "extractKeyTopics": true,
    "summaryLength": "medium"
  }
}
```

## Integration with Frontend

Update your Vite config to proxy API requests:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});
```

## Error Handling

The API provides detailed error responses:

- `400`: Bad Request (missing transcription)
- `401`: Invalid API key
- `402`: API quota exceeded
- `500`: Internal server error

## Development

- `npm start`: Start production server
- `npm run dev`: Start development server with auto-reload

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `PORT` | Server port | 3001 |
| `NODE_ENV` | Environment | development |

## Models Used

- **Basic & Advanced**: GPT-4o (Latest OpenAI model - faster and more capable than GPT-4)
- **Performance**: Optimized for speed and quality
- **Context Window**: 128K tokens

## Rate Limits

Respects OpenAI's rate limits. Consider implementing request queuing for high-volume usage.
