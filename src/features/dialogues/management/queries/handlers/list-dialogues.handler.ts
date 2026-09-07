import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import {
  dialoguePage,
  dialoguePageContext,
} from '../../../../../infrastructure/dialogue/dialogue-page.js';
import {
  decodeDialogueCursor,
  dialogueSummaryView,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  ListDialoguesQuery,
  type ListDialoguesQueryReturnType,
} from '../impl/list-dialogues.query.js';

@QueryHandler(ListDialoguesQuery)
export class ListDialoguesHandler implements IQueryHandler<
  ListDialoguesQuery,
  ListDialoguesQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ListDialoguesQuery): Promise<ListDialoguesQueryReturnType> {
    return this.transactions.runRepeatableRead(() => this.listDialogues(data));
  }

  private async listDialogues(
    data: ListDialoguesQuery['data'],
  ): Promise<ListDialoguesQueryReturnType> {
    const [feed, upper] = await Promise.all([this.getFeedPosition(), this.getNewestOrdinal()]);
    const context = dialoguePageContext(data, 'dialogues', upper, feed);
    const after = this.after(data.after);
    const [rows, total] = await Promise.all([
      this.findDialogues(context.upper, after, context.first + 1),
      this.countDialogues(context.upper),
    ]);

    return dialoguePage(
      rows.map(dialogueSummaryView),
      rows.map(({ ordinal }) => ordinal),
      total,
      'dialogues',
      context,
    );
  }

  private async getFeedPosition(): Promise<bigint> {
    const feed = await this.transaction.dialogueFeedPosition.findUniqueOrThrow({
      where: { id: 1 },
    });

    return feed.sequence;
  }

  private async getNewestOrdinal(): Promise<bigint> {
    const newest = await this.transaction.dialogue.findFirst({ orderBy: { ordinal: 'desc' } });

    return newest?.ordinal ?? 0n;
  }

  private after(cursor: string | undefined): bigint | undefined {
    return cursor === undefined
      ? undefined
      : BigInt(decodeDialogueCursor(cursor, 'dialogues').value);
  }

  private findDialogues(upper: bigint, after: bigint | undefined, take: number) {
    return this.transaction.dialogue.findMany({
      where: { ordinal: { lte: upper, ...(after === undefined ? {} : { gt: after }) } },
      orderBy: { ordinal: 'asc' },
      take,
    });
  }

  private countDialogues(upper: bigint): Promise<number> {
    return this.transaction.dialogue.count({ where: { ordinal: { lte: upper } } });
  }
}
