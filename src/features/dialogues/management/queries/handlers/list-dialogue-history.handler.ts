import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import {
  dialoguePage,
  dialoguePageContext,
} from '../../../../../infrastructure/dialogue/dialogue-page.js';
import {
  decodeDialogueCursor,
  dialogueHistoryItemView,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import type { DialoguePageInput } from '../../contracts/dialogue.contracts.js';
import {
  ListDialogueHistoryQuery,
  type ListDialogueHistoryQueryReturnType,
} from '../impl/list-dialogue-history.query.js';

@QueryHandler(ListDialogueHistoryQuery)
export class ListDialogueHistoryHandler implements IQueryHandler<
  ListDialogueHistoryQuery,
  ListDialogueHistoryQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ListDialogueHistoryQuery): Promise<ListDialogueHistoryQueryReturnType> {
    return this.transactions.runRepeatableRead(() => this.listHistory(data.dialogueId, data));
  }

  private async listHistory(
    dialogueId: string,
    input: DialoguePageInput,
  ): Promise<ListDialogueHistoryQueryReturnType> {
    const [feed, dialogue] = await Promise.all([
      this.currentFeedPosition(),
      this.getDialogue(dialogueId),
    ]);
    const kind = `history:${dialogueId}`;
    const context = dialoguePageContext(
      input,
      kind,
      dialogue.itemSequence,
      feed,
      dialogue.significantSequence,
    );
    const after = this.after(input.after, kind);
    const [rows, total] = await Promise.all([
      this.findHistory(dialogueId, context.upper, after, context.first + 1),
      this.countHistory(dialogueId, context.upper),
    ]);

    return {
      ...dialoguePage(
        rows.map(dialogueHistoryItemView),
        rows.map(({ sequence }) => sequence),
        total,
        kind,
        context,
      ),
      observedSignificantSequence: String(context.observed),
    };
  }

  private async getDialogue(dialogueId: string) {
    const dialogue = await this.transaction.dialogue.findUnique({ where: { id: dialogueId } });

    if (dialogue === null) {
      throw new NotFoundException('Dialogue not found.');
    }

    return dialogue;
  }

  private after(cursor: string | undefined, kind: string): bigint | undefined {
    return cursor === undefined ? undefined : BigInt(decodeDialogueCursor(cursor, kind).value);
  }

  private findHistory(dialogueId: string, upper: bigint, after: bigint | undefined, take: number) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        sequence: { lte: upper, ...(after === undefined ? {} : { gt: after }) },
      },
      orderBy: { sequence: 'asc' },
      take,
    });
  }

  private countHistory(dialogueId: string, upper: bigint): Promise<number> {
    return this.transaction.dialogueHistoryItem.count({
      where: { dialogueId, sequence: { lte: upper } },
    });
  }

  private async currentFeedPosition(): Promise<bigint> {
    const feed = await this.transaction.dialogueFeedPosition.findUniqueOrThrow({
      where: { id: 1 },
    });

    return feed.sequence;
  }
}
