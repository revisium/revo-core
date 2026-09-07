import { randomUUID } from 'node:crypto';

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type {
  Dialogue,
  DialogueHistoryItem,
  Prisma,
} from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import {
  dialogueSummaryView,
  json,
} from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import type { ForkDialogueInput } from '../../contracts/dialogue.contracts.js';
import {
  ForkDialogueCommand,
  type ForkDialogueCommandReturnType,
} from '../impl/fork-dialogue.command.js';

@CommandHandler(ForkDialogueCommand)
export class ForkDialogueHandler implements ICommandHandler<
  ForkDialogueCommand,
  ForkDialogueCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: ForkDialogueCommand): Promise<ForkDialogueCommandReturnType> {
    return this.transactions.runReadCommitted(() => this.forkDialogue(data));
  }

  private async forkDialogue(input: ForkDialogueInput): Promise<ForkDialogueCommandReturnType> {
    await this.changes.lockWriter();
    const origin = await this.getOrigin(input.dialogueId);
    const boundary = await this.getCompletedBoundary(input.dialogueId, input.turnId);
    const sourceItems = await this.getHistoryPrefix(input.dialogueId, boundary.endItemSequence);
    const id = randomUUID();
    const itemSequence = BigInt(sourceItems.length);
    await this.createFork(id, input.title, origin, boundary.id, boundary.endItemSequence);
    await this.copyHistory(id, origin.id, sourceItems);
    const created = await this.activateFork(id, itemSequence);
    await this.changes.append(id, { kind: 'SUMMARY_UPDATED' });

    return dialogueSummaryView(created);
  }

  private getHistoryPrefix(dialogueId: string, endItemSequence: bigint) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: { dialogueId, sequence: { lte: endItemSequence } },
      orderBy: { sequence: 'asc' },
    });
  }

  private createFork(
    id: string,
    title: string,
    origin: Dialogue,
    originTurnId: string,
    originItemSequence: bigint,
  ) {
    return this.transaction.dialogue.create({
      data: {
        id,
        title,
        agentId: origin.agentId,
        agentVersion: origin.agentVersion,
        agentConfiguration: json(origin.agentConfiguration),
        metadata: json(origin.metadata),
        systemContext: origin.systemContext,
        contextMode: 'FORK',
        originDialogueId: origin.id,
        originTurnId,
        originItemSequence,
      },
    });
  }

  private activateFork(id: string, itemSequence: bigint) {
    return this.transaction.dialogue.update({
      where: { id },
      data: { itemSequence, version: { increment: 1 } },
    });
  }

  private async getOrigin(dialogueId: string) {
    const origin = await this.transaction.dialogue.findUnique({ where: { id: dialogueId } });

    if (origin === null) {
      throw new NotFoundException('Dialogue not found.');
    }

    return origin;
  }

  private async getCompletedBoundary(dialogueId: string, turnId: string) {
    const boundary = await this.transaction.dialogueTurn.findFirst({
      where: { id: turnId, dialogueId, status: 'COMPLETED' },
    });

    if (boundary?.endItemSequence === null || boundary?.endItemSequence === undefined) {
      throw new ConflictException('Fork requires a completed turn boundary.');
    }

    return { ...boundary, endItemSequence: boundary.endItemSequence };
  }

  private async copyHistory(
    dialogueId: string,
    originDialogueId: string,
    sourceItems: readonly DialogueHistoryItem[],
  ): Promise<void> {
    if (sourceItems.length === 0) {
      return;
    }

    await this.transaction.dialogueHistoryItem.createMany({
      data: sourceItems.map((source, index) => ({
        id: randomUUID(),
        dialogueId,
        sequence: BigInt(index + 1),
        sourceKey: `fork:${originDialogueId}:${source.id}`,
        kind: source.kind,
        source: source.source,
        text: source.text,
        payload: json(source.payload),
        status: source.status,
        version: source.version,
        createdAt: source.createdAt,
        historical: true,
      })),
    });
  }
}
