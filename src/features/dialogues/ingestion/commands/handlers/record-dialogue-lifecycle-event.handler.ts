import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type { AgentSessionEventAppendResult } from '@revisium/revo-agent-runtime';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  RecordDialogueLifecycleEventCommand,
  type RecordDialogueLifecycleEventCommandReturnType,
} from '../impl/record-dialogue-lifecycle-event.command.js';

@Injectable()
@CommandHandler(RecordDialogueLifecycleEventCommand)
export class RecordDialogueLifecycleEventHandler implements ICommandHandler<
  RecordDialogueLifecycleEventCommand,
  RecordDialogueLifecycleEventCommandReturnType
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
  }: RecordDialogueLifecycleEventCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (
        event.type === 'session.opened' &&
        receipt.dialogueId !== null &&
        (await this.isActiveSession(receipt.dialogueId, event.sessionId))
      ) {
        await this.changes.append(receipt.dialogueId, { kind: 'SUMMARY_UPDATED' });
      }

      return { state: 'appended' };
    });
  }

  private async isActiveSession(dialogueId: string, sessionId: string): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === sessionId;
  }
}
