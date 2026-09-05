import { Inject } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentManager, AgentStartContext } from '@revisium/revo-agent-runtime';

import {
  AGENT_MANAGER,
  AGENT_LAUNCH_CONTEXT,
} from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../../infrastructure/agent-runtime/agent-session-directories.js';
import {
  ResumeAgentSessionCommand,
  type ResumeAgentSessionCommandReturnType,
} from '../impl/resume-agent-session.command.js';

@CommandHandler(ResumeAgentSessionCommand)
export class ResumeAgentSessionHandler implements ICommandHandler<
  ResumeAgentSessionCommand,
  ResumeAgentSessionCommandReturnType
> {
  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly launchContext: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
  ) {}

  async execute({ data }: ResumeAgentSessionCommand): Promise<ResumeAgentSessionCommandReturnType> {
    const session = await this.manager.sessions.resume(
      {
        token: data.token,
        workspace: { directory: this.directories.workspaceDirectory },
        output: {
          directory: this.directories.outputDirectory(
            data.token.sessionId,
            data.token.resumeTokenId,
          ),
        },
        parameters: {},
        permissions: {},
        ...(data.configuration === undefined ? {} : { configuration: data.configuration }),
      },
      this.launchContext,
    );

    return { sessionId: session.sessionId, pin: session.pin, capabilities: session.capabilities };
  }
}
