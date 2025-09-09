const { pool, db } = require('./server/db.js');
console.log('Pool available:', !!pool);
console.log('DB available:', !!db);
if (pool) {
  pool.query('SELECT NOW() as current_time').then(result => {
    console.log('Query successful:', result.rows[0]);
    process.exit(0);
  }).catch(err => {
    console.log('Query failed:', err.message);
    process.exit(1);
  });
} else {
  console.log('Pool is null - using fallback storage');
  process.exit(1);
}
