import { BadRequestException } from '@nestjs/common';
import type {
  AgentSessionInteractiveRequest,
  AgentSessionInteractiveResponse,
} from '@revisium/revo-agent-runtime';
import { Type, type Static } from 'typebox';
import { Compile } from 'typebox/compile';

import type { DialogueJson } from '../contracts/dialogue.contracts.js';

const requestId = Type.String({ minLength: 1 });
const inputValue = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Array(Type.String()),
]);
const dialogueResponseSchema = Type.Union([
  Type.Object(
    {
      requestId,
      kind: Type.Literal('permission'),
      outcome: Type.Literal('selected'),
      optionId: Type.String({ minLength: 1 }),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      requestId,
      kind: Type.Literal('permission'),
      outcome: Type.Literal('denied'),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      requestId,
      kind: Type.Literal('input'),
      outcome: Type.Literal('submitted'),
      values: Type.Record(Type.String(), inputValue),
    },
    { additionalProperties: false },
  ),
  Type.Object(
    {
      requestId,
      kind: Type.Literal('input'),
      outcome: Type.Union([Type.Literal('declined'), Type.Literal('cancelled')]),
    },
    { additionalProperties: false },
  ),
]);
type DialogueResponseData = Static<typeof dialogueResponseSchema>;
const responseValidator = Compile(dialogueResponseSchema);

function parseDialogueResponse(input: unknown): DialogueResponseData {
  if (
    !responseValidator.Check(input) ||
    Buffer.byteLength(JSON.stringify(input), 'utf8') > 65_536
  ) {
    throw new BadRequestException('Invalid interaction response.');
  }

  return input;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isRequest = (value: unknown): value is AgentSessionInteractiveRequest => {
  if (!isRecord(value) || typeof value.requestId !== 'string') {
    return false;
  }

  if (value.kind === 'permission') {
    return (
      isRecord(value.action) &&
      typeof value.action.kind === 'string' &&
      Array.isArray(value.options) &&
      value.options.every(
        (option) =>
          isRecord(option) &&
          typeof option.optionId === 'string' &&
          typeof option.kind === 'string' &&
          typeof option.label === 'string',
      )
    );
  }

  if (value.kind === 'input') {
    return (
      typeof value.message === 'string' &&
      Array.isArray(value.questions) &&
      value.questions.every(
        (question) =>
          isRecord(question) &&
          typeof question.questionId === 'string' &&
          typeof question.title === 'string' &&
          typeof question.required === 'boolean' &&
          typeof question.input === 'string',
      )
    );
  }

  return false;
};

export function validateDialogueResponse(
  requestJson: DialogueJson,
  responseJson: DialogueJson,
  interactionId: string,
): AgentSessionInteractiveResponse {
  if (typeof responseJson !== 'object' || responseJson === null || Array.isArray(responseJson)) {
    throw new BadRequestException('Invalid interaction response.');
  }
  const responseInput = Object.fromEntries([
    ...Object.entries(responseJson),
    ['requestId', interactionId],
  ]);
  const { requestId: _requestId, ...response } = parseDialogueResponse(responseInput);

  if (!isRequest(requestJson)) {
    throw new BadRequestException('Stored interaction request is invalid.');
  }
  const request = requestJson;
  const invalid = () => {
    throw new BadRequestException('Response does not satisfy the pending interaction.');
  };

  if (request.kind !== response.kind) {
    invalid();
  }

  if (
    request.kind === 'permission' &&
    response.kind === 'permission' &&
    response.outcome === 'selected' &&
    !request.options.some((option) => option.optionId === response.optionId)
  ) {
    invalid();
  }

  if (request.kind === 'input' && response.kind === 'input' && response.outcome === 'submitted') {
    if (
      Object.keys(response.values).some(
        (key) => !request.questions.some((question) => question.questionId === key),
      )
    ) {
      invalid();
    }

    for (const question of request.questions) {
      const value = response.values[question.questionId];

      if (value === undefined) {
        if (question.required) {
          invalid();
        }
        continue;
      }

      switch (question.input) {
        case 'text':
          if (
            typeof value !== 'string' ||
            value.length > question.maxLength ||
            value.length < (question.minLength ?? (question.required ? 1 : 0)) ||
            (!question.multiline && /[\r\n]/.test(value))
          ) {
            invalid();
          }
          break;
        case 'boolean':
          if (typeof value !== 'boolean') {
            invalid();
          }
          break;
        case 'number':
          if (
            typeof value !== 'number' ||
            !Number.isFinite(value) ||
            (question.integer && !Number.isInteger(value)) ||
            value < (question.minimum ?? -Infinity) ||
            value > (question.maximum ?? Infinity)
          ) {
            invalid();
          }
          break;
        case 'select': {
          const values =
            question.selection === 'multiple' && Array.isArray(value)
              ? value
              : typeof value === 'string'
                ? [value]
                : [];

          if (
            values.some((choice) => choice.length === 0) ||
            new Set(values).size !== values.length
          ) {
            invalid();
          }

          if (values.length === 0 && question.required) {
            invalid();
          }

          if (question.selection === 'single' && typeof value !== 'string') {
            invalid();
          }

          if (question.selection === 'multiple' && !Array.isArray(value)) {
            invalid();
          }

          if (
            !question.allowOther &&
            values.some((choice) => !question.options.some((option) => option.optionId === choice))
          ) {
            invalid();
          }
          break;
        }
      }
    }
  }

  return response;
}
