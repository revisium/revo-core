import { randomUUID } from 'node:crypto';

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { EventsHandler, type IEventHandler } from '@nestjs/cqrs';
import type {
  AgentConfigurationSelection,
  AgentFault,
  AgentManager,
  AgentSessionTurn,
  AgentStartContext,
} from '@revisium/revo-agent-runtime';

import type { Prisma } from '../../../../__generated__/client/client.js';
import {
  AGENT_LAUNCH_CONTEXT,
  AGENT_MANAGER,
} from '../../../../infrastructure/agent-runtime/agent-runtime.tokens.js';
import { AgentSessionDirectories } from '../../../../infrastructure/agent-runtime/agent-session-directories.js';
import { PrismaService } from '../../../../infrastructure/database/prisma.service.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { dialogueJson } from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  reportErrorDiagnostic,
  type ErrorDiagnosticContext,
} from '../../../../infrastructure/error-diagnostic.js';
import { DialogueEventIngestionApiService } from '../../ingestion/dialogue-event-ingestion-api.service.js';
import type { DialogueJson } from '../contracts/dialogue.contracts.js';
import { DialogueTurnSavedEvent } from '../events/dialogue-turn-saved.event.js';
import { publicFault, runtimeFaultFrom } from './dialogue-runtime-fault.js';

const DIALOGUE_RUNTIME_OPERATION_ERROR = Symbol('dialogue-runtime-operation-error');

type DialogueRuntimeOperationError = Readonly<{
  [DIALOGUE_RUNTIME_OPERATION_ERROR]: true;
  operation: string;
  error: unknown;
  context: Omit<ErrorDiagnosticContext, 'operation'>;
}>;

@Injectable()
@EventsHandler(DialogueTurnSavedEvent)
export class DispatchDialogueTurnHandler implements IEventHandler<DialogueTurnSavedEvent> {
  private readonly logger = new Logger(DispatchDialogueTurnHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly ingestion: DialogueEventIngestionApiService,
    @Inject(AGENT_MANAGER) private readonly manager: AgentManager,
    @Inject(AGENT_LAUNCH_CONTEXT) private readonly launchContext: AgentStartContext,
    private readonly directories: AgentSessionDirectories,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  handle(event: DialogueTurnSavedEvent): void {
    void this.dispatch(event).catch((error: unknown) => {
      const failure = isDialogueRuntimeOperationError(error)
        ? error
        : dialogueRuntimeOperationError('dialogue.turn.dispatch', error, {});
      void this.persistDispatchFailure(event.dialogueId, event.turnId, failure);
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
    const agentConfiguration = dialogueJson(dialogue.agentConfiguration);
    const model = selectedModel(agentConfiguration);
    const diagnosticContext = model === undefined ? {} : { model };
    let sessionId = dialogue.runtimeSessionId;
    let runtimePrompt = prompt;

    if (sessionId === null) {
      const newSessionId = `dlg_${randomUUID().replaceAll('-', '')}`;
      await this.transactions.runReadCommitted(() =>
        this.bindRuntime(dialogueId, turnId, newSessionId, true),
      );
      sessionId = newSessionId;
      runtimePrompt = await this.executionPrompt(dialogueId, turnId, prompt);
      await this.runtimeOperation(
        'dialogue.runtime.open',
        dialogue.agentId,
        dialogue.agentVersion,
        diagnosticContext,
        () =>
          this.openRuntime(
            newSessionId,
            dialogue.agentId,
            dialogue.agentVersion,
            agentConfiguration,
          ),
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
    const turn = await this.runtimeOperation(
      'dialogue.runtime.send',
      dialogue.agentId,
      dialogue.agentVersion,
      diagnosticContext,
      () => this.sendToRuntime(sessionId, turnId, runtimePrompt),
    );

    if (await this.isCancellationRequested(dialogueId, turnId)) {
      await this.runtimeOperation(
        'dialogue.runtime.cancel',
        dialogue.agentId,
        dialogue.agentVersion,
        diagnosticContext,
        () => turn.cancel('dialogue_api_cancel'),
      );
    }

    void turn.result().then(
      (result) => {
        if (result.status === 'failed' || result.status === 'timed_out') {
          this.reportRuntimeFault(
            'dialogue.runtime.turn_result',
            dialogueId,
            turnId,
            dialogue.agentId,
            dialogue.agentVersion,
            model,
            'error' in result ? result.error : undefined,
          );
        }
      },
      (error: unknown) => {
        void this.persistDispatchFailure(
          dialogueId,
          turnId,
          dialogueRuntimeOperationError('dialogue.runtime.turn_result', error, {
            agentId: dialogue.agentId,
            agentVersion: dialogue.agentVersion,
            ...diagnosticContext,
          }),
        );
      },
    );
  }

  private async beginDispatch(dialogueId: string, turnId: string): Promise<boolean> {
    await this.changes.lockWriter();
    const turn = await this.getTurn(dialogueId, turnId);

    if (turn.dispatchState !== 'SAVED') {
      return false;
    }

    if (turn.cancelRequested) {
      await this.ingestion.interruptTurn({
        dialogueId,
        turnId,
        reason: { kind: 'PRE_ADMISSION_CANCEL' },
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
      await this.ingestion.interruptTurn({
        dialogueId,
        turnId,
        reason: { kind: 'PRE_ADMISSION_CANCEL' },
      });
    }

    return true;
  }

  private async persistDispatchFailure(
    dialogueId: string,
    turnId: string,
    failure: DialogueRuntimeOperationError,
  ): Promise<void> {
    reportErrorDiagnostic(
      this.logger,
      { operation: failure.operation, dialogueId, turnId, ...failure.context },
      failure.error,
    );

    try {
      const fault = runtimeFaultFrom(failure.error);
      await this.ingestion.interruptTurn({
        dialogueId,
        turnId,
        reason: {
          kind: 'DISPATCH_FAILURE',
          message:
            fault === undefined ? 'Dialogue turn dispatch failed.' : publicFault(fault).message,
        },
      });
    } catch (persistenceError) {
      reportErrorDiagnostic(
        this.logger,
        {
          operation: 'dialogue.dispatch_failure.persist',
          dialogueId,
          turnId,
          ...failure.context,
        },
        persistenceError,
      );
    }
  }

  private async runtimeOperation<T>(
    operation: string,
    agentId: string,
    agentVersion: string,
    context: Pick<ErrorDiagnosticContext, 'model'> = {},
    action: () => Promise<T>,
  ): Promise<T> {
    try {
      return await action();
    } catch (error) {
      throw dialogueRuntimeOperationError(operation, error, { agentId, agentVersion, ...context });
    }
  }

  private reportRuntimeFault(
    operation: string,
    dialogueId: string,
    turnId: string,
    agentId: string,
    agentVersion: string,
    model: string | undefined,
    fault: AgentFault | undefined,
  ): void {
    reportErrorDiagnostic(
      this.logger,
      {
        operation,
        dialogueId,
        turnId,
        agentId,
        agentVersion,
        ...(model === undefined ? {} : { model }),
        ...(fault === undefined
          ? {}
          : { runtimeCode: fault.code, phase: fault.phase, retryable: fault.retryable }),
      },
      fault ?? new Error('Dialogue runtime turn failed.'),
    );
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

  private async openRuntime(
    sessionId: string,
    agentId: string,
    agentVersion: string,
    agentConfiguration: DialogueJson,
  ): Promise<void> {
    await this.manager.sessions.open(
      {
        sessionId,
        agent: { id: agentId, version: agentVersion },
        workspace: { directory: this.directories.workspaceDirectory },
        output: { directory: this.directories.outputDirectory(sessionId) },
        parameters: {},
        permissions: {},
        configuration: this.configuration(agentConfiguration),
      },
      this.launchContext,
    );
  }

  private sendToRuntime(
    sessionId: string,
    turnId: string,
    prompt: string,
  ): Promise<AgentSessionTurn> {
    const session = this.manager.sessions.get(sessionId);

    if (session === undefined) {
      throw new Error('Runtime session is not active.');
    }

    return session.send({ turnId, prompt });
  }

  private configuration(value: DialogueJson): AgentConfigurationSelection {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Persisted dialogue agent configuration is invalid.');
    }

    if (
      !('selections' in value) ||
      typeof value.selections !== 'object' ||
      value.selections === null ||
      Array.isArray(value.selections) ||
      Object.values(value.selections).some(
        (selection) => typeof selection !== 'boolean' && typeof selection !== 'string',
      )
    ) {
      throw new Error('Persisted dialogue agent configuration selections are invalid.');
    }

    const selections: Record<string, boolean | string> = {};

    for (const [id, selection] of Object.entries(value.selections)) {
      if (typeof selection === 'boolean' || typeof selection === 'string') {
        selections[id] = selection;
      }
    }

    const catalogRevision =
      'catalogRevision' in value && typeof value.catalogRevision === 'string'
        ? value.catalogRevision
        : undefined;

    return { selections, ...(catalogRevision === undefined ? {} : { catalogRevision }) };
  }
}

function dialogueRuntimeOperationError(
  operation: string,
  error: unknown,
  context: Omit<ErrorDiagnosticContext, 'operation'>,
): DialogueRuntimeOperationError {
  return { [DIALOGUE_RUNTIME_OPERATION_ERROR]: true, operation, error, context };
}

function isDialogueRuntimeOperationError(value: unknown): value is DialogueRuntimeOperationError {
  return (
    typeof value === 'object' &&
    value !== null &&
    DIALOGUE_RUNTIME_OPERATION_ERROR in value &&
    value[DIALOGUE_RUNTIME_OPERATION_ERROR] === true
  );
}

function selectedModel(value: DialogueJson): string | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return undefined;
  }
  if (!('selections' in value)) {
    return undefined;
  }
  const selections = value.selections;
  if (typeof selections !== 'object' || selections === null || Array.isArray(selections)) {
    return undefined;
  }
  const model = Object.entries(selections).find(([key]) => key === 'model')?.[1];
  return typeof model === 'string' ? model : undefined;
}
