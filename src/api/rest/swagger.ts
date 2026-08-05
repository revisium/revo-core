import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import packageJson from '../../../package.json' with { type: 'json' };

export const initSwagger = (app: INestApplication): void => {
  const config = new DocumentBuilder()
    .setTitle('Revo Core API')
    .setVersion(packageJson.version)
    .addTag('Runs')
    .addTag('System')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/api', app, document);
};
