import { isDeepStrictEqual } from 'node:util';

import { ConflictException, NotFoundException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type {
  DialogueInteraction as StoredDialogueInteraction,
  Prisma,
} from '../../../../__generated__/client/client.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import {
  dialogueInteractionView,
  dialogueJson,
  json,
} from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import { DialogueExecution } from '../../application/dialogue-execution.js';
import { validateDialogueResponse } from '../../application/dialogue-response.js';
import { DialogueTurnFinalizer } from '../../application/dialogue-turn-finalizer.js';
import type {
  DialogueInteraction,
  RespondDialogueInput,
} from '../../contracts/dialogue.contracts.js';
import {
  RespondDialogueCommand,
  type RespondDialogueCommandReturnType,
} from '../impl/respond-dialogue.command.js';

interface SavedResponse {
  readonly duplicate: boolean;
  readonly interaction: DialogueInteraction;
  readonly runtimeSessionId: string;
  readonly runtimeRequestId: string;
}

@CommandHandler(RespondDialogueCommand)
export class RespondDialogueHandler implements ICommandHandler<
  RespondDialogueCommand,
  RespondDialogueCommandReturnType
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly finalizer: DialogueTurnFinalizer,
    private readonly execution: DialogueExecution,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: RespondDialogueCommand): Promise<RespondDialogueCommandReturnType> {
    const current = await this.getInteraction(data.dialogueId, data.interactionId);
    const response = validateDialogueResponse(
      dialogueJson(current.request),
      data.response,
      data.interactionId,
    );
    const saved = await this.transactions.runReadCommitted(() => this.saveResponse(data));

    if (!saved.duplicate) {
      try {
        await this.execution.respond(saved.runtimeSessionId, saved.runtimeRequestId, response);
      } catch (error) {
        await this.transactions.runReadCommitted(() =>
          this.responseDeliveryFailed(data.dialogueId, data.interactionId, error),
        );
        throw error;
      }
    }

    return saved.interaction;
  }

  private async saveResponse(input: RespondDialogueInput): Promise<SavedResponse> {
    await this.changes.lockWriter();
    const interaction = await this.getStoredInteraction(input.dialogueId, input.interactionId);

    if (interaction.responseCommandId !== null) {
      this.ensureDuplicateResponse(interaction.responseCommandId, interaction.response, input);

      return {
        duplicate: true,
        interaction: dialogueInteractionView(interaction),
        runtimeSessionId: interaction.runtimeSessionId,
        runtimeRequestId: interaction.runtimeRequestId,
      };
    }

    if (interaction.status !== 'PENDING') {
      throw new ConflictException('Dialogue interaction is not pending.');
    }

    const updated = await this.markResponseDelivering(interaction.id, input);
    const item = await this.updateInteractionHistory(input.dialogueId, interaction, input);
    await this.publishInteraction(input.dialogueId, item);

    return {
      duplicate: false,
      interaction: dialogueInteractionView(updated),
      runtimeSessionId: interaction.runtimeSessionId,
      runtimeRequestId: interaction.runtimeRequestId,
    };
  }

  private markResponseDelivering(interactionId: string, input: RespondDialogueInput) {
    return this.transaction.dialogueInteraction.update({
      where: { id: interactionId },
      data: {
        status: 'RESPONDING',
        response: json(input.response),
        responseCommandId: input.commandId,
      },
    });
  }

  private updateInteractionHistory(
    dialogueId: string,
    interaction: StoredDialogueInteraction,
    input: RespondDialogueInput,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { dialogueId_sourceKey: { dialogueId, sourceKey: interaction.id } },
      data: {
        status: 'RESPONDING',
        payload: json({ request: interaction.request, response: input.response }),
        version: { increment: 1 },
      },
    });
  }

  private async responseDeliveryFailed(
    dialogueId: string,
    interactionId: string,
    error: unknown,
  ): Promise<void> {
    await this.changes.lockWriter();
    const interaction = await this.findStoredInteraction(dialogueId, interactionId);

    if (interaction === null || interaction.status !== 'RESPONDING') {
      return;
    }
    const dialogue = await this.getRuntimeBinding(dialogueId);

    if (dialogue?.runtimeSessionId !== interaction.runtimeSessionId) {
      return;
    }
    const affectedTurnId = interaction.turnId ?? dialogue.activeTurnId;

    if (affectedTurnId !== null) {
      await this.finalizer.finishWithoutRuntime(dialogueId, affectedTurnId, 'UNCERTAIN', {
        reason: 'Interaction response delivery could not be confirmed.',
        message: error instanceof Error ? error.message : String(error),
      });

      return;
    }
    await this.abandonInteraction(interaction.id);
    const item = await this.abandonInteractionHistory(dialogueId, interaction.id);
    await this.publishInteraction(dialogueId, item);
    await this.markResponseUncertain(dialogueId);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private findStoredInteraction(dialogueId: string, interactionId: string) {
    return this.transaction.dialogueInteraction.findFirst({
      where: { id: interactionId, dialogueId },
    });
  }

  private getRuntimeBinding(dialogueId: string) {
    return this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });
  }

  private abandonInteraction(interactionId: string) {
    return this.transaction.dialogueInteraction.update({
      where: { id: interactionId },
      data: { status: 'ABANDONED' },
    });
  }

  private abandonInteractionHistory(dialogueId: string, interactionId: string) {
    return this.transaction.dialogueHistoryItem.update({
      where: { dialogueId_sourceKey: { dialogueId, sourceKey: interactionId } },
      data: { status: 'ABANDONED', version: { increment: 1 } },
    });
  }

  private markResponseUncertain(dialogueId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'UNCERTAIN',
        pendingCount: 0,
        runtimeSessionId: null,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async getInteraction(dialogueId: string, interactionId: string) {
    const interaction = await this.prisma.dialogueInteraction.findFirst({
      where: { id: interactionId, dialogueId },
    });

    if (interaction === null) {
      throw new NotFoundException('Dialogue interaction not found.');
    }

    return interaction;
  }

  private async getStoredInteraction(dialogueId: string, interactionId: string) {
    const interaction = await this.findStoredInteraction(dialogueId, interactionId);

    if (interaction === null) {
      throw new NotFoundException('Dialogue interaction not found.');
    }

    return interaction;
  }

  private ensureDuplicateResponse(
    commandId: string,
    response: Prisma.JsonValue | null,
    input: RespondDialogueInput,
  ): void {
    if (commandId !== input.commandId || !isDeepStrictEqual(response, json(input.response))) {
      throw new ConflictException('Interaction response command was reused with different data.');
    }
  }

  private async publishInteraction(
    dialogueId: string,
    item: {
      readonly id: string;
      readonly version: bigint;
      readonly sequence: bigint;
      readonly turnId: string | null;
    },
  ): Promise<void> {
    await this.changes.append(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId: item.id,
      itemVersion: item.version,
      itemSequence: item.sequence,
      ...(item.turnId === null ? {} : { turnId: item.turnId }),
      itemKind: 'INTERACTION',
      itemSource: 'AGENT',
    });
  }
}
