import { readFile } from 'node:fs/promises';

import { Client } from 'pg';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { databaseConfig } from '../src/config/database.config.js';

const workspaceMigration = await readFile(
  'prisma/migrations/20260913130000_project_workspaces/migration.sql',
  'utf8',
);
const permissionsMigration = await readFile(
  'prisma/migrations/20260914130000_remove_file_system_permissions/migration.sql',
  'utf8',
);
let client: Client;

beforeEach(async () => {
  client = new Client({ connectionString: databaseConfig().url });
  await client.connect();
  await client.query(`
    SET search_path TO pg_temp;
    CREATE TEMP TABLE projects (id TEXT PRIMARY KEY);
    CREATE TEMP TABLE repositories (
      id TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      name TEXT NOT NULL,
      "remoteUrl" TEXT,
      "localPath" TEXT,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL,
      CONSTRAINT "repositories_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES projects(id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    );
    CREATE TEMP TABLE file_system_permission_policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      document JSONB NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMPTZ(3) NOT NULL,
      "revokedAt" TIMESTAMPTZ(3)
    );
    INSERT INTO projects VALUES ('project');
  `);
});

afterEach(async () => {
  await client.end();
});

test('replaces an empty legacy table with final Workspaces that persist defaults and restrict Project changes', async () => {
  await client.query(workspaceMigration);
  await client.query(`
    INSERT INTO workspaces (id, "projectId", name, type, "sourcePath", "updatedAt")
    VALUES ('workspace', 'project', 'Folder', 'folder', '/local/folder', '2026-09-14T10:00:00Z')
  `);

  const workspace = (await client.query('SELECT * FROM workspaces')).rows[0];
  expect(workspace).toEqual({
    archivedAt: null,
    createdAt: expect.any(Date),
    description: '',
    id: 'workspace',
    isArchived: false,
    projectId: 'project',
    name: 'Folder',
    sourcePath: '/local/folder',
    type: 'folder',
    updatedAt: new Date('2026-09-14T10:00:00Z'),
  });
  expect((await client.query("SELECT to_regclass('pg_temp.repositories') AS legacy")).rows).toEqual(
    [{ legacy: null }],
  );
  await expect(client.query("UPDATE projects SET id = 'renamed'")).rejects.toMatchObject({
    code: '23503',
  });
  await expect(client.query('DELETE FROM projects')).rejects.toMatchObject({ code: '23503' });
});

test('rejects populated legacy repositories without destructive partial schema changes', async () => {
  const repository = {
    id: 'repository',
    projectId: 'project',
    name: 'Repository',
    remoteUrl: 'https://example.com/repository.git',
    localPath: '/local/repository',
    createdAt: new Date('2026-09-14T09:00:00Z'),
    updatedAt: new Date('2026-09-14T09:00:00Z'),
  };
  const policy = {
    id: 'policy',
    name: 'Policy',
    document: { allow: ['/local/repository'] },
    version: 1,
    createdAt: new Date('2026-09-14T09:00:00Z'),
    updatedAt: new Date('2026-09-14T09:00:00Z'),
    revokedAt: null,
  };
  await client.query(
    'INSERT INTO repositories VALUES ($1, $2, $3, $4, $5, $6, $7)',
    Object.values(repository),
  );
  await client.query(
    'INSERT INTO file_system_permission_policies VALUES ($1, $2, $3, $4, $5, $6, $7)',
    Object.values(policy),
  );

  await expect(client.query(workspaceMigration)).rejects.toThrow(
    'Cannot remove repositories while legacy records exist.',
  );
  await client.query('ROLLBACK');

  expect((await client.query('SELECT * FROM repositories')).rows).toEqual([repository]);
  expect((await client.query('SELECT * FROM file_system_permission_policies')).rows).toEqual([
    policy,
  ]);
  expect(
    (await client.query("SELECT to_regclass('pg_temp.workspaces') AS workspace")).rows,
  ).toEqual([{ workspace: null }]);
});

test('removes permissions without changing final Workspaces', async () => {
  await client.query(workspaceMigration);
  await client.query(`
    INSERT INTO workspaces (id, "projectId", name, type, "sourcePath", "updatedAt")
    VALUES ('workspace', 'project', 'Folder', 'folder', '/local/folder', '2026-09-14T10:00:00Z');
    INSERT INTO file_system_permission_policies (id, name, document, "updatedAt")
    VALUES ('policy', 'Policy', '{"allow":[]}', '2026-09-14T10:00:00Z');
  `);

  await client.query(permissionsMigration);

  expect(
    (await client.query("SELECT to_regclass('pg_temp.file_system_permission_policies') AS policy"))
      .rows,
  ).toEqual([{ policy: null }]);
  expect(
    (await client.query('SELECT id, "projectId", name, type, "sourcePath" FROM workspaces')).rows,
  ).toEqual([
    {
      id: 'workspace',
      projectId: 'project',
      name: 'Folder',
      type: 'folder',
      sourcePath: '/local/folder',
    },
  ]);
});
