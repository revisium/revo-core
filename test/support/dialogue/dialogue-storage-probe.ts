import type { AgentSessionEvent } from '@revisium/revo-agent-runtime';

import { PrismaService } from '../../../src/infrastructure/database/prisma.service.js';
import { storedAgentSessionEvent } from '../../../src/infrastructure/dialogue/dialogue-event-reader.js';

export class DialogueStorageProbe {
  constructor(private readonly prisma: PrismaService) {}

  turnCount(dialogueId: string): Promise<number> {
    return this.prisma.dialogueTurn.count({ where: { dialogueId } });
  }

  historyItem(dialogueId: string, kind: 'MESSAGE' | 'OPERATION' | 'USAGE') {
    return this.prisma.dialogueHistoryItem.findFirstOrThrow({ where: { dialogueId, kind } });
  }

  async runtimeBinding(turnId: string) {
    const turn = await this.prisma.dialogueTurn.findUniqueOrThrow({ where: { id: turnId } });

    if (turn.runtimeSessionId === null) {
      throw new Error(`Turn ${turnId} has no durable runtime session binding.`);
    }
    const head = await this.prisma.agentSessionEventStream.findUniqueOrThrow({
      where: { sessionId: turn.runtimeSessionId },
    });

    if (head.streamId === null || head.eventId === null) {
      throw new Error(`Turn ${turnId} runtime event stream has no durable head.`);
    }

    return {
      turn,
      sessionId: turn.runtimeSessionId,
      head: { ...head, streamId: head.streamId, eventId: head.eventId },
    };
  }

  async latestEvent(turnId: string, type: AgentSessionEvent['type']): Promise<AgentSessionEvent> {
    const { sessionId } = await this.runtimeBinding(turnId);
    const stored = await this.prisma.agentSessionEvent.findFirstOrThrow({
      where: {
        sessionId,
        type,
        payload: { path: ['turnId'], equals: turnId },
      },
      orderBy: { sequence: 'desc' },
    });

    return storedAgentSessionEvent(stored.payload);
  }

  atomicState(dialogueId: string, sessionId: string) {
    return Promise.all([
      this.prisma.agentSessionEventStream.findUniqueOrThrow({ where: { sessionId } }),
      this.prisma.agentSessionEvent.count({ where: { sessionId } }),
      this.prisma.dialogueChange.count({ where: { dialogueId } }),
      this.prisma.dialogueHistoryItem.findMany({
        where: { dialogueId },
        orderBy: { sequence: 'asc' },
      }),
      this.prisma.dialogueFeedPosition.findUniqueOrThrow({ where: { id: 1 } }),
    ]);
  }

  textProjection(dialogueId: string, turnId: string) {
    return Promise.all([
      this.prisma.dialogueHistoryItem.findMany({
        where: { dialogueId, turnId, kind: 'MESSAGE', source: 'AGENT' },
      }),
      this.prisma.dialogueChange.findMany({
        where: { dialogueId, turnId, kind: 'HISTORY_TEXT_APPENDED' },
        orderBy: { sequence: 'asc' },
        select: { textDelta: true, itemVersion: true, baseItemVersion: true },
      }),
    ]);
  }
}
