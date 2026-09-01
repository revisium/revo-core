import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { databaseConfig } from './config/database.config.js';
import { httpConfig } from './config/http.config.js';
import { runConfig } from './config/run.config.js';
import { CoreModule } from './core.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [databaseConfig, httpConfig, runConfig] }),
    CoreModule,
  ],
})
export class AppModule {}
