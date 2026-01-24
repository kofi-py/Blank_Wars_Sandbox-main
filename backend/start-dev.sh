#!/bin/bash

# Set all required environment variables for development
export DATABASE_URL="postgresql://blankwars:devpass123@localhost:5432/blankwars_dev"
export OPENAI_API_KEY="placeholder-key"
export QR_SECRET="placeholder-secret"
export STRIPE_SECRET_KEY="placeholder-stripe-key"
export STRIPE_WEBHOOK_SECRET="placeholder-webhook-secret"
export JWT_ACCESS_SECRET="5e884898da28047151d0e56f8dc6292773603d0d6aabbdd2a2b3bdeeae5233e1"
export JWT_REFRESH_SECRET="a32ffdb81375f0bc5e41ad963e6b04f7c89bb0db287b1846b8a00a2e5d33f36a"
export NODE_ENV="development"
export PORT="4000"

# Start the server
node /home/mike/code/blank-wars-clean/backend/dist/server.js
