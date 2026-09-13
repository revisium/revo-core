import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, test, expect } from 'vitest';

import { parseFileSystemPermissionSet } from '../src/features/file-system/contracts/file-system-access-context.js';
import {
  FileSystemAccessContext,
  FileSystemPermission as P,
  type FileSystemAccessPolicy,
} from '../src/features/file-system/contracts/file-system.contracts.js';
import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
import { FileSystemModule } from '../src/features/file-system/file-system.module.js';

const capabilities = Object.values(P);

describe('Filesystem permission boundaries', () => {
  let module: TestingModule;
  let filesystem: FileSystemApiService;
  let root: string;
  let workspace: string;
  let authority: FileSystemAccessContext;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-boundaries-'));
    workspace = path.join(root, 'workspace');
    await mkdir(workspace);
    await mkdir(path.join(workspace, 'docs'));
    await mkdir(path.join(workspace, '.git'));
    await writeFile(path.join(workspace, '.env'), 'secret');
    authority = FileSystemAccessContext.create({
      scopes: [{ rootPath: root, allow: capabilities }],
    });
    module = await Test.createTestingModule({ imports: [FileSystemModule] }).compile();
    await module.init();
    filesystem = module.get(FileSystemApiService);
  });

  afterEach(async () => {
    await module.close();
    await rm(root, { recursive: true, force: true });
  });

  test('broad agent permissions cannot exceed Workspace paths or capabilities', async () => {
    const context = authority
      .restrict({ scopes: [{ rootPath: workspace, allow: [P.LIST, P.READ_METADATA] }] })
      .restrict({ scopes: [{ rootPath: root, allow: capabilities }] });
    const client = filesystem.withAccess(context);
    expect((await client.getRoots({})).edges.map((edge) => edge.node.path)).toEqual([workspace]);
    expect((await client.getDirectory({ path: workspace })).parentPath).toBeNull();
    await expect(client.getEntry({ path: root })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    await expect(
      client.createDirectory({ parentPath: workspace, name: 'forbidden' }),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('a broad Workspace boundary cannot grant capabilities missing from the agent', async () => {
    const context = authority
      .restrict({ scopes: [{ rootPath: workspace, allow: capabilities }] })
      .restrict({ scopes: [{ rootPath: workspace, allow: [P.READ_METADATA] }] });
    const client = filesystem.withAccess(context);
    expect(await client.isDirectory({ path: workspace })).toBe(true);
    await expect(client.getDirectory({ path: workspace })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    expect((await client.getRoots({})).totalCount).toBe(0);
  });

  test('host limits remain effective when Workspace and agent claim wider roots', async () => {
    const narrowHost = FileSystemAccessContext.create({
      scopes: [{ rootPath: workspace, allow: [P.READ_METADATA] }],
    });
    const broad = { scopes: [{ rootPath: root, allow: capabilities }] };
    const context = narrowHost.restrict(broad).restrict(broad);
    await expect(filesystem.getEntry({ path: root }, context)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('a step narrows writes to docs without weakening Workspace secret and git denies', async () => {
    const boundary: FileSystemAccessPolicy = {
      scopes: [
        {
          rootPath: workspace,
          allow: capabilities,
          rules: [
            { path: '.env', match: 'EXACT', deny: [P.READ_METADATA] },
            { path: '.git', match: 'SUBTREE', deny: [P.CREATE_DIRECTORY] },
          ],
        },
      ],
    };
    const step: FileSystemAccessPolicy = {
      scopes: [
        {
          rootPath: workspace,
          allow: [P.LIST, P.READ_METADATA],
          rules: [{ path: 'docs', match: 'SUBTREE', allow: [P.CREATE_DIRECTORY] }],
        },
      ],
    };
    const client = filesystem.withAccess(authority.restrict(boundary).restrict(step));
    await client.createDirectory({ parentPath: path.join(workspace, 'docs'), name: 'allowed' });
    await expect(
      client.createDirectory({ parentPath: workspace, name: 'forbidden' }),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(client.getEntry({ path: path.join(workspace, '.env') })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    await expect(
      client.createDirectory({ parentPath: path.join(workspace, '.git'), name: 'forbidden' }),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('layer order cannot change deny precedence', async () => {
    const allow: FileSystemAccessPolicy = {
      scopes: [{ rootPath: workspace, allow: capabilities }],
    };
    const deny: FileSystemAccessPolicy = {
      scopes: [{ rootPath: workspace, allow: capabilities, deny: [P.READ_METADATA] }],
    };
    await expect(
      filesystem.getEntry({ path: workspace }, authority.restrict(allow).restrict(deny)),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      filesystem.getEntry({ path: workspace }, authority.restrict(deny).restrict(allow)),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('an empty restriction denies everything and cannot be widened later', async () => {
    const context = authority
      .restrict({ scopes: [] })
      .restrict({ scopes: [{ rootPath: root, allow: capabilities }] });
    await expect(filesystem.exists({ path: workspace }, context)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('both requested and canonical paths must satisfy every layer', async () => {
    await symlink(root, path.join(workspace, 'outside'), 'dir');
    await symlink(path.join(workspace, '.env'), path.join(workspace, 'alias'));
    const context = authority.restrict({
      scopes: [
        {
          rootPath: workspace,
          allow: capabilities,
          rules: [{ path: '.env', match: 'EXACT', deny: [P.READ_METADATA] }],
        },
      ],
    });
    await expect(
      filesystem.getDirectory({ path: path.join(workspace, 'outside') }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      filesystem.getEntry({ path: path.join(workspace, 'alias') }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    const aliasDeny = authority.restrict({
      scopes: [
        {
          rootPath: workspace,
          allow: capabilities,
          rules: [{ path: 'alias', match: 'EXACT', deny: [P.READ_METADATA] }],
        },
      ],
    });
    await expect(
      filesystem.getEntry({ path: path.join(workspace, 'alias') }, aliasDeny),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('caller mutation cannot change issued grants or bound tool permissions', async () => {
    const allow = [P.READ_METADATA];
    const policy = { scopes: [{ rootPath: workspace, allow }] };
    const context = FileSystemAccessContext.create(policy);
    const client = filesystem.withAccess(context);
    allow.push(P.CREATE_DIRECTORY);
    policy.scopes[0] = { rootPath: root, allow: capabilities };
    await expect(
      client.createDirectory({ parentPath: workspace, name: 'forbidden' }),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(client.getEntry({ path: root })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    expect(Object.isFrozen(context.policies[0]?.scopes[0]?.allow)).toBe(true);
  });

  test('serialized policy data cannot impersonate an issued context', async () => {
    const forged = JSON.parse(JSON.stringify(authority)) as FileSystemAccessContext;
    await expect(filesystem.getEntry({ path: workspace }, forged)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    expect((await filesystem.getRoots({}, forged)).totalCount).toBe(0);
  });

  test.each([
    { allow: ['UNKNOWN'] },
    { allow: [], rules: [{ path: 'C:\\outside', match: 'SUBTREE' }] },
    { allow: [P.READ_METADATA], rootPath: '/' },
    { allow: [], rules: [{ path: '../outside', match: 'SUBTREE', allow: [P.READ_METADATA] }] },
    { allow: [], rules: [{ path: '/outside', match: 'EXACT' }] },
    { allow: [], rules: [{ path: 'docs/**', match: 'GLOB' }] },
  ])('rejects malformed or absolute persisted permission sets %j', (document) => {
    expect(() => parseFileSystemPermissionSet(document)).toThrow(
      expect.objectContaining({ code: 'FILE_SYSTEM_INVALID_POLICY' }),
    );
  });
});
