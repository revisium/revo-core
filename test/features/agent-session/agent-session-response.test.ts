import { describe, expect, it } from 'vitest';

import { parseAgentSessionResponse } from '../../../src/features/agent-session/contracts/agent-session-response.js';

describe('Agent interaction responses', () => {
  it.each([
    { kind: 'permission', outcome: 'selected', optionId: 'yes' },
    { kind: 'permission', outcome: 'denied' },
    { kind: 'input', outcome: 'declined' },
    { kind: 'input', outcome: 'cancelled' },
    {
      kind: 'input',
      outcome: 'submitted',
      values: { name: 'hello', count: 2, approved: true, choices: ['a'] },
    },
  ])('accepts $kind / $outcome', (response) => {
    expect(parseAgentSessionResponse({ requestId: 'request', ...response })).toEqual({
      requestId: 'request',
      ...response,
    });
  });

  it.each([
    {
      reason: 'an input outcome on a permission request',
      data: { kind: 'permission', outcome: 'submitted' },
    },
    {
      reason: 'a selected option on a denied permission',
      data: { kind: 'permission', outcome: 'denied', optionId: 'yes' },
    },
    {
      reason: 'nested input values',
      data: { kind: 'input', outcome: 'submitted', values: { nested: { secret: 'x' } } },
    },
    {
      reason: 'input exceeding the payload limit',
      data: { kind: 'input', outcome: 'submitted', values: { text: 'x'.repeat(65537) } },
    },
    {
      reason: 'multibyte input exceeding the UTF-8 payload limit',
      data: { kind: 'input', outcome: 'submitted', values: { text: 'ж'.repeat(32_769) } },
    },
  ])('rejects $reason', ({ data }) => {
    expect(() => parseAgentSessionResponse({ requestId: 'request', ...data })).toThrow(
      'Invalid interaction',
    );
  });
});
