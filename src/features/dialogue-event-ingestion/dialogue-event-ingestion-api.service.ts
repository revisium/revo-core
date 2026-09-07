import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

import { AppendDialogueRuntimeEventCommand } from './commands/impl/append-dialogue-runtime-event.command.js';

@Injectable()
export class DialogueEventIngestionApiService {
  constructor(private readonly commands: CommandBus) {}

  append(
    event: AgentSessionEvent,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(
      new AppendDialogueRuntimeEventCommand({ event, expected, signal }),
    );
  }
}
