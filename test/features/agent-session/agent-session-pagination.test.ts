import { describe, expect, it } from 'vitest';

import { paginateAgentSessions } from '../../../src/features/agent-session/contracts/agent-session.pagination.js';

const records = [
  { sessionId: 'a', timestamp: '2026-01-02' },
  { sessionId: 'b', timestamp: '2026-01-02' },
  { sessionId: 'c', timestamp: '2026-01-01' },
];
const position = (value: (typeof records)[number]) => value;

describe('Session connections', () => {
  it('continues deterministically after a removed record', () => {
    const first = paginateAgentSessions(records, { first: 1 }, position);
    expect(first.edges[0]?.node.sessionId).toBe('a');
    const after = first.pageInfo.endCursor;
    expect(after).toBeDefined();
    const second = paginateAgentSessions(
      records.slice(1),
      { first: 1, ...(after === undefined ? {} : { after }) },
      position,
    );
    expect(second.edges[0]?.node.sessionId).toBe('b');
    expect(second.pageInfo).toMatchObject({ hasNextPage: true, hasPreviousPage: true });
  });
  it('rejects an active-session cursor used for a terminal-session list', () => {
    const after = paginateAgentSessions(records, { first: 1 }, position).pageInfo.endCursor;
    expect(() =>
      paginateAgentSessions(
        records,
        { ...(after === undefined ? {} : { after }) },
        position,
        'terminal',
      ),
    ).toThrow('cursor is invalid');
  });

  it.each([0, 101, 1.5])('rejects invalid page size %s', (first) => {
    expect(() => paginateAgentSessions(records, { first }, position)).toThrow('first must');
  });

  it('rejects a malformed cursor', () => {
    expect(() => paginateAgentSessions(records, { after: '???' }, position)).toThrow(
      'cursor is invalid',
    );
  });
});
