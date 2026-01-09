const { Pool } = require('pg');

let pool;

if (process.env.DATABASE_URL) {
  console.log('🗄️  Connecting to database using DATABASE_URL');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
} else {
  console.log('🗄️  Connecting to database using individual variables');
  pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'workout_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

// Handle pool errors
pool.on('error', (err, client) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Test connection on startup
pool.connect()
  .then(client => {
    console.log('✅ Database connected successfully');
    client.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err.message);
    console.error('🔧 Check your DATABASE_URL or individual DB variables');

    // Log sanitized connection info for debugging
    if (process.env.DATABASE_URL) {
      const sanitized = process.env.DATABASE_URL.replace(/:\/\/[^@]+@/, '://***:***@');
      console.error('🔍 DATABASE_URL format:', sanitized);
    } else {
      console.error('🔍 DB Config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        ssl: process.env.NODE_ENV === 'production'
      });
    }
  });

module.exports = pool;
