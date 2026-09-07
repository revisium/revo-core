import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type {
  AgentSessionEvent,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

import type { DialogueHistoryItem, Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { json } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import { AgentSessionEventReceiptWriter } from '../../persistence/agent-session-event-receipt.js';
import {
  RecordDialogueActivityCommand,
  type RecordDialogueActivityCommandReturnType,
} from '../impl/record-dialogue-activity.command.js';

type ActivityEvent = RecordDialogueActivityCommand['data']['event'];
type ToolActivityEvent = Extract<AgentSessionEvent, { readonly type: 'tool.activity' }>;

interface ActivityProjection {
  readonly sourceKey: string;
  readonly kind: 'OPERATION' | 'PLAN' | 'USAGE';
  readonly text: string;
  readonly status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
}

@Injectable()
@CommandHandler(RecordDialogueActivityCommand)
export class RecordDialogueActivityHandler implements ICommandHandler<
  RecordDialogueActivityCommand,
  RecordDialogueActivityCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly receipts: AgentSessionEventReceiptWriter,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({
    data: { event, expected, signal },
  }: RecordDialogueActivityCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(async () => {
      const receipt = await this.receipts.append(event, expected, signal);

      if (receipt.state !== 'stored') {
        return receipt.result;
      }

      if (receipt.dialogueId !== null && (await this.isActiveTurn(receipt.dialogueId, event))) {
        await this.recordActivity(receipt.dialogueId, event);
      }

      return { state: 'appended' };
    });
  }

  private async isActiveTurn(dialogueId: string, event: ActivityEvent): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });

    return dialogue?.runtimeSessionId === event.sessionId && dialogue.activeTurnId === event.turnId;
  }

  private async recordActivity(dialogueId: string, event: ActivityEvent): Promise<void> {
    const projection = this.projection(event);
    const existing = await this.findActivity(dialogueId, projection.sourceKey);
    const item =
      existing === null
        ? await this.createActivity(dialogueId, event, projection)
        : await this.updateActivity(existing.id, event, projection);
    await this.publishActivity(dialogueId, item);
  }

  private projection(event: ActivityEvent): ActivityProjection {
    switch (event.type) {
      case 'tool.activity':
        return {
          sourceKey: `tool:${event.turnId}:${event.toolCallId}`,
          kind: 'OPERATION',
          text: event.title,
          status: this.toolStatus(event.status),
        };
      case 'plan.updated':
        return {
          sourceKey: `plan:${event.turnId}`,
          kind: 'PLAN',
          text: '',
          status: 'IN_PROGRESS',
        };
      case 'usage.updated':
        return {
          sourceKey: `usage:${event.turnId}`,
          kind: 'USAGE',
          text: '',
          status: 'COMPLETED',
        };
    }

    throw new Error('Unsupported dialogue activity event.');
  }

  private toolStatus(
    status: ToolActivityEvent['status'],
  ): 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' {
    switch (status) {
      case 'started':
        return 'STARTED';
      case 'in_progress':
        return 'IN_PROGRESS';
      case 'completed':
        return 'COMPLETED';
      case 'failed':
        return 'FAILED';
    }

    throw new Error('Unsupported tool status.');
  }

  private findActivity(dialogueId: string, sourceKey: string) {
    return this.transaction.dialogueHistoryItem.findFirst({ where: { dialogueId, sourceKey } });
  }

  private async createActivity(
    dialogueId: string,
    event: ActivityEvent,
    projection: ActivityProjection,
  ): Promise<DialogueHistoryItem> {
    const sequence = await this.reserveItemSequence(dialogueId);

    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${projection.sourceKey}`,
        dialogueId,
        sequence,
        turnId: event.turnId,
        sourceKey: projection.sourceKey,
        kind: projection.kind,
        source: 'AGENT',
        text: projection.text,
        status: projection.status,
        payload: json(event),
      },
    });
  }

  private async reserveItemSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private updateActivity(itemId: string, event: ActivityEvent, projection: ActivityProjection) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: {
        text: projection.text,
        status: projection.status,
        payload: json(event),
        version: { increment: 1 },
      },
    });
  }

  private async publishActivity(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
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
