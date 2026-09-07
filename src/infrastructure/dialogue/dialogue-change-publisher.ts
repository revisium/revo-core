import { Injectable } from '@nestjs/common';

import type { Prisma } from '../../__generated__/client/client.js';
import { TransactionPrismaService } from '../database/transaction-prisma.service.js';

const DIALOGUE_WRITER_LOCK = 824_091_773;

export interface DialogueChangeData {
  readonly kind: 'SUMMARY_UPDATED' | 'HISTORY_ITEM_UPSERTED' | 'HISTORY_TEXT_APPENDED';
  readonly itemId?: string;
  readonly itemVersion?: bigint;
  readonly baseItemVersion?: bigint;
  readonly itemSequence?: bigint;
  readonly turnId?: string;
  readonly itemKind?:
    | 'MESSAGE'
    | 'OPERATION'
    | 'INTERACTION'
    | 'RESULT'
    | 'PLAN'
    | 'USAGE'
    | 'CHECKPOINT';
  readonly itemSource?: 'USER' | 'AGENT' | 'SYSTEM';
  readonly textDelta?: string;
}

@Injectable()
export class DialogueChangePublisher {
  constructor(private readonly transactions: TransactionPrismaService) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async lockWriter(): Promise<void> {
    await this.transaction.$executeRaw`SELECT pg_advisory_xact_lock(${DIALOGUE_WRITER_LOCK})`;
  }

  async append(dialogueId: string, data: DialogueChangeData): Promise<bigint> {
    const feed = await this.transaction.dialogueFeedPosition.update({
      where: { id: 1 },
      data: { sequence: { increment: 1 } },
    });
    await this.transaction.dialogueChange.create({
      data: { sequence: feed.sequence, dialogueId, ...data },
    });

    return feed.sequence;
  }
}
