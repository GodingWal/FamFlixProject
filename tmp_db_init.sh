#!/usr/bin/env bash
set -e
export PGPASSWORD='Wittymango520!'
PSQL="psql -h 34.31.172.253 -U postgres -d postgres -v ON_ERROR_STOP=1"

echo "--- TEST CONNECTION ---"
$PSQL -tc "SELECT 1;" >/dev/null && echo OK

echo "--- CREATE DB/USER ---"
$PSQL -c "CREATE DATABASE famflix;" || true
$PSQL -c "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'famflix') THEN CREATE ROLE famflix LOGIN PASSWORD 'Wittymango520!'; END IF; END $$;"
$PSQL -c "GRANT ALL PRIVILEGES ON DATABASE famflix TO famflix;" || true

echo "--- UPDATE ENV ---"
cd /opt/famflix
if grep -q '^DATABASE_URL=' .env 2>/dev/null; then
  sed -i "s|^DATABASE_URL=.*|DATABASE_URL=postgresql://famflix:Wittymango520!@34.31.172.253:5432/famflix|" .env
else
  echo "DATABASE_URL=postgresql://famflix:Wittymango520!@34.31.172.253:5432/famflix" >> .env
fi
sed -i 's/^FORCE_MOCK_STORAGE=true/#FORCE_MOCK_STORAGE=true/' .env || true

echo "--- DB PUSH ---"
npm run db:push

echo "--- RESTART APP ---"
pm2 restart famflix && pm2 save
sleep 2

echo "--- API HEALTH ---"
curl -sS -m 10 http://localhost/api/health || true
