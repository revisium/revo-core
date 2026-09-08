/* oxlint-disable no-await-in-loop -- Changes must retain durable feed order. */

import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type {
  Dialogue,
  DialogueHistoryItem,
  DialogueInteraction,
  DialogueTurn,
  Prisma,
} from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueInteractionCleanup } from '../../../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import {
  compareHistoryItemSequence,
  json,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import type {
  DialogueInterruptionReason,
  InterruptDialogueTurnInput,
  InterruptDialogueTurnResult,
} from '../../contracts/dialogue-interruption.contracts.js';
import {
  InterruptDialogueTurnCommand,
  type InterruptDialogueTurnCommandReturnType,
} from '../impl/interrupt-dialogue-turn.command.js';

type InterruptionOutcome = 'CANCELLED' | 'FAILED' | 'UNCERTAIN';

interface InterruptionTarget {
  readonly outcome: InterruptionOutcome;
  readonly payload: Record<string, string>;
}

@CommandHandler(InterruptDialogueTurnCommand)
export class InterruptDialogueTurnHandler implements ICommandHandler<
  InterruptDialogueTurnCommand,
  InterruptDialogueTurnCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly interactions: DialogueInteractionCleanup,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  execute({ data }: InterruptDialogueTurnCommand): Promise<InterruptDialogueTurnResult> {
    return this.transactions.runReadCommitted(() => this.interrupt(data));
  }

  private async interrupt(input: InterruptDialogueTurnInput): Promise<InterruptDialogueTurnResult> {
    await this.changes.lockWriter();
    const target = await this.findTarget(input);

    if (target === null) {
      return { state: 'ignored' };
    }

    await this.finish(target, input.dialogueId, input.turnId);

    return { state: 'interrupted', outcome: target.outcome };
  }

  private async findTarget(input: InterruptDialogueTurnInput): Promise<InterruptionTarget | null> {
    const [dialogue, turn] = await Promise.all([
      this.findDialogue(input.dialogueId),
      this.findTurn(input.dialogueId, input.turnId),
    ]);

    if (dialogue === null || turn === null) {
      return null;
    }

    if (
      dialogue.activeTurnId !== turn.id ||
      turn.dispatchState === 'FINISHED' ||
      turn.dispatchState === 'UNCERTAIN'
    ) {
      return null;
    }

    if (!(await this.matchesReason(input.reason, dialogue, turn))) {
      return null;
    }

    return {
      outcome: this.outcome(input.reason, turn),
      payload: this.payload(input.reason),
    };
  }

  private findDialogue(dialogueId: string) {
    return this.transaction.dialogue.findUnique({ where: { id: dialogueId } });
  }

  private findTurn(dialogueId: string, turnId: string) {
    return this.transaction.dialogueTurn.findFirst({ where: { id: turnId, dialogueId } });
  }

  private async matchesReason(
    reason: DialogueInterruptionReason,
    dialogue: Dialogue,
    turn: DialogueTurn,
  ): Promise<boolean> {
    if (reason.kind === 'PRE_ADMISSION_CANCEL') {
      return turn.cancelRequested && turn.dispatchState !== 'ADMITTED';
    }

    if (reason.kind !== 'RESPONSE_DELIVERY_UNCONFIRMED') {
      return true;
    }

    const interaction = await this.findRespondingInteraction(dialogue.id, reason.interactionId);

    return (
      interaction !== null &&
      dialogue.runtimeSessionId === interaction.runtimeSessionId &&
      (interaction.turnId === null || interaction.turnId === turn.id)
    );
  }

  private findRespondingInteraction(
    dialogueId: string,
    interactionId: string,
  ): Promise<DialogueInteraction | null> {
    return this.transaction.dialogueInteraction.findFirst({
      where: { id: interactionId, dialogueId, status: 'RESPONDING' },
    });
  }

  private outcome(reason: DialogueInterruptionReason, turn: DialogueTurn): InterruptionOutcome {
    if (reason.kind === 'PRE_ADMISSION_CANCEL') {
      return 'CANCELLED';
    }

    if (reason.kind === 'DISPATCH_FAILURE' && turn.dispatchState !== 'ADMITTED') {
      return 'FAILED';
    }

    return 'UNCERTAIN';
  }

  private payload(reason: DialogueInterruptionReason): Record<string, string> {
    switch (reason.kind) {
      case 'PRE_ADMISSION_CANCEL':
        return { reason: 'Cancelled before runtime admission.' };
      case 'DISPATCH_FAILURE':
        return { message: reason.message };
      case 'RESPONSE_DELIVERY_UNCONFIRMED':
        return {
          reason: 'Interaction response delivery could not be confirmed.',
          message: reason.message,
        };
      case 'CORE_RESTART':
        return { reason: 'Core restarted before runtime completion was durably observed.' };
      default:
        throw new Error('Unsupported dialogue interruption reason.');
    }
  }

  private async finish(
    target: InterruptionTarget,
    dialogueId: string,
    turnId: string,
  ): Promise<void> {
    const resultSequence = await this.reserveResultSequence(dialogueId);
    await this.markAssistantPartial(dialogueId, turnId);
    const interruptedItems = await this.interruptTurnItems(dialogueId, turnId);
    const result = await this.createResult(
      dialogueId,
      turnId,
      resultSequence,
      target.outcome,
      target.payload,
    );
    await this.finishTurn(turnId, target.outcome, target.payload, result.sequence);
    const abandonedItems = await this.interactions.abandon(dialogueId, { kind: 'all' });
    interruptedItems.push(...abandonedItems);
    interruptedItems.sort(compareHistoryItemSequence);
    await this.finishDialogue(dialogueId, target.outcome);

    for (const item of interruptedItems) {
      await this.publishItem(dialogueId, item);
    }

    await this.publishItem(dialogueId, result);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private async reserveResultSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private createResult(
    dialogueId: string,
    turnId: string,
    sequence: bigint,
    outcome: InterruptionOutcome,
    payload: Record<string, string>,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${turnId}:result`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: `result:${turnId}`,
        kind: 'RESULT',
        source: 'SYSTEM',
        status: outcome === 'UNCERTAIN' ? 'INTERRUPTED' : outcome,
        payload: json(payload),
      },
    });
  }

  private finishTurn(
    turnId: string,
    outcome: InterruptionOutcome,
    payload: Record<string, string>,
    endItemSequence: bigint,
  ) {
    return this.transaction.dialogueTurn.update({
      where: { id: turnId },
      data: {
        status: outcome,
        dispatchState: outcome === 'UNCERTAIN' ? 'UNCERTAIN' : 'FINISHED',
        completedAt: new Date(),
        endItemSequence,
        outcome: json(payload),
      },
    });
  }

  private finishDialogue(dialogueId: string, outcome: InterruptionOutcome) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: outcome === 'UNCERTAIN' ? 'UNCERTAIN' : 'READY',
        activeTurnId: null,
        runtimeSessionId: null,
        pendingCount: 0,
        progress: '',
        lastOutcome: outcome,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async markAssistantPartial(dialogueId: string, turnId: string): Promise<void> {
    const assistant = await this.transaction.dialogueHistoryItem.findUnique({
      where: { id: `${dialogueId}:${turnId}:assistant` },
    });

    if (assistant?.status !== 'STREAMING') {
      return;
    }

    const partial = await this.transaction.dialogueHistoryItem.update({
      where: { id: assistant.id },
      data: { status: 'PARTIAL', version: { increment: 1 } },
    });
    await this.publishItem(dialogueId, partial);
  }

  private async interruptTurnItems(
    dialogueId: string,
    turnId: string,
  ): Promise<DialogueHistoryItem[]> {
    const unfinished = await this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        historical: false,
        turnId,
        kind: { notIn: ['MESSAGE', 'INTERACTION'] },
        status: { in: ['STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { sequence: 'asc' },
    });

    return Promise.all(
      unfinished.map((item) =>
        this.transaction.dialogueHistoryItem.update({
          where: { id: item.id },
          data: { status: 'INTERRUPTED', version: { increment: 1 } },
        }),
      ),
    );
  }

  private async publishItem(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
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
