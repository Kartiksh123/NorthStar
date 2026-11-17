import { randomUUID } from 'node:crypto';
import pool from '../config/db.js';

export async function createConnectionTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS database_connections (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      host TEXT NOT NULL,
      port INTEGER NOT NULL,
      database_name TEXT NOT NULL,
      username TEXT NOT NULL,
      encrypted_password TEXT NOT NULL,
      use_ssl BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

export async function saveConnection(userId, details, encryptedPassword) {
  const id = randomUUID();
  const result = await pool.query(
    `INSERT INTO database_connections
       (id, user_id, name, host, port, database_name, username, encrypted_password, use_ssl)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, name, host, port, database_name, use_ssl, created_at`,
    [id, userId, details.name, details.host, details.port, details.database, details.username, encryptedPassword, details.ssl],
  );
  return result.rows[0];
}

export async function listConnections(userId) {
  const result = await pool.query(
    `SELECT id, name, host, port, database_name, use_ssl, created_at
     FROM database_connections WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findConnection(userId, connectionId) {
  const result = await pool.query(
    `SELECT id, user_id, name, host, port, database_name, username, encrypted_password, use_ssl
     FROM database_connections WHERE user_id = $1 AND id = $2`,
    [userId, connectionId],
  );
  return result.rows[0] || null;
}
