import { Module } from '@nestjs/common';

import { AgentRuntimeModule } from '../agent-runtime/agent-runtime.module.js';
import { RevoRunService } from './revo-run.service.js';
import { TemporaryRunDirectoryHost } from './working-directory/temporary-run-directory-host.js';

@Module({
  imports: [AgentRuntimeModule],
  providers: [TemporaryRunDirectoryHost, RevoRunService],
  exports: [RevoRunService],
})
export class RunRuntimeModule {}
