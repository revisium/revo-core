import { randomUUID } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import {
  dialogueSummaryView,
  json,
} from '../../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  CreateDialogueCommand,
  type CreateDialogueCommandData,
  type CreateDialogueCommandReturnType,
} from '../impl/create-dialogue.command.js';

@CommandHandler(CreateDialogueCommand)
export class CreateDialogueHandler implements ICommandHandler<
  CreateDialogueCommand,
  CreateDialogueCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({ data }: CreateDialogueCommand): Promise<CreateDialogueCommandReturnType> {
    this.requireText(data.title, 'title');
    this.requireText(data.agentId, 'agentId');
    this.requireText(data.agentVersion, 'agentVersion');
    this.validateConfiguration(data.agentConfiguration);

    return this.transactions.runReadCommitted(() => this.createDialogue(data));
  }

  private async createDialogue(
    data: CreateDialogueCommandData,
  ): Promise<CreateDialogueCommandReturnType> {
    await this.changes.lockWriter();
    const dialogue = await this.insertDialogue(data);
    await this.changes.append(dialogue.id, { kind: 'SUMMARY_UPDATED' });

    return dialogueSummaryView(dialogue);
  }

  private insertDialogue(data: CreateDialogueCommandData) {
    return this.transaction.dialogue.create({
      data: {
        id: randomUUID(),
        title: data.title,
        agentId: data.agentId,
        agentVersion: data.agentVersion,
        agentConfiguration: json(data.agentConfiguration ?? { selections: {} }),
        systemContext: data.systemContext ?? '',
        metadata: json(data.metadata ?? {}),
        version: 1n,
      },
    });
  }

  private requireText(value: string, field: string): void {
    if (value.trim().length === 0) {
      throw new BadRequestException(`Invalid ${field}.`);
    }
  }

  private validateConfiguration(value: unknown): void {
    if (value === undefined) {
      return;
    }

    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new BadRequestException('Invalid agentConfiguration.');
    }
    const keys = Object.keys(value);

    if (keys.some((key) => key !== 'catalogRevision' && key !== 'selections')) {
      throw new BadRequestException('Invalid agentConfiguration.');
    }

    if (
      'catalogRevision' in value &&
      value.catalogRevision !== undefined &&
      typeof value.catalogRevision !== 'string'
    ) {
      throw new BadRequestException('Invalid agentConfiguration.');
    }

    if (
      !('selections' in value) ||
      typeof value.selections !== 'object' ||
      value.selections === null ||
      Array.isArray(value.selections)
    ) {
      throw new BadRequestException('Invalid agentConfiguration.');
    }

    if (
      Object.values(value.selections).some(
        (selection) => typeof selection !== 'boolean' && typeof selection !== 'string',
      )
    ) {
      throw new BadRequestException('Invalid agentConfiguration.');
    }
  }
}
