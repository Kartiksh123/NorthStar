import pg from 'pg';
import { encryptPassword, decryptPassword } from '../utils/connectionCrypto.js';
import {
  findConnection,
  listConnections,
  saveConnection,
} from '../models/connectionModel.js';

const { Pool } = pg;
const connectionPools = new Map();

function createPool(connection, password) {
  return new Pool({
    host: connection.host,
    port: connection.port,
    database: connection.database_name || connection.database,
    user: connection.username,
    password,
    ssl: connection.use_ssl || connection.ssl ? { rejectUnauthorized: true } : false,
    max: 2,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  });
}

export async function testConnection(details) {
  const temporaryPool = createPool(details, details.password);
  try {
    await temporaryPool.query('SELECT 1');
  } finally {
    await temporaryPool.end();
  }
}

export async function addConnection(userId, details) {
  await testConnection(details);
  const encryptedPassword = encryptPassword(details.password);
  return saveConnection(userId, details, encryptedPassword);
}

export async function getUserConnections(userId) {
  return listConnections(userId);
}

export async function getConnectionPool(userId, connectionId) {
  const connection = await findConnection(userId, connectionId);
  if (!connection) return null;

  if (!connectionPools.has(connection.id)) {
    const password = decryptPassword(connection.encrypted_password);
    connectionPools.set(connection.id, createPool(connection, password));
  }

  return connectionPools.get(connection.id);
}

export async function getConnectionSchema(userId, connectionId) {
  const databasePool = await getConnectionPool(userId, connectionId);
  if (!databasePool) return null;

  const [columnResult, relationshipResult] = await Promise.all([
    databasePool.query(`
      SELECT table_schema, table_name, table_type, column_name,
             data_type, is_nullable, column_default, ordinal_position
      FROM information_schema.columns
      JOIN information_schema.tables USING (table_schema, table_name)
      WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name, ordinal_position
    `),
    databasePool.query(`
      SELECT tc.table_schema, tc.table_name, kcu.column_name,
             ccu.table_schema AS referenced_schema,
             ccu.table_name AS referenced_table,
             ccu.column_name AS referenced_column
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
      ORDER BY tc.table_schema, tc.table_name, tc.constraint_name
    `),
  ]);

  const tablesByName = new Map();
  for (const column of columnResult.rows) {
    const key = `${column.table_schema}.${column.table_name}`;
    if (!tablesByName.has(key)) {
      tablesByName.set(key, {
        schema: column.table_schema,
        name: column.table_name,
        type: column.table_type,
        columns: [],
      });
    }

    tablesByName.get(key).columns.push({
      name: column.column_name,
      dataType: column.data_type,
      nullable: column.is_nullable === 'YES',
      default: column.column_default,
    });
  }

  const relationships = relationshipResult.rows.map((row) => ({
    from: { schema: row.table_schema, table: row.table_name, column: row.column_name },
    to: { schema: row.referenced_schema, table: row.referenced_table, column: row.referenced_column },
  }));

  return { tables: [...tablesByName.values()], relationships };
}

export async function closeConnectionPools() {
  const closingPools = [...connectionPools.values()].map((databasePool) => databasePool.end());
  connectionPools.clear();
  await Promise.all(closingPools);
}
