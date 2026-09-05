import { randomUUID } from 'node:crypto';

import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager, AgentStartContext } from '@revisium/revo-agent-runtime';

import {
  AGENT_MANAGER,
  AGENT_LAUNCH_CONTEXT,
} from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../../infrastructure/agent-runtime/agent-session-directories.js';
import {
  OpenAgentSessionCommand,
  type OpenAgentSessionCommandReturnType,
} from '../impl/open-agent-session.command.js';

@CommandHandler(OpenAgentSessionCommand)
export class OpenAgentSessionHandler implements ICommandHandler<
  OpenAgentSessionCommand,
  OpenAgentSessionCommandReturnType
> {
  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly launchContext: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
  ) {}

  async execute({ data }: OpenAgentSessionCommand): Promise<OpenAgentSessionCommandReturnType> {
    const sessionId = 'dlg_' + randomUUID().replaceAll('-', '');
    const session = await this.manager.sessions.open(
      {
        agent: { id: data.agentId, version: data.agentVersion },
        sessionId,
        workspace: { directory: this.directories.workspaceDirectory },
        output: { directory: this.directories.outputDirectory(sessionId) },
        parameters: {},
        permissions: {},
        ...(data.configuration === undefined ? {} : { configuration: data.configuration }),
      },
      this.launchContext,
    );

    return { sessionId: session.sessionId, pin: session.pin, capabilities: session.capabilities };
  }
}
