import 'reflect-metadata';
import type { ConfigType } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';

import { initSwagger } from './api/rest/swagger.js';
import { AppModule } from './app.module.js';
import { httpConfig } from './config/http.config.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const http = app.get<ConfigType<typeof httpConfig>>(httpConfig.KEY);

  initSwagger(app);
  app.enableShutdownHooks();

  await app.listen(http.port, http.host);
}

await bootstrap();
