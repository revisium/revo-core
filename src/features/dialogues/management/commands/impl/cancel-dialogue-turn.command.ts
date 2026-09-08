import { Command } from '@nestjs/cqrs';

import type { DialogueTurn } from '../../contracts/dialogue.contracts.js';

export type CancelDialogueTurnCommandData = { dialogueId: string; turnId: string };
export type CancelDialogueTurnCommandReturnType = DialogueTurn;

export class CancelDialogueTurnCommand extends Command<CancelDialogueTurnCommandReturnType> {
  constructor(readonly data: CancelDialogueTurnCommandData) {
    super();
  }
}
