import { randomUUID } from 'node:crypto';
import pool from '../config/db.js';
import { quoteIdentifier } from '../utils/schemaUtils.js';

export async function createDatasetTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS datasets (
      id UUID PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      table_name TEXT NOT NULL UNIQUE,
      columns JSONB NOT NULL,
      relationships JSONB NOT NULL DEFAULT '[]'::jsonb,
      row_count INTEGER NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    ALTER TABLE datasets
    ADD COLUMN IF NOT EXISTS relationships JSONB NOT NULL DEFAULT '[]'::jsonb
  `);
}

export async function saveDataset(userId, name, columns, relationships, records) {
  const id = randomUUID();
  const tableName = `dataset_${id.replaceAll('-', '')}`;
  const savedRelationships = relationships.map((relationship) => ({
    ...relationship,
    from: {
      ...relationship.from,
      table: relationship.from.table === '__current__' ? tableName : relationship.from.table,
    },
    to: {
      ...relationship.to,
      table: relationship.to.table === '__current__' ? tableName : relationship.to.table,
    },
  }));
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const columnDefinitions = columns
      .map((column) => `${quoteIdentifier(column.name)} ${column.dataType}`)
      .join(', ');
    await client.query(`CREATE TABLE ${quoteIdentifier(tableName)} (${columnDefinitions})`);

    const insertColumns = columns.map((column) => quoteIdentifier(column.name)).join(', ');
    const batchSize = 100;

    for (let start = 0; start < records.length; start += batchSize) {
      const batch = records.slice(start, start + batchSize);
      const values = [];
      const placeholders = batch.map((row, rowIndex) => {
        const rowPlaceholders = row.map((value, columnIndex) => {
          values.push(value);
          return `$${rowIndex * columns.length + columnIndex + 1}`;
        });
        return `(${rowPlaceholders.join(', ')})`;
      });

      await client.query(
        `INSERT INTO ${quoteIdentifier(tableName)} (${insertColumns}) VALUES ${placeholders.join(', ')}`,
        values,
      );
    }

    const result = await client.query(
      `INSERT INTO datasets (id, user_id, name, table_name, columns, relationships, row_count)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, columns, relationships, row_count, created_at`,
      [id, userId, name, tableName, JSON.stringify(columns), JSON.stringify(savedRelationships), records.length],
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function listDatasets(userId) {
  const result = await pool.query(
    `SELECT id, name, columns, relationships, row_count, created_at
     FROM datasets WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId],
  );
  return result.rows;
}

export async function findDataset(userId, datasetId) {
  const result = await pool.query(
    `SELECT id, user_id, name, table_name, columns, relationships, row_count, created_at
     FROM datasets WHERE user_id = $1 AND id = $2`,
    [userId, datasetId],
  );
  return result.rows[0] || null;
}

export async function getDatasetsForRelationships(userId) {
  const result = await pool.query(
    'SELECT id, name, table_name, columns, relationships FROM datasets WHERE user_id = $1',
    [userId],
  );
  return result.rows;
}

export async function findDatasetsByIds(userId, datasetIds) {
  const result = await pool.query(
    `SELECT id, user_id, name, table_name, columns, relationships, row_count, created_at
     FROM datasets WHERE user_id = $1 AND id = ANY($2::uuid[])`,
    [userId, datasetIds],
  );
  return result.rows;
}

export async function getDatasetRows(userId, datasetId, limit = 100) {
  const dataset = await findDataset(userId, datasetId);
  if (!dataset) return null;

  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));
  const result = await pool.query(
    `SELECT * FROM ${quoteIdentifier(dataset.table_name)} LIMIT $1`,
    [safeLimit],
  );
  return { dataset, rows: result.rows };
}
