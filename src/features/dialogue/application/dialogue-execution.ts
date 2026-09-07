import { Inject, Injectable } from '@nestjs/common';
import type {
  AgentConfigurationSelection,
  AgentManager,
  AgentSessionInteractiveResponse,
  AgentSessionTurn,
  AgentStartContext,
} from '@revisium/revo-agent-runtime';

import {
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../infrastructure/agent-runtime/agent-session-directories.js';
import type { DialogueJson } from '../contracts/dialogue.contracts.js';

@Injectable()
export class DialogueExecution {
  constructor(
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly launchContext: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
  ) {}

  async open(
    sessionId: string,
    agentId: string,
    agentVersion: string,
    agentConfiguration: DialogueJson,
  ): Promise<void> {
    await this.manager.sessions.open(
      {
        sessionId,
        agent: { id: agentId, version: agentVersion },
        workspace: { directory: this.directories.workspaceDirectory },
        output: { directory: this.directories.outputDirectory(sessionId) },
        parameters: {},
        permissions: {},
        configuration: this.configuration(agentConfiguration),
      },
      this.launchContext,
    );
  }

  send(sessionId: string, turnId: string, prompt: string): Promise<AgentSessionTurn> {
    const session = this.manager.sessions.get(sessionId);

    if (session === undefined) {
      throw new Error('Runtime session is not active.');
    }

    return session.send({ turnId, prompt });
  }

  async cancel(runtimeSessionId: string, turnId: string): Promise<void> {
    const turn = this.manager.sessions.getTurn(runtimeSessionId, turnId);

    await turn?.cancel('dialogue_api_cancel');
  }

  async respond(
    runtimeSessionId: string,
    runtimeRequestId: string,
    response: AgentSessionInteractiveResponse,
  ): Promise<void> {
    const session = this.manager.sessions.get(runtimeSessionId);

    if (session === undefined) {
      throw new Error('Runtime session is not active.');
    }

    await session.respond({ requestId: runtimeRequestId, response });
  }

  private configuration(value: DialogueJson): AgentConfigurationSelection {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Persisted dialogue agent configuration is invalid.');
    }

    if (
      !('selections' in value) ||
      typeof value.selections !== 'object' ||
      value.selections === null ||
      Array.isArray(value.selections) ||
      Object.values(value.selections).some(
        (selection) => typeof selection !== 'boolean' && typeof selection !== 'string',
      )
    ) {
      throw new Error('Persisted dialogue agent configuration selections are invalid.');
    }
    const selections: Record<string, boolean | string> = {};

    for (const [id, selection] of Object.entries(value.selections)) {
      if (typeof selection === 'boolean' || typeof selection === 'string') {
        selections[id] = selection;
      }
    }

    const catalogRevision =
      'catalogRevision' in value && typeof value.catalogRevision === 'string'
        ? value.catalogRevision
        : undefined;

    return { selections, ...(catalogRevision === undefined ? {} : { catalogRevision }) };
  }
}
