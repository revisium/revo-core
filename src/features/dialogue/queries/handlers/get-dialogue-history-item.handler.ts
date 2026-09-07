import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { dialogueHistoryItemView } from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  GetDialogueHistoryItemQuery,
  type GetDialogueHistoryItemQueryReturnType,
} from '../impl/get-dialogue-history-item.query.js';

@QueryHandler(GetDialogueHistoryItemQuery)
export class GetDialogueHistoryItemHandler implements IQueryHandler<
  GetDialogueHistoryItemQuery,
  GetDialogueHistoryItemQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({
    data,
  }: GetDialogueHistoryItemQuery): Promise<GetDialogueHistoryItemQueryReturnType> {
    const item = await this.getHistoryItem(data.dialogueId, data.itemId);

    return dialogueHistoryItemView(item);
  }

  private async getHistoryItem(dialogueId: string, itemId: string) {
    const item = await this.prisma.dialogueHistoryItem.findFirst({
      where: { id: itemId, dialogueId },
    });

    if (item === null) {
      throw new NotFoundException('Dialogue history item not found.');
    }

    return item;
  }
}
