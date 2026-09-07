import { isDeepStrictEqual } from 'node:util';

import { Injectable } from '@nestjs/common';
import type {
  AgentSessionEvent,
  AgentSessionEventAppendPrecondition,
  AgentSessionEventAppendResult,
} from '@revisium/revo-agent-runtime';

import type { AgentSessionEventStream, Prisma } from '../../../../__generated__/client/client.js';
import { TransactionPrismaService } from '../../../../infrastructure/database/transaction-prisma.service.js';
import { DialogueChangePublisher } from '../../../../infrastructure/dialogue/dialogue-change-publisher.js';
import { json } from '../../../../infrastructure/dialogue/dialogue-persistence.js';

export type AgentSessionEventReceipt =
  | { readonly state: 'stored'; readonly dialogueId: string | null }
  | { readonly state: 'existing'; readonly result: { readonly state: 'appended' } }
  | { readonly state: 'conflict'; readonly result: AgentSessionEventAppendResult };

@Injectable()
export class AgentSessionEventReceiptWriter {
  constructor(
    private readonly transactions: TransactionPrismaService,
    private readonly changes: DialogueChangePublisher,
  ) {}

  private get transaction(): Prisma.TransactionClient {
    return this.transactions.getTransaction();
  }

  async append(
    event: AgentSessionEvent,
    expected: AgentSessionEventAppendPrecondition,
    signal: AbortSignal,
  ): Promise<AgentSessionEventReceipt> {
    await this.changes.lockWriter();
    signal.throwIfAborted();

    const duplicate = await this.findEvent(event.eventId);

    if (duplicate !== null) {
      return this.duplicateResult(duplicate.payload, event);
    }

    const stream = await this.getOrCreateStream(event.sessionId, expected);

    if (stream === null || !(await this.matches(stream, expected, event))) {
      return { state: 'conflict', result: this.conflictResult(stream) };
    }

    await this.persistEvent(event, expected);
    await this.advanceStreamHead(event);

    return { state: 'stored', dialogueId: stream.dialogueId };
  }

  private findEvent(eventId: string) {
    return this.transaction.agentSessionEvent.findUnique({ where: { eventId } });
  }

  private duplicateResult(
    payload: Prisma.JsonValue,
    event: AgentSessionEvent,
  ): AgentSessionEventReceipt {
    if (isDeepStrictEqual(payload, json(event))) {
      return { state: 'existing', result: { state: 'appended' } };
    }

    return { state: 'conflict', result: { state: 'conflict' } };
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
}
