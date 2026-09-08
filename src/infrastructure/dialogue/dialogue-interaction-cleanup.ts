import { Injectable } from '@nestjs/common';

import type {
  DialogueHistoryItem as StoredDialogueHistoryItem,
  Prisma,
} from '../../__generated__/client/client.js';
import { TransactionPrismaService } from '../database/transaction-prisma.service.js';

export type DialogueInteractionCleanupScope =
  | { readonly kind: 'all' }
  | { readonly kind: 'turn'; readonly turnId: string };

@Injectable()
export class DialogueInteractionCleanup {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async abandon(
    dialogueId: string,
    scope: DialogueInteractionCleanupScope,
  ): Promise<readonly StoredDialogueHistoryItem[]> {
    const pendingItems = await this.findPendingItems(dialogueId, scope);
    await this.abandonInteractions(dialogueId, scope);

    return Promise.all(pendingItems.map(({ id }) => this.abandonHistoryItem(id)));
  }

  private findPendingItems(dialogueId: string, scope: DialogueInteractionCleanupScope) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        historical: false,
        kind: 'INTERACTION',
        status: { in: ['PENDING', 'RESPONDING'] },
        ...this.turnFilter(scope),
      },
      orderBy: { sequence: 'asc' },
    });
  }

  private abandonInteractions(dialogueId: string, scope: DialogueInteractionCleanupScope) {
    return this.transaction.dialogueInteraction.updateMany({
      where: {
        dialogueId,
        status: { in: ['PENDING', 'RESPONDING'] },
        ...this.turnFilter(scope),
      },
      data: { status: 'ABANDONED' },
    });
  }

  private abandonHistoryItem(id: string) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id },
      data: { status: 'ABANDONED', version: { increment: 1 } },
    });
  }

  private turnFilter(scope: DialogueInteractionCleanupScope): { readonly turnId?: string } {
    return scope.kind === 'all' ? {} : { turnId: scope.turnId };
  }
}
