# Northstar - Intelligent Database Platform

Northstar is a learning-focused platform for uploading data, connecting PostgreSQL databases, inspecting schemas, and asking questions in plain English. The backend is built with Node.js, Express, PostgreSQL, and JavaScript ES modules. The frontend is React, JavaScript, and CSS.

## What it can do

- Create accounts and sign in with email and password.
- Upload CSV, JSON, and XLSX files; infer column names and common PostgreSQL data types.
- Store each uploaded dataset in its own PostgreSQL table and preview its schema and rows.
- Suggest relationships between uploaded datasets based on column names.
- Connect existing PostgreSQL databases and inspect their tables, columns, and declared foreign keys.
- Ask natural-language questions about one or more datasets or a connected database.
- Generate SQL with Gemini, validate it, run it read-only, and explain the results.

## Project layout

```text
NorthStar/
+-- Backend/                 Express API and PostgreSQL services
|   +-- config/              Database pool and upload configuration
|   +-- controllers/         HTTP input and responses
|   +-- middleware/          JWT authentication and upload errors
|   +-- models/              PostgreSQL queries
|   +-- routes/              API endpoints
|   +-- services/            Authentication, imports, connections, and AI queries
|   +-- utils/                Schema helpers, encryption, and SQL validation
|   +-- app.js
|   +-- server.js
+-- frontend/                Vite + React web application
    +-- src/
        +-- components/      Auth, overview, datasets, connections, and query pages
        +-- services/api.js  Shared API requests and JWT header
```

The backend and frontend each have a README with component-specific details: [Backend/README.md](./Backend/README.md) and [frontend/README.md](./frontend/README.md).

## Requirements

- Node.js 22.12 or newer
- PostgreSQL
- A Gemini API key for natural-language queries

## Run locally

### 1. Configure PostgreSQL and the backend

Create a PostgreSQL database for Northstar, then open a terminal in `Backend`:

```powershell
cd Backend
npm install
Copy-Item .env.example .env
```

Edit `Backend/.env` and set `DATABASE_URL`, `JWT_SECRET`, `CONNECTION_ENCRYPTION_KEY`, and `GEMINI_API_KEY`. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite` and can be changed if needed.

Generate secrets with Node.js if needed:

```powershell
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
```

Use the first value for `JWT_SECRET` and the second for `CONNECTION_ENCRYPTION_KEY`. Keep `.env` private. Keep the encryption key stable: changing it prevents Northstar from decrypting passwords saved for external databases.

Start the API:

```powershell
npm run dev
```

The backend listens on port `3000` by default and creates its platform tables at startup.

### 2. Start the frontend

Open a second terminal at the project root:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`. During development, Vite proxies `/api` requests to `http://localhost:3000`. If the backend uses another URL, set `VITE_API_URL`; for separate production hosting, configure a reverse proxy or backend CORS policy.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | Backend HTTP port; defaults to `3000` |
| `DATABASE_URL` | PostgreSQL database used for user accounts, dataset metadata, and uploaded tables |
| `JWT_SECRET` | Signs login tokens |
| `CONNECTION_ENCRYPTION_KEY` | Base64-encoded 32-byte key for encrypting saved PostgreSQL passwords |
| `GEMINI_API_KEY` | Server-side Gemini API key; never put this in frontend code |
| `GEMINI_MODEL` | Gemini model name; defaults to `gemini-3.5-flash-lite` |
| `CORS_ORIGINS` | Comma-separated frontend origins allowed to call the backend; Render needs the Vercel origin |
| `VITE_API_URL` | Optional frontend API base URL; the local Vite proxy is used by default |

## API overview

Except for `/health`, registration, and login, endpoints require:

```http
Authorization: Bearer <JWT>
```

| Method and path | Purpose |
| --- | --- |
| `GET /health` | Check the API server |
| `POST /api/auth/register` | Register with JSON fields `name`, `email`, and `password` |
| `POST /api/auth/login` | Sign in with JSON fields `email` and `password`; returns a token |
| `GET /api/auth/me` | Return the signed-in user's account |
| `POST /api/datasets/upload` | Upload one multipart file in field `file`; optional field `name` |
| `GET /api/datasets` | List the signed-in user's datasets |
| `GET /api/datasets/:datasetId` | Read a dataset's schema and relationship candidates |
| `GET /api/datasets/:datasetId/rows?limit=100` | Preview dataset rows |
| `POST /api/connections` | Test and save a PostgreSQL connection |
| `GET /api/connections` | List saved connections |
| `GET /api/connections/:connectionId/schema` | Inspect tables, columns, and foreign keys |
| `POST /api/query/ask` | Generate, validate, and execute a natural-language query |

To save a PostgreSQL connection, send JSON with `name`, `host`, `port`, `database`, `username`, `password`, and optional boolean `ssl`. The host must resolve from the **backend's** network. Use `localhost` when PostgreSQL is local to a backend running directly on your computer; when both are Docker containers, use the database service name on their shared Docker network.

```json
{
  "name": "Local database",
  "host": "localhost",
  "port": 5432,
  "database": "analytics",
  "username": "postgres",
  "password": "your-database-password",
  "ssl": false
}
```

For `/api/query/ask`, provide a `question` and exactly one source: `datasetId`, `datasetIds` (up to 10 uploaded datasets), or `connectionId`.

```json
{
  "datasetIds": ["dataset-uuid-1", "dataset-uuid-2"],
  "question": "Which customers have the highest total orders?"
}
```

The response includes the SQL, result rows, row count, and a natural-language explanation.

## Upload and query limits

- Accepted files: CSV, JSON arrays of objects, and XLSX. Legacy `.xls` is not supported.
- One uploaded file per request, maximum 10 MB, 10,000 data rows, and 100 columns.
- Uploaded data is parsed in memory and inserted into PostgreSQL; uploaded files are not saved to disk.
- Detected data types include text, booleans, integers, numeric values, dates, and timestamps.
- Uploaded-table relationships are naming-based candidates (for example, `customer_id` to an `id` column); the backend does not add foreign-key constraints to those tables.
- Existing database foreign keys are read from PostgreSQL metadata.
- AI queries must be one SELECT statement and may read only the selected source tables. They run in a read-only transaction with a five-second SQL timeout and a 500-row result limit. Only common built-in functions are allowed.
- Gemini receives the question and schema. The explanation request may also include up to 30 result rows. Keep this data flow in mind when using sensitive information.

## Where information is stored

- User name, email, and bcrypt password hash are stored in PostgreSQL's `users` table; raw passwords are not stored.
- Uploaded rows are stored in generated PostgreSQL tables; dataset ownership and schema metadata are in `datasets`.
- External database connection passwords are encrypted before they are stored in `database_connections`.
- The frontend stores the login JWT in browser `localStorage` under `northstar_token`.

## Deploy to Vercel and Render

The repository includes [render.yaml](./render.yaml), which defines a free Render Node web service and PostgreSQL database. It connects the service to PostgreSQL through Render's connection string, generates JWT and database-encryption secrets, and prompts for the Gemini API key and CORS origins. Render's free API service sleeps after 15 minutes idle, and its free PostgreSQL database expires after 30 days; use paid plans for persistent production data.

### Render backend and database

1. Sign in to Render and create a new Blueprint from this GitHub repository's `main` branch.
2. Render reads `render.yaml` and configures `northstar-api` with `Backend` as its root directory, and provisions `northstar-db`.
3. Provide `GEMINI_API_KEY` and `CORS_ORIGINS` when prompted. Set `CORS_ORIGINS` to the exact Vercel origin, for example `https://your-project.vercel.app`, with no trailing slash. You can update it in the Render service environment after the Vercel site is created.
4. After the service deploys, note its public URL, such as `https://northstar-api.onrender.com`. The health endpoint is `/health`.

### Vercel frontend

1. Import the same GitHub repository into Vercel.
2. Set the project Root Directory to `frontend`. Use the Vite framework preset, build command `npm run build`, and output directory `dist`.
3. Add `VITE_API_URL` with the Render service URL followed by `/api`, for example `https://northstar-api.onrender.com/api`.
4. Deploy or redeploy the Vercel project. Add its exact production origin to Render's `CORS_ORIGINS` list. Add each Vercel preview or custom-domain origin that should also be allowed.

Never add `GEMINI_API_KEY`, `JWT_SECRET`, or `CONNECTION_ENCRYPTION_KEY` to Vercel; they belong only in the backend environment. Render generates the two backend secrets in the Blueprint, and the Gemini key is supplied privately through Render.
