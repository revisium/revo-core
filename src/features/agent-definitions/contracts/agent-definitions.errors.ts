export const AgentDefinitionsErrorCode = {
  invalidCursor: 'REVO_AGENT_SESSION_INVALID_CURSOR',
  expiredCursor: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
} as const;

export type AgentDefinitionsErrorCode =
  (typeof AgentDefinitionsErrorCode)[keyof typeof AgentDefinitionsErrorCode];

export type AgentDefinitionsErrorDetails = {
  REVO_AGENT_SESSION_INVALID_CURSOR: Record<string, never>;
  REVO_AGENT_SESSION_EXPIRED_CURSOR: Record<string, never>;
};

import { ApplicationError } from '../../../application/errors/application-error.js';

export class AgentDefinitionsApplicationError<
  TCode extends AgentDefinitionsErrorCode = AgentDefinitionsErrorCode,
> extends ApplicationError<TCode, AgentDefinitionsErrorDetails[TCode]> {
  constructor(readonly code: TCode) {
    super(code, {});
  }
}
