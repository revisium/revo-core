/* oxlint-disable no-await-in-loop -- Changes must retain durable feed order. */

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { DialogueHistoryItem, Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueInteractionCleanup } from '../../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import { dialogueSummaryView } from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  ReopenDialogueCommand,
  type ReopenDialogueCommandReturnType,
} from '../impl/reopen-dialogue.command.js';

@CommandHandler(ReopenDialogueCommand)
export class ReopenDialogueHandler implements ICommandHandler<
  ReopenDialogueCommand,
  ReopenDialogueCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly interactions: DialogueInteractionCleanup,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ReopenDialogueCommand): Promise<ReopenDialogueCommandReturnType> {
    return this.transactions.runReadCommitted(() => this.reopenDialogue(data.dialogueId));
  }

  private async reopenDialogue(dialogueId: string): Promise<ReopenDialogueCommandReturnType> {
    await this.changes.lockWriter();
    const dialogue = await this.getDialogue(dialogueId);

    if (dialogue.status !== 'UNCERTAIN' && dialogue.status !== 'CLOSED') {
      throw new ConflictException('Only an uncertain or closed dialogue can be reopened.');
    }
    const updatedItems = await this.interruptUnfinishedItems(dialogueId);
    const abandonedItems = await this.interactions.abandon(dialogueId, { kind: 'all' });
    updatedItems.push(...abandonedItems);
    updatedItems.sort((left, right) =>
      left.sequence < right.sequence ? -1 : left.sequence > right.sequence ? 1 : 0,
    );
    const updated = await this.markReopened(dialogueId);

    for (const item of updatedItems) {
      await this.publishItem(dialogueId, item);
    }
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });

    return dialogueSummaryView(updated);
  }

  private markReopened(dialogueId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'READY',
        runtimeSessionId: null,
        activeTurnId: null,
        progress: '',
        pendingCount: 0,
        contextMode: 'CONTINUED',
        version: { increment: 1 },
      },
    });
  }

  private async getDialogue(dialogueId: string) {
    const dialogue = await this.transaction.dialogue.findUnique({ where: { id: dialogueId } });

    if (dialogue === null) {
      throw new NotFoundException('Dialogue not found.');
    }

    return dialogue;
  }

  private async interruptUnfinishedItems(dialogueId: string): Promise<DialogueHistoryItem[]> {
    const unfinishedItems = await this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        historical: false,
        kind: { not: 'INTERACTION' },
        status: { in: ['STREAMING', 'STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { sequence: 'asc' },
    });

    return Promise.all(
      unfinishedItems.map((item) =>
        this.transaction.dialogueHistoryItem.update({
          where: { id: item.id },
          data: {
            status: item.kind === 'MESSAGE' ? 'PARTIAL' : 'INTERRUPTED',
            version: { increment: 1 },
          },
        }),
      ),
    );
  }

  private async publishItem(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
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
}
