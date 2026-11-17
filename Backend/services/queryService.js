import { GoogleGenAI } from '@google/genai';
import pool from '../config/db.js';
import { findDatasetsByIds } from '../models/datasetModel.js';
import { getConnectionPool, getConnectionSchema } from './connectionService.js';
import { validateSql } from '../utils/sqlValidation.js';

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing from the environment.');
  }
  return new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      timeout: 12000,
      retryOptions: {
        attempts: 2,
        initialDelay: 0.5,
        maxDelay: 1,
        expBase: 2,
        jitter: 0.2,
      },
    },
  });
}

function makeGeminiError(error) {
  const status = Number(error?.status) || null;
  const code = error?.cause?.code || error?.code;
  const isTimeout = error?.name === 'RequestTimeoutError'
    || code === 'ETIMEDOUT'
    || code === 'ABORT_ERR';
  let message = 'Gemini request failed. Check the API key, model, quota, and network.';
  let statusCode = 503;

  if ([400, 401, 403].includes(status)) {
    message = 'Gemini rejected the request or API key. Verify the key and API access.';
  } else if (status === 404) {
    message = 'The Gemini model was not found. Check GEMINI_MODEL in the backend .env.';
  } else if (status === 429) {
    message = 'Gemini rate or usage limit reached. Check your quota and try again later.';
    statusCode = 429;
  } else if (status === 503) {
    message = 'Gemini is temporarily overloaded or unavailable. Please try again shortly.';
  } else if (isTimeout) {
    message = 'Gemini timed out. Check the network and try again.';
    statusCode = 504;
  } else if (error?.name === 'ConnectionError' || code) {
    message = 'The backend could not reach Gemini. Check its network connection and try again.';
  } else if (status) {
    message = `Gemini returned HTTP ${status}. Try again later or check the backend logs.`;
  }

  // Log only safe error metadata. Provider messages can contain request details.
  console.error('Gemini request failed:', status || code || error?.name || 'unknown error');
  return Object.assign(new Error(message), { statusCode });
}

async function askGemini(prompt) {
  const ai = getGeminiClient();
  let response;
  try {
    response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
      contents: prompt,
      config: {
        temperature: 0,
        responseMimeType: 'application/json',
      },
    });
  } catch (error) {
    throw makeGeminiError(error);
  }

  try {
    return JSON.parse(response.text);
  } catch {
    throw new Error('Gemini returned an unexpected response.');
  }
}

function buildSchemaText(schema) {
  return JSON.stringify(schema, null, 2).slice(0, 30000);
}

async function generateSql(question, schema) {
  const answer = await askGemini(`
You translate natural language into PostgreSQL SELECT statements.
Return JSON with exactly two string properties: "sql" and "explanation".
The sql property must contain one read-only SELECT statement only.
Use only the tables and columns listed in the schema.
Never use INSERT, UPDATE, DELETE, DDL, multiple statements, or comments.
If the question cannot be answered from the schema, return sql as "" and explain why.

Schema:
${buildSchemaText(schema)}

Question:
${question}
`);

  if (!answer || typeof answer.sql !== 'string' || typeof answer.explanation !== 'string') {
    throw new Error('Gemini returned an unexpected response.');
  }
  if (!answer.sql.trim()) {
    const error = new Error(answer.explanation || 'The question could not be answered from this schema.');
    error.statusCode = 422;
    throw error;
  }

  return answer;
}

export async function runReadOnlyQuery(databasePool, sql, allowedTables) {
  const safeSql = validateSql(sql, allowedTables);
  const client = await databasePool.connect();

  try {
    await client.query('BEGIN READ ONLY');
    await client.query("SET LOCAL statement_timeout = '5000ms'");
    const result = await client.query(
      `SELECT * FROM (${safeSql}) AS ai_query_result LIMIT $1`,
      [500],
    );
    await client.query('COMMIT');
    return { rows: result.rows, rowCount: result.rowCount, sql: safeSql };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function explainResults(question, sql, rows) {
  try {
    const result = await askGemini(`
Explain these database query results in a short, clear paragraph.
Do not invent facts that are not in the results. Mention if there are no rows.

Question: ${question}
SQL: ${sql}
Rows returned (up to 30 shown): ${JSON.stringify(rows.slice(0, 30))}
`);
    return typeof result.explanation === 'string'
      ? result.explanation
      : 'The query ran successfully.';
  } catch {
    return 'The query ran successfully, but a natural-language summary could not be generated.';
  }
}

async function queryUploadedDatasets(userId, datasetIds, question) {
  const datasets = await findDatasetsByIds(userId, datasetIds);
  if (datasets.length !== datasetIds.length) throw new Error('One or more datasets were not found.');

  const schema = {
    tables: datasets.map((dataset) => ({
      name: dataset.name,
      table: dataset.table_name,
      columns: dataset.columns,
    })),
    relationships: datasets.flatMap((dataset) => dataset.relationships || []),
  };
  const generated = await generateSql(question, schema);
  const allowedTables = new Set(datasets.flatMap((dataset) => [
    dataset.table_name,
    `public.${dataset.table_name}`,
  ]));
  const result = await runReadOnlyQuery(pool, generated.sql, allowedTables);
  const explanation = await explainResults(question, result.sql, result.rows);

  return { sql: result.sql, rows: result.rows, rowCount: result.rowCount, explanation };
}

async function queryConnectedDatabase(userId, connectionId, question) {
  const databasePool = await getConnectionPool(userId, connectionId);
  if (!databasePool) throw new Error('Database connection not found.');

  const schema = await getConnectionSchema(userId, connectionId);
  const allowedTables = new Set();
  for (const table of schema.tables) {
    allowedTables.add(table.name);
    allowedTables.add(`${table.schema}.${table.name}`);
  }

  const generated = await generateSql(question, schema);
  const result = await runReadOnlyQuery(databasePool, generated.sql, allowedTables);
  const explanation = await explainResults(question, result.sql, result.rows);

  return { sql: result.sql, rows: result.rows, rowCount: result.rowCount, explanation };
}

export async function answerQuestion(userId, request) {
  const { datasetId, datasetIds, connectionId, question } = request;
  const selectedDatasets = Array.isArray(datasetIds) ? datasetIds : (datasetId ? [datasetId] : []);

  if (Boolean(selectedDatasets.length) === Boolean(connectionId)) {
    throw new Error('Choose one or more datasetIds or one connectionId.');
  }
  if (selectedDatasets.length > 10 || selectedDatasets.some((id) => typeof id !== 'string')) {
    throw new Error('Choose no more than 10 valid dataset IDs.');
  }
  if (typeof question !== 'string' || question.trim().length < 3 || question.length > 1000) {
    throw new Error('Provide a question between 3 and 1000 characters.');
  }

  if (selectedDatasets.length) return queryUploadedDatasets(userId, selectedDatasets, question.trim());
  return queryConnectedDatabase(userId, connectionId, question.trim());
}
