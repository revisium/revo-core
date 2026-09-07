import { BadRequestException } from '@nestjs/common';
import type {
  AgentSessionInputValue,
  AgentSessionInteractiveRequest,
  AgentSessionInteractiveResponse,
  AgentSessionQuestion,
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

type PermissionRequest = Extract<AgentSessionInteractiveRequest, { kind: 'permission' }>;
type PermissionResponse = Extract<AgentSessionInteractiveResponse, { kind: 'permission' }>;
type InputRequest = Extract<AgentSessionInteractiveRequest, { kind: 'input' }>;
type InputResponse = Extract<AgentSessionInteractiveResponse, { kind: 'input' }>;
type SubmittedInputResponse = Extract<InputResponse, { outcome: 'submitted' }>;

const invalidResponse = (): never => {
  throw new BadRequestException('Response does not satisfy the pending interaction.');
};

function validatePermissionResponse(
  request: PermissionRequest,
  response: PermissionResponse,
): void {
  if (
    response.outcome === 'selected' &&
    !request.options.some((option) => option.optionId === response.optionId)
  ) {
    invalidResponse();
  }
}

function selectedValues(
  question: Extract<AgentSessionQuestion, { input: 'select' }>,
  value: AgentSessionInputValue,
): readonly string[] {
  if (question.selection === 'multiple' && Array.isArray(value)) {
    return value as readonly string[];
  }

  if (typeof value === 'string') {
    return [value];
  }

  return [];
}

function validateTextValue(
  question: Extract<AgentSessionQuestion, { input: 'text' }>,
  value: AgentSessionInputValue,
): void {
  const minimumLength = question.minLength ?? (question.required ? 1 : 0);

  if (
    typeof value !== 'string' ||
    value.length > question.maxLength ||
    value.length < minimumLength ||
    (!question.multiline && /[\r\n]/.test(value))
  ) {
    invalidResponse();
  }
}

function validateNumberValue(
  question: Extract<AgentSessionQuestion, { input: 'number' }>,
  value: AgentSessionInputValue,
): void {
  const minimum = question.minimum ?? -Infinity;
  const maximum = question.maximum ?? Infinity;

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    (question.integer && !Number.isInteger(value)) ||
    value < minimum ||
    value > maximum
  ) {
    invalidResponse();
  }
}

function validateSelectValue(
  question: Extract<AgentSessionQuestion, { input: 'select' }>,
  value: AgentSessionInputValue,
): void {
  const values = selectedValues(question, value);

  if (
    values.some((choice) => choice.length === 0) ||
    new Set(values).size !== values.length ||
    (values.length === 0 && question.required) ||
    (question.selection === 'single' && typeof value !== 'string') ||
    (question.selection === 'multiple' && !Array.isArray(value)) ||
    (!question.allowOther &&
      values.some((choice) => !question.options.some((option) => option.optionId === choice)))
  ) {
    invalidResponse();
  }
}

function validateQuestionValue(
  question: AgentSessionQuestion,
  value: AgentSessionInputValue,
): void {
  switch (question.input) {
    case 'text':
      validateTextValue(question, value);
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        invalidResponse();
      }
      break;
    case 'number':
      validateNumberValue(question, value);
      break;
    case 'select':
      validateSelectValue(question, value);
      break;
  }
}

function validateSubmittedInputResponse(
  request: InputRequest,
  response: SubmittedInputResponse,
): void {
  const knownQuestion = (key: string) =>
    request.questions.some((question) => question.questionId === key);

  if (Object.keys(response.values).some((key) => !knownQuestion(key))) {
    invalidResponse();
  }

  for (const question of request.questions) {
    const value = response.values[question.questionId];

    if (value === undefined) {
      if (question.required) {
        invalidResponse();
      }

      continue;
    }

    validateQuestionValue(question, value);
  }
}

function validateInputResponse(request: InputRequest, response: InputResponse): void {
  if (response.outcome === 'submitted') {
    validateSubmittedInputResponse(request, response);
  }
}

function validateResponseKind(
  request: AgentSessionInteractiveRequest,
  response: AgentSessionInteractiveResponse,
): void {
  if (request.kind !== response.kind) {
    invalidResponse();
  }

  if (request.kind === 'permission' && response.kind === 'permission') {
    validatePermissionResponse(request, response);

    return;
  }

  if (request.kind === 'input' && response.kind === 'input') {
    validateInputResponse(request, response);
  }
}

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

  validateResponseKind(requestJson, response);

  return response;
}
