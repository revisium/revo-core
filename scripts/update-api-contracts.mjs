import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { Test } from '@nestjs/testing';
import { buildClientSchema, getIntrospectionQuery, printSchema } from 'graphql';
import request from 'supertest';

import { initSwagger } from '../dist/api/rest/swagger.js';
import { AppModule } from '../dist/app.module.js';

const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
const app = module.createNestApplication();

try {
  initSwagger(app);
  await app.init();

  const introspection = await request(app.getHttpServer())
    .post('/graphql')
    .send({ query: getIntrospectionQuery() })
    .expect(200);
  const schema = printSchema(buildClientSchema(introspection.body.data)).trim();
  await writeFile(resolve('src/api/graphql/schema.graphql'), `${schema}\n`);

  const openapi = await request(app.getHttpServer()).get('/api-json').expect(200);
  await writeFile(
    resolve('src/api/rest/openapi.json'),
    `${JSON.stringify(openapi.body, null, 2)}\n`,
  );
} finally {
  await app.close();
}
