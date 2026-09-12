import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { PackedCorePackage } from '../support/package/packed-core-package.js';
import { IsolatedRuntimeDatabase } from '../support/runtime/isolated-runtime-database.js';

const repositoryRoot = process.cwd();
const allowedPackagePath =
  /^(?:LICENSE|README\.md|package\.json|dist\/|prisma\/(?:schema\.prisma|migrate\.config\.mjs|migrations\/)|resources\/)/;
const forbiddenPackagePath =
  /(?:^|\/)(?:\.env[^/]*|test|tests|coverage|node_modules|\.cache)(?:\/|$)|\.map$/;

describe('packed public package', () => {
  let packed: PackedCorePackage;
  let database: IsolatedRuntimeDatabase;

  beforeAll(async () => {
    database = await IsolatedRuntimeDatabase.create();
    packed = await PackedCorePackage.create(repositoryRoot);
  });

  afterAll(async () => {
    await database?.drop();
    await packed?.remove();
  });

  test('contains only the declared production surface and runtime assets', () => {
    const paths = packed.paths();
    expect(paths.every((path) => allowedPackagePath.test(path))).toBe(true);
    expect(paths.some((path) => forbiddenPackagePath.test(path))).toBe(false);
    expect(paths).toContain('dist/index.js');
    expect(paths).toContain('dist/index.d.ts');
    expect(paths).toContain('dist/runtime/index.js');
    expect(paths).toContain('dist/runtime/index.d.ts');
    expect(paths).toContain('prisma/migrate.config.mjs');
    expect(paths).toContain('prisma/schema.prisma');
    expect(paths).toContain('resources/system-playbooks/migrations.json');
    expect(paths.some((path) => path.startsWith('prisma/migrations/'))).toBe(true);
    expect(packed.packedSize).toBeGreaterThan(0);
    expect(packed.unpackedSize).toBeGreaterThan(packed.packedSize);
  });

  test('typechecks and starts through public exports outside the checkout', async () => {
    await packed.install();
    await packed.typecheck(repositoryRoot);
    await packed.run(database.url);

    await expect(database.relations()).resolves.toEqual({
      prismaMigrations: '_prisma_migrations',
      dbosWorkflowStatus: 'dbos.workflow_status',
    });
  }, 30_000);
});
