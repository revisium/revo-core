import { Type, type Static } from 'typebox';
import { Compile } from 'typebox/compile';

import {
  AgentSessionApplicationError,
  AgentSessionErrorCode,
} from '../../../infrastructure/agent-runtime/agent-session.errors.js';

const requestId = Type.String({ minLength: 1 });
const inputValue = Type.Union([
  Type.String(),
  Type.Number(),
  Type.Boolean(),
  Type.Array(Type.String()),
]);

export const AgentSessionResponseSchema = Type.Union([
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

export type AgentSessionResponseData = Static<typeof AgentSessionResponseSchema>;

const responseValidator = Compile(AgentSessionResponseSchema);

export function parseAgentSessionResponse(input: unknown): AgentSessionResponseData {
  if (
    !responseValidator.Check(input) ||
    Buffer.byteLength(JSON.stringify(input), 'utf8') > 65_536
  ) {
    throw new AgentSessionApplicationError(
      AgentSessionErrorCode.invalidInput,
      'Invalid interaction response.',
    );
  }

  return input;
}
