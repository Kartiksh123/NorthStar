import { inferColumns } from '../utils/schemaUtils.js';
import { parseUploadedFile } from './fileParserService.js';
import {
  findDataset,
  getDatasetsForRelationships,
  getDatasetRows,
  listDatasets,
  saveDataset,
} from '../models/datasetModel.js';

function getSingularName(name) {
  const value = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (value.endsWith('ies')) return `${value.slice(0, -3)}y`;
  if (value.endsWith('s')) return value.slice(0, -1);
  return value;
}

async function detectRelationshipCandidates(userId, datasetName, columns) {
  const existingDatasets = await getDatasetsForRelationships(userId);
  const relationships = [];

  for (const column of columns) {
    if (!column.name.endsWith('_id')) continue;
    const referencedName = column.name.slice(0, -3);
    const target = existingDatasets.find((dataset) =>
      getSingularName(dataset.name) === referencedName
      && dataset.columns.some((item) => item.name === 'id'),
    );

    if (target) {
      relationships.push({
        kind: 'candidate',
        from: { table: '__current__', column: column.name },
        to: { table: target.table_name, column: 'id' },
      });
    }
  }

  const currentHasId = columns.some((column) => column.name === 'id');
  if (currentHasId) {
    for (const dataset of existingDatasets) {
      const datasetNameSingular = getSingularName(dataset.name);
      const referenceColumn = `${datasetNameSingular}_id`;
      const column = dataset.columns.find((item) => item.name === referenceColumn);
      if (column) {
        relationships.push({
          kind: 'candidate',
          from: { table: dataset.table_name, column: referenceColumn },
          to: { table: '__current__', column: 'id' },
        });
      }
    }
  }

  return relationships;
}

export async function importDataset(userId, file, requestedName) {
  const { headers, records } = await parseUploadedFile(file);
  const columns = inferColumns(headers, records);
  const name = typeof requestedName === 'string' && requestedName.trim()
    ? requestedName.trim().slice(0, 100)
    : file.originalname.replace(/\.[^.]+$/, '').slice(0, 100);
  const relationships = await detectRelationshipCandidates(userId, name, columns);

  return saveDataset(userId, name, columns, relationships, records);
}

export async function getUserDatasets(userId) {
  return listDatasets(userId);
}

export async function getUserDataset(userId, datasetId) {
  const dataset = await findDataset(userId, datasetId);
  if (!dataset) return null;
  const datasets = await getDatasetsForRelationships(userId);
  const relationships = datasets.flatMap((item) => item.relationships || []).filter((relationship) =>
    relationship.from.table === dataset.table_name || relationship.to.table === dataset.table_name,
  );
  return { ...dataset, relationships };
}

export async function getUserDatasetRows(userId, datasetId, limit) {
  return getDatasetRows(userId, datasetId, limit);
}
