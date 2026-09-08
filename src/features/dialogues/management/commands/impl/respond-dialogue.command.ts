import { Command } from '@nestjs/cqrs';

import type {
  DialogueInteraction,
  RespondDialogueInput,
} from '../../contracts/dialogue.contracts.js';

export type RespondDialogueCommandData = RespondDialogueInput;
export type RespondDialogueCommandReturnType = DialogueInteraction;

export class RespondDialogueCommand extends Command<RespondDialogueCommandReturnType> {
  constructor(readonly data: RespondDialogueCommandData) {
    super();
  }
}
