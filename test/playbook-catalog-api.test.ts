import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { CatalogError } from '../src/features/playbook-catalog/constants/catalog.constants.js';
import { SYSTEM_PLAYBOOKS_PROJECT } from '../src/features/revisium-bootstrap/revisium-bootstrap.constants.js';
import { taskPipeline } from './fixtures/task-pipeline.js';

describe('Playbook Catalog API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => app.close());

  test('hides the catalog dataset from the user project list', async () => {
    const response = await graphql(
      app,
      '{ projects(data: { first: 100 }) { edges { node { id } } } }',
    );
    expect(response.body.errors).toBeUndefined();
    const ids = (response.body.data.projects.edges as Array<{ node: { id: string } }>).map(
      ({ node }) => node.id,
    );
    expect(ids).not.toContain(SYSTEM_PLAYBOOKS_PROJECT.id);
  });

  test('writes Draft only and publishes on commit', async () => {
    const id = `pb-${Date.now()}`;
    const created = await graphql(
      app,
      `
        mutation ($data: PlaybookInput!) {
          createPlaybook(data: $data) {
            id
            name
          }
        }
      `,
      { data: { id, name: 'Draft only' } },
    );
    expect(created.body.errors).toBeUndefined();
    expect(created.body.data.createPlaybook).toMatchObject({ id, name: 'Draft only' });

    const head = await graphql(app, '{ playbooks(first: 100) { edges { node { id } } } }');
    expect(head.body.errors).toBeUndefined();
    expect(
      (head.body.data.playbooks.edges as Array<{ node: { id: string } }>).map(
        ({ node }) => node.id,
      ),
    ).not.toContain(id);

    const draft = await graphql(
      app,
      '{ playbooks(first: 100, scope: DRAFT) { edges { node { id } } } }',
    );
    expect(draft.body.errors).toBeUndefined();
    expect(
      (draft.body.data.playbooks.edges as Array<{ node: { id: string } }>).map(
        ({ node }) => node.id,
      ),
    ).toContain(id);

    const committed = await graphql(
      app,
      `
        mutation {
          commitCatalog(message: "Add draft playbook") {
            revisionId
          }
        }
      `,
    );
    expect(committed.body.errors).toBeUndefined();
    expect(committed.body.data.commitCatalog.revisionId).toEqual(expect.any(String));

    const afterCommit = await graphql(app, '{ playbooks(first: 100) { edges { node { id } } } }');
    expect(
      (afterCommit.body.data.playbooks.edges as Array<{ node: { id: string } }>).map(
        ({ node }) => node.id,
      ),
    ).toContain(id);
  });

  test('rejects a parent delete with live children', async () => {
    const playbookId = `pb-del-${Date.now()}`;
    const roleId = `role-${Date.now()}`;
    await graphql(
      app,
      `
        mutation ($data: PlaybookInput!) {
          createPlaybook(data: $data) {
            id
          }
        }
      `,
      {
        data: { id: playbookId, name: 'Blocked delete' },
      },
    );
    await graphql(
      app,
      `
        mutation ($data: RoleInput!) {
          createRole(data: $data) {
            id
          }
        }
      `,
      {
        data: { id: roleId, playbookId, body: 'Role body' },
      },
    );
    const blocked = await graphql(app, `mutation { deletePlaybook(id: "${playbookId}") }`);
    expect(blocked.body.data).toBeNull();
    expect(blocked.body.errors[0].message).toEqual(expect.any(String));
  });

  test('rejects a missing snapshot revision', async () => {
    const snapshot = await request(app.getHttpServer())
      .get('/api/playbook-catalog/snapshot')
      .expect(404);
    expect(snapshot.body.message).toBe(CatalogError.recordUnavailable);
  });

  test('covers GraphQL catalog writes, reads, import, snapshot, and discard', async () => {
    const stamp = `${Date.now()}`;
    const playbookId = `gql-pb-${stamp}`;
    const otherPlaybookId = `gql-pb-other-${stamp}`;
    const roleId = `gql-role-${stamp}`;
    const otherRoleId = `gql-role-other-${stamp}`;
    const roleRefId = `gql-rref-${stamp}`;
    const sharedId = `gql-shared-${stamp}`;
    const stackId = `gql-stack-${stamp}`;
    const stackRefId = `gql-sref-${stamp}`;
    const methodId = `gql-method-${stamp}`;
    const pipelineId = `gql-pipe-${stamp}`;
    const pipelineRoleId = `gql-prole-${stamp}`;
    const sourceId = `gql-src-${stamp}`;
    const profileId = `gql-profile-${stamp}`;
    const importId = `gql-imp-${stamp}`;
    const sourceJson = JSON.stringify(taskPipeline());

    await mutate(
      app,
      `mutation ($data: PlaybookInput!) { createPlaybook(data: $data) { id name } }`,
      { data: { id: playbookId, name: 'GraphQL playbook' } },
    );
    await mutate(app, `mutation ($data: PlaybookInput!) { createPlaybook(data: $data) { id } }`, {
      data: { id: otherPlaybookId, name: 'Other playbook' },
    });
    await mutate(app, `mutation ($data: RoleInput!) { createRole(data: $data) { id } }`, {
      data: { id: roleId, playbookId, body: 'Role' },
    });
    await mutate(app, `mutation ($data: RoleInput!) { createRole(data: $data) { id } }`, {
      data: { id: otherRoleId, playbookId: otherPlaybookId, body: 'Other role' },
    });
    await mutate(app, `mutation ($data: RoleRefInput!) { createRoleRef(data: $data) { id } }`, {
      data: { id: roleRefId, roleId, body: 'Role ref' },
    });
    await mutate(
      app,
      `mutation ($data: SharedReferenceInput!) { createSharedReference(data: $data) { id } }`,
      { data: { id: sharedId, playbookId, body: 'Shared' } },
    );
    await mutate(app, `mutation ($data: StackInput!) { createStack(data: $data) { id } }`, {
      data: { id: stackId, playbookId, body: 'Stack' },
    });
    await mutate(app, `mutation ($data: StackRefInput!) { createStackRef(data: $data) { id } }`, {
      data: { id: stackRefId, stackId, body: 'Stack ref' },
    });
    await mutate(
      app,
      `mutation ($data: MethodDocumentInput!) { createMethodDocument(data: $data) { id } }`,
      { data: { id: methodId, playbookId, kind: 'method', body: 'Method' } },
    );
    const createdPipeline = await mutate(
      app,
      `mutation ($data: PipelineInput!) { createPipeline(data: $data) { id launchability } }`,
      { data: { id: pipelineId, playbookId, body: 'Pipeline' } },
    );
    expect(createdPipeline.createPipeline?.launchability).toBe('Not launchable');
    await mutate(
      app,
      `mutation ($data: PipelineRoleInput!) { createPipelineRole(data: $data) { id } }`,
      { data: { id: pipelineRoleId, pipelineId, roleId, membership: 'required' } },
    );
    const crossed = await graphql(
      app,
      `
        mutation ($data: PipelineRoleInput!) {
          createPipelineRole(data: $data) {
            id
          }
        }
      `,
      {
        data: {
          id: `gql-cross-${stamp}`,
          pipelineId,
          roleId: otherRoleId,
          membership: 'optional',
        },
      },
    );
    expect(crossed.body.errors[0].message).toBe(CatalogError.invalidRelation);
    await mutate(
      app,
      `mutation ($data: PipelineSourceInput!) { updatePipelineSource(data: $data) { id sourceJson } }`,
      { data: { id: sourceId, pipelineId, sourceJson } },
    );
    await mutate(
      app,
      `mutation ($data: PipelineSourceInput!) { updatePipelineSource(data: $data) { id } }`,
      { data: { id: sourceId, pipelineId, sourceJson } },
    );
    await mutate(
      app,
      `mutation ($data: LaunchProfileInput!) { createLaunchProfile(data: $data) { id status } }`,
      { data: { id: profileId, pipelineId, status: 'active', bindings: [] } },
    );

    await mutate(app, `mutation ($data: PlaybookInput!) { updatePlaybook(data: $data) { name } }`, {
      data: { id: playbookId, name: 'GraphQL playbook updated' },
    });
    await mutate(app, `mutation ($data: RoleInput!) { updateRole(data: $data) { body } }`, {
      data: { id: roleId, playbookId, body: 'Role updated' },
    });
    await mutate(app, `mutation ($data: RoleRefInput!) { updateRoleRef(data: $data) { body } }`, {
      data: { id: roleRefId, roleId, body: 'Role ref updated' },
    });
    await mutate(
      app,
      `mutation ($data: SharedReferenceInput!) { updateSharedReference(data: $data) { body } }`,
      { data: { id: sharedId, playbookId, body: 'Shared updated' } },
    );
    await mutate(app, `mutation ($data: StackInput!) { updateStack(data: $data) { body } }`, {
      data: { id: stackId, playbookId, body: 'Stack updated' },
    });
    await mutate(app, `mutation ($data: StackRefInput!) { updateStackRef(data: $data) { body } }`, {
      data: { id: stackRefId, stackId, body: 'Stack ref updated' },
    });
    await mutate(
      app,
      `mutation ($data: MethodDocumentInput!) { updateMethodDocument(data: $data) { body } }`,
      { data: { id: methodId, playbookId, kind: 'template', body: 'Method updated' } },
    );
    await mutate(app, `mutation ($data: PipelineInput!) { updatePipeline(data: $data) { body } }`, {
      data: { id: pipelineId, playbookId, body: 'Pipeline updated' },
    });
    await mutate(
      app,
      `mutation ($data: LaunchProfileInput!) { updateLaunchProfile(data: $data) { status } }`,
      { data: { id: profileId, pipelineId, status: 'deprecated', bindings: [] } },
    );

    const reads = await graphql(
      app,
      `
        query ($playbookId: ID!, $roleId: ID!, $stackId: ID!, $pipelineId: ID!) {
          playbook(id: $playbookId, scope: DRAFT) { id name }
          role(id: $roleId, scope: DRAFT) { id }
          roleRef(id: "${roleRefId}", scope: DRAFT) { id }
          sharedReference(id: "${sharedId}", scope: DRAFT) { id }
          stack(id: $stackId, scope: DRAFT) { id }
          stackRef(id: "${stackRefId}", scope: DRAFT) { id }
          methodDocument(id: "${methodId}", scope: DRAFT) { id }
          pipeline(id: $pipelineId, scope: DRAFT) { id launchability }
          pipelineRole(id: "${pipelineRoleId}", scope: DRAFT) { id }
          pipelineSource(id: "${sourceId}", scope: DRAFT) { id }
          launchProfile(id: "${profileId}", scope: DRAFT) { id }
          roles(first: 1, playbookId: $playbookId, scope: DRAFT) { edges { cursor node { id } } pageInfo { endCursor hasNextPage } }
          roleRefs(first: 10, roleId: $roleId, scope: DRAFT) { edges { node { id } } }
          sharedReferences(first: 10, playbookId: $playbookId, scope: DRAFT) { edges { node { id } } }
          stacks(first: 10, playbookId: $playbookId, scope: DRAFT) { edges { node { id } } }
          stackRefs(first: 10, stackId: $stackId, scope: DRAFT) { edges { node { id } } }
          methodDocuments(first: 10, playbookId: $playbookId, scope: DRAFT) { edges { node { id } } }
          pipelines(first: 10, playbookId: $playbookId, scope: DRAFT) { edges { node { id } } }
          pipelineRoles(first: 10, pipelineId: $pipelineId, scope: DRAFT) { edges { node { id } } }
          pipelineSources(first: 10, pipelineId: $pipelineId, scope: DRAFT) { edges { node { id } } }
          pipelineSlots(first: 10, pipelineId: $pipelineId, scope: DRAFT) { edges { node { id } } }
          launchProfiles(first: 10, pipelineId: $pipelineId, scope: DRAFT) { edges { node { id } } }
          catalogStatus { hasChanges totalChanges headRevisionId draftRevisionId }
          catalogChangeSet(first: 1) { totalCount edges { cursor } pageInfo { endCursor hasNextPage } }
        }
      `,
      { playbookId, roleId, stackId, pipelineId },
    );
    expect(reads.body.errors).toBeUndefined();
    expect(reads.body.data.playbook.name).toBe('GraphQL playbook updated');
    expect(reads.body.data.catalogStatus.hasChanges).toBe(true);
    const roleCursor = String(reads.body.data.roles.edges[0].cursor);
    const paged = await graphql(
      app,
      `
        query ($after: String, $playbookId: ID!) {
          roles(first: 1, after: $after, playbookId: $playbookId, scope: DRAFT) {
            edges {
              node {
                id
              }
            }
          }
        }
      `,
      { after: roleCursor, playbookId },
    );
    expect(paged.body.errors).toBeUndefined();

    const changeCursor = String(reads.body.data.catalogChangeSet.edges[0].cursor);
    const moreChanges = await graphql(
      app,
      `
        query ($after: String) {
          catalogChangeSet(first: 10, after: $after) {
            edges {
              node {
                recordId
              }
            }
          }
        }
      `,
      { after: changeCursor },
    );
    expect(moreChanges.body.errors).toBeUndefined();

    const missing = await graphql(app, `{ playbook(id: "missing-${stamp}", scope: DRAFT) { id } }`);
    expect(missing.body.errors[0].message).toBe(CatalogError.recordUnavailable);
    const missingSlot = await graphql(
      app,
      `{ pipelineSlot(id: "missing-slot-${stamp}", scope: DRAFT) { id } }`,
    );
    expect(missingSlot.body.errors[0].message).toBe(CatalogError.recordUnavailable);
    const headWithRevision = await graphql(
      app,
      `{ playbook(id: "${playbookId}", scope: HEAD, revisionId: "rev") { id } }`,
    );
    expect(headWithRevision.body.errors[0].message).toBe(CatalogError.recordUnavailable);
    const draftWithRevision = await graphql(
      app,
      `{ playbook(id: "${playbookId}", scope: DRAFT, revisionId: "rev") { id } }`,
    );
    expect(draftWithRevision.body.errors[0].message).toBe(CatalogError.recordUnavailable);
    const revisionWithoutId = await graphql(
      app,
      `{ playbook(id: "${playbookId}", scope: REVISION) { id } }`,
    );
    expect(revisionWithoutId.body.errors[0].message).toBe(CatalogError.recordUnavailable);
    const emptyCommit = await graphql(
      app,
      `
        mutation {
          commitCatalog(message: "   ") {
            revisionId
          }
        }
      `,
    );
    expect(emptyCommit.body.errors[0].message).toBe(CatalogError.invalidMessage);
    const invalidImport = await graphql(
      app,
      `
        mutation ($data: JSON!) {
          importCatalog(data: $data) {
            tables {
              tableId
            }
          }
        }
      `,
      { data: { version: 1 } },
    );
    expect(invalidImport.body.errors[0].message).toBe(CatalogError.invalidImport);

    const imported = await mutate(
      app,
      `mutation ($data: JSON!) { importCatalog(data: $data) { tables { tableId created updated } } }`,
      { data: { version: 1, tables: { playbooks: [{ id: importId, name: 'Imported' }] } } },
    );
    expect(imported.importCatalog?.tables?.some((table) => table.created > 0)).toBe(true);
    await mutate(
      app,
      `mutation ($data: JSON!) { importCatalog(data: $data) { tables { updated } } }`,
      { data: { version: 1, tables: { playbooks: [{ id: importId, name: 'Imported again' }] } } },
    );

    const committed = await mutate(
      app,
      `mutation { commitCatalog(message: "Publish GraphQL catalog") { revisionId } }`,
    );
    const revisionId = String(committed.commitCatalog?.revisionId);
    const snapshot = await graphql(
      app,
      `
        query ($revisionId: ID!) {
          catalogSnapshot(revisionId: $revisionId) {
            revisionId
            isHead
            playbooks {
              id
            }
            roles {
              id
            }
            roleRefs {
              id
            }
            sharedReferences {
              id
            }
            stacks {
              id
            }
            stackRefs {
              id
            }
            methodDocuments {
              id
            }
            pipelines {
              id
            }
            pipelineRoles {
              id
            }
            pipelineSources {
              id
            }
            pipelineSlots {
              id
            }
            launchProfiles {
              id
            }
          }
        }
      `,
      { revisionId },
    );
    expect(snapshot.body.errors).toBeUndefined();
    expect(snapshot.body.data.catalogSnapshot.isHead).toBe(true);
    const byRevision = await graphql(
      app,
      `
        query ($id: ID!, $revisionId: ID!) {
          playbook(id: $id, scope: REVISION, revisionId: $revisionId) {
            id
          }
          playbooks(first: 10, scope: REVISION, revisionId: $revisionId) {
            edges {
              node {
                id
              }
            }
          }
        }
      `,
      { id: playbookId, revisionId },
    );
    expect(byRevision.body.errors).toBeUndefined();

    const otherProject = await request(app.getHttpServer())
      .post('/api/projects')
      .send({ name: `catalog-scope-${stamp}` })
      .expect(201);
    const foreignRevision = await graphql(
      app,
      '{ projects(data: { first: 1 }) { edges { node { id } } } }',
    );
    expect(foreignRevision.body.errors).toBeUndefined();
    const foreignSnapshot = await graphql(
      app,
      `query { catalogSnapshot(revisionId: "${otherProject.body.id}") { revisionId } }`,
    );
    expect(foreignSnapshot.body.errors[0].message).toBe(CatalogError.recordUnavailable);
    await request(app.getHttpServer()).delete(`/api/projects/${otherProject.body.id}`);

    const discardTarget = await mutate(
      app,
      `mutation ($data: PlaybookInput!) { createPlaybook(data: $data) { id } }`,
      { data: { id: `gql-discard-${stamp}`, name: 'Discard me' } },
    );
    expect(discardTarget.createPlaybook?.id).toBe(`gql-discard-${stamp}`);
    const discarded = await mutate(app, `mutation { discardCatalog { status { hasChanges } } }`);
    expect(discarded.discardCatalog?.status?.hasChanges).toBe(false);
    const afterDiscard = await graphql(
      app,
      `{ playbook(id: "gql-discard-${stamp}", scope: DRAFT) { id } }`,
    );
    expect(afterDiscard.body.errors[0].message).toBe(CatalogError.recordUnavailable);
  });

  test('covers REST catalog writes, reads, pagination, and lifecycle', async () => {
    const stamp = `${Date.now()}`;
    const playbookId = `rest-pb-${stamp}`;
    const roleId = `rest-role-${stamp}`;
    const roleRefId = `rest-rref-${stamp}`;
    const sharedId = `rest-shared-${stamp}`;
    const stackId = `rest-stack-${stamp}`;
    const stackRefId = `rest-sref-${stamp}`;
    const methodId = `rest-method-${stamp}`;
    const pipelineId = `rest-pipe-${stamp}`;
    const pipelineRoleId = `rest-prole-${stamp}`;
    const sourceId = `rest-src-${stamp}`;
    const profileId = `rest-profile-${stamp}`;
    const sourceJson = JSON.stringify(taskPipeline());
    const http = app.getHttpServer();

    await request(http)
      .post('/api/playbook-catalog/playbooks')
      .send({ id: playbookId, name: 'REST playbook' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/roles')
      .send({ id: roleId, playbookId, body: 'Role' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/role-refs')
      .send({ id: roleRefId, roleId, body: 'Role ref' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/shared-references')
      .send({ id: sharedId, playbookId, body: 'Shared' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/stacks')
      .send({ id: stackId, playbookId, body: 'Stack' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/stack-refs')
      .send({ id: stackRefId, stackId, body: 'Stack ref' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/method-documents')
      .send({ id: methodId, playbookId, kind: 'method', body: 'Method' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/pipelines')
      .send({ id: pipelineId, playbookId, body: 'Pipeline' })
      .expect(201);
    await request(http)
      .post('/api/playbook-catalog/pipeline-roles')
      .send({ id: pipelineRoleId, pipelineId, roleId, membership: 'required' })
      .expect(201);
    await request(http)
      .put(`/api/playbook-catalog/pipeline-sources/${sourceId}`)
      .send({ pipelineId, sourceJson })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/pipeline-sources/${sourceId}`)
      .send({ pipelineId, sourceJson })
      .expect(200);
    await request(http)
      .post('/api/playbook-catalog/launch-profiles')
      .send({ id: profileId, pipelineId, status: 'active', bindings: [] })
      .expect(201);

    await request(http)
      .put(`/api/playbook-catalog/playbooks/${playbookId}`)
      .send({ name: 'REST playbook updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/roles/${roleId}`)
      .send({ playbookId, body: 'Role updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/role-refs/${roleRefId}`)
      .send({ roleId, body: 'Role ref updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/shared-references/${sharedId}`)
      .send({ playbookId, body: 'Shared updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/stacks/${stackId}`)
      .send({ playbookId, body: 'Stack updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/stack-refs/${stackRefId}`)
      .send({ stackId, body: 'Stack ref updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/method-documents/${methodId}`)
      .send({ playbookId, kind: 'nav', body: 'Method updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/pipelines/${pipelineId}`)
      .send({ playbookId, body: 'Pipeline updated' })
      .expect(200);
    await request(http)
      .put(`/api/playbook-catalog/launch-profiles/${profileId}`)
      .send({ pipelineId, status: 'deprecated', bindings: [] })
      .expect(200);

    const listed = await request(http)
      .get(`/api/playbook-catalog/playbooks?first=1&scope=DRAFT`)
      .expect(200);
    expect(listed.body.edges.length).toBeGreaterThan(0);
    const after = listed.body.pageInfo.endCursor as string;
    await request(http)
      .get(`/api/playbook-catalog/playbooks?first=1&after=${encodeURIComponent(after)}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/playbooks/${playbookId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/roles?playbookId=${playbookId}&scope=DRAFT`)
      .expect(200);
    await request(http).get(`/api/playbook-catalog/roles/${roleId}?scope=DRAFT`).expect(200);
    await request(http)
      .get(`/api/playbook-catalog/role-refs?roleId=${roleId}&scope=DRAFT`)
      .expect(200);
    await request(http).get(`/api/playbook-catalog/role-refs/${roleRefId}?scope=DRAFT`).expect(200);
    await request(http)
      .get(`/api/playbook-catalog/shared-references?playbookId=${playbookId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/shared-references/${sharedId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/stacks?playbookId=${playbookId}&scope=DRAFT`)
      .expect(200);
    await request(http).get(`/api/playbook-catalog/stacks/${stackId}?scope=DRAFT`).expect(200);
    await request(http)
      .get(`/api/playbook-catalog/stack-refs?stackId=${stackId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/stack-refs/${stackRefId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/method-documents?playbookId=${playbookId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/method-documents/${methodId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipelines?playbookId=${playbookId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipelines/${pipelineId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipeline-roles?pipelineId=${pipelineId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipeline-roles/${pipelineRoleId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipeline-sources?pipelineId=${pipelineId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipeline-sources/${sourceId}?scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipeline-slots?pipelineId=${pipelineId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/pipeline-slots/missing-${stamp}?scope=DRAFT`)
      .expect(404);
    await request(http)
      .get(`/api/playbook-catalog/launch-profiles?pipelineId=${pipelineId}&scope=DRAFT`)
      .expect(200);
    await request(http)
      .get(`/api/playbook-catalog/launch-profiles/${profileId}?scope=DRAFT`)
      .expect(200);
    await request(http).get('/api/playbook-catalog/status').expect(200);
    const changes = await request(http).get('/api/playbook-catalog/changes?first=1').expect(200);
    const changeAfter = String(changes.body.pageInfo.endCursor);
    await request(http)
      .get(`/api/playbook-catalog/changes?first=10&after=${encodeURIComponent(changeAfter)}`)
      .expect(200);

    await request(http).get('/api/playbook-catalog/playbooks?scope=NOPE').expect(400);

    await request(http)
      .post('/api/playbook-catalog/import')
      .send({
        version: 1,
        tables: { playbooks: [{ id: `rest-imp-${stamp}`, name: 'REST import' }] },
      })
      .expect(201);

    const committed = await request(http)
      .post('/api/playbook-catalog/commit')
      .send({ message: 'Publish REST catalog' })
      .expect(201);
    await request(http)
      .get(`/api/playbook-catalog/snapshot?revisionId=${committed.body.revisionId}`)
      .expect(200);
    await request(http)
      .get(
        `/api/playbook-catalog/playbooks/${playbookId}?scope=REVISION&revisionId=${committed.body.revisionId}`,
      )
      .expect(200);

    await request(http).delete(`/api/playbook-catalog/launch-profiles/${profileId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/pipeline-sources/${sourceId}`).expect(204);
    await request(http)
      .delete(`/api/playbook-catalog/pipeline-roles/${pipelineRoleId}`)
      .expect(204);
    await request(http).delete(`/api/playbook-catalog/method-documents/${methodId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/stack-refs/${stackRefId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/role-refs/${roleRefId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/shared-references/${sharedId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/stacks/${stackId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/roles/${roleId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/pipelines/${pipelineId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/playbooks/${playbookId}`).expect(204);
    await request(http).delete(`/api/playbook-catalog/playbooks/rest-imp-${stamp}`).expect(204);

    await request(http).post('/api/playbook-catalog/discard').expect(201);
    const emptyDiscard = await request(http).post('/api/playbook-catalog/discard').expect(201);
    expect(emptyDiscard.body.status.hasChanges).toBe(false);
  });
});

async function graphql(app: INestApplication, query: string, variables?: Record<string, unknown>) {
  return request(app.getHttpServer()).post('/graphql').send({ query, variables }).expect(200);
}

async function mutate(app: INestApplication, query: string, variables?: Record<string, unknown>) {
  const response = await graphql(app, query, variables);
  expect(response.body.errors).toBeUndefined();

  return response.body.data as Record<
    string,
    {
      id?: string;
      launchability?: string;
      revisionId?: string;
      tables?: Array<{ created: number }>;
      status?: { hasChanges: boolean };
    }
  >;
}
