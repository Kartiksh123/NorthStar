const identifierLimit = 63;

function makeSafeName(value, fallback) {
  let name = String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!name) name = fallback;
  if (!/^[a-z_]/.test(name)) name = `column_${name}`;
  return name.slice(0, identifierLimit);
}

function makeUniqueNames(headers) {
  const usedNames = new Set();

  return headers.map((header, index) => {
    const originalName = String(header ?? '').trim() || `Column ${index + 1}`;
    const baseName = makeSafeName(originalName, `column_${index + 1}`);
    let name = baseName;
    let suffix = 2;

    while (usedNames.has(name)) {
      const ending = `_${suffix}`;
      name = `${baseName.slice(0, identifierLimit - ending.length)}${ending}`;
      suffix += 1;
    }

    usedNames.add(name);
    return { name, originalName };
  });
}

function isInteger(value) {
  return /^-?\d+$/.test(value);
}

function isNumber(value) {
  return /^-?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value);
}

function isDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function detectType(values) {
  const populated = values
    .filter((value) => value !== null && value !== undefined && String(value).trim() !== '')
    .map((value) => String(value).trim());

  if (populated.length === 0) return 'TEXT';
  if (populated.every((value) => /^(true|false)$/i.test(value))) return 'BOOLEAN';

  if (populated.every(isInteger)) {
    const isBigInt = populated.every((value) => {
      try {
        const number = BigInt(value);
        return number >= -9223372036854775808n && number <= 9223372036854775807n;
      } catch {
        return false;
      }
    });
    return isBigInt ? 'BIGINT' : 'NUMERIC';
  }

  if (populated.every(isNumber)) return 'NUMERIC';
  if (populated.every(isDate)) return 'DATE';
  if (populated.every((value) => value.includes('T') && !Number.isNaN(Date.parse(value)))) {
    return 'TIMESTAMPTZ';
  }

  return 'TEXT';
}

export function inferColumns(headers, records) {
  const namedColumns = makeUniqueNames(headers);

  return namedColumns.map((column, index) => ({
    name: column.name,
    originalName: column.originalName,
    dataType: detectType(records.map((record) => record[index])),
  }));
}

export function quoteIdentifier(identifier) {
  // Only generated names that match this pattern may be used in SQL identifiers.
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(identifier)) {
    throw new Error('Invalid SQL identifier.');
  }

  return `"${identifier}"`;
}
