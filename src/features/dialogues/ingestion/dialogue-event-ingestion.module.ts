import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DatabaseModule } from '../../../infrastructure/database/database.module.js';
import { DialogueChangePublisher } from '../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueEventReader } from '../../../infrastructure/dialogue/dialogue-event-reader.js';
import { DialogueInteractionCleanup } from '../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import { AppendDialogueTextDeltaHandler } from './commands/handlers/append-dialogue-text-delta.handler.js';
import { CloseDialogueSessionHandler } from './commands/handlers/close-dialogue-session.handler.js';
import { CompleteDialogueAssistantMessageHandler } from './commands/handlers/complete-dialogue-assistant-message.handler.js';
import { CompleteDialogueTurnHandler } from './commands/handlers/complete-dialogue-turn.handler.js';
import { RecordDialogueActivityHandler } from './commands/handlers/record-dialogue-activity.handler.js';
import { RecordDialogueLifecycleEventHandler } from './commands/handlers/record-dialogue-lifecycle-event.handler.js';
import { RequestDialogueInteractionHandler } from './commands/handlers/request-dialogue-interaction.handler.js';
import { ResolveDialogueInteractionHandler } from './commands/handlers/resolve-dialogue-interaction.handler.js';
import { StartDialogueTurnHandler } from './commands/handlers/start-dialogue-turn.handler.js';
import { UpdateDialogueProgressHandler } from './commands/handlers/update-dialogue-progress.handler.js';
import { DialogueEventIngestionApiService } from './dialogue-event-ingestion-api.service.js';
import { AgentSessionEventReceiptWriter } from './persistence/agent-session-event-receipt.js';

const eventHandlers = [
  AppendDialogueTextDeltaHandler,
  CompleteDialogueAssistantMessageHandler,
  StartDialogueTurnHandler,
  CompleteDialogueTurnHandler,
  UpdateDialogueProgressHandler,
  RecordDialogueActivityHandler,
  RequestDialogueInteractionHandler,
  ResolveDialogueInteractionHandler,
  CloseDialogueSessionHandler,
  RecordDialogueLifecycleEventHandler,
];

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [
    DialogueEventIngestionApiService,
    DialogueChangePublisher,
    DialogueEventReader,
    DialogueInteractionCleanup,
    AgentSessionEventReceiptWriter,
    ...eventHandlers,
  ],
  exports: [
    DialogueEventIngestionApiService,
    DialogueChangePublisher,
    DialogueEventReader,
    DialogueInteractionCleanup,
  ],
})
export class DialogueEventIngestionModule {}
