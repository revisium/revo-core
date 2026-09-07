import { Injectable } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';

import {
  CancelDialogueTurnCommand,
  type CancelDialogueTurnCommandData,
} from './commands/impl/cancel-dialogue-turn.command.js';
import {
  CreateDialogueCommand,
  type CreateDialogueCommandData,
} from './commands/impl/create-dialogue.command.js';
import {
  ForkDialogueCommand,
  type ForkDialogueCommandData,
} from './commands/impl/fork-dialogue.command.js';
import {
  MarkDialogueReadCommand,
  type MarkDialogueReadCommandData,
} from './commands/impl/mark-dialogue-read.command.js';
import { ReconcileDialogueRuntimeStateCommand } from './commands/impl/reconcile-dialogue-runtime-state.command.js';
import {
  ReopenDialogueCommand,
  type ReopenDialogueCommandData,
} from './commands/impl/reopen-dialogue.command.js';
import {
  RespondDialogueCommand,
  type RespondDialogueCommandData,
} from './commands/impl/respond-dialogue.command.js';
import {
  SendDialogueMessageCommand,
  type SendDialogueMessageCommandData,
} from './commands/impl/send-dialogue-message.command.js';
import {
  GetDialogueHistoryItemQuery,
  type GetDialogueHistoryItemQueryData,
} from './queries/impl/get-dialogue-history-item.query.js';
import { GetDialogueQuery, type GetDialogueQueryData } from './queries/impl/get-dialogue.query.js';
import {
  ListDialogueHistoryQuery,
  type ListDialogueHistoryQueryData,
} from './queries/impl/list-dialogue-history.query.js';
import {
  ListDialogueInteractionsQuery,
  type ListDialogueInteractionsQueryData,
} from './queries/impl/list-dialogue-interactions.query.js';
import {
  ListDialogueTurnsQuery,
  type ListDialogueTurnsQueryData,
} from './queries/impl/list-dialogue-turns.query.js';
import {
  ListDialoguesQuery,
  type ListDialoguesQueryData,
} from './queries/impl/list-dialogues.query.js';
import {
  SubscribeDialogueChangesQuery,
  type SubscribeDialogueChangesQueryData,
} from './queries/impl/subscribe-dialogue-changes.query.js';

@Injectable()
export class DialogueApiService {
  constructor(
    private readonly commands: CommandBus,
    private readonly queries: QueryBus,
  ) {}

  create(data: CreateDialogueCommandData) {
    return this.commands.execute(new CreateDialogueCommand(data));
  }

  send(data: SendDialogueMessageCommandData) {
    return this.commands.execute(new SendDialogueMessageCommand(data));
  }

  respond(data: RespondDialogueCommandData) {
    return this.commands.execute(new RespondDialogueCommand(data));
  }

  cancel(data: CancelDialogueTurnCommandData) {
    return this.commands.execute(new CancelDialogueTurnCommand(data));
  }

  markRead(data: MarkDialogueReadCommandData) {
    return this.commands.execute(new MarkDialogueReadCommand(data));
  }

  reopen(data: ReopenDialogueCommandData) {
    return this.commands.execute(new ReopenDialogueCommand(data));
  }

  reconcileRuntimeState() {
    return this.commands.execute(new ReconcileDialogueRuntimeStateCommand());
  }

  fork(data: ForkDialogueCommandData) {
    return this.commands.execute(new ForkDialogueCommand(data));
  }

  get(data: GetDialogueQueryData) {
    return this.queries.execute(new GetDialogueQuery(data));
  }

  historyItem(data: GetDialogueHistoryItemQueryData) {
    return this.queries.execute(new GetDialogueHistoryItemQuery(data));
  }

  list(data: ListDialoguesQueryData) {
    return this.queries.execute(new ListDialoguesQuery(data));
  }

  history(data: ListDialogueHistoryQueryData) {
    return this.queries.execute(new ListDialogueHistoryQuery(data));
  }

  turns(data: ListDialogueTurnsQueryData) {
    return this.queries.execute(new ListDialogueTurnsQuery(data));
  }

  interactions(data: ListDialogueInteractionsQueryData) {
    return this.queries.execute(new ListDialogueInteractionsQuery(data));
  }

  changes(data: SubscribeDialogueChangesQueryData) {
    return this.queries.execute(new SubscribeDialogueChangesQuery(data));
  }
}
