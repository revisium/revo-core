import { BadRequestException, NotFoundException } from '@nestjs/common';
import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';

import {
  CatalogScope,
  LaunchProfileStatus,
} from '../src/features/playbook-catalog/contracts/catalog.enums.js';
import { CatalogError } from '../src/features/playbook-catalog/contracts/catalog.errors.js';
import { taskPipeline, taskProfile } from './fixtures/task-pipeline.js';
import { CatalogTestKit } from './support/catalog-test-kit.js';

function withToJSON<Document extends object>(document: Document, toJSON: () => unknown): Document {
  Object.defineProperty(document, 'toJSON', { value: toJSON });

  return document;
}

describe('Playbook Catalog API', () => {
  let catalog: CatalogTestKit;

  beforeAll(async () => {
    catalog = await CatalogTestKit.start();
  });

  afterEach(async () => catalog.discard());
  afterAll(async () => catalog.close());

  test('writes Draft only and publishes on commit', async () => {
    const playbook = catalog.playbook({ name: 'Draft only' });
    await expect(catalog.api.createPlaybook(playbook)).resolves.toMatchObject({
      id: playbook.id,
      name: 'Draft only',
      isHead: false,
    });

    await expect(catalog.api.listPlaybooks({ first: 100 })).resolves.toEqual(
      expect.objectContaining({
        edges: expect.not.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: playbook.id }) }),
        ]),
      }),
    );
    await expect(
      catalog.api.listPlaybooks({ first: 100, scope: CatalogScope.DRAFT }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: playbook.id }) }),
        ]),
      }),
    );

    const committed = await catalog.api.commitCatalog('Add draft playbook');
    expect(committed.revisionId).toEqual(expect.any(String));
    await expect(catalog.api.listPlaybooks({ first: 100 })).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: playbook.id }) }),
        ]),
      }),
    );
  });

  test('rejects a parent delete with live children', async () => {
    const playbook = await catalog.api.createPlaybook(catalog.playbook({ name: 'Blocked delete' }));
    await catalog.api.createRole(catalog.role(playbook.id));

    await expect(catalog.api.deletePlaybook(playbook.id)).rejects.toBeInstanceOf(Error);
  });

  test('creates, reads, updates, and deletes every writable catalog record', async () => {
    const tree = await catalog.tree();
    const updatedPipeline = taskPipeline();
    const updatedProfile = taskProfile();

    await catalog.api.updatePlaybook({ id: tree.playbook.id, name: 'Updated playbook' });
    await catalog.api.updateRole({
      id: tree.role.id,
      playbookId: tree.playbook.id,
      body: 'Updated role',
    });
    await catalog.api.updateRoleRef({
      id: tree.roleRef.id,
      roleId: tree.role.id,
      body: 'Updated role ref',
    });
    await catalog.api.updateSharedReference({
      id: tree.sharedReference.id,
      playbookId: tree.playbook.id,
      body: 'Updated shared',
    });
    await catalog.api.updateStack({
      id: tree.stack.id,
      playbookId: tree.playbook.id,
      body: 'Updated stack',
    });
    await catalog.api.updateStackRef({
      id: tree.stackRef.id,
      stackId: tree.stack.id,
      body: 'Updated stack ref',
    });
    await catalog.api.updateMethodDocument({
      id: tree.methodDocument.id,
      playbookId: tree.playbook.id,
      kind: 'template',
      body: 'Updated method',
    });
    await catalog.api.updatePipeline({
      id: tree.pipeline.id,
      playbookId: tree.playbook.id,
      pipeline: updatedPipeline,
    });
    await catalog.api.updateLaunchProfile({
      id: tree.profile.id,
      pipelineId: tree.pipeline.id,
      status: LaunchProfileStatus.deprecated,
      profile: updatedProfile,
    });

    const draft = { scope: CatalogScope.DRAFT };
    await expect(catalog.api.getPlaybook(tree.playbook.id, draft)).resolves.toMatchObject({
      name: 'Updated playbook',
    });
    await expect(catalog.api.getRole(tree.role.id, draft)).resolves.toMatchObject({
      body: 'Updated role',
    });
    await expect(catalog.api.getRoleRef(tree.roleRef.id, draft)).resolves.toMatchObject({
      id: tree.roleRef.id,
    });
    await expect(
      catalog.api.getSharedReference(tree.sharedReference.id, draft),
    ).resolves.toMatchObject({ id: tree.sharedReference.id });
    await expect(catalog.api.getStack(tree.stack.id, draft)).resolves.toMatchObject({
      id: tree.stack.id,
    });
    await expect(catalog.api.getStackRef(tree.stackRef.id, draft)).resolves.toMatchObject({
      id: tree.stackRef.id,
    });
    await expect(
      catalog.api.getMethodDocument(tree.methodDocument.id, draft),
    ).resolves.toMatchObject({ kind: 'template' });
    await expect(catalog.api.getPipeline(tree.pipeline.id, draft)).resolves.toMatchObject({
      pipeline: updatedPipeline,
    });
    await expect(catalog.api.getPipelineRole(tree.pipelineRole.id, draft)).resolves.toMatchObject({
      id: tree.pipelineRole.id,
    });
    await expect(catalog.api.getLaunchProfile(tree.profile.id, draft)).resolves.toMatchObject({
      status: 'deprecated',
      profile: updatedProfile,
    });

    await expect(
      catalog.api.listRoles({ first: 10, playbookId: tree.playbook.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: tree.role.id }) }),
        ]),
      }),
    );
    await expect(
      catalog.api.listRoleRefs({ first: 10, roleId: tree.role.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: tree.roleRef.id }) }),
        ]),
      }),
    );
    await expect(
      catalog.api.listSharedReferences({ first: 10, playbookId: tree.playbook.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining({ id: tree.sharedReference.id }),
          }),
        ]),
      }),
    );
    await expect(
      catalog.api.listStacks({ first: 10, playbookId: tree.playbook.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: tree.stack.id }) }),
        ]),
      }),
    );
    await expect(
      catalog.api.listStackRefs({ first: 10, stackId: tree.stack.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: tree.stackRef.id }) }),
        ]),
      }),
    );
    await expect(
      catalog.api.listMethodDocuments({ first: 10, playbookId: tree.playbook.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining({ id: tree.methodDocument.id }),
          }),
        ]),
      }),
    );
    await expect(
      catalog.api.listPipelines({ first: 10, playbookId: tree.playbook.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining({
              id: tree.pipeline.id,
              pipeline: updatedPipeline,
            }),
          }),
        ]),
      }),
    );
    await expect(
      catalog.api.listPipelineRoles({ first: 10, pipelineId: tree.pipeline.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining({ id: tree.pipelineRole.id }),
          }),
        ]),
      }),
    );
    await expect(
      catalog.api.listLaunchProfiles({ first: 10, pipelineId: tree.pipeline.id, ...draft }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({
            node: expect.objectContaining({
              id: tree.profile.id,
              profile: updatedProfile,
            }),
          }),
        ]),
      }),
    );

    await catalog.api.deleteLaunchProfile(tree.profile.id);
    await catalog.api.deletePipelineRole(tree.pipelineRole.id);
    await catalog.api.deleteMethodDocument(tree.methodDocument.id);
    await catalog.api.deleteStackRef(tree.stackRef.id);
    await catalog.api.deleteRoleRef(tree.roleRef.id);
    await catalog.api.deleteSharedReference(tree.sharedReference.id);
    await catalog.api.deleteStack(tree.stack.id);
    await catalog.api.deleteRole(tree.role.id);
    await catalog.api.deletePipeline(tree.pipeline.id);
    await catalog.api.deletePlaybook(tree.playbook.id);
  });

  test('rejects a pipeline role that joins a role from another playbook', async () => {
    const tree = await catalog.tree();
    const other = await catalog.api.createPlaybook(catalog.playbook({ name: 'Other' }));
    const otherRole = await catalog.api.createRole(catalog.role(other.id));

    await expect(
      catalog.api.createPipelineRole(catalog.pipelineRole(tree.pipeline.id, otherRole.id)),
    ).rejects.toMatchObject({ message: CatalogError.invalidRelation });
  });

  test('pages draft lists and the change set with after', async () => {
    const first = await catalog.api.createPlaybook(catalog.playbook({ name: 'First' }));
    const second = await catalog.api.createPlaybook(catalog.playbook({ name: 'Second' }));
    const page = await catalog.api.listPlaybooks({ first: 1, scope: CatalogScope.DRAFT });
    const firstPageIds = catalog.idsOf(page);
    const [firstPageId] = firstPageIds;
    expect(firstPageId).toEqual(expect.any(String));

    const next = await catalog.api.listPlaybooks({
      first: 100,
      ...(page.pageInfo.endCursor === undefined ? {} : { after: page.pageInfo.endCursor }),
      scope: CatalogScope.DRAFT,
    });
    const nextIds = catalog.idsOf(next);
    expect(nextIds).not.toContain(firstPageId);
    expect([...firstPageIds, ...nextIds]).toEqual(expect.arrayContaining([first.id, second.id]));

    const changes = await catalog.api.changes({ first: 1 });
    expect(changes.edges).toHaveLength(1);
    await expect(
      catalog.api.changes(
        changes.pageInfo.endCursor === undefined
          ? { first: 10 }
          : { first: 10, after: changes.pageInfo.endCursor },
      ),
    ).resolves.toMatchObject({ edges: expect.any(Array) });
    await expect(catalog.api.status()).resolves.toMatchObject({ hasChanges: true });
  });

  test('rejects unavailable reads and an empty commit message', async () => {
    const playbook = await catalog.api.createPlaybook(catalog.playbook());

    await expect(
      catalog.api.getPlaybook(catalog.id('missing'), { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      catalog.api.getPlaybook(playbook.id, { scope: CatalogScope.HEAD, revisionId: 'rev' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      catalog.api.getPlaybook(playbook.id, { scope: CatalogScope.DRAFT, revisionId: 'rev' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      catalog.api.getPlaybook(playbook.id, { scope: CatalogScope.REVISION }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(catalog.api.snapshot('')).rejects.toBeInstanceOf(BadRequestException);
    await expect(catalog.api.commitCatalog('   ')).rejects.toMatchObject({
      message: CatalogError.invalidMessage,
    });
  });

  test('imports into Draft, then updates the same rows on a second import', async () => {
    const playbook = catalog.playbook({ name: 'Imported' });
    const pipeline = catalog.pipeline(playbook.id);
    const profile = catalog.launchProfile(pipeline.id);
    const imported = await catalog.api.importCatalog({
      version: 1,
      tables: {
        playbooks: [playbook],
        pipelines: [pipeline],
        launch_profiles: [profile],
      },
    });
    expect(imported.tables.some((table) => table.created > 0)).toBe(true);
    await expect(
      catalog.api.getPipeline(pipeline.id, { scope: CatalogScope.DRAFT }),
    ).resolves.toMatchObject({ pipeline: pipeline.pipeline });
    await expect(
      catalog.api.getLaunchProfile(profile.id, { scope: CatalogScope.DRAFT }),
    ).resolves.toMatchObject({ profile: profile.profile });

    const reimported = await catalog.api.importCatalog({
      version: 1,
      tables: {
        playbooks: [{ ...playbook, name: 'Imported again' }],
        pipelines: [pipeline],
        launch_profiles: [profile],
      },
    });
    expect(reimported.tables.some((table) => table.updated > 0)).toBe(true);
    await expect(
      catalog.api.getPlaybook(playbook.id, { scope: CatalogScope.DRAFT }),
    ).resolves.toMatchObject({ name: 'Imported again' });

    await expect(catalog.api.importCatalog({ version: 1 })).rejects.toMatchObject({
      message: CatalogError.invalidImport,
    });
  });

  test('rejects create documents whose toJSON result is not an object before writing rows', async () => {
    const playbook = await catalog.api.createPlaybook(catalog.playbook());
    const pipeline = catalog.pipeline(playbook.id, {
      pipeline: withToJSON(taskPipeline(), () => 'scalar'),
    });
    const validPipeline = await catalog.api.createPipeline(catalog.pipeline(playbook.id));
    const profile = catalog.launchProfile(validPipeline.id, {
      profile: withToJSON(taskProfile(), () => undefined),
    });

    await expect(catalog.api.createPipeline(pipeline)).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'catalog_definition_invalid',
        path: '/pipeline',
        details: { reason: 'object_required' },
      },
    });
    await expect(catalog.api.createLaunchProfile(profile)).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'catalog_definition_invalid',
        path: '/profile',
        details: { reason: 'object_required' },
      },
    });

    await expect(
      catalog.api.getPipeline(pipeline.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      catalog.api.getLaunchProfile(profile.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('rejects document serialization failures before changing existing rows', async () => {
    const tree = await catalog.tree();
    const throws = (): never => {
      throw new Error('serialization must fail');
    };

    await expect(
      catalog.api.updatePipeline({
        id: tree.pipeline.id,
        playbookId: tree.playbook.id,
        pipeline: withToJSON(taskPipeline(), throws),
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'catalog_definition_invalid',
        path: '/pipeline',
        details: { reason: 'serialization_failed' },
      },
    });
    await expect(
      catalog.api.updateLaunchProfile({
        id: tree.profile.id,
        pipelineId: tree.pipeline.id,
        status: LaunchProfileStatus.deprecated,
        profile: withToJSON(taskProfile(), throws),
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'catalog_definition_invalid',
        path: '/profile',
        details: { reason: 'serialization_failed' },
      },
    });

    await expect(
      catalog.api.getPipeline(tree.pipeline.id, { scope: CatalogScope.DRAFT }),
    ).resolves.toMatchObject({ pipeline: tree.pipeline.pipeline });
    await expect(
      catalog.api.getLaunchProfile(tree.profile.id, { scope: CatalogScope.DRAFT }),
    ).resolves.toMatchObject({
      status: tree.profile.status,
      profile: tree.profile.profile,
    });
  });

  test('validates all import documents before writing any rows', async () => {
    const pipelinePlaybook = catalog.playbook({ name: 'Invalid pipeline import' });
    const pipeline = catalog.pipeline(pipelinePlaybook.id, {
      pipeline: withToJSON(taskPipeline(), () => 'scalar'),
    });

    await expect(
      catalog.api.importCatalog({
        version: 1,
        tables: { playbooks: [pipelinePlaybook], pipelines: [pipeline] },
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'catalog_definition_invalid',
        path: '/pipeline',
        details: { reason: 'object_required' },
      },
    });
    await expect(
      catalog.api.getPlaybook(pipelinePlaybook.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      catalog.api.getPipeline(pipeline.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);

    const profilePlaybook = catalog.playbook({ name: 'Invalid profile import' });
    const validPipeline = catalog.pipeline(profilePlaybook.id);
    const profile = catalog.launchProfile(validPipeline.id, {
      profile: withToJSON(taskProfile(), () => undefined),
    });

    await expect(
      catalog.api.importCatalog({
        version: 1,
        tables: {
          playbooks: [profilePlaybook],
          pipelines: [validPipeline],
          launch_profiles: [profile],
        },
      }),
    ).rejects.toMatchObject({
      response: {
        statusCode: 400,
        code: 'catalog_definition_invalid',
        path: '/profile',
        details: { reason: 'object_required' },
      },
    });
    await expect(
      catalog.api.getPlaybook(profilePlaybook.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      catalog.api.getPipeline(validPipeline.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      catalog.api.getLaunchProfile(profile.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  test('snapshots a published revision and discards Draft-only writes', async () => {
    const tree = await catalog.tree();
    const committed = await catalog.api.commitCatalog('Publish catalog');
    const snapshot = await catalog.api.snapshot(committed.revisionId);
    expect(snapshot.isHead).toBe(true);
    expect(snapshot.tables.playbooks.map(({ id }) => id)).toContain(tree.playbook.id);
    expect(snapshot.tables.pipelines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: tree.pipeline.id, pipeline: tree.pipeline.pipeline }),
      ]),
    );
    expect(snapshot.tables.launch_profiles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: tree.profile.id, profile: tree.profile.profile }),
      ]),
    );

    await expect(
      catalog.api.getPlaybook(tree.playbook.id, {
        scope: CatalogScope.REVISION,
        revisionId: committed.revisionId,
      }),
    ).resolves.toMatchObject({ id: tree.playbook.id });
    await expect(
      catalog.api.listPlaybooks({
        first: 10,
        scope: CatalogScope.REVISION,
        revisionId: committed.revisionId,
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        edges: expect.arrayContaining([
          expect.objectContaining({ node: expect.objectContaining({ id: tree.playbook.id }) }),
        ]),
      }),
    );

    const draftOnly = await catalog.api.createPlaybook(catalog.playbook({ name: 'Discard me' }));
    const discarded = await catalog.api.discardCatalog();
    expect(discarded.status.hasChanges).toBe(false);
    await expect(
      catalog.api.getPlaybook(draftOnly.id, { scope: CatalogScope.DRAFT }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
