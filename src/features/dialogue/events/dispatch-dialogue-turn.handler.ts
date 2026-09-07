import { randomUUID } from 'node:crypto';

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';

import type { Prisma } from '../../../__generated__/client/client.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { dialogueJson } from '../../../infrastructure/dialogue/dialogue-persistence.js';
import { DialogueExecution } from '../application/dialogue-execution.js';
import { DialogueTurnFinalizer } from '../application/dialogue-turn-finalizer.js';
import { DialogueTurnSavedEvent } from './dialogue-turn-saved.event.js';

@Injectable()
@EventsHandler(DialogueTurnSavedEvent)
export class DispatchDialogueTurnHandler implements IEventHandler<DialogueTurnSavedEvent> {
  private readonly logger = new Logger(DispatchDialogueTurnHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly execution: DialogueExecution,
    private readonly finalizer: DialogueTurnFinalizer,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  handle(event: DialogueTurnSavedEvent): void {
    void this.dispatch(event).catch((error: unknown) => {
      void this.persistDispatchFailure(event.dialogueId, event.turnId, error);
    });
  }

  private async dispatch({ dialogueId, turnId, prompt }: DialogueTurnSavedEvent): Promise<void> {
    const dispatching = await this.transactions.runReadCommitted(() =>
      this.beginDispatch(dialogueId, turnId),
    );

    if (!dispatching) {
      return;
    }
    const dialogue = await this.getDialogue(dialogueId);
    let sessionId = dialogue.runtimeSessionId;
    let runtimePrompt = prompt;

    if (sessionId === null) {
      const newSessionId = `dlg_${randomUUID().replaceAll('-', '')}`;
      await this.transactions.runReadCommitted(() =>
        this.bindRuntime(dialogueId, turnId, newSessionId, true),
      );
      sessionId = newSessionId;
      runtimePrompt = await this.executionPrompt(dialogueId, turnId, prompt);
      await this.execution.open(
        sessionId,
        dialogue.agentId,
        dialogue.agentVersion,
        dialogueJson(dialogue.agentConfiguration),
      );
    } else {
      const existingSessionId = sessionId;
      await this.transactions.runReadCommitted(() =>
        this.bindRuntime(dialogueId, turnId, existingSessionId, false),
      );
    }

    if (
      await this.transactions.runReadCommitted(() => this.cancelBeforeAdmission(dialogueId, turnId))
    ) {
      return;
    }
    const turn = await this.execution.send(sessionId, turnId, runtimePrompt);

    if (await this.isCancellationRequested(dialogueId, turnId)) {
      await turn.cancel('dialogue_api_cancel');
    }

    void turn.result().catch((error: unknown) => {
      void this.persistDispatchFailure(dialogueId, turnId, error);
    });
  }

  private async beginDispatch(dialogueId: string, turnId: string): Promise<boolean> {
    await this.changes.lockWriter();
    const turn = await this.getTurn(dialogueId, turnId);

    if (turn.dispatchState !== 'SAVED') {
      return false;
    }

    if (turn.cancelRequested) {
      await this.finalizer.finishWithoutRuntime(dialogueId, turnId, 'CANCELLED', {
        reason: 'Cancelled before runtime admission.',
      });

      return false;
    }
    await this.markDispatching(turnId);

    return true;
  }

  private async bindRuntime(
    dialogueId: string,
    turnId: string,
    sessionId: string,
    createStream: boolean,
  ): Promise<void> {
    await this.changes.lockWriter();

    if (createStream) {
      await this.createRuntimeStream(sessionId, dialogueId);
    }
    await this.bindTurn(turnId, sessionId);

    if (!createStream) {
      return;
    }
    await this.bindDialogue(dialogueId, sessionId);
    await this.changes.append(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private async cancelBeforeAdmission(dialogueId: string, turnId: string): Promise<boolean> {
    await this.changes.lockWriter();
    const turn = await this.getTurn(dialogueId, turnId);

    if (!turn.cancelRequested || turn.dispatchState === 'ADMITTED') {
      return false;
    }

    if (turn.dispatchState !== 'FINISHED') {
      await this.finalizer.finishWithoutRuntime(dialogueId, turnId, 'CANCELLED', {
        reason: 'Cancelled before runtime admission.',
      });
    }

    return true;
  }

  private async persistDispatchFailure(
    dialogueId: string,
    turnId: string,
    error: unknown,
  ): Promise<void> {
    try {
      await this.transactions.runReadCommitted(() =>
        this.reconcileDispatchFailure(dialogueId, turnId, error),
      );
    } catch (persistenceError) {
      this.logger.error(
        `Failed to persist dialogue dispatch failure for turn ${turnId}.`,
        persistenceError instanceof Error ? persistenceError.stack : String(persistenceError),
      );
    }
  }

  private async reconcileDispatchFailure(
    dialogueId: string,
    turnId: string,
    error: unknown,
  ): Promise<void> {
    await this.changes.lockWriter();
    const [turn, activeTurnId] = await Promise.all([
      this.findTurn(dialogueId, turnId),
      this.getActiveTurnId(dialogueId),
    ]);

    if (
      turn === null ||
      activeTurnId !== turnId ||
      turn.dispatchState === 'FINISHED' ||
      turn.dispatchState === 'UNCERTAIN'
    ) {
      return;
    }

    const outcome = turn.dispatchState === 'ADMITTED' ? 'UNCERTAIN' : 'FAILED';
    await this.finalizer.finishWithoutRuntime(dialogueId, turnId, outcome, {
      message: error instanceof Error ? error.message : String(error),
    });
  }

  private getDialogue(dialogueId: string) {
    return this.prisma.dialogue.findUniqueOrThrow({ where: { id: dialogueId } });
  }

  private async getTurn(dialogueId: string, turnId: string) {
    const turn = await this.findTurn(dialogueId, turnId);

    if (turn === null) {
      throw new NotFoundException('Dialogue turn not found.');
    }

    return turn;
  }

  private findTurn(dialogueId: string, turnId: string) {
    return this.transaction.dialogueTurn.findFirst({ where: { id: turnId, dialogueId } });
  }

  private async getActiveTurnId(dialogueId: string): Promise<string | null | undefined> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true },
    });

    return dialogue?.activeTurnId;
  }

  private markDispatching(turnId: string) {
    return this.transaction.dialogueTurn.update({
      where: { id: turnId },
      data: { dispatchState: 'DISPATCHING' },
    });
  }

  private createRuntimeStream(sessionId: string, dialogueId: string) {
    return this.transaction.agentSessionEventStream.create({ data: { sessionId, dialogueId } });
  }

  private bindTurn(turnId: string, runtimeSessionId: string) {
    return this.transaction.dialogueTurn.update({
      where: { id: turnId },
      data: { runtimeSessionId },
    });
  }

  private bindDialogue(dialogueId: string, runtimeSessionId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { runtimeSessionId, version: { increment: 1 } },
    });
  }

  private async isCancellationRequested(dialogueId: string, turnId: string): Promise<boolean> {
    const turn = await this.prisma.dialogueTurn.findFirst({ where: { id: turnId, dialogueId } });

    if (turn === null) {
      throw new NotFoundException('Dialogue turn not found.');
    }

    return turn.cancelRequested;
  }

  private async executionPrompt(
    dialogueId: string,
    turnId: string,
    prompt: string,
  ): Promise<string> {
    const dialogue = await this.getDialogue(dialogueId);
    const messages = await this.getPriorMessages(dialogueId, turnId);

    if (dialogue.systemContext.length === 0 && messages.length === 0) {
      return prompt;
    }
    const sections: string[] = [];

    if (dialogue.systemContext.length > 0) {
      sections.push(`System context:\n${dialogue.systemContext}`);
    }

    if (messages.length > 0) {
      const transcript = messages
        .map(({ source, text }) => `${source === 'USER' ? 'User' : 'Assistant'}: ${text}`)
        .join('\n');
      sections.push(`Conversation history:\n${transcript}`);
    }
    sections.push(`User: ${prompt}`);

    return sections.join('\n\n');
  }

  private getPriorMessages(dialogueId: string, turnId: string) {
    return this.prisma.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        kind: 'MESSAGE',
        OR: [{ turnId: null }, { turnId: { not: turnId } }],
        source: { in: ['USER', 'AGENT'] },
        status: { in: ['COMPLETED', 'PARTIAL'] },
      },
      orderBy: { sequence: 'asc' },
      select: { source: true, text: true },
    });
  }
}
