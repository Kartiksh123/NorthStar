import pg from 'pg';

const { Pool } = pg;

// A pool reuses PostgreSQL connections instead of opening one per request.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export default pool;
