import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import { Injectable } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

import type {
  AgentSessionEventStream,
  DialogueHistoryItem,
  Prisma,
} from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import {
  DialogueChangePublisher,
  type DialogueChangeData,
} from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { DialogueInteractionCleanup } from '../../../../infrastructure/dialogue/dialogue-interaction-cleanup.js';
import { json } from '../../../../infrastructure/dialogue/dialogue-persistence.js';
import {
  AppendDialogueRuntimeEventCommand,
  type AppendDialogueRuntimeEventCommandReturnType,
} from '../impl/append-dialogue-runtime-event.command.js';

/* oxlint-disable no-await-in-loop -- Projection changes must retain durable feed order. */

type ToolActivityEvent = Extract<AgentSessionEvent, { readonly type: 'tool.activity' }>;
type ProjectedTurnOutcome = 'COMPLETED' | 'CANCELLED' | 'INTERRUPTED' | 'FAILED';

const toolStatus = (
  status: ToolActivityEvent['status'],
): 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' => {
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
};

@Injectable()
@CommandHandler(AppendDialogueRuntimeEventCommand)
export class AppendDialogueRuntimeEventHandler implements ICommandHandler<
  AppendDialogueRuntimeEventCommand,
  AppendDialogueRuntimeEventCommandReturnType
> {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
    private readonly interactions: DialogueInteractionCleanup,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async execute({
    data: { event, expected, signal },
  }: AppendDialogueRuntimeEventCommand): Promise<AgentSessionEventAppendResult> {
    signal.throwIfAborted();

    return this.transactions.runReadCommitted(() => this.receive(event, expected, signal));
  }

  private async receive(
    event: AgentSessionEvent,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventAppendResult> {
    await this.changes.lockWriter();
    signal.throwIfAborted();

    const duplicate = await this.findEvent(event.eventId);

    if (duplicate !== null) {
      return this.duplicateResult(duplicate.payload, event);
    }

    const stream = await this.getOrCreateStream(event.sessionId, expected);

    if (stream === null || !(await this.matches(stream, expected, event))) {
      return this.conflictResult(stream);
    }

    await this.persistEvent(event, expected);
    await this.advanceStreamHead(event);
    await this.projectActiveDialogue(stream, event);

    return { state: 'appended' };
  }

  private findEvent(eventId: string) {
    return this.transaction.agentSessionEvent.findUnique({ where: { eventId } });
  }

  private duplicateResult(
    payload: Prisma.JsonValue,
    event: AgentSessionEvent,
  ): AgentSessionEventAppendResult {
    return isDeepStrictEqual(payload, json(event)) ? { state: 'appended' } : { state: 'conflict' };
  }

  private async getOrCreateStream(
    sessionId: string,
    expected: AgentSessionEventAppendPrecondition,
  ): Promise<AgentSessionEventStream | null> {
    const stream = await this.transaction.agentSessionEventStream.findUnique({
      where: { sessionId },
    });

    if (stream !== null || expected.kind !== 'empty') {
      return stream;
    }

    return this.transaction.agentSessionEventStream.create({ data: { sessionId } });
  }

  private conflictResult(stream: AgentSessionEventStream | null): AgentSessionEventAppendResult {
    if (stream?.streamId === null || stream?.streamId === undefined || stream.eventId === null) {
      return { state: 'conflict' };
    }

    return {
      state: 'conflict',
      actual: {
        streamId: stream.streamId,
        sequence: stream.sequence,
        eventId: stream.eventId,
      },
    };
  }

  private persistEvent(event: AgentSessionEvent, expected: AgentSessionEventAppendPrecondition) {
    return this.transaction.agentSessionEvent.create({
      data: {
        eventId: event.eventId,
        sessionId: event.sessionId,
        streamId: event.streamId,
        sequence: event.sequence,
        type: event.type,
        payload: json(event),
        observedAt: new Date(event.observedAt),
        ...(expected.kind === 'hibernation_token'
          ? { claimedResumeTokenId: expected.resumeTokenId }
          : {}),
      },
    });
  }

  private advanceStreamHead(event: AgentSessionEvent) {
    return this.transaction.agentSessionEventStream.update({
      where: { sessionId: event.sessionId },
      data: { streamId: event.streamId, sequence: event.sequence, eventId: event.eventId },
    });
  }

  private async projectActiveDialogue(
    stream: AgentSessionEventStream,
    event: AgentSessionEvent,
  ): Promise<void> {
    if (stream.dialogueId === null) {
      return;
    }

    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: stream.dialogueId },
      select: { runtimeSessionId: true },
    });

    if (dialogue?.runtimeSessionId === event.sessionId) {
      await this.project(stream.dialogueId, event);
    }
  }

  private async matches(
    stream: {
      readonly streamId: string | null;
      readonly sequence: number;
      readonly eventId: string | null;
    },
    expected: AgentSessionEventAppendPrecondition,
    event: AgentSessionEvent,
  ): Promise<boolean> {
    if (expected.kind === 'empty') {
      return stream.streamId === null && event.sequence === 1;
    }

    if (
      stream.streamId !== expected.cursor.streamId ||
      stream.sequence !== expected.cursor.sequence ||
      stream.eventId !== expected.cursor.eventId ||
      event.sequence !== expected.cursor.sequence + 1
    ) {
      return false;
    }

    if (expected.kind !== 'hibernation_token') {
      return event.streamId === expected.cursor.streamId;
    }

    if (
      event.type !== 'session.accepted' ||
      !event.resumed ||
      event.resumeTokenId !== expected.resumeTokenId ||
      event.resumeTokenSha256 !== expected.resumeTokenSha256
    ) {
      return false;
    }
    const claimed = await this.findResumeClaim(expected.resumeTokenId);

    if (claimed !== null) {
      return false;
    }
    const predecessor = await this.getEventPayload(expected.cursor.eventId);
    const payload = predecessor?.payload;

    return (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload) &&
      payload.type === 'session.hibernated' &&
      payload.resumeTokenId === expected.resumeTokenId &&
      payload.resumeTokenSha256 === expected.resumeTokenSha256
    );
  }

  private findResumeClaim(resumeTokenId: string) {
    return this.transaction.agentSessionEvent.findUnique({
      where: { claimedResumeTokenId: resumeTokenId },
      select: { eventId: true },
    });
  }

  private getEventPayload(eventId: string) {
    return this.transaction.agentSessionEvent.findUnique({
      where: { eventId },
      select: { payload: true },
    });
  }

  private async project(dialogueId: string, event: AgentSessionEvent): Promise<void> {
    if ('turnId' in event) {
      if (!(await this.isActiveTurn(dialogueId, event.turnId))) {
        return;
      }
    }

    if (event.type === 'interaction.requested' && event.scope.kind === 'turn') {
      if (!(await this.isActiveTurn(dialogueId, event.scope.turnId))) {
        return;
      }
    }

    switch (event.type) {
      case 'session.opened':
        await this.summary(dialogueId);

        return;
      case 'turn.started':
        await this.startTurn(dialogueId, event.turnId);

        return;
      case 'assistant.message.delta':
        await this.appendText(dialogueId, event.turnId, event.content);

        return;
      case 'assistant.message.completed':
        await this.completeText(dialogueId, event);

        return;
      case 'agent.progress':
        await this.updateProgress(dialogueId, event.message);

        return;
      case 'turn.completed':
        await this.completeTurn(dialogueId, event);

        return;
      case 'tool.activity':
        await this.upsertActivity(
          dialogueId,
          event.turnId,
          `tool:${event.turnId}:${event.toolCallId}`,
          'OPERATION',
          event.title,
          toolStatus(event.status),
          event,
        );

        return;
      case 'plan.updated':
        await this.upsertActivity(
          dialogueId,
          event.turnId,
          `plan:${event.turnId}`,
          'PLAN',
          '',
          'IN_PROGRESS',
          event,
        );

        return;
      case 'usage.updated':
        await this.upsertActivity(
          dialogueId,
          event.turnId,
          `usage:${event.turnId}`,
          'USAGE',
          '',
          'COMPLETED',
          event,
        );

        return;
      case 'interaction.requested':
        await this.requestInteraction(dialogueId, event);

        return;
      case 'interaction.resolved':
        await this.resolveInteraction(dialogueId, event);

        return;
      case 'session.closed':
        await this.closeSession(dialogueId, event);

        return;
      case 'session.accepted':
      case 'session.checkpointed':
      case 'session.hibernated':
        return;
    }
  }

  private async isActiveTurn(dialogueId: string, turnId: string): Promise<boolean> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true },
    });

    return dialogue?.activeTurnId === turnId;
  }

  private async startTurn(dialogueId: string, turnId: string): Promise<void> {
    await this.markTurnAdmitted(dialogueId, turnId);
    await this.markDialogueRunning(dialogueId);
    await this.summary(dialogueId);
  }

  private markTurnAdmitted(dialogueId: string, turnId: string) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId },
      data: { status: 'RUNNING', dispatchState: 'ADMITTED' },
    });
  }

  private markDialogueRunning(dialogueId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { status: 'RUNNING', progress: 'Agent is working', version: { increment: 1 } },
    });
  }

  private async updateProgress(dialogueId: string, message: string): Promise<void> {
    await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { progress: message, version: { increment: 1 } },
    });
    await this.summary(dialogueId);
  }

  private async appendText(dialogueId: string, turnId: string, content: string): Promise<void> {
    const itemId = `${dialogueId}:${turnId}:assistant`;
    const existing = await this.findHistoryItem(itemId);
    let itemSequence: bigint;
    let version: bigint;

    if (existing === null) {
      itemSequence = await this.reserveItemSequence(dialogueId);
      version = 1n;
      await this.createAssistantMessage(dialogueId, turnId, itemSequence, content, version);
    } else {
      itemSequence = existing.sequence;
      version = existing.version + 1n;
      await this.appendAssistantContent(itemId, existing.text, content, version);
    }

    await this.change(dialogueId, {
      kind: 'HISTORY_TEXT_APPENDED',
      itemId,
      itemVersion: version,
      baseItemVersion: version - 1n,
      itemSequence,
      ...(turnId === null ? {} : { turnId }),
      itemKind: 'MESSAGE',
      itemSource: 'AGENT',
      textDelta: content,
    });
  }

  private findHistoryItem(id: string) {
    return this.transaction.dialogueHistoryItem.findUnique({ where: { id } });
  }

  private async reserveItemSequence(dialogueId: string): Promise<bigint> {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return dialogue.itemSequence;
  }

  private createAssistantMessage(
    dialogueId: string,
    turnId: string,
    sequence: bigint,
    text: string,
    version: bigint,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${turnId}:assistant`,
        dialogueId,
        sequence,
        turnId,
        sourceKey: `assistant:${turnId}`,
        kind: 'MESSAGE',
        source: 'AGENT',
        text,
        status: 'STREAMING',
        version,
      },
    });
  }

  private appendAssistantContent(
    itemId: string,
    currentText: string,
    content: string,
    version: bigint,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { text: currentText + content, version },
    });
  }

  private async completeText(
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'assistant.message.completed' }>,
  ): Promise<void> {
    const itemId = `${dialogueId}:${event.turnId}:assistant`;
    const item = await this.getOrCreateAssistantMessage(dialogueId, event.turnId);
    this.validateAssistantCompletion(item.text, event);
    const updated = await this.completeAssistantMessage(itemId, event);

    await this.change(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId,
      itemVersion: updated.version,
      itemSequence: updated.sequence,
      turnId: event.turnId,
      itemKind: 'MESSAGE',
      itemSource: 'AGENT',
    });
  }

  private async getOrCreateAssistantMessage(
    dialogueId: string,
    turnId: string,
  ): Promise<DialogueHistoryItem> {
    const itemId = `${dialogueId}:${turnId}:assistant`;
    const item = await this.findHistoryItem(itemId);

    if (item !== null) {
      return item;
    }

    const sequence = await this.reserveItemSequence(dialogueId);

    return this.createAssistantMessage(dialogueId, turnId, sequence, '', 0n);
  }

  private validateAssistantCompletion(
    text: string,
    event: Extract<AgentSessionEvent, { readonly type: 'assistant.message.completed' }>,
  ): void {
    const bytes = Buffer.byteLength(text, 'utf8');
    const digest = createHash('sha256').update(text, 'utf8').digest('hex');

    if (bytes !== event.contentBytes || digest !== event.contentSha256) {
      throw new Error('Assistant completion does not match the persisted text.');
    }
  }

  private completeAssistantMessage(
    itemId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'assistant.message.completed' }>,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { status: 'COMPLETED', version: { increment: 1 }, payload: json(event) },
    });
  }

  private async completeTurn(
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'turn.completed' }>,
  ): Promise<void> {
    const active = await this.getRuntimeBinding(dialogueId);

    if (active?.activeTurnId !== event.turnId || active.runtimeSessionId !== event.sessionId) {
      return;
    }

    await this.markStreamingAssistantPartial(dialogueId, event.turnId);
    const interrupted = await this.interruptTurnActivities(dialogueId, event.turnId);
    const abandoned = await this.interactions.abandon(dialogueId, {
      kind: 'turn',
      turnId: event.turnId,
    });
    const finalized = [...interrupted, ...abandoned].sort((left, right) =>
      left.sequence < right.sequence ? -1 : left.sequence > right.sequence ? 1 : 0,
    );
    const remainingInteractions = await this.countPendingInteractions(dialogueId);
    const resultSequence = await this.reserveItemSequence(dialogueId);
    const outcome = this.turnOutcome(event);
    const resultId = `${dialogueId}:${event.turnId}:result`;
    await this.createTurnResult(resultId, dialogueId, event, resultSequence, outcome);
    await this.finishTurn(dialogueId, event, resultSequence, outcome);
    await this.finishDialogue(dialogueId, remainingInteractions, outcome);

    for (const item of finalized) {
      await this.publishHistoryItem(dialogueId, item);
    }

    await this.change(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId: resultId,
      itemVersion: 0n,
      itemSequence: resultSequence,
      turnId: event.turnId,
      itemKind: 'RESULT',
      itemSource: 'SYSTEM',
    });
    await this.summary(dialogueId);
  }

  private getRuntimeBinding(dialogueId: string) {
    return this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true, runtimeSessionId: true },
    });
  }

  private async markStreamingAssistantPartial(dialogueId: string, turnId: string): Promise<void> {
    const assistant = await this.findHistoryItem(`${dialogueId}:${turnId}:assistant`);

    if (assistant?.status !== 'STREAMING') {
      return;
    }

    const partial = await this.markHistoryItemPartial(assistant.id);
    await this.publishHistoryItem(dialogueId, partial);
  }

  private markHistoryItemPartial(itemId: string) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { status: 'PARTIAL', version: { increment: 1 } },
    });
  }

  private async interruptTurnActivities(
    dialogueId: string,
    turnId?: string,
  ): Promise<DialogueHistoryItem[]> {
    const unfinished = await this.findUnfinishedActivities(dialogueId, turnId);

    return Promise.all(unfinished.map(({ id }) => this.markHistoryItemInterrupted(id)));
  }

  private findUnfinishedActivities(dialogueId: string, turnId?: string) {
    return this.transaction.dialogueHistoryItem.findMany({
      where: {
        dialogueId,
        ...(turnId === undefined ? {} : { turnId }),
        historical: false,
        kind: { notIn: ['MESSAGE', 'INTERACTION'] },
        status: { in: ['STARTED', 'IN_PROGRESS'] },
      },
      orderBy: { sequence: 'asc' },
    });
  }

  private markHistoryItemInterrupted(itemId: string) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { status: 'INTERRUPTED', version: { increment: 1 } },
    });
  }

  private countPendingInteractions(dialogueId: string, excludedId?: string): Promise<number> {
    return this.transaction.dialogueInteraction.count({
      where: {
        dialogueId,
        ...(excludedId === undefined ? {} : { id: { not: excludedId } }),
        status: { in: ['PENDING', 'RESPONDING'] },
      },
    });
  }

  private turnOutcome(
    event: Extract<AgentSessionEvent, { readonly type: 'turn.completed' }>,
  ): ProjectedTurnOutcome {
    if (event.outcome.status === 'completed') {
      return 'COMPLETED';
    }

    if (event.outcome.status === 'cancelled') {
      return 'CANCELLED';
    }

    if (event.outcome.status === 'interrupted' || event.outcome.status === 'timed_out') {
      return 'INTERRUPTED';
    }

    return 'FAILED';
  }

  private createTurnResult(
    resultId: string,
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'turn.completed' }>,
    sequence: bigint,
    outcome: ProjectedTurnOutcome,
  ) {
    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: resultId,
        dialogueId,
        sequence,
        turnId: event.turnId,
        sourceKey: `result:${event.turnId}`,
        kind: 'RESULT',
        source: 'SYSTEM',
        payload: json(event.outcome),
        status: outcome,
      },
    });
  }

  private finishTurn(
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'turn.completed' }>,
    endItemSequence: bigint,
    outcome: ProjectedTurnOutcome,
  ) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: event.turnId, dialogueId },
      data: {
        status: outcome,
        dispatchState: 'FINISHED',
        outcome: json(event.outcome),
        completedAt: new Date(event.observedAt),
        endItemSequence,
      },
    });
  }

  private finishDialogue(dialogueId: string, pendingCount: number, outcome: ProjectedTurnOutcome) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: pendingCount > 0 ? 'WAITING' : 'READY',
        activeTurnId: null,
        pendingCount,
        progress: '',
        lastOutcome: outcome,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async upsertActivity(
    dialogueId: string,
    turnId: string,
    sourceKey: string,
    kind: 'OPERATION' | 'PLAN' | 'USAGE',
    text: string,
    status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    payload: AgentSessionEvent,
  ): Promise<void> {
    const existing = await this.findActivity(dialogueId, sourceKey);
    const item =
      existing === null
        ? await this.createItem(dialogueId, {
            sourceKey,
            turnId,
            kind,
            source: 'AGENT',
            text,
            status,
            payload,
          })
        : await this.updateActivity(existing.id, text, status, payload);
    await this.publishHistoryItem(dialogueId, item);
  }

  private findActivity(dialogueId: string, sourceKey: string) {
    return this.transaction.dialogueHistoryItem.findFirst({ where: { dialogueId, sourceKey } });
  }

  private updateActivity(
    itemId: string,
    text: string,
    status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED',
    payload: AgentSessionEvent,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { id: itemId },
      data: { text, status, payload: json(payload), version: { increment: 1 } },
    });
  }

  private async requestInteraction(
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'interaction.requested' }>,
  ): Promise<void> {
    const turnId = event.scope.kind === 'turn' ? event.scope.turnId : null;
    const interactionId = `${event.sessionId}:${event.request.requestId}`;
    await this.createInteraction(dialogueId, interactionId, turnId, event);
    const item = await this.createItem(dialogueId, {
      sourceKey: interactionId,
      turnId,
      kind: 'INTERACTION',
      source: 'AGENT',
      text: '',
      status: 'PENDING',
      payload: event,
    });
    await this.markDialogueWaiting(dialogueId);

    if (turnId !== null) {
      await this.markTurnWaiting(dialogueId, turnId);
    }

    await this.publishHistoryItem(dialogueId, item);
    await this.summary(dialogueId);
  }

  private createInteraction(
    dialogueId: string,
    interactionId: string,
    turnId: string | null,
    event: Extract<AgentSessionEvent, { readonly type: 'interaction.requested' }>,
  ) {
    return this.transaction.dialogueInteraction.create({
      data: {
        id: interactionId,
        dialogueId,
        turnId,
        runtimeSessionId: event.sessionId,
        runtimeRequestId: event.request.requestId,
        request: json(event.request),
      },
    });
  }

  private markDialogueWaiting(dialogueId: string) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'WAITING',
        pendingCount: { increment: 1 },
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private markTurnWaiting(dialogueId: string, turnId: string) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId },
      data: { status: 'WAITING' },
    });
  }

  private async resolveInteraction(
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'interaction.resolved' }>,
  ): Promise<void> {
    const interactionId = `${event.sessionId}:${event.requestId}`;
    const interaction = await this.findInteraction(interactionId);

    if (
      interaction === null ||
      interaction.status === 'RESOLVED' ||
      interaction.status === 'ABANDONED'
    ) {
      return;
    }
    await this.markInteractionResolved(interactionId, event.response);
    const item = await this.resolveInteractionHistory(
      dialogueId,
      interactionId,
      interaction.request,
      event.response,
    );
    const remaining = await this.countPendingInteractions(dialogueId, interactionId);
    const activeTurnId = await this.getActiveTurnId(dialogueId);
    await this.updateDialogueAfterInteraction(dialogueId, activeTurnId, remaining);

    if (interaction.turnId !== null) {
      await this.updateTurnAfterInteraction(dialogueId, interaction.turnId, interactionId);
    }

    await this.publishHistoryItem(dialogueId, item);
    await this.summary(dialogueId);
  }

  private findInteraction(interactionId: string) {
    return this.transaction.dialogueInteraction.findUnique({ where: { id: interactionId } });
  }

  private markInteractionResolved(interactionId: string, response: unknown) {
    return this.transaction.dialogueInteraction.update({
      where: { id: interactionId },
      data: { status: 'RESOLVED', response: json(response) },
    });
  }

  private resolveInteractionHistory(
    dialogueId: string,
    interactionId: string,
    request: Prisma.JsonValue,
    response: unknown,
  ) {
    return this.transaction.dialogueHistoryItem.update({
      where: { dialogueId_sourceKey: { dialogueId, sourceKey: interactionId } },
      data: {
        status: 'RESOLVED',
        payload: json({ request, response }),
        version: { increment: 1 },
      },
    });
  }

  private async getActiveTurnId(dialogueId: string): Promise<string | null | undefined> {
    const dialogue = await this.transaction.dialogue.findUnique({
      where: { id: dialogueId },
      select: { activeTurnId: true },
    });

    return dialogue?.activeTurnId;
  }

  private updateDialogueAfterInteraction(
    dialogueId: string,
    activeTurnId: string | null | undefined,
    pendingCount: number,
  ) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: pendingCount > 0 ? 'WAITING' : activeTurnId === null ? 'READY' : 'RUNNING',
        pendingCount,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async updateTurnAfterInteraction(
    dialogueId: string,
    turnId: string,
    interactionId: string,
  ): Promise<void> {
    const remaining = await this.transaction.dialogueInteraction.count({
      where: {
        dialogueId,
        turnId,
        id: { not: interactionId },
        status: { in: ['PENDING', 'RESPONDING'] },
      },
    });
    await this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId, dispatchState: { not: 'FINISHED' } },
      data: { status: remaining > 0 ? 'WAITING' : 'RUNNING' },
    });
  }

  private async closeSession(
    dialogueId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'session.closed' }>,
  ): Promise<void> {
    const dialogue = await this.findDialogue(dialogueId);

    if (dialogue === null) {
      return;
    }

    if (dialogue.activeTurnId === null) {
      const abandonedItems = await this.interactions.abandon(dialogueId, {
        kind: 'all',
      });
      await this.detachIdleSession(dialogueId, abandonedItems.length > 0);

      for (const item of abandonedItems) {
        await this.publishHistoryItem(dialogueId, item);
      }

      await this.summary(dialogueId);

      return;
    }

    const outcome = event.outcome === 'cancelled' ? 'CANCELLED' : 'FAILED';
    await this.markStreamingAssistantPartial(dialogueId, dialogue.activeTurnId);
    const result = await this.createItem(dialogueId, {
      sourceKey: `result:${dialogue.activeTurnId}`,
      turnId: dialogue.activeTurnId,
      kind: 'RESULT',
      source: 'SYSTEM',
      text: '',
      status: outcome,
      payload: event,
    });
    await this.finishTurnAfterSessionClose(
      dialogueId,
      dialogue.activeTurnId,
      event,
      result.sequence,
      outcome,
    );
    const abandoned = await this.interactions.abandon(dialogueId, {
      kind: 'all',
    });
    const interrupted = await this.interruptTurnActivities(dialogueId);
    interrupted.push(...abandoned);
    interrupted.sort((left, right) =>
      left.sequence < right.sequence ? -1 : left.sequence > right.sequence ? 1 : 0,
    );
    await this.finishDialogueAfterSessionClose(dialogueId, outcome);
    await this.publishHistoryItem(dialogueId, result);

    for (const item of interrupted) {
      await this.publishHistoryItem(dialogueId, item);
    }

    await this.summary(dialogueId);
  }

  private findDialogue(dialogueId: string) {
    return this.transaction.dialogue.findUnique({ where: { id: dialogueId } });
  }

  private detachIdleSession(dialogueId: string, abandonedInteractions: boolean) {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'READY',
        runtimeSessionId: null,
        pendingCount: 0,
        contextMode: 'CONTINUED',
        ...(abandonedInteractions ? { significantSequence: { increment: 1 } } : {}),
        version: { increment: 1 },
      },
    });
  }

  private finishTurnAfterSessionClose(
    dialogueId: string,
    turnId: string,
    event: Extract<AgentSessionEvent, { readonly type: 'session.closed' }>,
    endItemSequence: bigint,
    outcome: 'CANCELLED' | 'FAILED',
  ) {
    return this.transaction.dialogueTurn.updateMany({
      where: { id: turnId, dialogueId, dispatchState: { not: 'FINISHED' } },
      data: {
        status: outcome,
        dispatchState: 'FINISHED',
        outcome: json(event),
        completedAt: new Date(event.observedAt),
        endItemSequence,
      },
    });
  }

  private finishDialogueAfterSessionClose(dialogueId: string, outcome: 'CANCELLED' | 'FAILED') {
    return this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: {
        status: 'READY',
        runtimeSessionId: null,
        activeTurnId: null,
        pendingCount: 0,
        progress: '',
        lastOutcome: outcome,
        significantSequence: { increment: 1 },
        version: { increment: 1 },
      },
    });
  }

  private async createItem(
    dialogueId: string,
    data: {
      readonly sourceKey: string;
      readonly turnId: string | null;
      readonly kind: 'OPERATION' | 'INTERACTION' | 'RESULT' | 'PLAN' | 'USAGE';
      readonly source: 'AGENT' | 'SYSTEM';
      readonly text: string;
      readonly status: 'STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING' | 'CANCELLED';
      readonly payload: AgentSessionEvent;
    },
  ) {
    const dialogue = await this.transaction.dialogue.update({
      where: { id: dialogueId },
      data: { itemSequence: { increment: 1 } },
    });

    return this.transaction.dialogueHistoryItem.create({
      data: {
        id: `${dialogueId}:${data.sourceKey}`,
        dialogueId,
        sequence: dialogue.itemSequence,
        turnId: data.turnId,
        sourceKey: data.sourceKey,
        kind: data.kind,
        source: data.source,
        text: data.text,
        status: data.status,
        payload: json(data.payload),
      },
    });
  }

  private publishHistoryItem(dialogueId: string, item: DialogueHistoryItem): Promise<void> {
    return this.change(dialogueId, {
      kind: 'HISTORY_ITEM_UPSERTED',
      itemId: item.id,
      itemVersion: item.version,
      itemSequence: item.sequence,
      ...(item.turnId === null ? {} : { turnId: item.turnId }),
      itemKind: item.kind,
      itemSource: item.source,
    });
  }

  private summary(dialogueId: string): Promise<void> {
    return this.change(dialogueId, { kind: 'SUMMARY_UPDATED' });
  }

  private async change(dialogueId: string, data: DialogueChangeData): Promise<void> {
    await this.changes.append(dialogueId, data);
  }
}
