import { readFile } from 'node:fs/promises';

import { HashService } from '@revisium/engine';
import { describe, expect, test } from 'vitest';

import {
  CATALOG_TABLES,
  CatalogTable,
  canCreateCatalogTable,
  canDeleteCatalogTable,
  canUpdateCatalogTable,
} from '../src/features/playbook-catalog/constants/catalog.constants.js';

type Migration = {
  id: string;
  changeType: string;
  tableId: string;
  hash?: string;
  schema?: unknown;
};

const migrationsUrl = new URL('../resources/system-playbooks/migrations.json', import.meta.url);
const schemaUrl = new URL('../src/api/graphql/schema.graphql', import.meta.url);
const openApiUrl = new URL('../src/api/rest/openapi.json', import.meta.url);

describe('Playbook Catalog contracts', () => {
  test('keeps the shipped migrations and hash-pins every catalog init schema', async () => {
    const migrations = JSON.parse(await readFile(migrationsUrl, 'utf8')) as Migration[];
    expect(migrations.map(({ changeType, tableId }) => ({ changeType, tableId }))).toEqual(
      CATALOG_TABLES.map((tableId) => ({ changeType: 'init', tableId })),
    );
    const catalogInits = migrations;
    const hashes = new HashService();
    await Promise.all(
      catalogInits.map(async (migration) => {
        await expect(hashes.hashObject(migration.schema)).resolves.toBe(migration.hash);
      }),
    );
  });

  test('exposes list and get reads for all twelve tables with cursor pagination', async () => {
    const schema = await readFile(schemaUrl, 'utf8');
    const listNames = [
      'playbooks',
      'roles',
      'roleRefs',
      'sharedReferences',
      'stacks',
      'stackRefs',
      'methodDocuments',
      'pipelines',
      'pipelineRoles',
      'pipelineSources',
      'pipelineSlots',
      'launchProfiles',
    ];
    const getNames = [
      'playbook',
      'role',
      'roleRef',
      'sharedReference',
      'stack',
      'stackRef',
      'methodDocument',
      'pipeline',
      'pipelineRole',
      'pipelineSource',
      'pipelineSlot',
      'launchProfile',
    ];
    for (const name of listNames) {
      expect(schema).toMatch(new RegExp(`\\n  ${name}\\(`));
      const start = schema.indexOf(`  ${name}(`);
      const signature = schema.slice(start, schema.indexOf('):', start));
      expect(signature).toContain('first: Int!');
      expect(signature).toContain('after: String');
    }
    for (const name of getNames) {
      expect(schema).toMatch(new RegExp(`\\n  ${name}\\(`));
    }
  });

  test('publishes domain writes and omits generic, slot-write, and bulk-role operations', async () => {
    const schema = await readFile(schemaUrl, 'utf8');
    for (const operation of [
      'createPlaybook',
      'updatePlaybook',
      'deletePlaybook',
      'updatePipelineSource',
      'deletePipelineSource',
      'importCatalog',
      'commitCatalog',
    ]) {
      expect(schema).toContain(`${operation}(`);
    }
    expect(schema).toContain('discardCatalog:');
    expect(schema).not.toMatch(/createPipelineSlot|deletePipelineSlot|setPipelineRoles/);
    expect(schema).not.toMatch(/createRow|updateRow|deleteRow/);
  });

  test('keeps every REST list cursor-paginated and the slot resource read-only', async () => {
    const document = JSON.parse(await readFile(openApiUrl, 'utf8')) as {
      paths: Record<
        string,
        Record<
          string,
          {
            operationId?: string;
            parameters?: Array<{ name?: string }>;
            responses?: Record<
              string,
              { content?: Record<string, { schema?: { $ref?: string } }> }
            >;
          }
        >
      >;
    };
    const collectionPaths = [
      'playbooks',
      'roles',
      'role-refs',
      'shared-references',
      'stacks',
      'stack-refs',
      'method-documents',
      'pipelines',
      'pipeline-roles',
      'pipeline-sources',
      'pipeline-slots',
      'launch-profiles',
    ];
    for (const path of collectionPaths) {
      const operation = document.paths[`/api/playbook-catalog/${path}`]?.get;
      expect(operation?.operationId).toEqual(expect.any(String));
      expect(operation?.parameters?.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['first', 'after']),
      );
    }
    expect(document.paths['/api/playbook-catalog/pipeline-slots']).toEqual({
      get: expect.any(Object),
    });
    expect(document.paths['/api/playbook-catalog/pipeline-slots/{id}']).toEqual({
      get: expect.any(Object),
    });
    const playbookList =
      document.paths['/api/playbook-catalog/playbooks']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    expect(playbookList).toMatchObject({ $ref: '#/components/schemas/PlaybookConnectionResponse' });
  });

  test('declares the twelve expected table ids', () => {
    expect(new Set(CATALOG_TABLES)).toEqual(
      new Set([
        CatalogTable.playbooks,
        CatalogTable.roles,
        CatalogTable.roleRefs,
        CatalogTable.sharedReferences,
        CatalogTable.stacks,
        CatalogTable.stackRefs,
        CatalogTable.methodDocuments,
        CatalogTable.pipelines,
        CatalogTable.pipelineRoles,
        CatalogTable.pipelineSources,
        CatalogTable.pipelineSlots,
        CatalogTable.launchProfiles,
      ]),
    );
    expect(canCreateCatalogTable(CatalogTable.playbooks)).toBe(true);
    expect(canCreateCatalogTable(CatalogTable.pipelineSlots)).toBe(false);
    expect(canUpdateCatalogTable(CatalogTable.playbooks)).toBe(true);
    expect(canUpdateCatalogTable(CatalogTable.pipelineRoles)).toBe(false);
    expect(canDeleteCatalogTable(CatalogTable.playbooks)).toBe(true);
    expect(canDeleteCatalogTable(CatalogTable.pipelineSlots)).toBe(false);
  });
});
