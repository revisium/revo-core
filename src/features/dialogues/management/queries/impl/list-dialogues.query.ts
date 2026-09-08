import { Query } from '@nestjs/cqrs';

import type {
  DialoguePage,
  DialoguePageInput,
  DialogueSummary,
} from '../../contracts/dialogue.contracts.js';

export type ListDialoguesQueryData = DialoguePageInput;
export type ListDialoguesQueryReturnType = DialoguePage<DialogueSummary>;

export class ListDialoguesQuery extends Query<ListDialoguesQueryReturnType> {
  constructor(readonly data: ListDialoguesQueryData) {
    super();
  }
}
