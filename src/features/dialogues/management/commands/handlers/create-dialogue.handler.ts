import { randomUUID } from 'node:crypto';

import { BadRequestException } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  decodeAgentConfigurationSelection,
  type AgentConfigurationSelection,
} from '@revisium/revo-agent-runtime';

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
    let agentConfiguration: AgentConfigurationSelection;
    try {
      agentConfiguration = decodeAgentConfigurationSelection(
        data.agentConfiguration ?? { selections: {} },
      );
    } catch {
      throw new BadRequestException('Invalid agentConfiguration.');
    }

    return this.transactions.runReadCommitted(() => this.createDialogue(data, agentConfiguration));
  }

  private async createDialogue(
    data: CreateDialogueCommandData,
    agentConfiguration: AgentConfigurationSelection,
  ): Promise<CreateDialogueCommandReturnType> {
    await this.changes.lockWriter();
    const dialogue = await this.insertDialogue(data, agentConfiguration);
    await this.changes.append(dialogue.id, { kind: 'SUMMARY_UPDATED' });

    return dialogueSummaryView(dialogue);
  }

  private insertDialogue(
    data: CreateDialogueCommandData,
    agentConfiguration: AgentConfigurationSelection,
  ) {
    return this.transaction.dialogue.create({
      data: {
        id: randomUUID(),
        title: data.title,
        agentId: data.agentId,
        agentVersion: data.agentVersion,
        agentConfiguration: json(agentConfiguration),
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
}
