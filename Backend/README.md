# Intelligent Database Platform Backend

A beginner-friendly Express backend for account authentication, PostgreSQL connections, dataset uploads, schema inspection, and natural-language read-only queries.

## Requirements

- Node.js 22 or newer
- PostgreSQL
- A Gemini API key for natural-language questions

## Run locally

1. Install packages with `npm install`.
2. Copy `.env.example` to `.env`.
3. Set `DATABASE_URL` to the platform's PostgreSQL database.
4. Generate a random `JWT_SECRET` and a base64-encoded 32-byte `CONNECTION_ENCRYPTION_KEY`. Keep both values private and keep the encryption key unchanged after saving external connections.
5. Set `GEMINI_API_KEY` to a key from Google AI Studio.
6. Run `npm run dev`.

The server creates its required tables at startup. The `.env` file is ignored by Git. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` and can be changed in `.env`.

## How the files work together

- `server.js` checks environment settings, connects to PostgreSQL, creates the platform tables, then starts Express.
- `app.js` configures JSON requests and mounts the API routes.
- `routes/` maps URLs to controllers and applies authentication to protected endpoints.
- `controllers/` validates HTTP input and chooses response status codes.
- `services/` contains the work for authentication, parsing files, managing connections, and generating queries.
- `models/` contains PostgreSQL statements for platform users, datasets, and saved database connections.
- `middleware/` verifies JWTs, handles CORS, and formats upload errors.
- `config/` contains the platform database pool and upload limits.
- `utils/` contains schema helpers, credential encryption, and SQL validation.

## API overview

Except for registration, login, and `/health`, requests require `Authorization: Bearer <token>`.

| Method and path | Purpose |
| --- | --- |
| `GET /health` | Check that the HTTP server responds |
| `POST /api/auth/register` | Create an account with `name`, `email`, and `password` |
| `POST /api/auth/login` | Log in with `email` and `password`; returns a JWT |
| `GET /api/auth/me` | Read the signed-in user's account |
| `POST /api/datasets/upload` | Upload one CSV, JSON array-of-objects, or XLSX file as multipart field `file`; optional field `name` |
| `GET /api/datasets` | List the signed-in user's datasets |
| `GET /api/datasets/:datasetId` | Read dataset schema and detected relationship candidates |
| `GET /api/datasets/:datasetId/rows?limit=100` | Preview up to 500 rows |
| `POST /api/connections` | Test and save a PostgreSQL connection |
| `GET /api/connections` | List the signed-in user's connections |
| `GET /api/connections/:connectionId/schema` | Inspect tables, columns, and declared foreign keys |
| `POST /api/query/ask` | Generate, validate, and run a read-only query |

To create a connection, send `name`, `host`, `port`, `database`, `username`, `password`, and optional boolean `ssl` as JSON. Credentials are encrypted in the platform database.

For `/api/query/ask`, send a `question` and exactly one source: a `datasetId`, a `datasetIds` array of up to 10 uploaded datasets, or a `connectionId`.

Example:

```json
{
  "datasetIds": ["dataset-uuid-1", "dataset-uuid-2"],
  "question": "Which customers have the highest total orders?"
}
```

The response contains the SQL, up to 500 result rows, their count, and a natural-language explanation.

## Upload and query limits

- One file per request, up to 10 MB.
- CSV, JSON, and XLSX are supported. Legacy `.xls` is not supported.
- A file can contain up to 10,000 data rows and 100 columns.
- Generated queries must be one SELECT statement, may read only selected tables, run in a read-only transaction, time out after 5 seconds, and return at most 500 rows.
- SQL function calls are limited to common built-in aggregate and string/date functions.
- Dataset relationships are name-based candidates; PostgreSQL foreign keys are not added to uploaded tables. Existing-database foreign keys are read from PostgreSQL metadata.

Gemini receives the question and schema to generate SQL. The explanation request also includes up to 30 result rows, so configure Gemini access in line with your data-handling requirements.

For production, set `CORS_ORIGINS` to a comma-separated list of exact frontend origins, such as your Vercel production URL. Do not include a trailing slash. Local Vite origins are allowed by default.
