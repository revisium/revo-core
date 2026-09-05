import { Inject, Injectable } from '@nestjs/common';
import type { AgentManager } from '@revisium/revo-agent-runtime';

import { AGENT_MANAGER } from './agent-runtime.tokens.js';
import { AgentSessionDirectories } from './agent-session-directories.js';

@Injectable()
export class AgentRuntimeLifecycle {
  private shutdown?: Promise<void>;

  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    private readonly directories: AgentSessionDirectories,
  ) {}

  stop(): Promise<void> {
    this.shutdown ??= this.manager.shutdown('revo_core_shutdown');

    return this.shutdown;
  }

  async cleanup(): Promise<void> {
    await this.stop();
    await this.directories.cleanup();
  }
}
