import { Module } from '@nestjs/common';

import { RevoRunService } from '../../src/infrastructure/run-runtime/revo-run.service.js';

@Module({
  providers: [{ provide: RevoRunService, useValue: {} }],
  exports: [RevoRunService],
})
export class ProjectTestRuntimeModule {}
