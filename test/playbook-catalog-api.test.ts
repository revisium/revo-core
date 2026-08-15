import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { CatalogError } from '../src/features/playbook-catalog/constants/catalog.constants.js';
import { SYSTEM_PLAYBOOKS_PROJECT } from '../src/features/revisium-bootstrap/revisium-bootstrap.constants.js';

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
});

async function graphql(app: INestApplication, query: string, variables?: Record<string, unknown>) {
  return request(app.getHttpServer()).post('/graphql').send({ query, variables }).expect(200);
}
