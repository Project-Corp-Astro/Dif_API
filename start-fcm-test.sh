#!/bin/bash

# Start FCM Testing Environment
# This script starts the backend server and provides commands for testing FCM

echo "===== Corp Astro FCM Testing Environment ====="
echo ""
echo "Starting backend server..."

# Start the backend server in the background
npm run dev &
SERVER_PID=$!

# Function to clean up when script exits
cleanup() {
  echo ""
  echo "Stopping backend server..."
  kill $SERVER_PID
  echo "Server stopped."
  exit 0
}

# Set up trap to catch Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM

echo ""
echo "Server started with PID: $SERVER_PID"
echo ""
echo "Available FCM test commands:"
echo "----------------------------"
echo "1. Send test notification to all users:"
echo "   npm run test-fcm"
echo ""
echo "2. Send test notification to specific user:"
echo "   npm run test-fcm -- --userId=<user_id>"
echo ""
echo "3. Send test notification to topic:"
echo "   npm run test-fcm -- --topic=test-topic"
echo ""
echo "Press Ctrl+C to stop the server and exit"
echo ""

# Keep script running until user presses Ctrl+C
while true; do
  sleep 1
done
