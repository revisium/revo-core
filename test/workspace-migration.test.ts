import { readFile } from 'node:fs/promises';

import { Client } from 'pg';
import { afterEach, beforeEach, expect, test } from 'vitest';

import { databaseConfig } from '../src/config/database.config.js';

const migration = await readFile(
  'prisma/migrations/20260913133859_unify_project_workspaces/migration.sql',
  'utf8',
);
const simplificationMigration = await readFile(
  'prisma/migrations/20260914130000_remove_file_system_permissions_and_workspace_version/migration.sql',
  'utf8',
);
const archiveMigration = await readFile(
  'prisma/migrations/20260914140000_archive_workspaces/migration.sql',
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
      "remoteUrl" TEXT,
      "localPath" TEXT,
      CONSTRAINT "repositories_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES projects(id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
    );
    CREATE TEMP TABLE workspaces (
      id TEXT PRIMARY KEY,
      "projectId" TEXT NOT NULL,
      CONSTRAINT "workspaces_projectId_fkey"
        FOREIGN KEY ("projectId") REFERENCES projects(id)
        ON DELETE RESTRICT ON UPDATE CASCADE
    );
    INSERT INTO projects VALUES ('project');
    INSERT INTO workspaces VALUES ('workspace', 'project');
  `);
});

afterEach(async () => {
  await client.end();
});

test('removes an empty legacy table, preserves Workspaces and restricts Project identity changes', async () => {
  await client.query(migration);
  expect((await client.query("SELECT to_regclass('repositories') AS legacy")).rows).toEqual([
    { legacy: null },
  ]);
  expect((await client.query('SELECT * FROM workspaces')).rows).toEqual([
    { id: 'workspace', projectId: 'project' },
  ]);
  await expect(client.query("UPDATE projects SET id = 'renamed'")).rejects.toMatchObject({
    code: '23503',
  });
  await expect(client.query('DELETE FROM projects')).rejects.toMatchObject({ code: '23503' });
});

test('rejects a populated legacy table without losing source metadata or changing constraints', async () => {
  const legacy = {
    id: 'repository',
    projectId: 'project',
    remoteUrl: 'https://example.com/repository.git',
    localPath: null,
  };
  await client.query('INSERT INTO repositories VALUES ($1, $2, $3, $4)', Object.values(legacy));

  await expect(client.query(migration)).rejects.toThrow(
    'Cannot remove repositories while legacy records exist.',
  );
  await client.query('ROLLBACK');
  expect((await client.query('SELECT * FROM repositories')).rows).toEqual([legacy]);
  expect((await client.query('SELECT * FROM workspaces')).rows).toEqual([
    { id: 'workspace', projectId: 'project' },
  ]);
  await expect(client.query("UPDATE projects SET id = 'renamed'")).rejects.toMatchObject({
    code: '23503',
  });
  await client.query('DELETE FROM repositories');
  await client.query("UPDATE projects SET id = 'renamed'");
  expect((await client.query('SELECT "projectId" FROM workspaces')).rows).toEqual([
    { projectId: 'renamed' },
  ]);
});

test('removes permissions and technical versions while preserving Workspaces and their history', async () => {
  await client.query(`
    ALTER TABLE workspaces ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
    CREATE TEMP TABLE file_system_permission_policies (id TEXT PRIMARY KEY);
    CREATE TEMP TABLE workspace_events (
      id TEXT PRIMARY KEY,
      "workspaceId" TEXT REFERENCES workspaces(id) ON DELETE RESTRICT
    );
    INSERT INTO file_system_permission_policies VALUES ('policy');
    INSERT INTO workspace_events VALUES ('event', 'workspace');
  `);

  await client.query(simplificationMigration.replaceAll('"public".', 'pg_temp.'));

  expect((await client.query('SELECT * FROM workspaces')).rows).toEqual([
    { id: 'workspace', projectId: 'project' },
  ]);
  expect((await client.query('SELECT * FROM workspace_events')).rows).toEqual([
    { id: 'event', workspaceId: 'workspace' },
  ]);
  expect(
    (await client.query("SELECT to_regclass('pg_temp.file_system_permission_policies') AS policy"))
      .rows,
  ).toEqual([{ policy: null }]);
});

test('migrates disconnected Workspaces to the archive without losing their source or timestamp', async () => {
  await client.query(`
    CREATE TYPE pg_temp."WorkspaceAvailability" AS ENUM ('UNKNOWN');
    ALTER TABLE workspaces
      ADD COLUMN name TEXT NOT NULL DEFAULT 'Folder',
      ADD COLUMN "sourcePath" TEXT NOT NULL DEFAULT '/local/folder',
      ADD COLUMN "availability" pg_temp."WorkspaceAvailability" NOT NULL DEFAULT 'UNKNOWN',
      ADD COLUMN "lastCheckedAt" TIMESTAMPTZ(3),
      ADD COLUMN "lastErrorCode" TEXT,
      ADD COLUMN "disconnectedAt" TIMESTAMPTZ(3);
    CREATE INDEX "workspaces_projectId_disconnectedAt_name_id_idx"
      ON workspaces("projectId", "disconnectedAt", name, id);
    CREATE TEMP TABLE workspace_events (
      id TEXT PRIMARY KEY,
      "workspaceId" TEXT REFERENCES workspaces(id)
    );
    INSERT INTO workspace_events VALUES ('event', 'workspace');
    INSERT INTO workspaces (id, "projectId", "disconnectedAt")
      VALUES ('archived', 'project', '2026-09-14T10:00:00Z');
  `);

  await client.query(archiveMigration.replaceAll('"public".', 'pg_temp.'));

  expect((await client.query('SELECT * FROM workspaces ORDER BY id')).rows).toEqual([
    {
      id: 'archived',
      projectId: 'project',
      name: 'Folder',
      sourcePath: '/local/folder',
      isArchived: true,
      archivedAt: new Date('2026-09-14T10:00:00Z'),
    },
    {
      id: 'workspace',
      projectId: 'project',
      name: 'Folder',
      sourcePath: '/local/folder',
      isArchived: false,
      archivedAt: null,
    },
  ]);
  expect(
    (await client.query("SELECT to_regclass('pg_temp.workspace_events') AS history")).rows,
  ).toEqual([{ history: null }]);
});
