import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { DialogueChangePublisher } from '../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueEventReader } from '../../infrastructure/dialogue/dialogue-event-reader.js';
import { DialogueInteractionCleanup } from '../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import { AppendDialogueRuntimeEventHandler } from './commands/handlers/append-dialogue-runtime-event.handler.js';
import { DialogueEventIngestionApiService } from './dialogue-event-ingestion-api.service.js';

@Module({
  imports: [CqrsModule, DatabaseModule],
  providers: [
    DialogueEventIngestionApiService,
    DialogueChangePublisher,
    DialogueEventReader,
    DialogueInteractionCleanup,
    AppendDialogueRuntimeEventHandler,
  ],
  exports: [
    DialogueEventIngestionApiService,
    DialogueChangePublisher,
    DialogueEventReader,
    DialogueInteractionCleanup,
  ],
})
export class DialogueEventIngestionModule {}
