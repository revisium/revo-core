import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

import packageJson from '../../../package.json' with { type: 'json' };

export const initSwagger = (app: INestApplication): OpenAPIObject => {
  const config = new DocumentBuilder()
    .setTitle('Revo Core API')
    .setVersion(packageJson.version)
    .addTag('Projects')
    .addTag('Playbook Catalog')
    .addTag('Runs')
    .addTag('System')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api', app, document);
  return document;
};
