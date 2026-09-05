import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';

export const AgentSessionErrorCode = {
  invalidInput: 'REVO_AGENT_SESSION_INVALID_INPUT',
  invalidCursor: 'REVO_AGENT_SESSION_INVALID_CURSOR',
  expiredCursor: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
  notFound: 'REVO_AGENT_SESSION_NOT_FOUND',
  conflict: 'REVO_AGENT_SESSION_CONFLICT',
  unsupported: 'REVO_AGENT_SESSION_UNSUPPORTED',
  unavailable: 'REVO_AGENT_SESSION_UNAVAILABLE',
  internal: 'REVO_AGENT_SESSION_INTERNAL',
} as const;

export type AgentSessionErrorCode =
  (typeof AgentSessionErrorCode)[keyof typeof AgentSessionErrorCode];

export class AgentSessionApplicationError extends Error {
  constructor(
    readonly code: AgentSessionErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
  }
}

export const mapAgentSessionError = (error: unknown): AgentSessionApplicationError => {
  if (error instanceof AgentSessionApplicationError) {
    return error;
  }
  if (error instanceof AgentManagerError) {
    const code = error.fault.code;
    return new AgentSessionApplicationError(classifyRuntimeFault(code), error.fault.message, {
      ...error.fault.details,
      runtimeCode: code,
      retryable: error.fault.retryable,
    });
  }

  return new AgentSessionApplicationError(
    AgentSessionErrorCode.internal,
    'Agent session operation failed.',
  );
};

function classifyRuntimeFault(code: AgentFault['code']): AgentSessionErrorCode {
  if (code.endsWith('_unknown')) {
    return AgentSessionErrorCode.notFound;
  }

  if (code.includes('invalid') || code === 'revo.agent.continuation_pin_mismatch') {
    return AgentSessionErrorCode.invalidInput;
  }

  if (code.includes('unsupported')) {
    return AgentSessionErrorCode.unsupported;
  }

  if (
    code.includes('capacity') ||
    code.includes('backpressure') ||
    code.endsWith('_unavailable') ||
    code === 'revo.agent.manager_closed' ||
    code === 'revo.agent.manager_not_initialized'
  ) {
    return AgentSessionErrorCode.unavailable;
  }

  if (
    code.includes('busy') ||
    code.includes('conflict') ||
    code.includes('consumed') ||
    code.endsWith('_duplicate') ||
    code === 'revo.agent.configuration_stale' ||
    code === 'revo.agent.session_closed' ||
    code === 'revo.agent.turn_incomplete'
  ) {
    return AgentSessionErrorCode.conflict;
  }

  return AgentSessionErrorCode.internal;
}
