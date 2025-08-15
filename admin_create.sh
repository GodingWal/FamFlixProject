#!/usr/bin/env bash
set -euo pipefail

# Generate bcrypt hash for the admin password
HASH=$(node -e "import('bcryptjs').then(b=>b.default.hash('Wittymango520@',10).then(h=>console.log(h))))

# DB connection details
export PGPASSWORD='Wittymango520!'
HOST=34.31.172.253
USER=postgres
DB=famflix

# Upsert admin user
psql -h "$HOST" -U "$USER" -d "$DB" -v ON_ERROR_STOP=1 <<SQL
WITH up AS (
  UPDATE users
  SET password='${HASH}', role='admin', subscription_status='premium', display_name='Administrator', email='admin@fam-flix.com'
  WHERE username='admin' OR email='admin@fam-flix.com'
  RETURNING 1
)
INSERT INTO users (username,password,email,display_name,role,subscription_status,created_at)
SELECT 'admin','${HASH}','admin@fam-flix.com','Administrator','admin','premium', NOW()
WHERE NOT EXISTS (SELECT 1 FROM up);
SQL

# Verify
psql -h "$HOST" -U "$USER" -d "$DB" -tc "SELECT id, username, role, email FROM users WHERE username='admin' OR email='admin@fam-flix.com';"
