import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import path from 'node:path';

import { Test, type TestingModule } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import { FileSystemApiService } from '../src/features/file-system/file-system-api.service.js';
import { FileSystemModule } from '../src/features/file-system/file-system.module.js';

describe('FileSystemModule public operations', () => {
  let module: TestingModule;
  let filesystem: FileSystemApiService;
  let root: string;
  let directory: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'revo-file-system-'));
    directory = path.join(root, 'workspace');
    await mkdir(directory);
    await mkdir(path.join(directory, 'docs'));
    await writeFile(path.join(directory, 'a.txt'), 'hello');
    module = await Test.createTestingModule({ imports: [FileSystemModule] }).compile();
    await module.init();
    filesystem = module.get(FileSystemApiService);
  });

  afterEach(async () => {
    await module.close();
    await rm(root, { recursive: true, force: true });
  });

  test('reads entries without a permission context', async () => {
    expect(await filesystem.exists({ path: path.join(directory, 'a.txt') })).toBe(true);
    expect(await filesystem.isDirectory({ path: directory })).toBe(true);
    expect((await filesystem.getEntry({ path: directory })).type).toBe('DIRECTORY');
  });

  test('creates directories without a permission context', async () => {
    const created = await filesystem.createDirectory({ parentPath: directory, name: 'created' });
    expect(created.path).toBe(path.join(directory, 'created'));
  });

  test('paginates directory children with opaque cursors', async () => {
    await writeFile(path.join(directory, '.env'), 'secret');
    const first = await filesystem.getDirectory({ path: directory, first: 1 });
    expect(first.entries.totalCount).toBe(2);
    expect(first.entries.edges.map((edge) => edge.node.name)).toEqual(['a.txt']);
    const after = first.entries.pageInfo.endCursor;
    expect(after).toBeDefined();
    expect(
      (
        await filesystem.getDirectory({
          path: directory,
          ...(after === undefined ? {} : { after }),
        })
      ).entries.edges.map((edge) => edge.node.name),
    ).toEqual(['docs']);
  });

  test('filters directory entries by type and hidden-name option', async () => {
    await writeFile(path.join(directory, '.env'), 'secret');
    expect(
      (await filesystem.getDirectory({ path: directory, directoriesOnly: true })).entries.edges.map(
        (edge) => edge.node.name,
      ),
    ).toEqual(['docs']);
    expect(
      (await filesystem.getDirectory({ path: directory, includeHidden: true })).entries.totalCount,
    ).toBe(3);
  });

  test('reads text files up to 64 KiB', async () => {
    const file = path.join(directory, 'bounded.txt');
    await writeFile(file, 'a'.repeat(65536));
    await expect(filesystem.readTextFile({ path: file })).resolves.toHaveLength(65536);
  });

  test('rejects text files larger than 64 KiB', async () => {
    const file = path.join(directory, 'too-large.txt');
    await writeFile(file, 'a'.repeat(65537));
    await expect(filesystem.readTextFile({ path: file })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_TOO_LARGE',
    });
  });

  test('canonicalizes symlink targets and lists their resolved metadata', async () => {
    const link = path.join(directory, 'docs-link');
    await symlink(path.join(directory, 'docs'), link, 'dir');
    expect(await filesystem.canonicalize({ path: link })).toBe(path.join(directory, 'docs'));
    expect(await filesystem.getEntry({ path: link })).toMatchObject({
      type: 'DIRECTORY',
      isSymlink: true,
    });
    expect(
      (await filesystem.getDirectory({ path: directory })).entries.edges.map(
        (edge) => edge.node.name,
      ),
    ).toContain('docs-link');
  });

  test('enumerates actual filesystem roots', async () => {
    const roots = await filesystem.getRoots({});
    const locations = roots.edges.map((edge) => edge.node.path);
    expect(locations).toContain(homedir());
  });

  test.skipIf(process.platform === 'win32')('includes the Unix root directory', async () => {
    const roots = await filesystem.getRoots({});
    expect(roots.edges.map((edge) => edge.node.path)).toContain('/');
  });

  test('rejects relative paths', async () => {
    await expect(filesystem.getEntry({ path: 'relative' })).rejects.toMatchObject({
      code: 'FILE_SYSTEM_INVALID_PATH',
    });
  });

  test.each(['', '.', '..', '../escape', 'child/name', 'child\\name', 'bad\0name'])(
    'rejects invalid directory name %j',
    async (name) => {
      await expect(
        filesystem.createDirectory({ parentPath: directory, name }),
      ).rejects.toMatchObject({ code: 'FILE_SYSTEM_INVALID_NAME' });
    },
  );

  test('reports missing filesystem entries', async () => {
    await expect(
      filesystem.getEntry({ path: path.join(directory, 'missing') }),
    ).rejects.toMatchObject({
      code: 'FILE_SYSTEM_NOT_FOUND',
    });
  });
});
