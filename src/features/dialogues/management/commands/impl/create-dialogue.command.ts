import { Command } from '@nestjs/cqrs';

import type { CreateDialogueInput, DialogueSummary } from '../../contracts/dialogue.contracts.js';

export type CreateDialogueCommandData = CreateDialogueInput;
export type CreateDialogueCommandReturnType = DialogueSummary;

export class CreateDialogueCommand extends Command<CreateDialogueCommandReturnType> {
  constructor(readonly data: CreateDialogueCommandData) {
    super();
  }
}
