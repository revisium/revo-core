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

export type AgentDefinitionsFailure = {
  [TCode in AgentDefinitionsErrorCode]: Readonly<{
    code: TCode;
    details: AgentDefinitionsErrorDetails[TCode];
  }>;
}[AgentDefinitionsErrorCode];

export class AgentDefinitionsApplicationError extends ApplicationError<AgentDefinitionsFailure> {}
