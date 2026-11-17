import { astVisitor, parse, toSql } from 'pgsql-ast-parser';

const allowedStatementTypes = new Set(['select', 'with', 'union']);
const blockedNodeTypes = new Set([
  'insert', 'update', 'delete', 'merge', 'create', 'alter', 'drop',
  'truncate', 'grant', 'revoke', 'copy', 'do',
]);
const allowedFunctions = new Set([
  'abs', 'avg', 'ceil', 'ceiling', 'coalesce', 'concat', 'count',
  'date_part', 'date_trunc', 'floor', 'greatest', 'least', 'length',
  'lower', 'max', 'min', 'nullif', 'replace', 'round', 'substring',
  'sum', 'to_char', 'trim', 'upper',
]);

function collectCteNames(statement, names = new Set()) {
  if (statement.type === 'with') {
    for (const item of statement.bind || []) {
      names.add(item.alias.name);
      collectCteNames(item.statement, names);
    }
    collectCteNames(statement.in, names);
  }
  return names;
}

function rejectChanges(statement) {
  if (!statement || typeof statement !== 'object') return;
  if (blockedNodeTypes.has(statement.type)) {
    throw new Error('Only read-only SELECT queries are allowed.');
  }
  if (statement.type === 'call') {
    const functionName = statement.function?.name;
    if (typeof functionName !== 'string' || !allowedFunctions.has(functionName.toLowerCase())) {
      throw new Error('The query uses a database function that is not allowed.');
    }
  }

  for (const value of Object.values(statement)) {
    if (Array.isArray(value)) value.forEach(rejectChanges);
    else if (value && typeof value === 'object') rejectChanges(value);
  }
}

export function validateSql(sql, allowedTables = null) {
  if (typeof sql !== 'string' || sql.length > 10000) {
    throw new Error('The generated SQL is missing or too long.');
  }

  let statements;
  try {
    statements = parse(sql);
  } catch {
    throw new Error('Gemini returned SQL that could not be parsed.');
  }

  if (statements.length !== 1 || !allowedStatementTypes.has(statements[0].type)) {
    throw new Error('Only one read-only SELECT query is allowed.');
  }

  const statement = statements[0];
  rejectChanges(statement);
  const cteNames = collectCteNames(statement);
  const referencedTables = [];
  const visitor = astVisitor((map) => ({
    tableRef(table) {
      referencedTables.push(table.name);
      return map.super().tableRef(table);
    },
  }));
  visitor.statement(statement);

  if (allowedTables) {
    for (const table of referencedTables) {
      const tableName = typeof table === 'string' ? table : table.name;
      const schemaName = typeof table === 'string' ? null : table.schema;
      if (cteNames.has(tableName)) continue;

      const qualifiedName = schemaName ? `${schemaName}.${tableName}` : tableName;
      if (!allowedTables.has(qualifiedName) && !(schemaName === 'public' && allowedTables.has(tableName))) {
        throw new Error('The query refers to a table outside the selected data source.');
      }
    }
  }

  return toSql.statement(statement);
}
