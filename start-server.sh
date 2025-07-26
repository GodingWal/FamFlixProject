#!/bin/bash

# FamFlix Server Startup Script

echo "🚀 Starting FamFlix Server..."

# Check if .env file exists, if not create it from example
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
fi

# Kill any existing processes on port 5000
echo "🔧 Checking for existing processes on port 5000..."
EXISTING_PID=$(lsof -ti:5000)
if [ ! -z "$EXISTING_PID" ]; then
    echo "🛑 Killing existing process on port 5000 (PID: $EXISTING_PID)..."
    kill -9 $EXISTING_PID
fi

# Start the server in development mode
echo "🌟 Starting server in development mode..."
npm run dev

echo "✅ Server started successfully!"
echo "🌐 Access your application at: http://localhost:5000"
echo "🔍 API health check: http://localhost:5000/health" 