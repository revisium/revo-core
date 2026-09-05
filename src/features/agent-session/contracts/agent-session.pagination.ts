import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../infrastructure/agent-runtime/agent-session.errors.js';
import type { AgentSessionPage, AgentSessionPageData } from './agent-session.contracts.js';

const defaultPageSize = 20;
const maxPageSize = 100;
const cursorEpoch = randomUUID();

interface Position {
  readonly timestamp: string;
  readonly sessionId: string;
}

const compareText = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

const encode = (position: Position, kind: string): string =>
  Buffer.from(
    JSON.stringify({ version: 1, epoch: cursorEpoch, kind, ...position }),
    'utf8',
  ).toString('base64url');

const decode = (cursor: string, kind: string): Position => {
  try {
    if (cursor.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(cursor)) {
      throw new Error('invalid');
    }
    const value: unknown = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));

    if (
      typeof value !== 'object' ||
      value === null ||
      !('version' in value) ||
      value.version !== 1 ||
      !('kind' in value) ||
      value.kind !== kind ||
      !('epoch' in value) ||
      typeof value.epoch !== 'string' ||
      !('timestamp' in value) ||
      typeof value.timestamp !== 'string' ||
      !('sessionId' in value) ||
      typeof value.sessionId !== 'string'
    ) {
      throw new Error('invalid');
    }

    if (value.epoch !== cursorEpoch) {
      throw new AgentSessionApplicationError(
        AgentSessionErrorCode.expiredCursor,
        'Agent session cursor belongs to an earlier process.',
      );
    }

    return { timestamp: value.timestamp, sessionId: value.sessionId };
  } catch (error) {
    if (error instanceof AgentSessionApplicationError) {
      throw error;
    }
    throw new AgentSessionApplicationError(
      AgentSessionErrorCode.invalidCursor,
      'Agent session cursor is invalid.',
    );
  }
};

export const paginateAgentSessions = <T>(
  records: readonly T[],
  data: AgentSessionPageData,
  positionOf: (record: T) => Position,
  kind: 'active' | 'terminal' | 'agents' = 'active',
): AgentSessionPage<T> => {
  const first = data.first ?? defaultPageSize;

  if (!Number.isInteger(first) || first < 1 || first > maxPageSize) {
    throw new AgentSessionApplicationError(
      AgentSessionErrorCode.invalidInput,
      'first must be an integer between 1 and 100.',
      { first },
    );
  }
  const sorted = [...records].sort((left, right) => {
    const a = positionOf(left);
    const b = positionOf(right);

    return compareText(b.timestamp, a.timestamp) || compareText(a.sessionId, b.sessionId);
  });
  const after = data.after === undefined ? undefined : decode(data.after, kind);
  const start =
    after === undefined
      ? 0
      : sorted.findIndex((record) => {
          const position = positionOf(record);

          return (
            position.timestamp < after.timestamp ||
            (position.timestamp === after.timestamp && position.sessionId > after.sessionId)
          );
        });
  const offset = start < 0 ? sorted.length : start;
  const nodes = sorted.slice(offset, offset + first);
  const edges = nodes.map((node) => ({ cursor: encode(positionOf(node), kind), node }));
  const startCursor = edges[0]?.cursor;
  const endCursor = edges.at(-1)?.cursor;

  return {
    edges,
    totalCount: sorted.length,
    pageInfo: {
      ...(startCursor === undefined ? {} : { startCursor }),
      ...(endCursor === undefined ? {} : { endCursor }),
      hasNextPage: offset + nodes.length < sorted.length,
      hasPreviousPage: after !== undefined,
    },
  };
};
