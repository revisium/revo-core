import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, afterEach, describe, test, expect } from 'vitest';

import { FileSystemPermission as P } from '../src/features/file-system/contracts/file-system.contracts.js';
import { rethrowFileSystemError } from '../src/features/file-system/contracts/file-system.error.js';
import { FileSystemAccessContext } from '../src/features/file-system/file-system-access-context.js';
import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
import { FileSystemModule } from '../src/features/file-system/file-system.module.js';
import { FileSystemService } from '../src/features/file-system/filesystem/file-system.service.js';
import { FileSystemPolicyService } from '../src/features/file-system/policy/file-system-policy.service.js';

describe('FileSystemModule public operations', () => {
  let module: TestingModule;
  let api: FileSystemApiService;
  let root: string;
  let scope: string;
  let context: FileSystemAccessContext;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-file-system-'));
    scope = path.join(root, 'workspace');
    await mkdir(scope);
    await mkdir(path.join(scope, 'docs'));
    await mkdir(path.join(scope, '.git'));
    await writeFile(path.join(scope, 'a.txt'), 'hello');
    await writeFile(path.join(scope, '.env'), 'secret');
    context = FileSystemAccessContext.create({
      scopes: [{ rootPath: scope, allow: [P.LIST, P.READ_METADATA, P.CREATE_DIRECTORY] }],
    });
    module = await Test.createTestingModule({ imports: [FileSystemModule] }).compile();
    await module.init();
    api = module.get(FileSystemApiService);
  });

  afterEach(async () => {
    await module.close();
    await rm(root, { recursive: true, force: true });
  });

  test('defaults to no access and no roots', async () => {
    expect((await api.getRoots({})).edges).toEqual([]);
    await expect(api.exists({ path: scope })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    await expect(api.getEntry({ path: root }, context)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
    await expect(api.getEntry({ path: scope + '-neighbor' }, context)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_PERMISSION_DENIED',
    });
  });

  test('reads entries and missing paths with normalized errors', async () => {
    expect(await api.exists({ path: path.join(scope, 'a.txt') }, context)).toBe(true);
    expect(await api.exists({ path: path.join(scope, 'missing', 'child') }, context)).toBe(false);
    expect(await api.isDirectory({ path: scope }, context)).toBe(true);
    expect(await api.isDirectory({ path: path.join(scope, 'a.txt') }, context)).toBe(false);
    await expect(
      api.getEntry({ path: path.join(scope, 'missing') }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_NOT_FOUND' });
    await expect(
      api.getDirectory({ path: path.join(scope, 'a.txt') }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_NOT_DIRECTORY' });
    await expect(api.getEntry({ path: 'relative' }, context)).rejects.toMatchObject({
      code: 'FILE_SYSTEM_INVALID_PATH',
    });
  });

  test('filters, sorts and paginates directory children and computes parent paths', async () => {
    const first = await api.getDirectory({ path: scope, first: 1 }, context);
    expect(first.parentPath).toBeNull();
    expect(first.entries.edges.map((edge) => edge.node.name)).toEqual(['a.txt']);
    expect(first.entries.totalCount).toBe(2);
    const after = first.entries.pageInfo.endCursor;
    expect(after).toBeDefined();
    const second = await api.getDirectory({ path: scope, ...(after ? { after } : {}) }, context);
    expect(second.entries.edges.map((edge) => edge.node.name)).toEqual(['docs']);
    expect(
      (await api.getDirectory({ path: scope, directoriesOnly: true }, context)).entries.edges.map(
        (edge) => edge.node.name,
      ),
    ).toEqual(['docs']);
    expect(
      (await api.getDirectory({ path: scope, includeHidden: true }, context)).entries.totalCount,
    ).toBe(4);
    const empty = await api.getDirectory({ path: path.join(scope, 'docs') }, context);
    expect(empty.parentPath).toBe(scope);
    expect(empty.entries.totalCount).toBe(0);
    await expect(api.getDirectory({ path: scope, first: 101 }, context)).rejects.toThrow(
      /parameter|cursor/,
    );
    await expect(api.getDirectory({ path: scope, after: 'bad' }, context)).rejects.toThrow(
      /parameter|cursor/,
    );
  });

  test('roots reveal only accessible initial navigation points', async () => {
    const roots = await api.getRoots({}, context);
    expect(roots.edges.map((edge) => edge.node.path)).toEqual([scope]);
  });

  test('sorts directory children with JavaScript string ordering', async () => {
    await writeFile(path.join(scope, '\u{10000}.txt'), 'first');
    await writeFile(path.join(scope, '\uE000.txt'), 'second');

    expect(
      (await api.getDirectory({ path: scope }, context)).entries.edges.map(
        (edge) => edge.node.name,
      ),
    ).toEqual(['a.txt', 'docs', '\u{10000}.txt', '\uE000.txt']);
  });

  test('creates directories and rejects collisions', async () => {
    const entry = await api.createDirectory({ parentPath: scope, name: 'new' }, context);
    expect(entry.path).toBe(path.join(scope, 'new'));
    expect(await api.isDirectory({ path: entry.path }, context)).toBe(true);
    await expect(
      api.createDirectory({ parentPath: scope, name: 'new' }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_ALREADY_EXISTS' });
    await expect(
      api.createDirectory({ parentPath: path.join(scope, 'missing'), name: 'new' }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_NOT_FOUND' });
  });

  test.each(['', '.', '..', '../foo', 'foo/bar', 'foo\\bar', 'bad\0name', 'CON', 'trailing.'])(
    'rejects unsafe name %j',
    async (name) => {
      await expect(api.createDirectory({ parentPath: scope, name }, context)).rejects.toMatchObject(
        { code: 'FILE_SYSTEM_INVALID_NAME' },
      );
    },
  );

  test('read-only and scoped rules restrict writes and hide secrets', async () => {
    const restricted = FileSystemAccessContext.create({
      scopes: [
        {
          rootPath: scope,
          allow: [P.LIST, P.READ_METADATA],
          rules: [
            { path: 'docs', match: 'SUBTREE', allow: [P.CREATE_DIRECTORY] },
            { path: '.env', match: 'EXACT', deny: [P.READ_METADATA] },
            { path: '.git', match: 'SUBTREE', deny: [P.CREATE_DIRECTORY, P.WRITE_FILE] },
          ],
        },
      ],
    });
    await expect(
      api.createDirectory({ parentPath: scope, name: 'no' }, restricted),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await api.createDirectory({ parentPath: path.join(scope, 'docs'), name: 'yes' }, restricted);
    await expect(
      api.createDirectory({ parentPath: path.join(scope, '.git'), name: 'no' }, restricted),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      api.getEntry({ path: path.join(scope, '.env') }, restricted),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    expect(
      (await api.getDirectory({ path: scope, includeHidden: true }, restricted)).entries.edges.map(
        (edge) => edge.node.name,
      ),
    ).not.toContain('.env');
    const policy = module.get(FileSystemPolicyService);
    expect(
      await policy.isAllowed(restricted, P.WRITE_FILE, path.join(scope, '.git', 'config')),
    ).toBe(false);
  });

  test('deny overrides allow across scopes in either order', async () => {
    const allow = { rootPath: scope, allow: [P.READ_METADATA] };
    const deny = { rootPath: scope, allow: [], deny: [P.READ_METADATA] };

    await Promise.all(
      [
        [allow, deny],
        [deny, allow],
      ].map(async (scopes) => {
        await expect(
          api.getEntry({ path: scope }, FileSystemAccessContext.create({ scopes })),
        ).rejects.toMatchObject({
          code: 'FILE_SYSTEM_PERMISSION_DENIED',
        });
      }),
    );
  });

  test('unions grants from scopes and matching rules while explicit denies win', async () => {
    const metadata = { rootPath: scope, allow: [P.READ_METADATA] };
    const list = { rootPath: scope, allow: [P.LIST] };
    const location = path.join(scope, 'docs');

    await expect(
      api.getEntry(
        { path: location },
        FileSystemAccessContext.create({
          scopes: [
            {
              ...metadata,
              rules: [{ path: 'docs', match: 'SUBTREE', allow: [P.LIST] }],
            },
          ],
        }),
      ),
    ).resolves.toMatchObject({ path: location });

    await Promise.all(
      [
        [list, metadata],
        [metadata, list],
      ].map(async (scopes) => {
        await expect(
          api.getEntry({ path: location }, FileSystemAccessContext.create({ scopes })),
        ).resolves.toMatchObject({ path: location });
      }),
    );

    await expect(
      api.getEntry(
        { path: location },
        FileSystemAccessContext.create({
          scopes: [
            {
              rootPath: scope,
              allow: [],
              rules: [
                { path: 'docs', match: 'EXACT', allow: [P.LIST] },
                { path: 'docs', match: 'EXACT', allow: [P.READ_METADATA] },
              ],
            },
          ],
        }),
      ),
    ).resolves.toMatchObject({ path: location });

    await expect(
      api.getEntry(
        { path: location },
        FileSystemAccessContext.create({
          scopes: [
            {
              rootPath: scope,
              allow: [P.READ_METADATA],
              rules: [{ path: 'docs', match: 'EXACT', deny: [P.READ_METADATA] }],
            },
          ],
        }),
      ),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('symlinks cannot escape, leak entries, or bypass exact denies', async () => {
    await symlink(root, path.join(scope, 'external'), 'dir');
    await symlink(path.join(scope, 'docs'), path.join(scope, 'internal'), 'dir');
    await symlink(path.join(root, 'missing'), path.join(scope, 'dangling'));
    await expect(
      api.getDirectory({ path: path.join(scope, 'external') }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      api.exists({ path: path.join(scope, 'external', 'missing') }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    await expect(
      api.createDirectory({ parentPath: path.join(scope, 'external'), name: 'escape' }, context),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
    expect(await api.canonicalize({ path: path.join(scope, 'internal') }, context)).toBe(
      path.join(scope, 'docs'),
    );
    expect(await api.getEntry({ path: path.join(scope, 'internal') }, context)).toMatchObject({
      type: 'DIRECTORY',
      isSymlink: true,
    });
    expect(
      (await api.getDirectory({ path: scope }, context)).entries.edges.map(
        (edge) => edge.node.name,
      ),
    ).toEqual(['a.txt', 'docs', 'internal']);
    await symlink(path.join(scope, '.env'), path.join(scope, 'alias'));
    const restricted = FileSystemAccessContext.create({
      scopes: [
        {
          rootPath: scope,
          allow: [P.READ_METADATA],
          rules: [{ path: '.env', match: 'EXACT', deny: [P.READ_METADATA] }],
        },
      ],
    });
    await expect(
      api.getEntry({ path: path.join(scope, 'alias') }, restricted),
    ).rejects.toMatchObject({ code: 'FILE_SYSTEM_PERMISSION_DENIED' });
  });

  test('low-level metadata, directory listing and links remain separate', async () => {
    const filesystem = module.get(FileSystemService);
    expect(await filesystem.isFile(path.join(scope, 'a.txt'))).toBe(true);
    expect(await filesystem.metadata(path.join(scope, 'a.txt'))).toMatchObject({
      type: 'FILE',
      size: 5,
      isSymlink: false,
    });
    expect(await filesystem.readDirectory(path.join(scope, 'docs'))).toEqual([]);
    await symlink(path.join(scope, 'docs'), path.join(scope, 'link'), 'dir');
    expect(await filesystem.readLink(path.join(scope, 'link'))).toBe(path.join(scope, 'docs'));
    expect(
      (await filesystem.readDirectory(scope)).find((entry) => entry.name === 'link'),
    ).toMatchObject({ type: 'SYMLINK', isSymlink: true });
  });

  test.each([
    ['EACCES', 'FILE_SYSTEM_ACCESS_DENIED'],
    ['EPERM', 'FILE_SYSTEM_ACCESS_DENIED'],
    ['ENOENT', 'FILE_SYSTEM_NOT_FOUND'],
    ['ENOTDIR', 'FILE_SYSTEM_NOT_DIRECTORY'],
    ['EEXIST', 'FILE_SYSTEM_ALREADY_EXISTS'],
    ['ELOOP', 'FILE_SYSTEM_INVALID_PATH'],
    ['EIO', 'FILE_SYSTEM_IO_ERROR'],
  ])('normalizes OS %s without leaking details', (code, expected) => {
    expect(() => rethrowFileSystemError({ code, message: '/private/secret' })).toThrow(
      expect.objectContaining({ code: expected }),
    );
  });
});
