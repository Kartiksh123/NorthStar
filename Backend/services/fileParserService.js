import path from 'node:path';
import ExcelJS from 'exceljs';
import { parse as parseCsv } from 'csv-parse/sync';

const maximumRows = 10000;
const maximumColumns = 100;

function normalizeCell(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') return JSON.stringify(value);
  return value;
}

function validateSize(headers, records) {
  if (headers.length === 0 || headers.length > maximumColumns) {
    throw new Error(`The file must contain between 1 and ${maximumColumns} columns.`);
  }
  if (records.length === 0 || records.length > maximumRows) {
    throw new Error(`The file must contain between 1 and ${maximumRows} data rows.`);
  }
}

function parseJson(buffer) {
  const values = JSON.parse(buffer.toString('utf8'));
  if (!Array.isArray(values) || values.length === 0 || !values.every((row) => row && typeof row === 'object' && !Array.isArray(row))) {
    throw new Error('JSON uploads must be a non-empty array of objects.');
  }

  const headers = [...new Set(values.flatMap((row) => Object.keys(row)))];
  const records = values.map((row) => headers.map((header) => normalizeCell(row[header])));
  validateSize(headers, records);
  return { headers, records };
}

function parseCsvFile(buffer) {
  const objects = parseCsv(buffer, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    max_records: maximumRows + 1,
    max_record_size: 1000000,
  });

  if (objects.length === 0) throw new Error('The CSV file has no data rows.');
  const headers = Object.keys(objects[0]);
  const records = objects.map((row) => headers.map((header) => normalizeCell(row[header])));
  validateSize(headers, records);
  return { headers, records };
}

async function parseExcelFile(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  if (!worksheet || worksheet.rowCount < 2) {
    throw new Error('The Excel file must have a header row and at least one data row.');
  }
  if (worksheet.columnCount > maximumColumns || worksheet.rowCount > maximumRows + 1) {
    throw new Error(`The Excel file may contain at most ${maximumColumns} columns and ${maximumRows} data rows.`);
  }

  const headerRow = worksheet.getRow(1);
  const headers = Array.from({ length: worksheet.columnCount }, (_, index) => {
    const cell = headerRow.getCell(index + 1).value;
    return cell === null || cell === undefined ? '' : String(normalizeCell(cell));
  });
  const records = [];

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = headers.map((_, index) => normalizeCell(row.getCell(index + 1).value));
    if (values.some((value) => value !== null)) records.push(values);
  }

  validateSize(headers, records);
  return { headers, records };
}

export async function parseUploadedFile(file) {
  const extension = path.extname(file.originalname).toLowerCase();

  if (extension === '.csv') return parseCsvFile(file.buffer);
  if (extension === '.json') return parseJson(file.buffer);
  if (extension === '.xlsx') return parseExcelFile(file.buffer);

  throw new Error('Supported file types are CSV, JSON, and XLSX.');
}
