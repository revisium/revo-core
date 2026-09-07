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
  dialogueInteractionView,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import type { DialoguePageInput } from '../../contracts/dialogue.contracts.js';
import {
  ListDialogueInteractionsQuery,
  type ListDialogueInteractionsQueryReturnType,
} from '../impl/list-dialogue-interactions.query.js';

@QueryHandler(ListDialogueInteractionsQuery)
export class ListDialogueInteractionsHandler implements IQueryHandler<
  ListDialogueInteractionsQuery,
  ListDialogueInteractionsQueryReturnType
> {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({
    data,
  }: ListDialogueInteractionsQuery): Promise<ListDialogueInteractionsQueryReturnType> {
    return this.transactions.runRepeatableRead(() => this.listInteractions(data.dialogueId, data));
  }

  private async listInteractions(
    dialogueId: string,
    input: DialoguePageInput,
  ): Promise<ListDialogueInteractionsQueryReturnType> {
    const feed = await this.currentFeedPosition();
    const dialogue = await this.getDialogue(dialogueId);
    const kind = `interactions:${dialogueId}`;
    const context = dialoguePageContext(input, kind, dialogue.itemSequence, feed);
    const after =
      input.after === undefined ? undefined : BigInt(decodeDialogueCursor(input.after, kind).value);
    const items = await this.findInteractionItems(
      dialogueId,
      context.upper,
      after,
      context.first + 1,
    );
    const keys = items.flatMap(({ sourceKey }) => (sourceKey === null ? [] : [sourceKey]));
    const interactions = await this.findInteractions(keys);
    const byId = new Map(interactions.map((interaction) => [interaction.id, interaction]));
    const nodes = items.map(({ sourceKey }) => {
      const interaction = sourceKey === null ? undefined : byId.get(sourceKey);

      if (interaction === undefined) {
        throw new Error('Dialogue interaction item has no matching interaction.');
      }

      return dialogueInteractionView(interaction);
    });
    const total = await this.countInteractionItems(dialogueId, context.upper);

    return dialoguePage(
      nodes,
      items.map(({ sequence }) => sequence),
      total,
      kind,
      context,
    );
  }

  private findInteractionItems(
    dialogueId: string,
    upper: bigint,
    after: bigint | undefined,
    take: number,
  ) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        kind: 'INTERACTION',
        historical: false,
        sourceKey: { not: null },
        sequence: { lte: upper, ...(after === undefined ? {} : { gt: after }) },
      },
      orderBy: { sequence: 'asc' },
      take,
    });
  }

  private findInteractions(ids: readonly string[]) {
    return this.transaction.dialogueInteraction.findMany({ where: { id: { in: [...ids] } } });
  }

  private countInteractionItems(dialogueId: string, upper: bigint): Promise<number> {
    return this.transaction.dialogueHistoryItem.count({
      where: { dialogueId, kind: 'INTERACTION', historical: false, sequence: { lte: upper } },
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
