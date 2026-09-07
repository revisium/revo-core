import { Inject, Injectable } from '@nestjs/common';
import type {
  AgentManager,
  AgentSessionInteractiveResponse,
  AgentStartContext,
} from '@revisium/revo-agent-runtime';

import { DialogueExecution } from '../../../src/features/dialogue/application/dialogue-execution.js';
import {
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../../src/infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../src/infrastructure/agent-runtime/agent-session-directories.js';

@Injectable()
export class ControllableDialogueExecution extends DialogueExecution {
  private responseBarrier:
    | {
        readonly reached: () => void;
        readonly release: Promise<void>;
        fail: boolean;
      }
    | undefined;

  constructor(
    @Inject(AGENT_MANAGER) manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) launchContext: AgentStartContext,
    directories: AgentSessionDirectories,
  ) {
    super(manager, launchContext, directories);
  }

  holdNextResponse(): { readonly reached: Promise<void>; fail(): void; release(): void } {
    if (this.responseBarrier !== undefined) {
      throw new Error('A dialogue response barrier is already active.');
    }
    const reached = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const barrier = { reached: reached.resolve, release: release.promise, fail: false };
    this.responseBarrier = barrier;
    return {
      reached: reached.promise,
      fail: () => {
        barrier.fail = true;
        release.resolve();
      },
      release: release.resolve,
    };
  }

  override async respond(
    runtimeSessionId: string,
    runtimeRequestId: string,
    response: AgentSessionInteractiveResponse,
  ): Promise<void> {
    const barrier = this.responseBarrier;
    if (barrier !== undefined) {
      this.responseBarrier = undefined;
      barrier.reached();
      await barrier.release;
      if (barrier.fail) {
        throw new Error('Controlled interaction response delivery failure.');
      }
    }
    return super.respond(runtimeSessionId, runtimeRequestId, response);
  }
}
