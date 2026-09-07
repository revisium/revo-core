import { Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

import { AppendDialogueTextDeltaCommand } from './commands/impl/append-dialogue-text-delta.command.js';
import { CloseDialogueSessionCommand } from './commands/impl/close-dialogue-session.command.js';
import { CompleteDialogueAssistantMessageCommand } from './commands/impl/complete-dialogue-assistant-message.command.js';
import { CompleteDialogueTurnCommand } from './commands/impl/complete-dialogue-turn.command.js';
import { RecordDialogueActivityCommand } from './commands/impl/record-dialogue-activity.command.js';
import { RecordDialogueLifecycleEventCommand } from './commands/impl/record-dialogue-lifecycle-event.command.js';
import { RequestDialogueInteractionCommand } from './commands/impl/request-dialogue-interaction.command.js';
import { ResolveDialogueInteractionCommand } from './commands/impl/resolve-dialogue-interaction.command.js';
import { StartDialogueTurnCommand } from './commands/impl/start-dialogue-turn.command.js';
import { UpdateDialogueProgressCommand } from './commands/impl/update-dialogue-progress.command.js';

type Event<T extends AgentSessionEvent['type']> = Extract<AgentSessionEvent, { readonly type: T }>;
type LifecycleEvent = Event<
  'session.accepted' | 'session.opened' | 'session.checkpointed' | 'session.hibernated'
>;
type ActivityEvent = Event<'tool.activity' | 'plan.updated' | 'usage.updated'>;

@Injectable()
export class DialogueEventIngestionApiService {
  constructor(private readonly commands: CommandBus) {}

  appendTextDelta(
    event: Event<'assistant.message.delta'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(new AppendDialogueTextDeltaCommand({ event, expected, signal }));
  }

  completeAssistantMessage(
    event: Event<'assistant.message.completed'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(
      new CompleteDialogueAssistantMessageCommand({ event, expected, signal }),
    );
  }

  startTurn(
    event: Event<'turn.started'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(new StartDialogueTurnCommand({ event, expected, signal }));
  }

  completeTurn(
    event: Event<'turn.completed'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(new CompleteDialogueTurnCommand({ event, expected, signal }));
  }

  updateProgress(
    event: Event<'agent.progress'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(new UpdateDialogueProgressCommand({ event, expected, signal }));
  }

  recordActivity(
    event: ActivityEvent,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(new RecordDialogueActivityCommand({ event, expected, signal }));
  }

  requestInteraction(
    event: Event<'interaction.requested'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(
      new RequestDialogueInteractionCommand({ event, expected, signal }),
    );
  }

  resolveInteraction(
    event: Event<'interaction.resolved'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(
      new ResolveDialogueInteractionCommand({ event, expected, signal }),
    );
  }

  closeSession(
    event: Event<'session.closed'>,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(new CloseDialogueSessionCommand({ event, expected, signal }));
  }

  recordLifecycleEvent(
    event: LifecycleEvent,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    return this.commands.execute(
      new RecordDialogueLifecycleEventCommand({ event, expected, signal }),
    );
  }
}
