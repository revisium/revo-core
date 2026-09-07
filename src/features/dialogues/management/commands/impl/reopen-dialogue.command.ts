import { Command } from '@nestjs/cqrs';

import type { DialogueSummary } from '../../contracts/dialogue.contracts.js';

export type ReopenDialogueCommandData = { dialogueId: string };
export type ReopenDialogueCommandReturnType = DialogueSummary;

export class ReopenDialogueCommand extends Command<ReopenDialogueCommandReturnType> {
  constructor(readonly data: ReopenDialogueCommandData) {
    super();
  }
}
