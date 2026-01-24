#!/bin/bash

# Blank Wars - Local Development Database Setup Script
# This script sets up a PostgreSQL database for local development

set -e

echo "🎯 Setting up Blank Wars local development database..."

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL is not installed. Please install it first:"
    echo "   Ubuntu/Debian: sudo apt install postgresql postgresql-contrib"
    echo "   macOS: brew install postgresql"
    echo "   Windows: Download from https://www.postgresql.org/download/"
    exit 1
fi

# Check if PostgreSQL is running
if ! pg_isready >/dev/null 2>&1; then
    echo "❌ PostgreSQL is not running. Please start it:"
    echo "   Ubuntu/Debian: sudo service postgresql start"
    echo "   macOS: brew services start postgresql"
    echo "   Windows: Start PostgreSQL service from Services"
    exit 1
fi

# Configuration
DB_NAME="blankwars_dev"
DB_USER="blankwars"
DB_PASSWORD="devpass123"

echo "📝 Database configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo "   Password: $DB_PASSWORD"

# Check if database already exists
if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "⚠️  Database $DB_NAME already exists."
    read -p "Do you want to recreate it? This will DELETE all existing data! (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🗑️  Dropping existing database..."
        sudo -u postgres dropdb "$DB_NAME"
    else
        echo "✅ Using existing database."
        exit 0
    fi
fi

# Create database
echo "🔨 Creating database $DB_NAME..."
sudo -u postgres createdb "$DB_NAME"

# Create user (ignore error if user already exists)
echo "👤 Creating user $DB_USER..."
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || echo "   User already exists, skipping..."

# Grant privileges
echo "🔑 Granting privileges..."
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER; ALTER USER $DB_USER CREATEDB;"

# Install required extensions
echo "🔧 Installing required PostgreSQL extensions..."
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS pgcrypto;"

# Test connection
echo "🔌 Testing database connection..."
if psql "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME" -c "SELECT version();" >/dev/null 2>&1; then
    echo "✅ Database connection successful!"
else
    echo "❌ Database connection failed!"
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env

    # Update DATABASE_URL in .env
    sed -i "s|DATABASE_URL=.*|DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME|" .env
    sed -i "s|DEV_DB_PASSWORD=.*|DEV_DB_PASSWORD=$DB_PASSWORD|" .env

    echo "✅ .env file created with database configuration"
else
    echo "⚠️  .env file already exists. Please update DATABASE_URL manually:"
    echo "   DATABASE_URL=postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
fi

echo ""
echo "🎉 Database setup complete!"
echo ""
echo "Next steps:"
echo "1. Run migrations: npm run migrate"
echo "2. Start the development server: npm run dev"
echo ""
echo "Database connection string:"
echo "postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"
