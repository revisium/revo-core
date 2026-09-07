import { Command } from '@nestjs/cqrs';

import type { DialogueTurn, SendDialogueInput } from '../../contracts/dialogue.contracts.js';

export type SendDialogueMessageCommandData = SendDialogueInput;
export type SendDialogueMessageCommandReturnType = DialogueTurn;

export class SendDialogueMessageCommand extends Command<SendDialogueMessageCommandReturnType> {
  constructor(readonly data: SendDialogueMessageCommandData) {
    super();
  }
}
