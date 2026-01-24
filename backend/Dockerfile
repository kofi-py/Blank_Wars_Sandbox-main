# Backend Dockerfile for deployment (Monorepo Aware)
FROM node:20-alpine

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy package.json for all packages (pnpm workspaces need full workspace context)
COPY backend/package.json ./backend/
COPY shared/types/package.json ./shared/types/
COPY shared/hex-engine/package.json ./shared/hex-engine/

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++

# Install dependencies (frozen-lockfile for reproducibility)
RUN pnpm install --frozen-lockfile

# Copy source code
COPY backend ./backend
COPY shared/types ./shared/types
COPY shared/hex-engine ./shared/hex-engine

# Build shared hex-engine (required by backend)
WORKDIR /app/shared/hex-engine
RUN pnpm build

# Rebuild bcrypt for Alpine Linux at root level (where it's actually installed in pnpm monorepo)
WORKDIR /app
RUN cd node_modules/.pnpm/bcrypt@5.1.1/node_modules/bcrypt && npm rebuild --build-from-source

# Build backend
WORKDIR /app/backend

# Install PostgreSQL client for migrations
RUN apk add --no-cache postgresql-client bash

# Ensure migration script is executable
RUN chmod +x ./migrations/run-migrations.sh

# Accept DATABASE_URL
ARG DATABASE_URL
ENV DATABASE_URL=$DATABASE_URL

# Build
RUN pnpm build

# Expose port
EXPOSE 4000

# Start
CMD ["pnpm", "start"]