import { Query } from '@nestjs/cqrs';

import type {
  DialoguePage,
  DialoguePageInput,
  DialogueTurn,
} from '../../contracts/dialogue.contracts.js';

export type ListDialogueTurnsQueryData = DialoguePageInput & { dialogueId: string };
export type ListDialogueTurnsQueryReturnType = DialoguePage<DialogueTurn>;

export class ListDialogueTurnsQuery extends Query<ListDialogueTurnsQueryReturnType> {
  constructor(readonly data: ListDialogueTurnsQueryData) {
    super();
  }
}
