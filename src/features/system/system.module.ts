import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { SYSTEM_QUERY_HANDLERS } from './queries/index.js';
import { SystemApiService } from './system-api.service.js';

@Module({
  imports: [CqrsModule],
  providers: [SystemApiService, ...SYSTEM_QUERY_HANDLERS],
  exports: [SystemApiService],
})
export class SystemModule {}
