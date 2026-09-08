import { Command } from '@nestjs/cqrs';

import type {
  InterruptDialogueTurnInput,
  InterruptDialogueTurnResult,
} from '../../contracts/dialogue-interruption.contracts.js';

export type InterruptDialogueTurnCommandReturnType = InterruptDialogueTurnResult;

export class InterruptDialogueTurnCommand extends Command<InterruptDialogueTurnCommandReturnType> {
  constructor(readonly data: InterruptDialogueTurnInput) {
    super();
  }
}
