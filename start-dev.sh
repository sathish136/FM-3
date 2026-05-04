#!/bin/bash

# Start both API server and PM app with a single command
# This script runs both services in parallel and handles cleanup

echo "ðŸš€ Starting FlowMatrix development environment..."
echo "ðŸ“ API Server: http://localhost:3000"
echo "ðŸ“ PM App: http://localhost:5173"
echo ""

# Function to cleanup background processes
cleanup() {
    echo ""
    echo "ðŸ›‘ Shutting down services..."
    jobs -p | xargs -r kill
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup SIGINT SIGTERM

# Start API server in background
echo "ðŸ”§ Starting API server..."
cd artifacts/api-server
pnpm run dev &
API_PID=$!

# Wait a moment for API server to start
sleep 2

# Start PM app in background
echo "ðŸŽ¨ Starting PM app..."
cd ../pm-app
pnpm run dev &
PM_PID=$!

echo ""
echo "âœ… Both services started!"
echo "ðŸ”§ API Server (PID: $API_PID): http://localhost:3000"
echo "ðŸŽ¨ PM App (PID: $PM_PID): http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for all background jobs
wait
