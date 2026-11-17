import {
  addConnection,
  getConnectionSchema,
  getUserConnections,
} from '../services/connectionService.js';

function validateConnection(body) {
  return typeof body.name === 'string'
    && body.name.trim().length > 0
    && typeof body.host === 'string'
    && body.host.trim().length > 0
    && Number.isInteger(Number(body.port || 5432))
    && Number(body.port || 5432) > 0
    && Number(body.port || 5432) <= 65535
    && typeof body.database === 'string'
    && body.database.trim().length > 0
    && typeof body.username === 'string'
    && body.username.trim().length > 0
    && typeof body.password === 'string';
}

export async function createConnection(req, res) {
  const body = req.body || {};
  if (!validateConnection(body)) {
    return res.status(400).json({ message: 'Provide a connection name, host, port, database, username, and password.' });
  }

  const details = {
    name: body.name.trim().slice(0, 100),
    host: body.host.trim(),
    port: Number(body.port || 5432),
    database: body.database.trim(),
    username: body.username.trim(),
    password: body.password,
    ssl: body.ssl === true,
  };

  try {
    const connection = await addConnection(req.user.userId, details);
    return res.status(201).json({ connection });
  } catch (error) {
    return res.status(400).json({ message: `Could not connect to the database: ${error.message}` });
  }
}

export async function listUserConnections(req, res) {
  try {
    const connections = await getUserConnections(req.user.userId);
    return res.json({ connections });
  } catch {
    return res.status(500).json({ message: 'Could not load database connections.' });
  }
}

export async function inspectConnectionSchema(req, res) {
  try {
    const schema = await getConnectionSchema(req.user.userId, req.params.connectionId);
    if (!schema) return res.status(404).json({ message: 'Database connection not found.' });
    return res.json(schema);
  } catch {
    return res.status(400).json({ message: 'Could not inspect this database schema.' });
  }
}
