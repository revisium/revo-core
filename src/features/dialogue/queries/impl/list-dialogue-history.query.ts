import { Query } from '@nestjs/cqrs';

import type {
  DialogueHistoryItem,
  DialoguePage,
  DialoguePageInput,
} from '../../contracts/dialogue.contracts.js';

export type ListDialogueHistoryQueryData = DialoguePageInput & {
  dialogueId: string;
};
export type ListDialogueHistoryQueryReturnType = DialoguePage<DialogueHistoryItem>;

export class ListDialogueHistoryQuery extends Query<ListDialogueHistoryQueryReturnType> {
  constructor(readonly data: ListDialogueHistoryQueryData) {
    super();
  }
}
