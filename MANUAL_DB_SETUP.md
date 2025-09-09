# 🔧 Manual Database Setup Guide

## Problem: Person creation not saving to database

This guide will help you set up a local PostgreSQL database to fix the person creation issue.

## 🚀 Quick Fix (Try This First)

1. **Check if PostgreSQL is running:**
   ```bash
   sudo systemctl status postgresql
   ```

2. **If not running, start it:**
   ```bash
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

3. **Create database and user:**
   ```bash
   sudo -u postgres psql -c "CREATE USER famflix_user WITH PASSWORD 'famflix_password';"
   sudo -u postgres psql -c "CREATE DATABASE famflix_db OWNER famflix_user;"
   sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE famflix_db TO famflix_user;"
   ```

4. **Create .env file:**
   ```bash
   cat > .env << 'EOF'
   DATABASE_URL=postgresql://famflix_user:famflix_password@localhost:5432/famflix_db
   DATABASE_SSL=false
   SESSION_SECRET=famflix_local_session_secret_2024
   JWT_SECRET=famflix_local_jwt_secret_2024
   REFRESH_SECRET=famflix_local_refresh_secret_2024
   NODE_ENV=development
   PORT=5000
   EOF
   ```

5. **Create database tables:**
   ```bash
   npm run db:push
   ```

6. **Test connection:**
   ```bash
   node diagnose-db.js
   ```

7. **Test person creation:**
   ```bash
   node test-person-creation.js
   ```

8. **Start the application:**
   ```bash
   npm run dev
   ```

## 🔍 Detailed Troubleshooting

### Step 1: Check PostgreSQL Status
```bash
# Check if service is running
systemctl status postgresql

# Check if processes are running
ps aux | grep postgres

# Check PostgreSQL version
psql --version
```

### Step 2: Connect to PostgreSQL as superuser
```bash
# Connect as postgres user
sudo -u postgres psql

# Inside psql, check users and databases
\du
\l
\q
```

### Step 3: Create Database and User
```bash
# Create user
sudo -u postgres psql -c "CREATE USER famflix_user WITH PASSWORD 'famflix_password';"

# Create database
sudo -u postgres psql -c "CREATE DATABASE famflix_db OWNER famflix_user;"

# Grant permissions
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE famflix_db TO famflix_user;"

# Verify
sudo -u postgres psql -c "\l" | grep famflix
```

### Step 4: Test Database Connection
```bash
# Test with psql
psql -h localhost -U famflix_user -d famflix_db -c "SELECT NOW();"

# Or use the diagnostic script
node diagnose-db.js
```

### Step 5: Initialize Database Schema
```bash
# Push schema to database
npm run db:push

# Check if tables were created
psql -h localhost -U famflix_user -d famflix_db -c "\dt"
```

### Step 6: Verify Application Setup
```bash
# Test person creation functionality
node test-person-creation.js

# Check .env file
cat .env

# Check database URL format
echo $DATABASE_URL
```

## 🐛 Common Issues & Solutions

### Issue: "Connection refused"
**Solution:** PostgreSQL is not running
```bash
sudo systemctl start postgresql
```

### Issue: "password authentication failed"
**Solution:** Wrong credentials or user doesn't exist
```bash
# Check if user exists
sudo -u postgres psql -c "\du" | grep famflix_user

# Recreate user if needed
sudo -u postgres psql -c "DROP USER IF EXISTS famflix_user;"
sudo -u postgres psql -c "CREATE USER famflix_user WITH PASSWORD 'famflix_password';"
```

### Issue: "database does not exist"
**Solution:** Database not created
```bash
sudo -u postgres psql -c "CREATE DATABASE famflix_db OWNER famflix_user;"
```

### Issue: "relation 'people' does not exist"
**Solution:** Database schema not initialized
```bash
npm run db:push
```

### Issue: Still using MemoryStorage
**Solution:** Database connection failed, check logs
```bash
# Check server logs
tail -50 logs/out.dev.log

# Run diagnostic
node diagnose-db.js
```

## 📝 Expected Results

After successful setup:
- ✅ `node diagnose-db.js` should show successful connection
- ✅ `node test-person-creation.js` should create/retrieve/delete person
- ✅ Person creation in app should persist data
- ✅ `npm run dev` should show database connection success

## 📞 Need Help?

If you're still having issues:
1. Run `node diagnose-db.js` and share the output
2. Check `/var/log/postgresql/postgresql-*.log` for PostgreSQL errors
3. Verify your `.env` file has the correct DATABASE_URL
4. Make sure PostgreSQL is accepting connections on localhost:5432

## 🔄 Reset Everything (Last Resort)

If nothing works, reset the database:
```bash
# Stop the application first
pkill -f "npm run dev"

# Drop and recreate everything
sudo -u postgres psql -c "DROP DATABASE IF EXISTS famflix_db;"
sudo -u postgres psql -c "DROP USER IF EXISTS famflix_user;"

# Then follow the Quick Fix steps above
```

