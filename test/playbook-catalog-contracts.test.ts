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
  tableId: CatalogTable;
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

  test('ships exact pipeline and launch profile document fields', async () => {
    const migrations = JSON.parse(await readFile(migrationsUrl, 'utf8')) as Migration[];
    const pipeline = migrations.find(({ tableId }) => tableId === CatalogTable.pipelines);
    const launchProfile = migrations.find(({ tableId }) => tableId === CatalogTable.launchProfiles);

    expect(pipeline?.schema).toEqual({
      type: 'object',
      properties: {
        playbookId: { type: 'string', default: '', foreignKey: 'playbooks' },
        pipeline: { type: 'string', default: '', contentMediaType: 'application/json' },
      },
      additionalProperties: false,
      required: ['playbookId', 'pipeline'],
    });
    expect(launchProfile?.schema).toEqual({
      type: 'object',
      properties: {
        pipelineId: { type: 'string', default: '', foreignKey: 'pipelines' },
        status: { type: 'string', default: 'active', enum: ['active', 'deprecated'] },
        profile: { type: 'string', default: '', contentMediaType: 'application/json' },
      },
      additionalProperties: false,
      required: ['pipelineId', 'status', 'profile'],
    });
  });

  test('exposes list and get reads for all canonical tables with cursor pagination', async () => {
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

  test('publishes the canonical domain writes without generic operations', async () => {
    const schema = await readFile(schemaUrl, 'utf8');
    for (const operation of [
      'createPlaybook',
      'updatePlaybook',
      'deletePlaybook',
      'updatePipeline',
      'updateLaunchProfile',
      'importCatalog',
      'commitCatalog',
    ]) {
      expect(schema).toContain(`${operation}(`);
    }
    expect(schema).toContain('discardCatalog:');
    expect(schema).not.toMatch(/createRow|updateRow|deleteRow/);
  });

  test('keeps every canonical REST list cursor-paginated', async () => {
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
      'launch-profiles',
    ];
    for (const path of collectionPaths) {
      const operation = document.paths[`/api/playbook-catalog/${path}`]?.get;
      expect(operation?.operationId).toEqual(expect.any(String));
      expect(operation?.parameters?.map(({ name }) => name)).toEqual(
        expect.arrayContaining(['first', 'after']),
      );
    }
    const playbookList =
      document.paths['/api/playbook-catalog/playbooks']?.get?.responses?.['200']?.content?.[
        'application/json'
      ]?.schema;
    expect(playbookList).toMatchObject({ $ref: '#/components/schemas/PlaybookConnectionResponse' });
  });

  test('declares the ten canonical table ids', () => {
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
        CatalogTable.launchProfiles,
      ]),
    );
    expect(canCreateCatalogTable(CatalogTable.playbooks)).toBe(true);
    expect(canUpdateCatalogTable(CatalogTable.playbooks)).toBe(true);
    expect(canUpdateCatalogTable(CatalogTable.pipelineRoles)).toBe(false);
    expect(canDeleteCatalogTable(CatalogTable.playbooks)).toBe(true);
  });
});
