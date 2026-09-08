import { createHash, randomUUID } from 'node:crypto';

import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';

import type {
  Dialogue,
  DialogueTurn as StoredDialogueTurn,
  Prisma,
} from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { dialogueTurnView } from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import type { DialogueTurn, SendDialogueInput } from '../../contracts/dialogue.contracts.js';
import { DialogueTurnSavedEvent } from '../../events/dialogue-turn-saved.event.js';
import {
  SendDialogueMessageCommand,
  type SendDialogueMessageCommandReturnType,
} from '../impl/send-dialogue-message.command.js';

interface MessageAdmission {
  readonly created: boolean;
  readonly turn: DialogueTurn;
}

@CommandHandler(SendDialogueMessageCommand)
export class SendDialogueMessageHandler implements ICommandHandler<
  SendDialogueMessageCommand,
  SendDialogueMessageCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly events: EventBus,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({
    data,
  }: SendDialogueMessageCommand): Promise<SendDialogueMessageCommandReturnType> {
    if (data.commandId.trim().length === 0 || data.prompt.trim().length === 0) {
      throw new BadRequestException('Command id and prompt must be nonempty.');
    }
    const admission = await this.transactions.runReadCommitted(async () => {
      await this.changes.lockWriter();

      return this.admitMessage(data);
    });

    if (admission.created) {
      this.events.publish(
        new DialogueTurnSavedEvent(data.dialogueId, admission.turn.id, data.prompt),
      );
    }

    return admission.turn;
  }

  private async admitMessage(input: SendDialogueInput): Promise<MessageAdmission> {
    const inputSha256 = createHash('sha256').update(input.prompt, 'utf8').digest('hex');
    const dialogue = await this.getDialogue(input.dialogueId);
    const existing = await this.findCommand(input.dialogueId, input.commandId);

    if (existing !== null) {
      this.ensureMatchingCommand(existing, inputSha256);

      return { created: false, turn: dialogueTurnView(existing) };
    }
    this.ensureReady(dialogue);

    const turnId = randomUUID();
    const userItemId = randomUUID();
    const itemSequence = dialogue.itemSequence + 1n;
    const turn = await this.createTurn(input, turnId, userItemId, inputSha256);
    await this.createUserMessage(input, turnId, userItemId, itemSequence);
    await this.markDialogueQueued(input.dialogueId, turnId, itemSequence);
    await this.publishAdmission(input.dialogueId, turnId, userItemId, itemSequence);

    return { created: true, turn: dialogueTurnView(turn) };
  }

  private async getDialogue(dialogueId: string): Promise<Dialogue> {
    const dialogue = await this.transaction.dialogue.findUnique({ where: { id: dialogueId } });

    if (dialogue === null) {
      throw new NotFoundException('Dialogue not found.');
    }

    return dialogue;
  }

  private findCommand(dialogueId: string, commandId: string) {
    return this.transaction.dialogueTurn.findUnique({
      where: { dialogueId_commandId: { dialogueId, commandId } },
    });
  }

  private ensureMatchingCommand(turn: StoredDialogueTurn, inputSha256: string): void {
    if (turn.inputSha256 !== inputSha256) {
      throw new ConflictException('Command id was reused with a different prompt.');
    }
  }

  private ensureReady(dialogue: Dialogue): void {
    if (dialogue.activeTurnId !== null || dialogue.status !== 'READY') {
      throw new ConflictException('Dialogue is not ready for another message.');
    }
  }

  private createTurn(
    input: SendDialogueInput,
    turnId: string,
    userItemId: string,
    inputSha256: string,
  ) {
    return this.transaction.dialogueTurn.create({
      data: {
        id: turnId,
        dialogueId: input.dialogueId,
        commandId: input.commandId,
        userItemId,
        inputSha256,
      },
    });
  }

  private createUserMessage(
    input: SendDialogueInput,
    turnId: string,
    userItemId: string,
    itemSequence: bigint,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: userItemId,
        dialogueId: input.dialogueId,
        sequence: itemSequence,
        turnId,
        sourceKey: `user:${turnId}`,
        kind: 'MESSAGE',
        source: 'USER',
        text: input.prompt,
        status: 'COMPLETED',
      },
    });
  }

  private markDialogueQueued(dialogueId: string, turnId: string, itemSequence: bigint) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence, activeTurnId: turnId, status: 'QUEUED', version: { increment: 1 } },
    });
  }

  private async publishAdmission(
    dialogueId: string,
    turnId: string,
    userItemId: string,
    itemSequence: bigint,
  ): Promise<void> {
    await this.changes.append(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId: userItemId,
      itemVersion: 0n,
      itemSequence,
      turnId,
      itemKind: 'MESSAGE',
      itemSource: 'USER',
    });
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }
}
