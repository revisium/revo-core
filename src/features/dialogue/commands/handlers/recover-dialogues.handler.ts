/* oxlint-disable no-await-in-loop -- Changes must retain durable feed order. */

import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueInteractionCleanup } from '../../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import { DialogueTurnFinalizer } from '../../application/dialogue-turn-finalizer.js';
import {
  RecoverDialoguesCommand,
  type RecoverDialoguesCommandReturnType,
} from '../impl/recover-dialogues.command.js';

@CommandHandler(RecoverDialoguesCommand)
export class RecoverDialoguesHandler implements ICommandHandler<
  RecoverDialoguesCommand,
  RecoverDialoguesCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly finalizer: DialogueTurnFinalizer,
    private readonly interactions: DialogueInteractionCleanup,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute(): Promise<void> {
    return this.transactions.runReadCommitted(() => this.recoverUnfinished());
  }

  private async recoverUnfinished(): Promise<void> {
    await this.changes.lockWriter();
    const dialogues = await this.findUnfinishedDialogues();

    for (const dialogue of dialogues) {
      if (await this.recoverActiveTurn(dialogue.id, dialogue.activeTurnId)) {
        continue;
      }
      await this.detachIdleRuntime(dialogue.id);
    }
  }

  private findUnfinishedDialogues() {
    return this.transaction.dialogue.findMany({
      where: { OR: [{ activeTurnId: { not: null } }, { runtimeSessionId: { not: null } }] },
      orderBy: { id: 'asc' },
    });
  }

  private async recoverActiveTurn(dialogueId: string, turnId: string | null): Promise<boolean> {
    if (turnId === null) {
      return false;
    }
    const turn = await this.transaction.dialogueTurn.findUnique({ where: { id: turnId } });

    if (turn === null || turn.dispatchState === 'FINISHED') {
      return false;
    }
    await this.finalizer.finishWithoutRuntime(dialogueId, turn.id, 'UNCERTAIN', {
      reason: 'Core restarted before runtime completion was durably observed.',
    });

    return true;
  }

  private async detachIdleRuntime(dialogueId: string): Promise<void> {
    const updatedItems = await this.interactions.abandon(dialogueId, { kind: 'all' });
    await this.detachRuntime(dialogueId, updatedItems.length > 0);

    for (const item of updatedItems) {
      await this.changes.append(dialogueId, {
        kind: 'HISTORY_ITEM_UPSERTED',
        itemId: item.id,
        itemVersion: item.version,
        itemSequence: item.sequence,
        ...(item.turnId === null ? {} : { turnId: item.turnId }),
        itemKind: item.kind,
        itemSource: item.source,
      });
    }
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private detachRuntime(dialogueId: string, abandonedInteractions: boolean) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        runtimeSessionId: null,
        contextMode: 'CONTINUED',
        ...(abandonedInteractions
          ? {
              status: 'UNCERTAIN',
              pendingCount: 0,
              significantSequence: { increment: 1 },
            }
          : {}),
        version: { increment: 1 },
      },
    });
  }
}
