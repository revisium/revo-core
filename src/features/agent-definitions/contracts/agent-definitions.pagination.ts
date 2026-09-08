import { Buffer } from 'node:buffer';
import { randomUUID } from 'node:crypto';

import { pageSize } from '../../shared/pagination/page-size.js';
import type {
  AgentDefinitionPage,
  AgentDefinitionPageData,
} from './agent-definitions.contracts.js';
import {
  AgentDefinitionsApplicationError,
  AgentDefinitionsErrorCode,
} from './agent-definitions.errors.js';

const cursorEpoch = randomUUID();

interface Position {
  readonly definitionId: string;
}

const compareText = (left: string, right: string): number => {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
};

const encode = (position: Position): string =>
  Buffer.from(
    JSON.stringify({ version: 1, epoch: cursorEpoch, kind: 'agent-definitions', ...position }),
    'utf8',
  ).toString('base64url');

const decode = (cursor: string): Position => {
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
      value.kind !== 'agent-definitions' ||
      !('epoch' in value) ||
      typeof value.epoch !== 'string' ||
      !('definitionId' in value) ||
      typeof value.definitionId !== 'string'
    ) {
      throw new Error('invalid');
    }

    if (value.epoch !== cursorEpoch) {
      throw new AgentDefinitionsApplicationError(
        AgentDefinitionsErrorCode.expiredCursor,
        'Agent definition cursor belongs to an earlier process.',
      );
    }

    return { definitionId: value.definitionId };
  } catch (error) {
    if (error instanceof AgentDefinitionsApplicationError) {
      throw error;
    }

    throw new AgentDefinitionsApplicationError(
      AgentDefinitionsErrorCode.invalidCursor,
      'Agent definition cursor is invalid.',
    );
  }
};

export const paginateAgentDefinitions = <T>(
  records: readonly T[],
  data: AgentDefinitionPageData,
  definitionIdOf: (record: T) => string,
): AgentDefinitionPage<T> => {
  const first = pageSize(data.first);

  const sorted = [...records].sort((left, right) =>
    compareText(definitionIdOf(left), definitionIdOf(right)),
  );
  const after = data.after === undefined ? undefined : decode(data.after);
  const start =
    after === undefined
      ? 0
      : sorted.findIndex((record) => compareText(definitionIdOf(record), after.definitionId) > 0);
  const offset = start < 0 ? sorted.length : start;
  const nodes = sorted.slice(offset, offset + first);
  const edges = nodes.map((node) => ({
    cursor: encode({ definitionId: definitionIdOf(node) }),
    node,
  }));
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
