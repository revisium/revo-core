import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { DialogueEventReader } from '../../../../../infrastructure/dialogue/dialogue-event-reader.js';
import {
  SubscribeDialogueChangesQuery,
  type SubscribeDialogueChangesQueryReturnType,
} from '../impl/subscribe-dialogue-changes.query.js';

@QueryHandler(SubscribeDialogueChangesQuery)
export class SubscribeDialogueChangesHandler implements IQueryHandler<
  SubscribeDialogueChangesQuery,
  SubscribeDialogueChangesQueryReturnType
> {
  constructor(private readonly events: DialogueEventReader) {}

  async execute({
    data,
  }: SubscribeDialogueChangesQuery): Promise<SubscribeDialogueChangesQueryReturnType> {
    return this.events.changes(data.after, data.dialogueIds, data.summaryOnly ?? false);
  }
}
