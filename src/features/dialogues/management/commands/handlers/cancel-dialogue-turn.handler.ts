import { NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { dialogueTurnView } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import { DialogueDispatchState, type DialogueTurn } from '../../contracts/dialogue.contracts.js';
import { DialogueExecution } from '../../runtime/dialogue-execution.js';
import {
  CancelDialogueTurnCommand,
  type CancelDialogueTurnCommandReturnType,
} from '../impl/cancel-dialogue-turn.command.js';

interface CancellationIntent {
  readonly runtimeSessionId: string | null;
  readonly turn: DialogueTurn;
}

@CommandHandler(CancelDialogueTurnCommand)
export class CancelDialogueTurnHandler implements ICommandHandler<
  CancelDialogueTurnCommand,
  CancelDialogueTurnCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly execution: DialogueExecution,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: CancelDialogueTurnCommand): Promise<CancelDialogueTurnCommandReturnType> {
    const intent = await this.transactions.runReadCommitted(async () => {
      await this.changes.lockWriter();

      return this.saveCancellation(data.dialogueId, data.turnId);
    });

    if (
      intent.turn.dispatchState !== DialogueDispatchState.FINISHED &&
      intent.runtimeSessionId !== null
    ) {
      await this.execution.cancel(intent.runtimeSessionId, data.turnId);
    }

    return intent.turn;
  }

  private async saveCancellation(dialogueId: string, turnId: string): Promise<CancellationIntent> {
    const turn = await this.getTurn(dialogueId, turnId);
    const runtimeSessionId = await this.getRuntimeSessionId(dialogueId);

    if (turn.cancelRequested || turn.dispatchState === 'FINISHED') {
      return { runtimeSessionId, turn: dialogueTurnView(turn) };
    }

    const updated = await this.requestCancellation(turnId);

    return { runtimeSessionId, turn: dialogueTurnView(updated) };
  }

  private async getTurn(dialogueId: string, turnId: string) {
    const turn = await this.transaction.dialogueTurn.findFirst({
      where: { id: turnId, dialogueId },
    });

    if (turn === null) {
      throw new NotFoundException('Dialogue turn not found.');
    }

    return turn;
  }

  private async getRuntimeSessionId(dialogueId: string): Promise<string | null> {
    const dialogue = await this.transaction.dialogue.findUniqueOrThrow({
      where: { id: dialogueId },
      select: { runtimeSessionId: true },
    });

    return dialogue.runtimeSessionId;
  }

  private requestCancellation(turnId: string) {
    return this.transaction.dialogueTurn.update({
      where: { id: turnId },
      data: { cancelRequested: true },
    });
  }
}
