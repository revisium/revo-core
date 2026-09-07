import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AgentRuntimeModule } from '../../../infrastructure/agent-runtime/agent-runtime.module.js';
import { DatabaseModule } from '../../../infrastructure/database/database.module.js';
import { DialogueEventIngestionModule } from '../ingestion/dialogue-event-ingestion.module.js';
import { CancelDialogueTurnHandler } from './commands/handlers/cancel-dialogue-turn.handler.js';
import { CreateDialogueHandler } from './commands/handlers/create-dialogue.handler.js';
import { ForkDialogueHandler } from './commands/handlers/fork-dialogue.handler.js';
import { MarkDialogueReadHandler } from './commands/handlers/mark-dialogue-read.handler.js';
import { ReconcileDialogueRuntimeStateHandler } from './commands/handlers/reconcile-dialogue-runtime-state.handler.js';
import { ReopenDialogueHandler } from './commands/handlers/reopen-dialogue.handler.js';
import { RespondDialogueHandler } from './commands/handlers/respond-dialogue.handler.js';
import { SendDialogueMessageHandler } from './commands/handlers/send-dialogue-message.handler.js';
import { DialogueTurnFinalizer } from './completion/dialogue-turn-finalizer.js';
import { DialogueApiService } from './dialogue-api.service.js';
import { DialogueStartupReconciliation } from './lifecycle/dialogue-startup-reconciliation.js';
import { GetDialogueHistoryItemHandler } from './queries/handlers/get-dialogue-history-item.handler.js';
import { GetDialogueHandler } from './queries/handlers/get-dialogue.handler.js';
import { ListDialogueHistoryHandler } from './queries/handlers/list-dialogue-history.handler.js';
import { ListDialogueInteractionsHandler } from './queries/handlers/list-dialogue-interactions.handler.js';
import { ListDialogueTurnsHandler } from './queries/handlers/list-dialogue-turns.handler.js';
import { ListDialoguesHandler } from './queries/handlers/list-dialogues.handler.js';
import { SubscribeDialogueChangesHandler } from './queries/handlers/subscribe-dialogue-changes.handler.js';
import { DialogueExecution } from './runtime/dialogue-execution.js';
import { DispatchDialogueTurnHandler } from './runtime/dispatch-dialogue-turn.handler.js';

@Module({
  imports: [CqrsModule, DatabaseModule, DialogueEventIngestionModule, AgentRuntimeModule],
  providers: [
    DialogueApiService,
    DialogueExecution,
    DialogueStartupReconciliation,
    DialogueTurnFinalizer,
    CreateDialogueHandler,
    SendDialogueMessageHandler,
    RespondDialogueHandler,
    CancelDialogueTurnHandler,
    MarkDialogueReadHandler,
    ReconcileDialogueRuntimeStateHandler,
    ReopenDialogueHandler,
    ForkDialogueHandler,
    GetDialogueHandler,
    GetDialogueHistoryItemHandler,
    ListDialoguesHandler,
    ListDialogueHistoryHandler,
    ListDialogueTurnsHandler,
    ListDialogueInteractionsHandler,
    SubscribeDialogueChangesHandler,
    DispatchDialogueTurnHandler,
  ],
  exports: [DialogueApiService],
})
export class DialogueManagementModule {}
