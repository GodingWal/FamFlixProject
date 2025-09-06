#!/bin/bash

echo "🚀 Setting up FamFlix Local Database"
echo "===================================="

# Check if PostgreSQL is running
echo "📋 Step 1: Checking PostgreSQL status..."
if ! systemctl is-active --quiet postgresql; then
    echo "❌ PostgreSQL is not running. Starting it..."
    sudo systemctl start postgresql
    sudo systemctl enable postgresql
fi

echo "✅ PostgreSQL is running"

# Create database and user
echo "📋 Step 2: Setting up database and user..."
sudo -u postgres psql -c "CREATE USER famflix_user WITH PASSWORD 'famflix_password';" 2>/dev/null || echo "User already exists"
sudo -u postgres psql -c "CREATE DATABASE famflix_db OWNER famflix_user;" 2>/dev/null || echo "Database already exists"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE famflix_db TO famflix_user;" 2>/dev/null || echo "Privileges already granted"

echo "✅ Database and user created"

# Create .env file
echo "📋 Step 3: Creating .env file..."
cat > .env << 'EOF'
# Local Development Environment Configuration

# Database Configuration (Local PostgreSQL)
DATABASE_URL=postgresql://famflix_user:famflix_password@localhost:5432/famflix_db
DATABASE_SSL=false

# Authentication
JWT_SECRET=famflix_local_jwt_secret_2024_development_only
SESSION_SECRET=famflix_local_session_secret_2024_development_only
REFRESH_SECRET=famflix_local_refresh_secret_2024_development_only

# Server Configuration
NODE_ENV=development
PORT=5000

# External API Keys (optional for local development)
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
ELEVENLABS_API_KEY=

# Redis (optional - will use in-memory cache if not available)
# REDIS_URL=redis://localhost:6379

# Optional: Monitoring (leave empty for local dev)
SENTRY_DSN=
EOF

echo "✅ .env file created"

# Test database connection
echo "📋 Step 4: Testing database connection..."
if psql -h localhost -U famflix_user -d famflix_db -c "SELECT NOW();" >/dev/null 2>&1; then
    echo "✅ Database connection successful"
else
    echo "❌ Database connection failed"
    exit 1
fi

# Initialize database schema
echo "📋 Step 5: Initializing database schema..."
npm run db:push

echo ""
echo "🎉 Local database setup completed!"
echo ""
echo "📝 Next steps:"
echo "1. Run: npm run dev"
echo "2. Test person creation in your application"
echo "3. The database should now persist your data"
echo ""
echo "🔗 Your app will be available at: http://localhost:5000"
