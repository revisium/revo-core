import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AgentRuntimeModule } from '../../infrastructure/agent-runtime/agent-runtime.module.js';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { DialogueEventIngestionModule } from '../dialogue-event-ingestion/dialogue-event-ingestion.module.js';
import { DialogueExecution } from './application/dialogue-execution.js';
import { DialogueRecovery } from './application/dialogue-recovery.js';
import { DialogueTurnFinalizer } from './application/dialogue-turn-finalizer.js';
import { CancelDialogueTurnHandler } from './commands/handlers/cancel-dialogue-turn.handler.js';
import { CreateDialogueHandler } from './commands/handlers/create-dialogue.handler.js';
import { ForkDialogueHandler } from './commands/handlers/fork-dialogue.handler.js';
import { MarkDialogueReadHandler } from './commands/handlers/mark-dialogue-read.handler.js';
import { RecoverDialoguesHandler } from './commands/handlers/recover-dialogues.handler.js';
import { ReopenDialogueHandler } from './commands/handlers/reopen-dialogue.handler.js';
import { RespondDialogueHandler } from './commands/handlers/respond-dialogue.handler.js';
import { SendDialogueMessageHandler } from './commands/handlers/send-dialogue-message.handler.js';
import { DialogueApiService } from './dialogue-api.service.js';
import { DispatchDialogueTurnHandler } from './events/dispatch-dialogue-turn.handler.js';
import { GetDialogueHistoryItemHandler } from './queries/handlers/get-dialogue-history-item.handler.js';
import { GetDialogueHandler } from './queries/handlers/get-dialogue.handler.js';
import { ListDialogueHistoryHandler } from './queries/handlers/list-dialogue-history.handler.js';
import { ListDialogueInteractionsHandler } from './queries/handlers/list-dialogue-interactions.handler.js';
import { ListDialogueTurnsHandler } from './queries/handlers/list-dialogue-turns.handler.js';
import { ListDialoguesHandler } from './queries/handlers/list-dialogues.handler.js';
import { SubscribeDialogueChangesHandler } from './queries/handlers/subscribe-dialogue-changes.handler.js';

@Module({
  imports: [CqrsModule, DatabaseModule, DialogueEventIngestionModule, AgentRuntimeModule],
  providers: [
    DialogueApiService,
    DialogueExecution,
    DialogueRecovery,
    DialogueTurnFinalizer,
    CreateDialogueHandler,
    SendDialogueMessageHandler,
    RespondDialogueHandler,
    CancelDialogueTurnHandler,
    MarkDialogueReadHandler,
    RecoverDialoguesHandler,
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
export class DialogueModule {}
