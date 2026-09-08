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
  dialogueTurnView,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import type { DialoguePageInput } from '../../contracts/dialogue.contracts.js';
import {
  ListDialogueTurnsQuery,
  type ListDialogueTurnsQueryReturnType,
} from '../impl/list-dialogue-turns.query.js';

@QueryHandler(ListDialogueTurnsQuery)
export class ListDialogueTurnsHandler implements IQueryHandler<
  ListDialogueTurnsQuery,
  ListDialogueTurnsQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ListDialogueTurnsQuery): Promise<ListDialogueTurnsQueryReturnType> {
    return this.transactions.runRepeatableRead(() => this.listTurns(data.dialogueId, data));
  }

  private async listTurns(
    dialogueId: string,
    input: DialoguePageInput,
  ): Promise<ListDialogueTurnsQueryReturnType> {
    const feed = await this.currentFeedPosition();
    const dialogue = await this.getDialogue(dialogueId);
    const kind = `turns:${dialogueId}`;
    const context = dialoguePageContext(input, kind, dialogue.itemSequence, feed);
    const after =
      input.after === undefined ? undefined : BigInt(decodeDialogueCursor(input.after, kind).value);
    const items = await this.findTurnItems(dialogueId, context.upper, after, context.first + 1);
    const turnIds = items.flatMap(({ turnId }) => (turnId === null ? [] : [turnId]));
    const turns = await this.findTurns(turnIds);
    const byId = new Map(turns.map((turn) => [turn.id, turn]));
    const nodes = items.map(({ turnId }) => {
      const turn = turnId === null ? undefined : byId.get(turnId);

      if (turn === undefined) {
        throw new Error('Dialogue user item has no matching turn.');
      }

      return dialogueTurnView(turn);
    });
    const total = await this.countTurnItems(dialogueId, context.upper);

    return dialoguePage(
      nodes,
      items.map(({ sequence }) => sequence),
      total,
      kind,
      context,
    );
  }

  private findTurnItems(
    dialogueId: string,
    upper: bigint,
    after: bigint | undefined,
    take: number,
  ) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        source: 'USER',
        kind: 'MESSAGE',
        historical: false,
        sequence: { lte: upper, ...(after === undefined ? {} : { gt: after }) },
      },
      orderBy: { sequence: 'asc' },
      take,
    });
  }

  private findTurns(turnIds: readonly string[]) {
    return this.transaction.dialogueTurn.findMany({ where: { id: { in: [...turnIds] } } });
  }

  private countTurnItems(dialogueId: string, upper: bigint): Promise<number> {
    return this.transaction.dialogueHistoryItem.count({
      where: {
        dialogueId,
        source: 'USER',
        kind: 'MESSAGE',
        historical: false,
        sequence: { lte: upper },
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

  private async currentFeedPosition(): Promise<bigint> {
    const feed = await this.transaction.dialogueFeedPosition.findUniqueOrThrow({
      where: { id: 1 },
    });

    return feed.sequence;
  }
}
