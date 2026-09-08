import { describe, expect, it } from 'vitest';

import { paginateAgentDefinitions } from '../../../src/features/agent-definitions/contracts/agent-definitions.pagination.js';

const records = [
  { agent: { id: 'Alpha', version: '1' } },
  { agent: { id: 'alpha', version: '1' } },
  { agent: { id: 'alpha-beta', version: '2' } },
];
const identity = (value: { readonly agent: { readonly id: string; readonly version: string } }) =>
  JSON.stringify([value.agent.id, value.agent.version]);

describe('Agent definition pagination', () => {
  it('continues with the same lexical ordering across case and punctuation', () => {
    const first = paginateAgentDefinitions(records, { first: 1 }, identity);
    const after = first.pageInfo.endCursor;
    expect(after).toBeDefined();

    if (after === undefined) {
      throw new Error('Expected a continuation cursor.');
    }

    const second = paginateAgentDefinitions(records, { first: 1, after }, identity);

    expect(first.edges[0]?.node.agent.id).toBe('Alpha');
    expect(second.edges[0]?.node.agent.id).toBe('alpha');
    expect(second.pageInfo).toMatchObject({ hasNextPage: true, hasPreviousPage: true });
  });

  it('uses the shared default page size', () => {
    const many = Array.from({ length: 101 }, (_, index) => ({
      agent: { id: `agent-${String(index).padStart(3, '0')}`, version: '1' },
    }));

    const page = paginateAgentDefinitions(many, {}, identity);

    expect(page.edges).toHaveLength(100);
    expect(page.pageInfo.hasNextPage).toBe(true);
  });

  it.each([0, 101, 1.5])('rejects invalid page size %s', (first) => {
    expect(() => paginateAgentDefinitions(records, { first }, identity)).toThrow('first must');
  });

  it('rejects a malformed cursor', () => {
    expect(() => paginateAgentDefinitions(records, { after: '???' }, identity)).toThrow(
      'cursor is invalid',
    );
  });
});
