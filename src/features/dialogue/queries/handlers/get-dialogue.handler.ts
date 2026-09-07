import { NotFoundException } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';

import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { dialogueSummaryView } from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import { GetDialogueQuery, type GetDialogueQueryReturnType } from '../impl/get-dialogue.query.js';

@QueryHandler(GetDialogueQuery)
export class GetDialogueHandler implements IQueryHandler<
  GetDialogueQuery,
  GetDialogueQueryReturnType
> {
  constructor(private readonly prisma: PrismaService) {}

  async execute({ data }: GetDialogueQuery): Promise<GetDialogueQueryReturnType> {
    const dialogue = await this.getDialogue(data.dialogueId);

    return dialogueSummaryView(dialogue);
  }

  private async getDialogue(dialogueId: string) {
    const dialogue = await this.prisma.dialogue.findUnique({ where: { id: dialogueId } });

    if (dialogue === null) {
      throw new NotFoundException('Dialogue not found.');
    }

    return dialogue;
  }
}
