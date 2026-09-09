import { AgentManagerError, type AgentFault } from '@revisium/revo-agent-runtime';

export const AgentDefinitionsErrorCode = {
  invalidInput: 'REVO_AGENT_SESSION_INVALID_INPUT',
  invalidCursor: 'REVO_AGENT_SESSION_INVALID_CURSOR',
  expiredCursor: 'REVO_AGENT_SESSION_EXPIRED_CURSOR',
  notFound: 'REVO_AGENT_SESSION_NOT_FOUND',
  conflict: 'REVO_AGENT_SESSION_CONFLICT',
  unsupported: 'REVO_AGENT_SESSION_UNSUPPORTED',
  unavailable: 'REVO_AGENT_SESSION_UNAVAILABLE',
  internal: 'REVO_AGENT_SESSION_INTERNAL',
} as const;

export type AgentDefinitionsErrorCode =
  (typeof AgentDefinitionsErrorCode)[keyof typeof AgentDefinitionsErrorCode];

export class AgentDefinitionsApplicationError extends Error {
  constructor(
    readonly code: AgentDefinitionsErrorCode,
    message: string,
    readonly details: Readonly<Record<string, unknown>> = {},
  ) {
    super(message);
  }
}

export const mapAgentDefinitionsError = (error: unknown): AgentDefinitionsApplicationError => {
  if (error instanceof AgentDefinitionsApplicationError) {
    return error;
  }

  if (error instanceof AgentManagerError) {
    const code = error.fault.code;
    const publicCode = classifyRuntimeFault(code);

    return new AgentDefinitionsApplicationError(publicCode, publicAgentErrorMessage(publicCode), {
      runtimeCode: code,
      retryable: error.fault.retryable,
    });
  }

  return new AgentDefinitionsApplicationError(
    AgentDefinitionsErrorCode.internal,
    'Agent definition operation failed.',
  );
};

function classifyRuntimeFault(code: AgentFault['code']): AgentDefinitionsErrorCode {
  if (code.endsWith('_unknown')) {
    return AgentDefinitionsErrorCode.notFound;
  }

  if (code.includes('invalid')) {
    return AgentDefinitionsErrorCode.invalidInput;
  }

  if (code.includes('unsupported')) {
    return AgentDefinitionsErrorCode.unsupported;
  }

  if (
    code.endsWith('_unavailable') ||
    code === 'revo.agent.manager_closed' ||
    code === 'revo.agent.manager_not_initialized'
  ) {
    return AgentDefinitionsErrorCode.unavailable;
  }

  if (code.includes('conflict') || code === 'revo.agent.configuration_stale') {
    return AgentDefinitionsErrorCode.conflict;
  }

  return AgentDefinitionsErrorCode.internal;
}

function publicAgentErrorMessage(code: AgentDefinitionsErrorCode): string {
  if (code === AgentDefinitionsErrorCode.notFound) {
    return 'Agent definition was not found.';
  }

  if (code === AgentDefinitionsErrorCode.invalidInput) {
    return 'Agent definition input is invalid.';
  }

  if (code === AgentDefinitionsErrorCode.unsupported) {
    return 'Agent definition operation is unsupported.';
  }

  if (code === AgentDefinitionsErrorCode.unavailable) {
    return 'Agent definition operation is unavailable.';
  }

  if (code === AgentDefinitionsErrorCode.conflict) {
    return 'Agent definition operation conflicts with current state.';
  }

  return 'Agent definition operation failed.';
}
