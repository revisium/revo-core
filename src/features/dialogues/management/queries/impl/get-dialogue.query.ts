import { Query } from '@nestjs/cqrs';

import type { DialogueSummary } from '../../contracts/dialogue.contracts.js';

export type GetDialogueQueryData = { dialogueId: string };
export type GetDialogueQueryReturnType = DialogueSummary;

export class GetDialogueQuery extends Query<GetDialogueQueryReturnType> {
  constructor(readonly data: GetDialogueQueryData) {
    super();
  }
}
