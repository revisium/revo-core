import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { httpConfig } from './config/http.config.js';
import { CoreModule } from './core.module.js';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true, load: [httpConfig] }), CoreModule],
})
export class AppModule {}
