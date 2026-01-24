#!/bin/bash

cd /Users/gabrielgreenstein/blank-wars-clean/

echo "🎮 Starting Blank Wars Local Development Servers..."
echo ""

# Kill any existing processes on these ports and common node/npm processes
echo "🧹 Cleaning up existing processes..."
lsof -ti:4000 | xargs kill -9 2>/dev/null || true
lsof -ti:3007 | xargs kill -9 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
sleep 3

# Start backend server
echo "🚀 Starting backend server on port 4000..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to initialize..."
sleep 10

# Start frontend server
echo "🚀 Starting frontend server on port 3007..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to initialize..."
sleep 8

echo ""
echo "✅ Servers started!"
echo "📊 Backend: http://localhost:4000 (PID: $BACKEND_PID)"
echo "🎮 Frontend: http://localhost:3007 (PID: $FRONTEND_PID)"
echo ""
echo "📋 To view logs:"
echo "   Backend: tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
echo ""
echo "🔥 To access the application:"
echo "   1. Open http://localhost:3007"
echo "   2. Backend API available at http://localhost:4000"
echo ""
echo "🐛 If servers won't start:"
echo "   1. Make sure PostgreSQL and Redis are running"
echo "   2. Check .env file exists in backend/"
echo "   3. Run this script again to clean up any stuck processes"