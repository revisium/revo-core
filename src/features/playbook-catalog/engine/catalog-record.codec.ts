import { BadRequestException, ConflictException } from '@nestjs/common';
import type { PipelineSourcePackage, RunProfile } from '@revisium/revo-run';

import { CatalogTable } from '../contracts/catalog-table.js';
import type {
  CatalogRecordData,
  LaunchProfileRecordData,
  PipelineRecordData,
} from '../contracts/catalog.types.js';
import { asCatalogData } from './catalog-record.mapper.js';

type CatalogDefinitionField = 'pipeline' | 'profile';

export function encodeCatalogDefinition(value: unknown, field: CatalogDefinitionField): string {
  if (!isObject(value)) {
    return invalidCatalogDefinition(field, 'object_required');
  }

  let serialized: string | undefined;

  try {
    serialized = JSON.stringify(value);
  } catch {
    return invalidCatalogDefinition(field, 'serialization_failed');
  }

  if (typeof serialized !== 'string') {
    return invalidCatalogDefinition(field, 'object_required');
  }

  let serializedValue: unknown;

  try {
    serializedValue = JSON.parse(serialized);
  } catch {
    return invalidCatalogDefinition(field, 'serialization_failed');
  }

  if (!isObject(serializedValue)) {
    return invalidCatalogDefinition(field, 'object_required');
  }

  return serialized;
}

export function decodePipelineRecordData(value: unknown): PipelineRecordData {
  const data = asCatalogData(value);

  return {
    ...data,
    pipeline: decodeCatalogDefinition(data.pipeline, 'pipeline'),
  } as PipelineRecordData;
}

export function decodeLaunchProfileRecordData(value: unknown): LaunchProfileRecordData {
  const data = asCatalogData(value);

  return {
    ...data,
    profile: decodeCatalogDefinition(data.profile, 'profile'),
  } as LaunchProfileRecordData;
}

export function decodeCatalogRecordData(tableId: CatalogTable, value: unknown): object {
  if (tableId === CatalogTable.pipelines) {
    return decodePipelineRecordData(value);
  }
  if (tableId === CatalogTable.launchProfiles) {
    return decodeLaunchProfileRecordData(value);
  }

  return asCatalogData(value);
}

export function encodeCatalogRecordData(tableId: CatalogTable, value: unknown): CatalogRecordData {
  const data = asCatalogData(value);

  if (tableId === CatalogTable.pipelines) {
    return {
      ...data,
      pipeline: encodeCatalogDefinition(data.pipeline, 'pipeline'),
    };
  }
  if (tableId === CatalogTable.launchProfiles) {
    return {
      ...data,
      profile: encodeCatalogDefinition(data.profile, 'profile'),
    };
  }

  return data;
}

function decodeCatalogDefinition(value: unknown, field: 'pipeline'): PipelineSourcePackage;
function decodeCatalogDefinition(value: unknown, field: 'profile'): RunProfile;
function decodeCatalogDefinition(
  value: unknown,
  field: CatalogDefinitionField,
): PipelineSourcePackage | RunProfile {
  if (typeof value !== 'string') {
    return corruptCatalogDefinition(field);
  }

  try {
    const parsed: unknown = JSON.parse(value);

    if (!isObject(parsed)) {
      return corruptCatalogDefinition(field);
    }

    return parsed as unknown as PipelineSourcePackage | RunProfile;
  } catch {
    return corruptCatalogDefinition(field);
  }
}

function invalidCatalogDefinition(field: CatalogDefinitionField, reason: string): never {
  throw new BadRequestException({
    statusCode: 400,
    code: 'catalog_definition_invalid',
    message: 'Catalog definition must be a JSON object.',
    path: `/${field}`,
    details: { reason },
  });
}

function corruptCatalogDefinition(field: CatalogDefinitionField): never {
  throw new ConflictException({
    statusCode: 409,
    code: 'catalog_definition_corrupt',
    message: 'Catalog definition is corrupt.',
    path: `/${field}`,
    details: { reason: 'storage_json' },
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
