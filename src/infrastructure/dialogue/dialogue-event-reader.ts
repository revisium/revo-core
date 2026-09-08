import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { AgentSessionEvent, AgentSessionEventCursor } from '@revisium/revo-agent-runtime';

import type { DialogueChange } from '../../features/dialogues/management/contracts/dialogue.contracts.js';
import { PrismaService } from '../database/prisma.service.js';
import {
  decodeDialogueCursor,
  dialogueChangeKind,
  dialogueHistoryKind,
  dialogueHistoryItemView,
  dialogueHistorySource,
  dialogueSummaryView,
  encodeDialogueCursor,
} from './dialogue-persistence.js';

/* oxlint-disable no-await-in-loop -- Subscription polling and ordered replay are intentionally sequential. */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAgentSessionEvent = (value: unknown): value is AgentSessionEvent => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== 'agent-session-event/v1' ||
    typeof value.sessionId !== 'string' ||
    typeof value.streamId !== 'string' ||
    typeof value.sequence !== 'number' ||
    typeof value.eventId !== 'string' ||
    typeof value.observedAt !== 'string'
  ) {
    return false;
  }

  switch (value.type) {
    case 'session.accepted':
      return typeof value.resumed === 'boolean' && isRecord(value.pin);
    case 'session.opened':
      return (
        typeof value.resumed === 'boolean' && isRecord(value.pin) && isRecord(value.capabilities)
      );
    case 'turn.started':
      return typeof value.turnId === 'string';
    case 'assistant.message.delta':
      return typeof value.turnId === 'string' && typeof value.content === 'string';
    case 'assistant.message.completed':
      return (
        typeof value.turnId === 'string' &&
        value.role === 'assistant' &&
        typeof value.contentBytes === 'number' &&
        typeof value.contentSha256 === 'string'
      );
    case 'agent.progress':
      return typeof value.turnId === 'string' && typeof value.message === 'string';
    case 'tool.activity':
      return typeof value.turnId === 'string' && typeof value.toolCallId === 'string';
    case 'plan.updated':
      return typeof value.turnId === 'string' && Array.isArray(value.items);
    case 'interaction.requested':
      return isRecord(value.scope) && isRecord(value.request);
    case 'interaction.resolved':
      return (
        isRecord(value.scope) && typeof value.requestId === 'string' && isRecord(value.response)
      );
    case 'usage.updated':
      return typeof value.turnId === 'string' && isRecord(value.usage);
    case 'session.checkpointed':
      return typeof value.checkpointId === 'string' && typeof value.checkpointSha256 === 'string';
    case 'turn.completed':
      return typeof value.turnId === 'string' && isRecord(value.outcome);
    case 'session.hibernated':
      return typeof value.resumeTokenId === 'string' && typeof value.resumeTokenSha256 === 'string';
    case 'session.closed':
      return typeof value.outcome === 'string';
    default:
      return false;
  }
};

export const storedAgentSessionEvent = (value: unknown): AgentSessionEvent => {
  if (!isAgentSessionEvent(value)) {
    throw new Error('Stored agent session event is invalid.');
  }

  return value;
};

const waitForCommittedWrite = (): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, 50));

@Injectable()
export class DialogueEventReader {
  constructor(private readonly prisma: PrismaService) {}

  changes(
    after: string | undefined,
    dialogueIds: readonly string[] | undefined,
    summaryOnly: boolean,
  ): AsyncIterable<DialogueChange> {
    const prisma = this.prisma;
    const initialPosition = () => this.changePosition(after);

    return {
      [Symbol.asyncIterator]: () => {
        let stopped = false;
        let position: bigint | undefined;
        let nextPending = false;
        const buffered: DialogueChange[] = [];

        return {
          async next(): Promise<IteratorResult<DialogueChange>> {
            if (nextPending) {
              throw new Error('Dialogue change iterator allows one outstanding next().');
            }
            nextPending = true;

            try {
              position ??= await initialPosition();

              for (;;) {
                if (stopped) {
                  return { done: true, value: undefined };
                }
                const ready = buffered.shift();

                if (ready !== undefined) {
                  position = BigInt(decodeDialogueCursor(ready.cursor, 'changes').value);

                  return { done: false, value: ready };
                }
                const rows = await prisma.dialogueChange.findMany({
                  where: {
                    sequence: { gt: position },
                    ...(dialogueIds === undefined ? {} : { dialogueId: { in: [...dialogueIds] } }),
                    ...(summaryOnly ? { kind: 'SUMMARY_UPDATED' as const } : {}),
                  },
                  orderBy: { sequence: 'asc' },
                  take: 100,
                });

                if (rows.length === 0) {
                  await waitForCommittedWrite();
                  continue;
                }
                const itemIds = rows.flatMap((row) =>
                  row.kind === 'HISTORY_ITEM_UPSERTED' && row.itemId !== null ? [row.itemId] : [],
                );
                const summaryIds = rows.flatMap((row) =>
                  row.kind === 'SUMMARY_UPDATED' ? [row.dialogueId] : [],
                );
                const [items, summaries] = await Promise.all([
                  prisma.dialogueHistoryItem.findMany({ where: { id: { in: itemIds } } }),
                  prisma.dialogue.findMany({ where: { id: { in: summaryIds } } }),
                ]);
                const itemById = new Map(items.map((item) => [item.id, item]));
                const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));
                buffered.push(
                  ...rows.map((row): DialogueChange => {
                    const item =
                      row.kind === 'HISTORY_ITEM_UPSERTED' && row.itemId !== null
                        ? itemById.get(row.itemId)
                        : undefined;
                    const summary =
                      row.kind === 'SUMMARY_UPDATED' ? summaryById.get(row.dialogueId) : undefined;

                    return {
                      cursor: encodeDialogueCursor('changes', String(row.sequence)),
                      dialogueId: row.dialogueId,
                      kind: dialogueChangeKind(row.kind),
                      itemId: row.itemId,
                      itemVersion: row.itemVersion === null ? null : String(row.itemVersion),
                      baseItemVersion:
                        row.baseItemVersion === null ? null : String(row.baseItemVersion),
                      itemSequence: row.itemSequence === null ? null : String(row.itemSequence),
                      turnId: row.turnId,
                      itemKind: row.itemKind === null ? null : dialogueHistoryKind(row.itemKind),
                      itemSource:
                        row.itemSource === null ? null : dialogueHistorySource(row.itemSource),
                      textDelta: row.textDelta,
                      item: item === undefined ? null : dialogueHistoryItemView(item),
                      summary: summary === undefined ? null : dialogueSummaryView(summary),
                    };
                  }),
                );
              }
            } finally {
              nextPending = false;
            }
          },
          async return(): Promise<IteratorResult<DialogueChange>> {
            stopped = true;

            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  events(sessionId: string, after?: AgentSessionEventCursor): AsyncIterable<AgentSessionEvent> {
    const prisma = this.prisma;
    const initialPosition = () => this.eventPosition(sessionId, after);
    const isTerminalHead = (position: number) => this.isTerminalHead(sessionId, position);

    return {
      [Symbol.asyncIterator]: () => {
        let stopped = false;
        let position: number | undefined;
        let nextPending = false;
        const buffered: AgentSessionEvent[] = [];

        return {
          async next(): Promise<IteratorResult<AgentSessionEvent>> {
            if (nextPending) {
              throw new Error('Agent session event iterator allows one outstanding next().');
            }
            nextPending = true;

            try {
              position ??= await initialPosition();

              for (;;) {
                if (stopped) {
                  return { done: true, value: undefined };
                }
                const ready = buffered.shift();

                if (ready !== undefined) {
                  position = ready.sequence;

                  return { done: false, value: ready };
                }
                const rows = await prisma.agentSessionEvent.findMany({
                  where: { sessionId, sequence: { gt: position } },
                  orderBy: { sequence: 'asc' },
                  take: 100,
                });

                if (rows.length > 0) {
                  buffered.push(...rows.map(({ payload }) => storedAgentSessionEvent(payload)));
                  continue;
                }

                if (await isTerminalHead(position)) {
                  stopped = true;

                  return { done: true, value: undefined };
                }
                await waitForCommittedWrite();
              }
            } finally {
              nextPending = false;
            }
          },
          async return(): Promise<IteratorResult<AgentSessionEvent>> {
            stopped = true;

            return { done: true, value: undefined };
          },
        };
      },
    };
  }

  private async changePosition(after?: string): Promise<bigint> {
    if (after === undefined) {
      return 0n;
    }
    const value = BigInt(decodeDialogueCursor(after, 'changes').value);
    const feed = await this.prisma.dialogueFeedPosition.findUniqueOrThrow({ where: { id: 1 } });

    if (value > feed.sequence) {
      throw new BadRequestException('CURSOR_AHEAD: reload dialogue data.');
    }

    if (value !== 0n) {
      const exists = await this.prisma.dialogueChange.findUnique({ where: { sequence: value } });

      if (exists === null) {
        throw new BadRequestException('CURSOR_UNAVAILABLE: reload dialogue data.');
      }
    }

    return value;
  }

  private async eventPosition(sessionId: string, after?: AgentSessionEventCursor): Promise<number> {
    const stream = await this.prisma.agentSessionEventStream.findUnique({ where: { sessionId } });

    if (stream === null) {
      throw new NotFoundException('Agent session event stream not found.');
    }

    if (after === undefined) {
      return 0;
    }
    const event = await this.prisma.agentSessionEvent.findFirst({
      where: {
        sessionId,
        streamId: after.streamId,
        sequence: after.sequence,
        eventId: after.eventId,
      },
    });

    if (event === null) {
      throw new BadRequestException('Agent session event cursor is unavailable.');
    }

    return after.sequence;
  }

  private async isTerminalHead(sessionId: string, position: number): Promise<boolean> {
    const stream = await this.prisma.agentSessionEventStream.findUnique({ where: { sessionId } });

    if (stream?.sequence !== position || stream.eventId === null) {
      return false;
    }
    const head = await this.prisma.agentSessionEvent.findUnique({
      where: { eventId: stream.eventId },
    });

    if (head === null) {
      return false;
    }
    const event = storedAgentSessionEvent(head.payload);

    return event.type === 'session.closed' || event.type === 'session.hibernated';
  }
}
