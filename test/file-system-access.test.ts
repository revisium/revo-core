import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { ConfigModule } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';

import { databaseConfig } from '../src/config/database.config.js';
import type { ResolveFileSystemAccessData } from '../src/features/file-system-access/contracts/file-system-policy.contracts.js';
import { FileSystemAccessApiService } from '../src/features/file-system-access/file-system-access-api.service.js';
import { FileSystemAccessModule } from '../src/features/file-system-access/file-system-access.module.js';
import {
  FileSystemPermission as P,
  type FileSystemPermissionSet,
} from '../src/features/file-system/contracts/file-system.contracts.js';
import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
import { FileSystemModule } from '../src/features/file-system/file-system.module.js';
import { FileSystemAccessContext } from '../src/features/file-system/policy/file-system-access-context.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const allPermissions = Object.values(P);

describe('Persisted filesystem access configuration', () => {
  let module: TestingModule;
  let policies: FileSystemAccessApiService;
  let filesystem: FileSystemApiService;
  let prisma: PrismaService;
  let root: string;
  let workspace: string;
  let selection: ResolveFileSystemAccessData;
  let ids: string[];

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-access-'));
    workspace = path.join(root, 'workspace');
    await mkdir(workspace);
    await mkdir(path.join(workspace, 'docs'));
    await mkdir(path.join(workspace, '.git'));
    await writeFile(path.join(workspace, '.env'), 'secret');
    ids = [];
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig], ignoreEnvFile: true }),
        FileSystemAccessModule,
        FileSystemModule,
      ],
    }).compile();
    await module.init();
    policies = module.get(FileSystemAccessApiService);
    filesystem = module.get(FileSystemApiService);
    prisma = module.get(PrismaService);
    const boundaryPolicyId = await create('Workspace boundary', {
      allow: allPermissions,
      rules: [
        { path: '.env', match: 'EXACT', deny: [P.READ_METADATA] },
        { path: '.git', match: 'SUBTREE', deny: [P.CREATE_DIRECTORY] },
      ],
    });
    const grantPolicyId = await create('Agent grant', { allow: [P.LIST, P.READ_METADATA] });
    selection = {
      authority: FileSystemAccessContext.create({
        scopes: [{ rootPath: root, allow: allPermissions }],
      }),
      rootPaths: [workspace],
      boundaryPolicyId,
      grantPolicyId,
    };
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await prisma.fileSystemPermissionPolicy.deleteMany({ where: { id: { in: ids } } });
    await module.close();
    await rm(root, { recursive: true, force: true });
  });

  async function create(name: string, document: FileSystemPermissionSet): Promise<string> {
    const id = await policies.createPolicy({ name, document });
    ids.push(id);

    return id;
  }

  test('stores portable policies separately from runtime roots and reads versions', async () => {
    const record = await policies.getPolicy({ id: selection.grantPolicyId });
    expect(record).toMatchObject({
      name: 'Agent grant',
      version: 1,
      revokedAt: null,
      document: { allow: [P.LIST, P.READ_METADATA] },
    });
    const stored = await prisma.fileSystemPermissionPolicy.findUniqueOrThrow({
      where: { id: record.id },
    });
    expect(stored.document).toEqual(record.document);
    expect(JSON.stringify(stored.document)).not.toContain(workspace);
    await expect(policies.getPolicy({ id: 'missing' })).rejects.toThrow(
      'Filesystem permission policy was not found.',
    );
  });

  test('intersects agent grants, Workspace rules and the trusted root for all operations', async () => {
    const access = () => policies.resolveAccess(selection);
    expect(
      (await filesystem.getRoots({}, await access())).edges.map((edge) => edge.node.path),
    ).toEqual([workspace]);
    expect(
      (
        await filesystem.getDirectory({ path: workspace, includeHidden: true }, await access())
      ).entries.edges.map((edge) => edge.node.name),
    ).toEqual(['.git', 'docs']);
    await expect(filesystem.getEntry({ path: root }, await access())).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    await expect(
      filesystem.getEntry({ path: path.join(workspace, '.env') }, await access()),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      filesystem.createDirectory({ parentPath: workspace, name: 'denied' }, await access()),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('policy updates and revocation affect an already-bound client on its next call', async () => {
    const access = () => policies.resolveAccess(selection);
    expect(await filesystem.exists({ path: workspace }, await access())).toBe(true);
    await policies.updatePolicy({
      id: selection.grantPolicyId,
      expectedVersion: 1,
      name: 'Writer',
      document: { allow: allPermissions },
    });
    await filesystem.createDirectory({ parentPath: workspace, name: 'created' }, await access());
    await expect(
      filesystem.createDirectory(
        { parentPath: path.join(workspace, '.git'), name: 'denied' },
        await access(),
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await policies.revokePolicy({ id: selection.grantPolicyId, expectedVersion: 2 });
    await expect(access()).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    expect(await policies.getPolicy({ id: selection.grantPolicyId })).toMatchObject({
      version: 3,
      revokedAt: expect.any(Date),
    });
    await expect(
      policies.updatePolicy({
        id: selection.grantPolicyId,
        expectedVersion: 3,
        name: 'Resurrected',
        document: { allow: allPermissions },
      }),
    ).rejects.toThrow('Filesystem policy is missing, revoked, or has a different version.');
  });

  test('a step policy narrows agent write permissions to docs', async () => {
    await policies.updatePolicy({
      id: selection.grantPolicyId,
      expectedVersion: 1,
      name: 'Writer',
      document: { allow: allPermissions },
    });
    const stepId = await create('Docs step', {
      allow: [P.LIST, P.READ_METADATA],
      rules: [{ path: 'docs', match: 'SUBTREE', allow: [P.CREATE_DIRECTORY] }],
    });
    const access = () => policies.resolveAccess({ ...selection, restrictionPolicyIds: [stepId] });
    await filesystem.createDirectory(
      { parentPath: path.join(workspace, 'docs'), name: 'allowed' },
      await access(),
    );
    await expect(
      filesystem.createDirectory({ parentPath: workspace, name: 'denied' }, await access()),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await policies.revokePolicy({ id: stepId, expectedVersion: 1 });
    await expect(access()).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('a read-only Workspace remains read-only despite an unrestricted agent grant', async () => {
    await policies.updatePolicy({
      id: selection.boundaryPolicyId,
      expectedVersion: 1,
      name: 'Read-only workspace',
      document: { allow: [P.LIST, P.READ_METADATA] },
    });
    await policies.updatePolicy({
      id: selection.grantPolicyId,
      expectedVersion: 1,
      name: 'Broad agent',
      document: { allow: allPermissions },
    });
    await expect(
      filesystem.createDirectory(
        { parentPath: workspace, name: 'denied' },
        await policies.resolveAccess(selection),
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('host restrictions and canonical paths also constrain persisted policies', async () => {
    await symlink(root, path.join(workspace, 'external'), 'dir');
    await expect(
      filesystem.getDirectory(
        { path: path.join(workspace, 'external') },
        await policies.resolveAccess(selection),
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    const host = FileSystemAccessContext.create({
      scopes: [{ rootPath: path.join(workspace, 'docs'), allow: allPermissions }],
    });
    const narrowed = () => policies.resolveAccess({ ...selection, authority: host });
    await expect(filesystem.getEntry({ path: workspace }, await narrowed())).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    expect(
      await filesystem.isDirectory({ path: path.join(workspace, 'docs') }, await narrowed()),
    ).toBe(true);
  });

  test('missing mandatory policy, revoked boundary and empty roots all fail closed', async () => {
    await expect(
      policies.resolveAccess({ ...selection, boundaryPolicyId: '' }),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      policies.resolveAccess({ ...selection, grantPolicyId: 'missing' }),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(policies.resolveAccess({ ...selection, rootPaths: [] })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    await policies.revokePolicy({ id: selection.boundaryPolicyId, expectedVersion: 1 });
    await expect(policies.resolveAccess(selection)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('concurrent policy edits cannot silently overwrite each other', async () => {
    const update = {
      id: selection.grantPolicyId,
      expectedVersion: 1,
      document: { allow: [P.READ_METADATA] },
    };
    const results = await Promise.allSettled([
      policies.updatePolicy({ ...update, name: 'First' }),
      policies.updatePolicy({ ...update, name: 'Second' }),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    expect((await policies.getPolicy({ id: selection.grantPolicyId })).version).toBe(2);
  });

  test('policy storage failures reject access without leaking database errors', async () => {
    vi.spyOn(prisma.fileSystemPermissionPolicy, 'findMany').mockRejectedValue(
      new Error('private connection details'),
    );
    await expect(policies.resolveAccess(selection)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_POLICY_UNAVAILABLE',
      message: 'Filesystem access policy is unavailable.',
    });
  });

  test('validates persisted JSON before authorizing and fails closed on database corruption', async () => {
    await prisma.fileSystemPermissionPolicy.update({
      where: { id: selection.grantPolicyId },
      data: { document: { allow: ['INVALID'] } },
    });
    await expect(policies.resolveAccess(selection)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_INVALID_POLICY',
    });
    await expect(policies.createPolicy({ name: ' ', document: { allow: [] } })).rejects.toThrow(
      'Filesystem policy name must contain between 1 and 200 characters.',
    );
    await expect(
      policies.revokePolicy({ id: selection.grantPolicyId, expectedVersion: 0 }),
    ).rejects.toThrow('Filesystem policy version must be a positive integer.');
  });
});
