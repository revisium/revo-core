import { Query } from '@nestjs/cqrs';

import type {
  DialogueInteraction,
  DialoguePage,
  DialoguePageInput,
} from '../../contracts/dialogue.contracts.js';

export type ListDialogueInteractionsQueryData = DialoguePageInput & { dialogueId: string };
export type ListDialogueInteractionsQueryReturnType = DialoguePage<DialogueInteraction>;

export class ListDialogueInteractionsQuery extends Query<ListDialogueInteractionsQueryReturnType> {
  constructor(readonly data: ListDialogueInteractionsQueryData) {
    super();
  }
}
