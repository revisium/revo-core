import { Command } from '@nestjs/cqrs';

import type { DialogueSummary } from '../../contracts/dialogue.contracts.js';

export type MarkDialogueReadCommandData = { dialogueId: string; through: string };
export type MarkDialogueReadCommandReturnType = DialogueSummary;

export class MarkDialogueReadCommand extends Command<MarkDialogueReadCommandReturnType> {
  constructor(readonly data: MarkDialogueReadCommandData) {
    super();
  }
}
