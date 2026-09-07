import { Command } from '@nestjs/cqrs';

import type { DialogueSummary, ForkDialogueInput } from '../../contracts/dialogue.contracts.js';

export type ForkDialogueCommandData = ForkDialogueInput;
export type ForkDialogueCommandReturnType = DialogueSummary;

export class ForkDialogueCommand extends Command<ForkDialogueCommandReturnType> {
  constructor(readonly data: ForkDialogueCommandData) {
    super();
  }
}
