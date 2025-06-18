#!/bin/bash

echo "🚀 Setting up Meeting Summarizer API..."

# Navigate to API directory
cd api

# Install dependencies
echo "📦 Installing API dependencies..."
npm install

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  IMPORTANT: Please edit api/.env and add your OpenAI API key!"
    echo "   Get your API key from: https://platform.openai.com/api-keys"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Go back to root
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add your OpenAI API key to api/.env"
echo "2. Start the API server: cd api && npm run dev"
echo "3. In another terminal, start the frontend: npm run dev"
echo ""
echo "The API will be available at http://localhost:3001"
echo "The frontend will be available at http://localhost:5173"
