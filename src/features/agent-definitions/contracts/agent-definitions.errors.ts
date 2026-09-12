export const AgentDefinitionsErrorCode = {
  invalidCursor: 'REVO_AGENT_SESSION_INVALID_CURSOR',
  expiredCursor: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
} as const;

export type AgentDefinitionsErrorCode =
  (typeof AgentDefinitionsErrorCode)[keyof typeof AgentDefinitionsErrorCode];

export class AgentDefinitionsApplicationError extends Error {
  constructor(
    readonly code: AgentDefinitionsErrorCode,
    message: string,
  ) {
    super(message);
  }
}
