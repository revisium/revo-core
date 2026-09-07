import { Query } from '@nestjs/cqrs';

import type { DialogueChange } from '../../contracts/dialogue.contracts.js';

export type SubscribeDialogueChangesQueryData = {
  after?: string;
  dialogueIds?: string[];
  summaryOnly?: boolean;
};
export type SubscribeDialogueChangesQueryReturnType = AsyncIterable<DialogueChange>;

export class SubscribeDialogueChangesQuery extends Query<SubscribeDialogueChangesQueryReturnType> {
  constructor(readonly data: SubscribeDialogueChangesQueryData) {
    super();
  }
}
