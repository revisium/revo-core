import { describe, expect, it } from 'vitest';

import { validateDialogueResponse } from '../../../src/features/dialogues/management/interactions/dialogue-response.js';

const permissionRequest = {
  requestId: 'request',
  kind: 'permission',
  action: { kind: 'shell' },
  options: [{ optionId: 'yes', kind: 'allow_once', label: 'Allow once' }],
};
const inputRequest = {
  requestId: 'request',
  kind: 'input',
  message: 'Provide values.',
  questions: [
    {
      questionId: 'name',
      title: 'Name',
      required: true,
      input: 'text',
      multiline: false,
      minLength: 1,
      maxLength: 100,
    },
    {
      questionId: 'count',
      title: 'Count',
      required: false,
      input: 'number',
      integer: true,
      minimum: 0,
      maximum: 10,
    },
    {
      questionId: 'approved',
      title: 'Approved',
      required: false,
      input: 'boolean',
    },
    {
      questionId: 'choices',
      title: 'Choices',
      required: false,
      input: 'select',
      selection: 'multiple',
      allowOther: false,
      options: [{ optionId: 'a', label: 'A' }],
    },
  ],
};

describe('Dialogue interaction responses', () => {
  it.each([
    {
      request: permissionRequest,
      response: { kind: 'permission', outcome: 'selected', optionId: 'yes' },
    },
    { request: permissionRequest, response: { kind: 'permission', outcome: 'denied' } },
    { request: inputRequest, response: { kind: 'input', outcome: 'declined' } },
    { request: inputRequest, response: { kind: 'input', outcome: 'cancelled' } },
    {
      request: inputRequest,
      response: {
        kind: 'input',
        outcome: 'submitted',
        values: { name: 'hello', count: 2, approved: true, choices: ['a'] },
      },
    },
  ])('accepts $response.kind / $response.outcome', ({ request, response }) => {
    expect(validateDialogueResponse(request, response, 'request')).toEqual(response);
  });

  it.each([
    {
      reason: 'an input outcome on a permission request',
      request: permissionRequest,
      response: { kind: 'permission', outcome: 'submitted' },
    },
    {
      reason: 'a selected option on a denied permission',
      request: permissionRequest,
      response: { kind: 'permission', outcome: 'denied', optionId: 'yes' },
    },
    {
      reason: 'nested input values',
      request: inputRequest,
      response: { kind: 'input', outcome: 'submitted', values: { nested: { secret: 'x' } } },
    },
    {
      reason: 'an unknown field',
      request: permissionRequest,
      response: { kind: 'permission', outcome: 'denied', extra: true },
    },
    {
      reason: 'input exceeding the payload limit',
      request: inputRequest,
      response: { kind: 'input', outcome: 'submitted', values: { name: 'x'.repeat(65_537) } },
    },
    {
      reason: 'multibyte input exceeding the UTF-8 payload limit',
      request: inputRequest,
      response: { kind: 'input', outcome: 'submitted', values: { name: '界'.repeat(32_769) } },
    },
  ])('rejects $reason', ({ request, response }) => {
    expect(() => validateDialogueResponse(request, response, 'request')).toThrow(
      'Invalid interaction response.',
    );
  });
});
