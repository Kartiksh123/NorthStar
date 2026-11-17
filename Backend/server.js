import 'dotenv/config';
import app from './app.js';
import pool from './config/db.js';
import { createUsersTable } from './models/userModel.js';
import { createDatasetTables } from './models/datasetModel.js';
import { createConnectionTable } from './models/connectionModel.js';
import { validateEncryptionKey } from './utils/connectionCrypto.js';
import { closeConnectionPools } from './services/connectionService.js';

const port = process.env.PORT || 3000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error('JWT_SECRET is missing from the environment.');
    }
    validateEncryptionKey();

    // Confirm the database is reachable before accepting requests.
    await pool.query('SELECT 1');
    await createUsersTable();
    await createDatasetTables();
    await createConnectionTable();

    const server = app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });

    async function stopServer() {
      server.close(async () => {
        await closeConnectionPools();
        await pool.end();
        process.exit(0);
      });
    }

    process.once('SIGINT', stopServer);
    process.once('SIGTERM', stopServer);
  } catch (error) {
    console.error('Could not start the server:', error.message);
    process.exit(1);
  }
}

startServer();
