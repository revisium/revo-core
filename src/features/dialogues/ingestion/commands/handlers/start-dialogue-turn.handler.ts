import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  StartDialogueTurnCommand,
  type StartDialogueTurnCommandReturnType,
} from '../impl/start-dialogue-turn.command.js';

@Injectable()
@CommandHandler(StartDialogueTurnCommand)
export class StartDialogueTurnHandler implements ICommandHandler<
  StartDialogueTurnCommand,
  StartDialogueTurnCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly receipts: AgentSessionEventReceiptWriter,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({
    data: { event, expected, signal },
  }: StartDialogueTurnCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveTurn(receipt.dialogueId, event))) {
        await this.startTurn(receipt.dialogueId, event.turnId);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveTurn(
    dialogueId: string,
    event: StartDialogueTurnCommand['data']['event'],
  ): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId && dialogue.activeTurnId === event.turnId;
  }

  private async startTurn(dialogueId: string, turnId: string): Promise<void> {
    await this.markTurnAdmitted(dialogueId, turnId);
    await this.markDialogueRunning(dialogueId);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private markTurnAdmitted(dialogueId: string, turnId: string) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId },
      data: { status: 'RUNNING', dispatchState: 'ADMITTED' },
    });
  }

  private markDialogueRunning(dialogueId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { status: 'RUNNING', progress: 'Agent is working', version: { increment: 1 } },
    });
  }
}
