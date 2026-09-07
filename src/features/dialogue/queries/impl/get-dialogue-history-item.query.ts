import { Query } from '@nestjs/cqrs';

import type { DialogueHistoryItem } from '../../contracts/dialogue.contracts.js';

export interface GetDialogueHistoryItemQueryData {
  readonly dialogueId: string;
  readonly itemId: string;
}

export type GetDialogueHistoryItemQueryReturnType = DialogueHistoryItem;

export class GetDialogueHistoryItemQuery extends Query<GetDialogueHistoryItemQueryReturnType> {
  constructor(readonly data: GetDialogueHistoryItemQueryData) {
    super();
  }
}
