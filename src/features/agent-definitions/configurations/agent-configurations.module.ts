import { Module } from '@nestjs/common';

import { AgentRuntimeModule } from '../../../infrastructure/agent-runtime/agent-runtime.module.js';
import { AgentConfigurationCache } from './agent-configuration-cache.js';
import { AgentConfigurationWarmup } from './agent-configuration-warmup.js';

@Module({
  imports: [AgentRuntimeModule],
  providers: [AgentConfigurationCache, AgentConfigurationWarmup],
  exports: [AgentConfigurationCache],
})
export class AgentConfigurationsModule {}
